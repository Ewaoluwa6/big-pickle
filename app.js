const STORAGE_KEY = "sales-dashboard.sales";

const els = {
  form: document.getElementById("saleForm"),
  product: document.getElementById("product"),
  amount: document.getElementById("amount"),
  qty: document.getElementById("qty"),
  date: document.getElementById("date"),
  body: document.getElementById("salesBody"),
  empty: document.getElementById("emptyState"),
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  statCount: document.getElementById("statCount"),
  statRevenue: document.getElementById("statRevenue"),
  statAvg: document.getElementById("statAvg"),
  statToday: document.getElementById("statToday"),
  chart: document.getElementById("chart"),
  exportBtn: document.getElementById("exportBtn"),
  clearBtn: document.getElementById("clearBtn"),
};

let sales = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function saleTotal(s) {
  return Number(s.amount) * Number(s.qty);
}

function render() {
  renderStats();
  renderChart();
  renderTable();
}

function renderStats() {
  const count = sales.length;
  const revenue = sales.reduce((sum, s) => sum + saleTotal(s), 0);
  const avg = count ? revenue / count : 0;
  const today = todayISO();
  const todayRevenue = sales
    .filter((s) => s.date === today)
    .reduce((sum, s) => sum + saleTotal(s), 0);

  els.statCount.textContent = String(count);
  els.statRevenue.textContent = money.format(revenue);
  els.statAvg.textContent = money.format(avg);
  els.statToday.textContent = money.format(todayRevenue);
}

function renderChart() {
  const ctx = els.chart.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const cssW = els.chart.clientWidth || 640;
  const cssH = 260;
  els.chart.width = cssW * dpr;
  els.chart.height = cssH * dpr;
  els.chart.style.height = cssH + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const off = d.getTimezoneOffset();
    days.push(new Date(d.getTime() - off * 60000).toISOString().slice(0, 10));
  }

  const totals = days.map((day) =>
    sales.filter((s) => s.date === day).reduce((sum, s) => sum + saleTotal(s), 0)
  );
  const max = Math.max(...totals, 1);

  const padL = 56;
  const padR = 16;
  const padT = 16;
  const padB = 34;
  const plotW = cssW - padL - padR;
  const plotH = cssH - padT - padB;

  ctx.strokeStyle = "#2b3050";
  ctx.fillStyle = "#9aa0c3";
  ctx.font = "12px Segoe UI, sans-serif";
  ctx.textBaseline = "middle";

  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = padT + (plotH / gridLines) * i;
    const value = max - (max / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(money.format(value), padL - 8, y);
  }

  const slot = plotW / days.length;
  const barW = Math.min(slot * 0.55, 48);

  totals.forEach((value, i) => {
    const x = padL + slot * i + (slot - barW) / 2;
    const h = (value / max) * plotH;
    const y = padT + plotH - h;
    const grad = ctx.createLinearGradient(0, y, 0, padT + plotH);
    grad.addColorStop(0, "#6f8cff");
    grad.addColorStop(1, "#3b56c9");
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, barW, Math.max(h, value > 0 ? 3 : 0), 6);
    ctx.fill();

    ctx.fillStyle = "#9aa0c3";
    ctx.textAlign = "center";
    const d = new Date(days[i] + "T00:00:00");
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    ctx.fillText(label, x + barW / 2, padT + plotH + 18);
  });
}

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function visibleSales() {
  const q = els.search.value.trim().toLowerCase();
  let list = sales.filter((s) => s.product.toLowerCase().includes(q));

  const [field, dir] = els.sort.value.split("-");
  list.sort((a, b) => {
    let cmp;
    if (field === "amount") cmp = saleTotal(a) - saleTotal(b);
    else cmp = a.date.localeCompare(b.date) || a.id - b.id;
    return dir === "asc" ? cmp : -cmp;
  });
  return list;
}

function renderTable() {
  const list = visibleSales();
  els.body.innerHTML = "";
  els.empty.style.display = list.length ? "none" : "block";
  if (!list.length) {
    els.empty.textContent = sales.length
      ? "No sales match your search."
      : "No sales yet. Add your first sale on the left.";
  }

  for (const s of list) {
    const tr = document.createElement("tr");

    const dateTd = document.createElement("td");
    dateTd.textContent = s.date;

    const prodTd = document.createElement("td");
    prodTd.textContent = s.product;

    const qtyTd = document.createElement("td");
    qtyTd.className = "num";
    qtyTd.textContent = s.qty;

    const amtTd = document.createElement("td");
    amtTd.className = "num";
    amtTd.textContent = money.format(s.amount);

    const totTd = document.createElement("td");
    totTd.className = "num";
    totTd.textContent = money.format(saleTotal(s));

    const actTd = document.createElement("td");
    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "\u00d7";
    del.title = "Delete";
    del.addEventListener("click", () => removeSale(s.id));
    actTd.appendChild(del);

    tr.append(dateTd, prodTd, qtyTd, amtTd, totTd, actTd);
    els.body.appendChild(tr);
  }
}

function removeSale(id) {
  sales = sales.filter((s) => s.id !== id);
  save();
  render();
}

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = parseFloat(els.amount.value);
  const qty = parseInt(els.qty.value, 10);
  if (!els.product.value.trim() || !(amount >= 0) || !(qty >= 1)) return;

  sales.push({
    id: Date.now() + Math.random(),
    product: els.product.value.trim(),
    amount,
    qty,
    date: els.date.value || todayISO(),
  });
  save();
  render();

  els.product.value = "";
  els.amount.value = "";
  els.qty.value = "1";
  els.product.focus();
});

els.search.addEventListener("input", renderTable);
els.sort.addEventListener("change", renderTable);

els.exportBtn.addEventListener("click", () => {
  if (!sales.length) return;
  const header = "date,product,qty,amount,total";
  const rows = sales.map((s) =>
    [s.date, `"${s.product.replace(/"/g, '""')}"`, s.qty, s.amount, saleTotal(s)].join(",")
  );
  const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sales-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

els.clearBtn.addEventListener("click", () => {
  if (!sales.length) return;
  if (confirm("Delete all sales? This cannot be undone.")) {
    sales = [];
    save();
    render();
  }
});

window.addEventListener("resize", renderChart);

els.date.value = todayISO();
render();
