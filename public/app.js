const state = {
  token: localStorage.getItem("token") || null,
  userEmail: localStorage.getItem("userEmail") || null,
};

const money = (n) =>
  Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ocurrio un error");
  return data;
}

// ---------- Auth ----------
const authSection = document.getElementById("authSection");
const mainSection = document.getElementById("mainSection");
const userBox = document.getElementById("userBox");
const userEmailEl = document.getElementById("userEmail");

function setSession(token, email) {
  state.token = token;
  state.userEmail = email;
  localStorage.setItem("token", token);
  localStorage.setItem("userEmail", email);
  renderAuthState();
  loadAll();
}

function clearSession() {
  state.token = null;
  state.userEmail = null;
  localStorage.removeItem("token");
  localStorage.removeItem("userEmail");
  renderAuthState();
}

function renderAuthState() {
  if (state.token) {
    authSection.classList.add("hidden");
    mainSection.classList.remove("hidden");
    userBox.classList.remove("hidden");
    userEmailEl.textContent = state.userEmail;
  } else {
    authSection.classList.remove("hidden");
    mainSection.classList.add("hidden");
    userBox.classList.add("hidden");
  }
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    document.getElementById("loginForm").classList.toggle("hidden", tab !== "login");
    document.getElementById("registerForm").classList.toggle("hidden", tab !== "register");
  });
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const errorEl = document.getElementById("loginError");
  errorEl.textContent = "";
  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    setSession(data.token, data.user.email);
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const errorEl = document.getElementById("registerError");
  errorEl.textContent = "";
  try {
    const data = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    setSession(data.token, data.user.email);
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.getElementById("logoutBtn").addEventListener("click", clearSession);

// ---------- Month picker ----------
const monthPicker = document.getElementById("monthPicker");
function currentMonth() {
  return monthPicker.value || new Date().toISOString().slice(0, 7);
}
monthPicker.value = new Date().toISOString().slice(0, 7);
monthPicker.addEventListener("change", loadAll);

// ---------- Bills ----------
const billsTableBody = document.querySelector("#billsTable tbody");

async function loadBills() {
  const bills = await api("/bills");
  billsTableBody.innerHTML = "";
  if (bills.length === 0) {
    billsTableBody.innerHTML = `<tr><td colspan="6" class="empty">Aun no tienes facturas registradas.</td></tr>`;
    return;
  }
  bills.forEach((bill) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(bill.name)}</td>
      <td>${escapeHtml(bill.category || "-")}</td>
      <td>${money(bill.monthly_amount)}</td>
      <td>${money(bill.monthly_amount / 2)}</td>
      <td>${bill.due_day ? "Dia " + bill.due_day : "-"}</td>
      <td><button class="btn danger" data-id="${bill.id}">Eliminar</button></td>
    `;
    tr.querySelector("button").addEventListener("click", async () => {
      if (!confirm(`Eliminar la factura "${bill.name}"?`)) return;
      await api(`/bills/${bill.id}`, { method: "DELETE" });
      loadAll();
    });
    billsTableBody.appendChild(tr);
  });
}

document.getElementById("billForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const errorEl = document.getElementById("billError");
  errorEl.textContent = "";
  try {
    await api("/bills", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        monthlyAmount: form.get("monthlyAmount"),
        dueDay: form.get("dueDay") ? Number(form.get("dueDay")) : null,
        category: form.get("category"),
      }),
    });
    e.target.reset();
    loadAll();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// ---------- Dashboard ----------
const totalsGrid = document.getElementById("totalsGrid");
const billsStatusEl = document.getElementById("billsStatus");

async function loadDashboard() {
  const data = await api(`/dashboard?month=${currentMonth()}`);
  totalsGrid.innerHTML = `
    <div class="total-tile">
      <div class="label">Ingreso del mes</div>
      <div class="value">${money(data.totals.income)}</div>
    </div>
    <div class="total-tile">
      <div class="label">Total facturas</div>
      <div class="value">${money(data.totals.monthlyBills)}</div>
    </div>
    <div class="total-tile">
      <div class="label">Apartado</div>
      <div class="value">${money(data.totals.saved)}</div>
    </div>
    <div class="total-tile ${data.totals.disponible < 0 ? "warn" : ""}">
      <div class="label">Disponible</div>
      <div class="value">${money(data.totals.disponible)}</div>
    </div>
  `;

  if (data.bills.length === 0) {
    billsStatusEl.innerHTML = `<p class="empty">Agrega facturas para ver el avance del mes.</p>`;
    return;
  }

  billsStatusEl.innerHTML = data.bills
    .map((b) => {
      const pct = b.monthlyAmount > 0 ? Math.min((b.saved / b.monthlyAmount) * 100, 100) : 0;
      return `
        <div class="bill-status-row ${b.covered ? "covered" : ""}">
          <div class="top">
            <span>${escapeHtml(b.name)}</span>
            <span>${money(b.saved)} / ${money(b.monthlyAmount)}</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="sub">${b.covered ? "Cubierta ✔" : `Falta ${money(b.remaining)} · ${money(b.perQuincena)} por quincena`}</div>
        </div>
      `;
    })
    .join("");
}

// ---------- Paydays ----------
const paydayResult = document.getElementById("paydayResult");
const paydaysList = document.getElementById("paydaysList");

document.getElementById("paydayForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const errorEl = document.getElementById("paydayError");
  errorEl.textContent = "";
  try {
    const data = await api("/paydays", {
      method: "POST",
      body: JSON.stringify({
        date: form.get("date"),
        incomeAmount: form.get("incomeAmount"),
        note: form.get("note"),
      }),
    });
    e.target.reset();
    renderPaydayResult(data);
    loadAll();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

function renderPaydayResult(data) {
  paydayResult.classList.remove("hidden");
  const items = data.contributions
    .map((c) => `<li>${escapeHtml(c.billName)}: ${money(c.amount)}</li>`)
    .join("");
  paydayResult.innerHTML = `
    <div>Total apartado para facturas: <strong>${money(data.totalApartado)}</strong></div>
    <div class="disponible">Te queda disponible: ${money(data.disponible)}</div>
    <ul>${items || "<li>No hay facturas activas para repartir.</li>"}</ul>
  `;
}

async function loadPaydays() {
  const paydays = await api(`/paydays?month=${currentMonth()}`);
  if (paydays.length === 0) {
    paydaysList.innerHTML = `<p class="empty">Aun no has registrado quincenas este mes.</p>`;
    return;
  }
  paydaysList.innerHTML = paydays
    .map(
      (p) => `
      <div class="payday-item">
        <div class="info">${p.date}${p.note ? " · " + escapeHtml(p.note) : ""}</div>
        <div class="amounts">Ingreso ${money(p.income_amount)} · Apartado ${money(p.totalApartado)} · Disponible ${money(p.disponible)}</div>
        <button class="btn danger" data-id="${p.id}">Eliminar</button>
      </div>
    `
    )
    .join("");

  paydaysList.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Eliminar esta quincena y su reparto?")) return;
      await api(`/paydays/${btn.dataset.id}`, { method: "DELETE" });
      loadAll();
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

async function loadAll() {
  if (!state.token) return;
  try {
    await Promise.all([loadBills(), loadDashboard(), loadPaydays()]);
  } catch (err) {
    if (err.message.includes("Sesion") || err.message.includes("autenticado")) {
      clearSession();
    }
  }
}

renderAuthState();
if (state.token) loadAll();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
