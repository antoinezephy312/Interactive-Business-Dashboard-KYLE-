const revenueCtx = document.getElementById("revenueChart").getContext("2d");
const productCtx = document.getElementById("productChart").getContext("2d");
const kpiGrid = document.getElementById("kpiGrid");
const activityFeed = document.getElementById("activityFeed");
const customerTableBody = document.querySelector("#customerTable tbody");
const revenueMeta = document.getElementById("revenueMeta");
const mixMeta = document.getElementById("mixMeta");
const activityMeta = document.getElementById("activityMeta");
const rangeFilter = document.getElementById("rangeFilter");
const refreshButton = document.getElementById("refreshButton");

const customers = [
    { name: "Acme Holdings", value: 420000, health: "good" },
    { name: "Northwind Group", value: 350000, health: "warning" },
    { name: "Lumina Retail", value: 285000, health: "good" },
    { name: "Vertex Media", value: 198000, health: "risk" },
    { name: "Atlas Mobility", value: 167000, health: "good" }
];

const activities = [
    { label: "New order", value: () => `+$${randomInt(8, 75)}k` },
    { label: "Renewal", value: () => `+$${randomInt(20, 60)}k` },
    { label: "Churn alert", value: () => "-1 acct" },
    { label: "Product inquiry", value: () => randomInt(5, 22) + " leads" },
    { label: "Refund issued", value: () => `-$${randomInt(4, 18)}k` }
];

const state = {
    range: Number(rangeFilter.value),
    revenueSeries: [],
    productMix: [],
    kpis: []
};

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value) {
    return `${(value * 100).toFixed(1)}%`;
}

function generateRevenueSeries(days) {
    const series = [];
    let value = randomInt(180, 260);
    for (let i = days - 1; i >= 0; i -= 1) {
        value += randomInt(-12, 15);
        if (value < 120) value = 120;
        series.unshift({ day: days - i, value });
    }
    return series;
}

function generateProductMix() {
    const base = [
        { label: "Enterprise", value: randomInt(35, 45) },
        { label: "Teams", value: randomInt(25, 35) },
        { label: "Consumer", value: randomInt(15, 25) },
        { label: "Services", value: randomInt(8, 15) }
    ];
    const total = base.reduce((sum, entry) => sum + entry.value, 0);
    return base.map(entry => ({ ...entry, ratio: entry.value / total }));
}

function buildKpis(series) {
    const latest = series[series.length - 1].value;
    const prior = series[Math.max(series.length - 8, 0)].value;
    const delta = ((latest - prior) / prior) || 0;

    const sales = randomInt(280, 430);
    const pipeline = randomInt(32, 55);
    const churn = Math.max(0.02, Math.random() * 0.05);
    const satisfaction = Math.random() * 0.25 + 0.65;

    return [
        { label: "Revenue", value: formatCurrency(latest * 1000), trend: delta, deltaLabel: formatPercent(delta) },
        { label: "Sales Volume", value: `${sales} deals`, trend: (sales - 320) / 320, deltaLabel: `${sales} deals` },
        { label: "Pipeline", value: formatCurrency(pipeline * 10000), trend: (pipeline - 40) / 40, deltaLabel: `${pipeline} active` },
        { label: "Customer Satisfaction", value: formatPercent(satisfaction), trend: satisfaction - 0.75, deltaLabel: formatPercent(satisfaction) }
    ];
}

function renderKpis(kpis) {
    kpiGrid.innerHTML = kpis.map(kpi => {
        const trendClass = kpi.trend >= 0 ? "up" : "down";
        const trendSymbol = kpi.trend >= 0 ? "▲" : "▼";
        return `
            <article class="kpi-card">
                <span class="kpi-trend ${trendClass}">${trendSymbol} ${Math.abs(kpi.trend * 100).toFixed(1)}%</span>
                <h3>${kpi.label}</h3>
                <strong>${kpi.value}</strong>
                <small>${kpi.deltaLabel}</small>
            </article>
        `;
    }).join("");
}

function drawLineChart(ctx, series) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    ctx.clearRect(0, 0, width, height);

    const values = series.map(point => point.value);
    const min = Math.min(...values) - 10;
    const max = Math.max(...values) + 10;
    const range = max - min || 1;

    ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    for (let i = 1; i < 4; i += 1) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.beginPath();
    series.forEach((point, index) => {
        const x = (index / (series.length - 1)) * width;
        const y = height - ((point.value - min) / range) * height;
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(56, 189, 248, 0.35)");
    gradient.addColorStop(1, "rgba(15, 23, 42, 0)");

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
}

function drawRoundedRectPath(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function drawBarChart(ctx, mix) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / mix.length - 20;
    mix.forEach((product, index) => {
        const x = index * (barWidth + 20) + 10;
        const barHeight = product.ratio * (height - 40);
        const y = height - barHeight - 20;

        ctx.fillStyle = index % 2 === 0 ? "#f97316" : "#38bdf8";
        drawRoundedRectPath(ctx, x, y, barWidth, barHeight, 6);
        ctx.fill();

        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px 'Segoe UI'";
        ctx.fillText(product.label, x, height - 6);

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 13px 'Segoe UI'";
        ctx.fillText(formatPercent(product.ratio), x, y - 8);
    });
}

function renderActivity() {
    const now = new Date();
    activityMeta.textContent = `Updated ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    const entries = Array.from({ length: 5 }, () => activities[randomInt(0, activities.length - 1)]);
    activityFeed.innerHTML = entries.map(entry => `
        <li class="activity__item">
            <span class="activity__label">${entry.label}</span>
            <span class="activity__value">${entry.value()}</span>
        </li>
    `).join("");
}

function renderCustomers() {
    customerTableBody.innerHTML = customers.map(customer => `
        <tr>
            <td>${customer.name}</td>
            <td>${formatCurrency(customer.value)}</td>
            <td><span class="badge ${customer.health}">${customer.health}</span></td>
        </tr>
    `).join("");
}

function updateDashboard() {
    state.range = Number(rangeFilter.value);
    state.revenueSeries = generateRevenueSeries(state.range);
    state.productMix = generateProductMix();
    state.kpis = buildKpis(state.revenueSeries);

    renderKpis(state.kpis);
    drawLineChart(revenueCtx, state.revenueSeries);
    drawBarChart(productCtx, state.productMix);
    renderActivity();
    renderCustomers();

    const total = state.revenueSeries.reduce((sum, point) => sum + point.value, 0);
    revenueMeta.textContent = `${formatCurrency(total * 1000)} ${state.range}-day total`;
    mixMeta.textContent = "Share of revenue by segment";
}

rangeFilter.addEventListener("change", updateDashboard);
refreshButton.addEventListener("click", updateDashboard);

updateDashboard();
setInterval(updateDashboard, 8000);
