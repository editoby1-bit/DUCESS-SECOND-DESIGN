(function () {
    const CONFIG = {
    STORAGE: "sc_pro_b_v2",
    HIGH_WITHDRAWAL: 50000,
    AUTO_TOLERANCE: 500,
    PERSIST: true,
  };
  // 🔑 PLATFORM BEHAVIOR FLAGS (DO NOT REMOVE EXISTING CONFIG)
  CONFIG.REQUIRE_APPROVAL_FOR_ALL_TX = true;
  CONFIG.ALLOW_NEGATIVE_BALANCE = true;
  CONFIG.START_ACCOUNT_NO = 1000;
  // ✅ single source of truth for storage key (save + load must match)
const STORAGE_KEY = (typeof CONFIG !== "undefined" && CONFIG?.STORAGE)
  ? CONFIG.STORAGE
  : "sc_pro_b_v2";
  // ✅ Storage key must be GLOBAL (works even if script is type="module")
window.STORAGE_KEY =
  (typeof CONFIG !== "undefined" && CONFIG && CONFIG.STORAGE)
    ? CONFIG.STORAGE
    : "sc_pro_b_v2";

  const ROLES = {
  MANAGER: "manager",
  TELLER: "teller",
  MARKETER: "marketer",
  CEO: "ceo"
};


function currentStaff() {
  const staff = state.staff.find(s => s.id === state.activeStaffId);
  if (!staff) return null;

  // 🔑 HARD DEFAULT (safety)
  staff.role = staff.role || ROLES.TELLER;

  return staff;
}
window.currentStaff = currentStaff;


  const $ = (s) => document.querySelector(s),
    $$ = (s) => document.querySelectorAll(s);
  const uid = (p = "id") => p + Math.random().toString(36).slice(2, 9);
  const fmt = (n) => Number(n || 0).toLocaleString(); // ✅ no ₦ anywhere
// (Optional helper if you ever need the symbol in ONE place like print headers)
const fmtN = (n) => "₦" + fmt(n);
  async function sha(s) {
    try {
      const h = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(s)
      );
      return Array.from(new Uint8Array(h))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch (e) {
      let x = 0;
      for (let i = 0; i < s.length; i++) x = (x << 5) - x + s.charCodeAt(i);
      return (x >>> 0).toString(16);
    }
  }

  const RANGE_LABELS = {
  today: "Daily",
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
  all: "All",

  // if your UI uses these exact strings:
  "TODAY": "Daily",
  "THIS WEEK": "Weekly",
  "THIS MONTH": "Monthly",
  "THIS YEAR": "Yearly",
  "ALL TIME": "All"
};

function labelRange(x) {
  return RANGE_LABELS[x] || x;
}

function bindCustomerSearchInputs() {
  const searchBox = document.getElementById("search");
  if (searchBox) searchBox.oninput = renderCustomers;

  const accBox = document.getElementById("searchAcc");
  if (accBox) accBox.oninput = renderCustomers;

  const sortBox = document.getElementById("sort");
  if (sortBox) sortBox.onchange = renderCustomers;
}




  function getTxBadgeClass(type) {
    if (type === "credit") return "tx-credit";
    if (type === "withdraw") return "tx-withdraw";
    if (type === "adjust") return "tx-adjust";
    if (type.startsWith("reverse")) return "tx-reverse";
    return "tx-adjust";
  }

  let state = {
  staff: [],
  customers: [],
  approvals: [],
  audit: [],
  cod: [],
  codDrafts: {},
  accounts: { income: [], expense: [] },
  accountEntries: [],
  empowerments: [],
  ui: { current: null, dateFilter: "today" },

business: {
  approvedIncome: 0,
  approvedExpense: 0,
  empowermentExpense: 0,
  includeEmpowerment: false
},
};

window.state = state; // make global
state.empowerments = state.empowerments || [];

state.ui.entryDisplayLimit = state.ui.entryDisplayLimit || {};
// 🔒 LOCK ACCOUNTS STRUCTURE (RUNS ONCE AT BOOT)
state.accounts = state.accounts || { income: [], expense: [] };
state.accountEntries = state.accountEntries || [];
state.empowerments = state.empowerments || [];


  function load() {
  try {
   const raw = localStorage.getItem(
  (window && window.STORAGE_KEY) ||
  (typeof CONFIG !== "undefined" && CONFIG && CONFIG.STORAGE) ||
  "sc_pro_b_v2"
);
    if (!raw) return;

    const data = JSON.parse(raw);

    // NEVER replace state object — only mutate fields

    state.staff = Array.isArray(data.staff) ? data.staff : [];
    state.customers = Array.isArray(data.customers) ? data.customers : [];
    state.approvals = Array.isArray(data.approvals) ? data.approvals : [];
    state.audit = Array.isArray(data.audit) ? data.audit : [];
    state.cod = Array.isArray(data.cod) ? data.cod : [];
    state.codDrafts = data.codDrafts || {};
state.empowerments = Array.isArray(data.empowerments) ? data.empowerments : [];

// 🔥 RESTORE EMPOWERMENT TRANSACTIONS
state.transactions = Array.isArray(data.transactions) ? data.transactions : [];
state.staffAccounts = (data.staffAccounts && typeof data.staffAccounts === "object")
  ? data.staffAccounts
  : {};

state.accounts = state.accounts && typeof state.accounts === "object"
  ? state.accounts
  : { income: [], expense: [] };

    if (data.accounts) {
  state.accounts.income = Array.isArray(data.accounts.income)
    ? data.accounts.income
    : [];

  state.accounts.expense = Array.isArray(data.accounts.expense)
    ? data.accounts.expense
    : [];
}
    state.accounts.income = Array.isArray(state.accounts.income) ? state.accounts.income : [];
    state.accounts.expense = Array.isArray(state.accounts.expense) ? state.accounts.expense : [];

    state.accountEntries = Array.isArray(data.accountEntries) ? data.accountEntries : [];

    state.ui = data.ui || {};
    state.ui.dateFilter = state.ui.dateFilter || "today";

    // 🔁 Restore UI role-based visibility after loading
setTimeout(syncDashboardVisibility, 50);

  } catch (e) {
    console.warn("Load failed, using fresh state", e);
  }
}

  
async function toBase64Compressed(file, maxSize = 420, quality = 0.68) {
  // maxSize = max width/height; quality for JPEG
  const img = new Image();
  const url = URL.createObjectURL(file);

  await new Promise((res, rej) => {
    img.onload = () => res();
    img.onerror = rej;
    img.src = url;
  });

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  let nw = w, nh = h;
  if (w > h && w > maxSize) {
    nw = maxSize;
    nh = Math.round((h * maxSize) / w);
  } else if (h >= w && h > maxSize) {
    nh = maxSize;
    nw = Math.round((w * maxSize) / h);
  }

  const canvas = document.createElement("canvas");
  canvas.width = nw;
  canvas.height = nh;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, nw, nh);

  URL.revokeObjectURL(url);

  // JPEG compress
  return canvas.toDataURL("image/jpeg", quality);
}
window.toBase64Compressed = toBase64Compressed;



function dashboardIsOpen() {
  return state.ui && state.ui.dashboardMode === true;
}
  const dashboardState = {
  filter: null,              // "approvals" | "risk" | null
  selectedApprovalId: null,
  highlightCustomerId: null
};

  function save() {
  try {
    // ✅ Always resolve key safely (never ReferenceError)
    const key =
      (window && window.STORAGE_KEY) ||
      (typeof CONFIG !== "undefined" && CONFIG && CONFIG.STORAGE) ||
      "sc_pro_b_v2";

    // ✅ Ensure accounts container exists
    state.accounts = state.accounts || {};
    state.accounts.income = Array.isArray(state.accounts.income) ? state.accounts.income : [];
    state.accounts.expense = Array.isArray(state.accounts.expense) ? state.accounts.expense : [];

    const data = {
      staff: Array.isArray(state.staff) ? state.staff : [],
      customers: Array.isArray(state.customers) ? state.customers : [],
      approvals: Array.isArray(state.approvals) ? state.approvals : [],
      audit: Array.isArray(state.audit) ? state.audit : [],
      cod: Array.isArray(state.cod) ? state.cod : [],
      codDrafts: state.codDrafts || {},
      staffAccounts: state.staffAccounts || {},
      empowerments: Array.isArray(state.empowerments) ? state.empowerments : [],
      transactions: Array.isArray(state.transactions) ? state.transactions : [],

      accounts: {
        income: state.accounts.income,
        expense: state.accounts.expense,
      },

      accountEntries: Array.isArray(state.accountEntries) ? state.accountEntries : [],

      ui: state.ui || {},
      _v: 1,
      _savedAt: new Date().toISOString(),
    };

    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
  console.warn("Save failed", e?.name, e?.message, e);
  try { showToast("Save failed: storage may be full (photo too large)."); } catch {}
}
}
window.save = save;


  
  function seed() {
    state.staff = [
      { id: "t1", name: "Ada Teller", role: "teller" },
      { id: "m1", name: "Ben Marketer", role: "marketer" },
      { id: "v1", name: "Chi Vault", role: "vault" },
      { id: "mgr", name: "Dan Manager", role: "manager" },
      { id: "ceo", name: "Eno CEO", role: "ceo" },
    ];
    state.customers = [
      {
        id: "c1",
        name: "Udo Essien",
        phone: "0802000001",
        balance: 50000,
        frozen: false,
        empowerment: {
  outstanding: 0,
  history: []
},

        transactions: [
          {
            id: uid(),
            type: "credit",
            amount: 20000,
            date: "2025-02-01T09:22",
            desc: "Market contrib",
            actor: "m1",
          },
          {
            id: uid(),
            type: "withdraw",
            amount: 5000,
            date: "2025-02-03T11:40",
            desc: "Urgent",
            actor: "t1",
          },
        ],
      },
      {
        id: "c2",
        name: "Ngo Okon",
        phone: "0802000002",
        balance: 125000,
        frozen: false,
        empowerment: {
  outstanding: 0,
  history: []
},

        transactions: [
          {
            id: uid(),
            type: "credit",
            amount: 50000,
            date: "2025-02-02T10:01",
            desc: "Agent",
            actor: "m1",
          },
        ],
      },
      {
        id: "c3",
        name: "Imo Peters",
        phone: "0802000003",
        balance: 4800,
        frozen: false,
        empowerment: {
  outstanding: 0,
  history: []
},

        transactions: [
          {
            id: uid(),
            type: "credit",
            amount: 3000,
            date: "2025-02-04T13:11",
            desc: "POS",
            actor: "t1",
          },
        ],
      },
      {
        id: "c4",
        name: "Joseph Effiong",
        phone: "0802000004",
        balance: 70000,
        frozen: false,
        empowerment: {
  outstanding: 0,
  history: []
},

        transactions: [],
      },
      {
        id: "c5",
        name: "Mary Abraham",
        phone: "0802000005",
        balance: 90000,
        frozen: false,
        empowerment: {
  outstanding: 0,
  history: []
},

        transactions: [
          {
            id: uid(),
            type: "credit",
            amount: 30000,
            date: "2025-02-02T12:00",
            desc: "Agent",
            actor: "m1",
          },
        ],
      },
      {
        id: "c6",
        name: "Peter John",
        phone: "0802000006",
        balance: 15000,
        frozen: false,
        empowerment: {
  outstanding: 0,
  history: []
},

        transactions: [],
      },
      {
        id: "c7",
        name: "Grace N",
        phone: "0802000007",
        balance: 22000,
        frozen: false,
        empowerment: {
  outstanding: 0,
  history: []
},

        transactions: [],
      },
      {
        id: "c8",
        name: "Blessing O",
        phone: "0802000008",
        balance: 34000,
        frozen: false,
        empowerment: {
  outstanding: 0,
  history: []
},

        transactions: [],
      },
      {
        id: "c9",
        name: "Kunle A",
        phone: "0802000009",
        balance: 480000,
        frozen: false,
        empowerment: {
  outstanding: 0,
  history: []
},

        transactions: [
          {
            id: uid(),
            type: "credit",
            amount: 400000,
            date: "2025-02-01T09:22",
            desc: "Large collection",
            actor: "m1",
          },
        ],
      },
      {
        id: "c10",
        name: "Aisha S",
        phone: "0802000010",
        balance: 6000,
        frozen: false,
        empowerment: {
  outstanding: 0,
  history: []
},

        transactions: [],
      },
    ];
    state.approvals = [
      {
        id: uid("ap"),
        type: "withdraw",
        amount: 150000,
        customerId: "c9",
        requestedBy: "t1",
        requestedAt: new Date().toISOString(),
        status: "pending",
      },
    ];
    state.audit = [];
    state.cod = [];
    state.activeStaffId = state.staff[0].id;
    pushAudit("system", "system", "init", "seeded demo data");
    save();
  }

  // ============================
// DATE NORMALIZER (GLOBAL)
// ============================
function normDate(x) {
  if (!x) return "";
  const s = String(x);

  // ISO already: 2026-03-03 or 2026-03-03T...
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // dd/mm/yyyy
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  // Fallback: try Date parse
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);

  return "";
}
window.normDate = normDate;

function moneyNumber(v) {
  const s = String(v ?? "").replace(/,/g, "").trim();
  const n = Number(s || 0);
  return isNaN(n) ? 0 : n;
}


// =========================
// STAFF ACCOUNT (LIABILITY LEDGER)
// - debits = staff owes company (shortage)
// - credits = staff paid back
// =========================
function ensureStaffAccount(staffId) {
  state.staffAccounts = state.staffAccounts || {};

  if (!state.staffAccounts[staffId]) {
    const existingNums = Object.values(state.staffAccounts || {})
      .map(x => Number(x?.accountNumber || 0))
      .filter(n => n >= 4000);

    const nextNum = existingNums.length ? Math.max(...existingNums) + 1 : 4000;

    state.staffAccounts[staffId] = {
      staffId,
      accountNumber: nextNum,
      walletBalance: 0,
      balance: 0,
      entries: []
    };
  }

  // ✅ backfill missing fields for old accounts
  const acc = state.staffAccounts[staffId];

  if (!acc.accountNumber) {
    const usedNums = Object.values(state.staffAccounts || {})
      .map(x => Number(x?.accountNumber || 0))
      .filter(n => n >= 4000);

    acc.accountNumber = usedNums.length ? Math.max(...usedNums) + 1 : 4000;
  }

  if (typeof acc.walletBalance !== "number") acc.walletBalance = 0;
  if (!Array.isArray(acc.entries)) acc.entries = [];
  if (typeof acc.balance !== "number") acc.balance = 0;

  return acc;
}

window.ensureStaffAccount = ensureStaffAccount;



function getOpeningBalanceForStaffDate(staffId, dateStr) {
  const refOpen = `OPENFLOAT|${staffId}|${dateStr}`;
  const acc = ensureStaffAccount(staffId);
  const entry = (acc.entries || []).find(e => e.refId === refOpen && e.type === "opening_float");
  return entry ? Number(entry.amount || 0) : 0;
}
window.getOpeningBalanceForStaffDate = getOpeningBalanceForStaffDate;


function postStaffCharge(staffId, amount, note, codId) {

 const n = Number(amount || 0);
 if (!staffId) return false;
 if (isNaN(n) || n <= 0) return false;

 const acc = ensureStaffAccount(staffId);
 acc.entries = acc.entries || [];

 const exists = acc.entries.some(e => e.type === "cod_shortage" && e.codId === codId);
 if (exists) return true;

 const entry = {
   id: uid("staff"),
   staffId,
   type: "cod_shortage",
   amount: n,
   delta: -n,
   note: (note || "").trim(),
   codId: codId || null,
   date: new Date().toISOString(),
   createdBy: currentStaff?.()?.name || "system"
 };

 acc.entries.unshift(entry);

 // shortage increases debt
 acc.balance = Number(acc.balance || 0) - n;

 pushAudit?.(
   currentStaff?.()?.name || "system",
   currentStaff?.()?.role || "system",
   "staff_charged_for_shortage",
   JSON.stringify({ staffId, amount: n, codId, note: entry.note })
 );

 save?.();

 return true;
}

window.postStaffCharge = postStaffCharge;


function postStaffPayment(staffId, amount, note) {

 const n = Number(amount || 0);
 if (!staffId) return false;
 if (isNaN(n) || n <= 0) return false;

 const acc = ensureStaffAccount(staffId);
 acc.entries = acc.entries || [];

 const amt = Math.abs(n);

 acc.walletBalance = Number(acc.walletBalance || 0) + amt;

 const entry = {
   id: uid("staff"),
   staffId,
   type: "staff_deposit",
   amount: amt,
   delta: 0,
   note: (note || "").trim(),
   date: new Date().toISOString(),
   createdBy: currentStaff?.()?.name || "system"
 };

 acc.entries.unshift(entry);

 pushAudit?.(
   currentStaff?.()?.name || "system",
   currentStaff?.()?.role || "system",
   "staff_wallet_deposit",
   JSON.stringify({ staffId, amount: amt, note: entry.note })
 );

 save?.();

 return true;
}

window.postStaffPayment = postStaffPayment;


 function openCODResolutionModal(codId) {
 console.log("STEP 3: openCODResolutionModal ENTERED", codId);

 if (!isManager()) {
   showToast("Only managers can resolve COD");
   return;
 }

 // 🔑 FETCH REAL RECORD FROM STATE
 const cod = state.cod.find(c => c.id === codId);
 if (!cod) {
   showToast("COD record not found");
   console.error("COD not found in state:", codId, state.cod);
   return;
 }

 const back = document.getElementById("txModalBack");
const modal = document.getElementById("txModal");
const body = document.getElementById("txBody");
const title = document.getElementById("txTitle");

console.log("MODAL BACK FOUND?", back);

 title.textContent = "Resolve Close of Day Variance";

 body.innerHTML = `
   <div class="small">
     <b>Staff:</b> ${cod.staffName}<br/>
     <b>Date:</b> ${cod.date}
   </div>

   <div class="card" style="margin-top:10px">
     <div class="small">System Expected: ${fmt(cod.systemExpected)}</div>
     <div class="small">Staff Declared: ${fmt(cod.staffDeclared)}</div>
     <div class="small danger">Variance: ${fmt(cod.variance)}</div>
   </div>

   <input
     id="resolvedAmount"
     class="input"
     style="margin-top:10px"
     value="${cod.systemExpected}"
     placeholder="Final accepted cash amount"
   />

   <textarea
     id="resolutionNote"
     class="input"
     placeholder="Resolution note (required)"
     style="margin-top:8px"
   ></textarea>
 `;

 modal.querySelectorAll(".tx-ok").forEach(b => b.remove());

 const btn = document.createElement("button");
 btn.className = "btn success tx-ok";
 btn.textContent = "Resolve COD";

 btn.onclick = () => {
   const resolvedAmount = Number(
     document.getElementById("resolvedAmount").value
   );
   const note = document.getElementById("resolutionNote").value.trim();

   if (!note) {
     showToast("Resolution note is required");
     return;
   }

   // 🔑 UPDATE REAL RECORD
   cod.resolvedAmount = resolvedAmount;
   cod.resolutionNote = note;
   cod.resolvedBy = currentStaff().name;
   cod.resolvedAt = new Date().toISOString();
   cod.status = "resolved";
   cod.variance = resolvedAmount - cod.systemExpected;

   // ✅ If final variance is SHORTAGE, manager can charge staff account
if (cod.variance < 0) {
 const shortage = Math.abs(cod.variance);

 // ✅ prevent double charge at COD-level too
 if (!cod.staffCharged) {
   const ok = postStaffCharge(
     cod.staffId,
     shortage,
     `COD shortage on ${cod.date}: ${note}`,
     cod.id
   );
   if (ok) cod.staffCharged = true;
 }
} else {
 cod.staffCharged = false; // optional, keeps record clean
}

   save();

   renderCODForDate(window.activeCODDate);
   renderManagerCODSummary(window.activeCODDate);

   document.getElementById("txModalBack").style.display = "none";
showToast("COD resolved");
 };

 modal.querySelector(".modal-actions").appendChild(btn);

// 🔑 SHOW MODAL (THIS WAS MISSING)
back.style.display = "flex";
}
window.openCODResolutionModal = openCODResolutionModal;






function postStaffDebtRepayment(staffId, amount) {

const acc = ensureStaffAccount(staffId);

amount = Math.abs(Number(amount || 0));

if (!amount) return showToast("Invalid amount");

const debtNow = Math.abs(Number(acc.balance || 0));

// ✅ cap repayment so debt never goes positive
amount = Math.min(amount, debtNow);

if (!amount) return showToast("No debt to repay");

if (Number(acc.walletBalance || 0) < amount)
  return showToast("Insufficient wallet balance");

acc.walletBalance -= amount;

// debt is negative, so adding repayment moves it toward zero
acc.balance += amount;

acc.entries.unshift({
  id: uid("sf"),
  staffId,
  type: "debt_repayment",
  amount,
  delta: amount,
  date: new Date().toISOString(),
  refId: uid("repay"),
  note: "Debt repayment"
});


// business receives repayment
state.accounts = state.accounts || {};
state.accounts.income = state.accounts.income || [];

state.transactions = state.transactions || [];

state.transactions.push({
  id: uid("tx"),
  type: "credit",
  amount,
  date: new Date().toISOString(),
  desc: "Staff debt repayment",
  customerId: null,
  actor: currentStaff()?.name || "system",
  actorId: staffId,
  approvalId: null,
  metaType: "staff_debt_payment"
});


save?.();
}

window.postStaffDebtRepayment = postStaffDebtRepayment;



  async function pushAudit(actor, role, action, details) {
  const staff = currentStaff();
  const time = new Date().toISOString();
      const prev = state.audit.length
  ? state.audit[state.audit.length - 1].hash
  : "";
    const payload = JSON.stringify({
  time,
  actor,
  actorId: staff?.id || actor || null,
  role,
  action,
  details,
  prev,
});

    const h = await sha(payload);
    const entry = {
  id: uid("a"),
  time,
  actor,
  actorId: staff?.id || null,
  role,
  action,
  details,
  prev,
  hash: h,
};

    state.audit.push(entry);
    save();
    renderAudit();
    return entry;
  }

  async function verifyAudit() {
    const issues = [];
    for (let i = 0; i < state.audit.length; i++) {
      const e = state.audit[i];
      const expected = await sha(
        JSON.stringify({
          time: e.time,
          actor: e.actor,
          role: e.role,
          action: e.action,
          details: e.details,
          prev: e.prev,
        })
      );
      if (expected !== e.hash) issues.push({ i, problem: "hash_mismatch" });
      if (i > 0 && e.prev !== state.audit[i - 1].hash)
        issues.push({ i, problem: "prev_mismatch" });
    }
    return issues;
  }

  function setDateFilter(filter) {
  state.ui.dateFilter = filter;

  // IMPORTANT: reset custom range when using preset filters
  state.ui.fromDate = null;
  state.ui.toDate = null;

  renderAccounts();
}

window.setDateFilter = setDateFilter;


  function nextAccountNumber(type) {
  const base = type === "income" ? 2000 : 3000;
  const list = state.accounts[type] || [];
  const num = base + list.length;
  return `${type === "income" ? "INC" : "EXP"}-${num}`;
}

function getEntriesByAccount(accountId) {
  return (state.accountEntries || []).filter(e => e.accountId === accountId);
}

function entryMatchesFilter(dateStr) {
   const filter = state.ui.dateFilter || "today";
  const d = new Date(dateStr);   // ← FIXED (no manual T00)
  const now = new Date();

  // CUSTOM RANGE OVERRIDE
  if (state.ui.fromDate || state.ui.toDate) {
    const from = state.ui.fromDate ? new Date(state.ui.fromDate) : null;
    const to   = state.ui.toDate   ? new Date(state.ui.toDate)   : null;

    if (from && d < from) return false;
    if (to && d > new Date(to.setHours(23,59,59,999))) return false;
    return true;
  }

  if (filter === "today") {
    return d.toDateString() === now.toDateString();
  }

  if (filter === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0,0,0,0);
    return d >= start;
  }

  if (filter === "month") {
    return d.getMonth() === now.getMonth() &&
           d.getFullYear() === now.getFullYear();
  }

  if (filter === "year") {
    return d.getFullYear() === now.getFullYear();
  }

  return true;
}


function sumEntries(entries) {
  return entries.reduce((t, e) => t + Number(e.amount || 0), 0);
}

function sumByType(type) {
  return sumEntries(
    state.accountEntries.filter(e =>
      e.type === type && entryMatchesFilter(e.date)
    )
  );
}

function renderMiniBars(accountId) {
  const entries = (state.accountEntries || [])
    .filter(e => e.accountId === accountId)
    .filter(e => entryMatchesFilter(e.date));

  let income = 0;
  let expense = 0;

  entries.forEach(e => {
    const amt = Number(e.amount || 0);
    if (e.type === "income" || amt > 0) income += Math.abs(amt);
    else expense += Math.abs(amt);
  });

  const max = Math.max(income, expense, 1); // prevent divide by zero

  const incomeWidth = (income / max) * 100;
  const expenseWidth = (expense / max) * 100;

  return `
    <div style="margin:6px 0 10px 0;">
      <div style="height:6px; background:#e0e0e0; border-radius:4px; overflow:hidden; display:flex;">
        <div style="width:${incomeWidth}%; background:#2e7d32;"></div>
        <div style="width:${expenseWidth}%; background:#c62828;"></div>
      </div>
      <div style="font-size:11px; color:#666; margin-top:2px; display:flex; justify-content:space-between;">
        <span>Income: ${fmt(income)}</span>
        <span>Expense: ${fmt(expense)}</span>
      </div>
    </div>
  `;
}

function sumByAccounts(accountIds) {
  return (state.accountEntries || [])
    .filter(e => accountIds.includes(e.accountId))
    .filter(e => entryMatchesFilter(e.date)) // 👈 ADD THIS
    .reduce((t, e) => t + Number(e.amount || 0), 0);
}


  function can(role, action) {
    const map = {
      teller: ["credit", "withdraw", "create_account", "cod"],
      marketer: ["credit", "create_account", "cod"],
      vault: ["vault_in", "vault_out", "cod", "adjust"],
      manager: ["approve", "view_all", "adjust", "reverse", "delete_tx"],
      ceo: [
        "approve",
        "view_all",
        "adjust",
        "reverse",
        "delete_tx",
        "delete_customer",
      ],
    };
    return map[role] && map[role].includes(action);
  }

  function renderStaff() {
  const sel = $("#staffSelect");
  sel.innerHTML = "";

  state.staff.forEach((s) => {
    const o = document.createElement("option");
    o.value = s.id;
    o.textContent = `${s.name} — ${s.role}`;
    sel.appendChild(o);
  });

  // 🔑 bind selection
  sel.onchange = () => {
    state.activeStaffId = sel.value;
    save();
  };

  // 🔑 default staff (first load)
  if (!state.activeStaffId && state.staff.length > 0) {
    state.activeStaffId = state.staff[0].id;
    sel.value = state.activeStaffId;
    save();
  }
  syncDashboardVisibility(); // ✅ REQUIRED
}


  function syncDashboardVisibility() {
  const btnDash = document.getElementById("btnDashboard");
  const dash = document.getElementById("dashboardView");
  const app = document.getElementById("app");

  // ✅ ADD: My COD button visibility
  const btnMyCOD = document.getElementById("btnMyCOD");

  const staff = currentStaff?.();
  const role = (staff?.role || "").toLowerCase();

  // 🔒 decide who sees "My Close of Day"
  // (edit this rule if you want marketers to see it too)
  const canSeeMyCOD = !!staff && role !== "marketer";

  if (btnMyCOD) btnMyCOD.style.display = canSeeMyCOD ? "inline-block" : "none";

  if (!btnDash) return;

  const allowed = (typeof canViewDashboard === "function") ? canViewDashboard() : false;
  btnDash.style.display = allowed ? "inline-block" : "none";

  if (!allowed && dash && app) {
    dash.style.display = "none";
    app.style.display = "grid";
    state.ui = state.ui || {};
    state.ui.dashboardMode = false;
    save?.();
  }
}
window.syncDashboardVisibility = syncDashboardVisibility;


async function confirmApproval(a, action) {
  if (a.type === "customer_creation") {
    const mapped = action === "approved" ? "approve" : "reject";
    await processApproval(a.id, mapped);
    return;
  }

  // ✅ KEEP ALL YOUR OLD confirmApproval LOGIC HERE (for credit/withdraw/empowerment/etc)
  // ... (your existing code continues)
}

function computeTodayStaffTotals(staffId) {
  const _today = new Date().toISOString().slice(0, 10);

  let receipts = 0;
  let payments = 0;
  let empowerment = 0;

  for (const c of state.customers) {
    for (const t of c.transactions || []) {
      const tDate = (t.date || "").slice(0, 10);
      if (t.actor !== staffId) continue;
      if (tDate !== _today) continue;

      if (t.type === "credit" || t.type === "adjust") {
        receipts += Number(t.amount || 0);
      }

      if (t.type === "withdraw") {
        payments += Number(t.amount || 0);
      }

      if (t.type === "empowerment") {
        empowerment += Number(t.amount || 0);
      }
    }
  }

  return {
    receipts,
    payments,
    empowerment, // visual only
  };
}

function createAccount(type, name) {
  const staff = currentStaff();
  if (!staff || !["manager", "ceo"].includes(staff.role)) {
    showToast("Not authorized");
    return;
  }

  if (!name || !name.trim()) {
    showToast("Account name required");
    return;
  }

  const acc = {
    id: uid("acc"),
    category: type, // "income" | "expense"
    name: name.trim(),
    accountNumber: nextAccountNumber(type),
    createdBy: staff.name,
    createdAt: new Date().toISOString(),
    archived: false
  };

  state.accounts[type].push(acc);
  save();
  renderAccounts();

  showToast(`${type.toUpperCase()} account created`);
}

function createAccountEntry(accountId, type, amount, note, date) {
  const staff = currentStaff?.();
  if (!staff) {
    showToast("Select staff");
    return false;
  }

  const n = Number(amount || 0);
  if (isNaN(n) || n === 0) {
    showToast("Invalid amount");
    return false;
  }

  const now = new Date().toISOString();

  // Resolve account meta (for approvals UI readability)
  const acc =
    [...(state.accounts?.income || []), ...(state.accounts?.expense || [])]
      .find(a => a.id === accountId);

  const accountName = acc?.name || "Unknown Account";
  const accountNumber = acc?.accountNumber || "";
  const accountType = type; // 'income' | 'expense'

  // ✅ Managers/CEO: post immediately (same as before)
  if (["manager", "ceo"].includes(staff.role)) {
    state.accountEntries = state.accountEntries || [];
    state.accountEntries.unshift({
      id: uid("op"),
      accountId,
      type,
      amount: Math.abs(n), // ✅ store positive always
      note: (note || "").trim(),
      date: date || now,
      createdBy: staff.name,
      createdById: staff.id,
      createdAt: now
    });

    return true;
  }

  // ✅ Others: send request for approval
  state.approvals = state.approvals || [];
  state.approvals.unshift({
    id: uid("ap"),
    type: "account_entry",
    status: "pending",

    requestedAt: now,
    requestedBy: staff.id,
    requestedByName: staff.name,

    createdAt: now,
    createdBy: staff.id,
    createdByName: staff.name,

    amount: Math.abs(n),

    // For nicer approval display
    accountId,
    accountType,
    accountName,
    accountNumber,

    payload: {
      accountId,
      type: accountType,
      amount: Math.abs(n),
      note: (note || "").trim(),
      date: date || now,
      accountName,
      accountNumber
    }
  });

  save?.();
  renderApprovals?.();

  showToast("Request sent for approval");
  return true; // ✅ allows modal to close normally
}
window.createAccountEntry = createAccountEntry;

  
function closeModal() {
  const modal = document.getElementById("accountEntryModal");
  if (modal) modal.style.display = "none";

  // Clear inputs
  const amt = document.getElementById("entryAmount");
  const note = document.getElementById("entryNote");
  if (amt) amt.value = "";
  if (note) note.value = "";
}

window.closeModal = closeModal;

function canPostOperationalDirect() {
  const s = currentStaff?.();
  return !!(s && ["manager", "ceo"].includes(s.role));
}

function openAccountEntryModal(accountId, type) {
  const acc = state.accounts?.[type]?.find(a => a.id === accountId);
  if (!acc) return;

  const staff = currentStaff?.();
  if (!staff) return showToast("Select staff");

  const direct = canPostOperationalDirect();

  const box = document.createElement("div");
  box.innerHTML = `
    <div class="small"><b>${acc.accountNumber} — ${acc.name}</b></div>

    <div style="margin-top:10px">
      <input id="entryAmount" class="input" type="number" placeholder="Amount">
    </div>

    <div style="margin-top:6px">
      <input id="entryNote" class="input" placeholder="Note (optional)">
    </div>

    <div style="margin-top:10px">
      <button
        class="btn solid"
        style="background:#0f766e;color:white;opacity:1;font-weight:700"
        id="opEntrySubmitBtn">
        ${direct ? "Post" : "Send Request"}
      </button>
    </div>
  `;

  openModalGeneric(direct ? "Add Account Entry" : "Request Account Entry", box, null, true)
    .then(() => {
      if (typeof openOperationalDrilldown === "function") openOperationalDrilldown();
    });

  const btn = box.querySelector("#opEntrySubmitBtn");
  if (btn) {
    btn.onclick = () => {
      const amount = Number(box.querySelector("#entryAmount")?.value || 0);
      const note = (box.querySelector("#entryNote")?.value || "").trim();
      if (!amount || amount <= 0) return showToast("Enter a valid amount");

      if (direct) {
        // manager/ceo posts directly
        saveAccountEntry(accountId, type);
        return;
      }

      // staff sends request (no direct posting)
      requestAccountEntryApproval(accountId, type, amount, note);
    };
  }
}
window.openAccountEntryModal = openAccountEntryModal;

function saveAccountEntry(accountId, type) {
  const amount = Number(document.getElementById("entryAmount").value || 0);
  if (amount <= 0) return showToast("Enter a valid amount");

  const note = document.getElementById("entryNote").value || "";
  const date = new Date().toISOString();

  // ✅ store positive always
  const ok = createAccountEntry(accountId, type, Math.abs(amount), note, date);
  if (!ok) return;

  const acc = [...state.accounts.income, ...state.accounts.expense]
    .find(a => a.id === accountId);

  if (acc && acc.name && acc.name.toLowerCase().includes("empowerment")) {
    state.empowerments = state.empowerments || [];

    if (type === "expense") {
      state.empowerments.push({
        id: crypto.randomUUID(),
        amount: Math.abs(amount),
        type: "given",
        date
      });
    }

    if (type === "income") {
      state.empowerments.push({
        id: crypto.randomUUID(),
        amount: Math.abs(amount),
        type: "returned",
        date
      });
    }
  }

  save();

const back = document.getElementById("txModalBack");
if (back) back.style.display = "none";

// ✅ ALWAYS return to operational drilldown (no conditional)
if (typeof openOperationalDrilldown === "function") openOperationalDrilldown();
  else {
    renderOperationalTransactions();
    renderOperationalAccountLists();
    refreshOperationalHeader?.();
  }
}
window.saveAccountEntry = saveAccountEntry;



function promptCreateAccount(type) {
  const name = prompt(`Enter ${type.toUpperCase()} account name`);
  if (name !== null) {
    createAccount(type, name);
    save();

    renderOperationalAccountLists(); // refresh inside modal
  }
}
window.promptCreateAccount = promptCreateAccount;


function getCODDraft(staffId, date) {
  if (!state.codDrafts) state.codDrafts = {};
  return state.codDrafts[`${staffId}|${date}`] || null;
}

function openDeclareFloatModal(dateOverride = null) {
  const staff = currentStaff?.();
  if (!staff) return showToast("Select staff");

  const selectedDate = dateOverride || new Date().toISOString().slice(0, 10);
  const refOpen = `OPENFLOAT|${staff.id}|${selectedDate}`;

  const staffAcc = ensureStaffAccount(staff.id);
  const balNow = Number(staffAcc.balance || 0);
  staffAcc.entries = staffAcc.entries || [];

  // already declared today?
  // already declared today? (ONLY opening_float counts)
const existing = (staffAcc.entries || []).find(e =>
  e.refId === refOpen && e.type === "opening_float"
);
  if (existing) {
    showToast("Opening Float already declared for today");
    return;
  }

  const box = document.createElement("div");
  box.innerHTML = `
    <div class="small"><b>Staff:</b> ${staff.name}</div>
    <div class="small muted" style="margin-top:6px">
      Declare your opening float for <b>${selectedDate}</b>.
    </div>
    
    <div class="small" style="margin-top:6px">
  <b>Current Balance:</b> <span id="staffBalNow">${fmt(balNow)}</span>
</div>

    <input id="floatAmt" class="input" type="number"
      placeholder="Enter Opening Float"
      style="margin-top:10px" />

    <div id="floatErr" class="small danger" style="margin-top:8px;display:none"></div>
  `;

  openModalGeneric("Declare Opening Float", box, "Declare", true, () => {
    const n = Number(box.querySelector("#floatAmt")?.value || 0);
    const err = box.querySelector("#floatErr");
    if (!n || n <= 0) {
      if (err) {
        err.textContent = "Enter a valid opening float amount";
        err.style.display = "block";
      }
      return false;
    }
    return true;
  }).then((ok) => {
    if (!ok) return;

    const openingFloat = Math.abs(Number(box.querySelector("#floatAmt").value || 0));
    const now = new Date().toISOString();

    // ✅ Post opening float ONCE per day (LEDGER ONLY)
// ✅ Opening float is NOT debt. Do not change staffAcc.balance.
staffAcc.entries.unshift({
  id: uid("sf"),
  staffId: staff.id,
  type: "opening_float",
  amount: openingFloat,
  delta: 0, // ✅ does NOT affect debt
  date: selectedDate + "T00:00:00.000Z",
  refId: refOpen,
  note: `Opening Float for ${selectedDate}`
});

// ✅ keep balance clean by recomputing from ledger (excluding opening_float)
staffAcc.balance = (staffAcc.entries || []).reduce((sum, e) => {
  const t = String(e.type || "").toLowerCase();
  if (t === "opening_float" || t === "opening") return sum;
  if (t === "credit_out" || t === "credit") return sum - Math.abs(Number(e.amount || 0));
  if (t === "repay" || t === "payin" || t === "credit_in") return sum + Math.abs(Number(e.amount || 0));
  return sum + Number(e.delta || 0);
}, 0);


    save?.();

    // close modal
    const back = document.getElementById("txModalBack");
    if (back) back.style.display = "none";

    showToast("Opening Float declared");
    if (typeof openMyStaffAccount === "function") openMyStaffAccount();
  });
}

window.openDeclareFloatModal = openDeclareFloatModal;


function openMyStaffAccount() {
 const staff = currentStaff?.();
 if (!staff) return showToast("Select staff");

 const acc = ensureStaffAccount(staff.id);
 acc.entries = acc.entries || [];

 // ✅ recompute debt safely (debt can NEVER be positive)
const recomputed = (acc.entries || []).reduce((sum, e) => {
  const t = String(e.type || "").toLowerCase();

  // informational only
  if (t === "opening_float" || t === "opening" || t === "float_used" || t === "staff_deposit") {
    return sum;
  }

  // debt creators
  if (t === "credit_out" || t === "credit" || t === "cod_shortage") {
    return sum - Math.abs(Number(e.amount || 0));
  }

  // debt reducers
  if (t === "repay" || t === "payin" || t === "credit_in" || t === "debt_repayment") {
    return sum + Math.abs(Number(e.amount || 0));
  }

  return sum;
}, 0);

// debt must stay <= 0
acc.balance = Math.min(0, Number(recomputed || 0));

// ✅ Today summary
const today = new Date().toISOString().slice(0,10);

const todaysFloat = (acc.entries || [])
 .filter(e =>
   String(e.type || "").toLowerCase() === "opening_float" &&
   normDate(e.date) === today
 )
 .reduce((s, e) => s + Math.abs(Number(e.amount || 0)), 0);

const todaysUsed = (acc.entries || [])
 .filter(e =>
   String(e.type || "").toLowerCase() === "float_used" &&
   normDate(e.date) === today
 )
 .reduce((s, e) => s + Math.abs(Number(e.amount || 0)), 0);

const todaysRemaining = Math.max(0, todaysFloat - todaysUsed);

// 🧾 Build modal
const box = document.createElement("div");

box.innerHTML = `
<div class="small"><b>${staff.name}</b> — Staff Account</div>

<div class="card" style="margin-top:10px">

  <div class="small"><b>Account Number:</b> ${acc.accountNumber || "-"}</div>

  <div class="small"><b>Wallet Balance:</b> ${fmt(Number(acc.walletBalance || 0))}</div>

  <div class="small"><b>Debt Balance:</b> ${fmt(Number(acc.balance || 0))}</div>

  <div class="small muted" style="margin-top:6px">
    <b>Today's Opening Float:</b> ${fmt(Number(todaysFloat || 0))}
  </div>

  <div class="small muted" style="margin-top:4px">
    <b>Float Used Today:</b> ${fmt(Number(todaysUsed || 0))}
  </div>

  <div class="small muted" style="margin-top:4px">
    <b>Remaining Float Today:</b> ${fmt(Number(todaysRemaining || 0))}
  </div>

</div>

<div style="margin-top:10px;display:flex;gap:6px">
  <button class="btn primary" id="staffDepositBtn" style="color:#fff;font-weight:600">Deposit</button>
  <button class="btn danger" id="staffRepayBtn">Pay Debt</button>
</div>

<div style="margin-top:10px;max-height:280px;overflow:auto">

  ${(acc.entries || []).slice(0,50).map(e => `
    <div style="padding:8px;border-bottom:1px solid #eee">

      <div class="small">
        <b>${String(e.type || "").toUpperCase()}</b> — ${fmt(Number(e.amount || 0))}
      </div>

      <div class="small muted">
        ${new Date(e.date || Date.now()).toLocaleString()}
      </div>

      ${e.note ? `<div class="small muted">${e.note}</div>` : ""}

    </div>
  `).join("") || `<div class="small muted">No entries yet</div>`}

</div>
`;

// open modal
openModalGeneric("My Staff Account", box);

// 🔘 wire buttons
setTimeout(() => {
  const depBtn = box.querySelector("#staffDepositBtn");
  const repayBtn = box.querySelector("#staffRepayBtn");

  if (depBtn) depBtn.onclick = async () => {

  const depBox = document.createElement("div");
  depBox.innerHTML = `
    <div class="small"><b>System</b></div>
    <div class="small muted" style="margin-top:6px">Enter deposit amount</div>
    <input id="staffDepositAmt" class="input" type="number" placeholder="Enter amount" style="margin-top:10px" />
    <div id="staffDepositErr" class="small danger" style="margin-top:8px;display:none"></div>
  `;

  const okInput = await openModalGeneric("System", depBox, "Continue", true, () => {
    const amt = Number(depBox.querySelector("#staffDepositAmt")?.value || 0);
    const err = depBox.querySelector("#staffDepositErr");

    if (!amt || amt <= 0) {
      if (err) {
        err.textContent = "Enter a valid deposit amount";
        err.style.display = "block";
      }
      return false;
    }

    return true;
  });

  if (!okInput) return;

  const amt = Number(depBox.querySelector("#staffDepositAmt")?.value || 0);

  const okConfirm = await openModalGeneric(
    "Confirm Deposit Request",
    `
    <div class="small">
      Send deposit request for <b>${fmt(amt)}</b> to your staff wallet?
    </div>
    `,
    "Send for Approval",
    true
  );

  if (!okConfirm) return;

  state.approvals = state.approvals || [];

  state.approvals.unshift({
    id: uid("app"),
    type: "staff_wallet_deposit",
    amount: amt,
    staffId: staff.id,
    staffName: staff.name,
    status: "pending",
    requestedAt: new Date().toISOString(),
    requestedBy: staff.id
  });

  pushAudit?.(
    staff.name,
    staff.role,
    "staff_wallet_deposit_requested",
    { staffId: staff.id, amount: amt }
  );

  save?.();
  showToast("Deposit request sent for approval");

  // reopen staff account after modal closes
  setTimeout(() => openMyStaffAccount(), 50);
};

if (repayBtn) repayBtn.onclick = async () => {

  const repayBox = document.createElement("div");

  const accNow = ensureStaffAccount(staff.id);
  const currentDebt = Math.abs(Number(accNow.balance || 0));
  const currentWallet = Number(accNow.walletBalance || 0);

  repayBox.innerHTML = `
    <div class="small"><b>System</b></div>
    <div class="small muted" style="margin-top:6px">Enter repayment amount</div>

    <div class="small" style="margin-top:8px">
      <b>Current Debt:</b> ${fmt(currentDebt)}
    </div>

    <div class="small" style="margin-top:4px">
      <b>Wallet Balance:</b> ${fmt(currentWallet)}
    </div>

    <input id="staffRepayAmt" class="input" type="number" placeholder="Enter amount" style="margin-top:10px" />
    <div id="staffRepayErr" class="small danger" style="margin-top:8px;display:none"></div>
  `;

  const okInput = await openModalGeneric("System", repayBox, "Continue", true, () => {
    const amt = Number(repayBox.querySelector("#staffRepayAmt")?.value || 0);
    const err = repayBox.querySelector("#staffRepayErr");

    if (!amt || amt <= 0) {
      if (err) {
        err.textContent = "Enter a valid repayment amount";
        err.style.display = "block";
      }
      return false;
    }

    const accNow = ensureStaffAccount(staff.id);

    if (Number(accNow.walletBalance || 0) < amt) {
      if (err) {
        err.textContent = "Insufficient wallet balance";
        err.style.display = "block";
      }
      return false;
    }

    const debtNow = Math.abs(Number(accNow.balance || 0));

    if (amt > debtNow) {
      if (err) {
        err.textContent = "Repayment cannot exceed current debt";
        err.style.display = "block";
      }
      return false;
    }

    return true;
  });

  if (!okInput) return;

  const amt = Number(repayBox.querySelector("#staffRepayAmt")?.value || 0);

  const okConfirm = await openModalGeneric(
    "Confirm Debt Repayment",
    `
    <div class="small">
      Send debt repayment request for <b>${fmt(amt)}</b>?
    </div>
    `,
    "Send for Approval",
    true
  );

  if (!okConfirm) return;

  state.approvals = state.approvals || [];

  state.approvals.unshift({
    id: uid("app"),
    type: "staff_debt_repayment",
    amount: amt,
    staffId: staff.id,
    staffName: staff.name,
    status: "pending",
    requestedAt: new Date().toISOString(),
    requestedBy: staff.id
  });

  pushAudit?.(
    staff.name,
    staff.role,
    "staff_debt_repayment_requested",
    { staffId: staff.id, amount: amt }
  );

  save?.();
 showToast("Debt repayment request sent for approval");

 // reopen staff account after modal closes
 setTimeout(() => openMyStaffAccount(), 50);
};

}, 50);

}

window.openMyStaffAccount = openMyStaffAccount;

window.openMyStaffAccount = openMyStaffAccount;


function openMyCOD() {
  const staff = currentStaff();
  if (!staff) return;

  let selectedDate = normDate(new Date());

  function getRecords(date) {
    const key = normDate(date);
    return (state.cod || [])
      .filter(c =>
        String(c.staffId) === String(staff.id) &&
        (!key || normDate(c.date) === key)
      )
      .sort((a, b) => normDate(b.date).localeCompare(normDate(a.date)));
  }

  const box = document.createElement("div");

  const header = document.createElement("div");
  header.innerHTML = `
    <div class="small" style="margin-bottom:8px">
      View Close of Day for:
      <input type="date" id="myCODDate" class="input" value="${selectedDate}">
    </div>
  `;
  box.appendChild(header);

  const list = document.createElement("div");
  box.appendChild(list);

  function renderList(date) {
    const records = getRecords(date);

    if (!records.length) {
      list.innerHTML = `<div class="small muted">No records for this date</div>`;
      return;
    }

    list.innerHTML = records.map(rec => {
      const expected = Number(rec.systemExpected || 0);

      const usedDeclared = (rec.status === "resolved" && rec.resolvedAmount != null)
        ? Number(rec.resolvedAmount || 0)
        : Number(rec.staffDeclared || 0);

      const variance = Number(usedDeclared - expected);

      const statusLabel =
        variance === 0
          ? `<span style="color:green">Balanced ✔</span>`
          : (rec.status === "resolved")
            ? `<span style="color:#1976d2">Resolved ✔</span>`
            : `<span style="color:red">Flagged ⚠</span>`;

      return `
        <div class="card" style="margin-bottom:10px">
          <div class="small"><b>Date:</b> ${normDate(rec.date)}</div>

          <div class="small" style="margin-top:6px">
            <div>${statusLabel}</div>
            <b>System Expected:</b> ${fmt(expected)}<br/>
            <b>Declared:</b> ${fmt(usedDeclared)}<br/>
            <b>Variance:</b>
            <span style="color:${variance === 0 ? "green" : "red"}">
              ${fmt(variance)}
            </span>
          </div>

          ${
            rec.staffNote
              ? `<div class="small muted" style="margin-top:6px">📝 Staff note: ${rec.staffNote}</div>`
              : ""
          }

          ${
            rec.status === "resolved"
              ? `
                <div class="small success" style="margin-top:6px">
                  <b>Resolved Amount:</b> ${fmt(rec.resolvedAmount)}
                </div>
                <div class="small muted">
                  🧾 Resolution Note: ${rec.resolutionNote || "—"}
                </div>
              `
              : (rec.managerNote
                  ? `<div class="small warning" style="margin-top:6px">⚠ Manager Note: ${rec.managerNote}</div>`
                  : ""
                )
          }
        </div>
      `;
    }).join("");
  }

  renderList(selectedDate);

  header.querySelector("#myCODDate").onchange = (e) => {
    selectedDate = normDate(e.target.value);
    renderList(selectedDate);
  };

  openModalGeneric("My Close of Day", box, "Close");
}
window.openMyCOD = openMyCOD;




async function openCloseDayModal() {
  const staff = currentStaff();
  if (!staff) return showToast("Select staff");
  

  const today = new Date().toISOString().slice(0, 10);
  let selectedDate = today;
  if (!state.codDrafts) state.codDrafts = {};

const resumeDraftKey = `${staff.id}|${today}`;
const resumeDraft = state.codDrafts[resumeDraftKey] || null;

    const back = document.getElementById("txModalBack");
  if (!back) return;

  const box = document.createElement("div");
// ===== ALWAYS RENDER PHASE A UI =====
  box.innerHTML = `
    <div class="small"><b>Staff:</b> ${staff.name}</div>

    <div style="margin-top:6px">
      <label class="small">Close of Day for:</label>
      <input
        type="date"
        id="codDate"
        class="input"
        value="${today}"
        max="${today}"
      />
    </div>

    <div class="card" style="margin-top:10px">
  <div class="small"><b>Opening Balance (Declared):</b> <span id="codOpenFloatValue">${fmt(0)}</span></div>
  <div class="small muted" style="margin-top:6px" id="codOpenFloatHint"></div>
</div>

    <div id="codError" class="small danger" style="margin-top:8px;display:none"></div>
  `;
  function getDeclaredOpeningFloat(dateStr) {
  const refOpen = `OPENFLOAT|${staff.id}|${dateStr}`; // ✅ must be OPENFLOAT (no typo)
  const acc = ensureStaffAccount(staff.id);
  const entry = (acc.entries || []).find(e => e.refId === refOpen && e.type === "opening_float");
  return entry ? Number(entry.amount || 0) : 0;
}

function renderOpeningFloatReadOnly(dateStr) {
  const v = getDeclaredOpeningFloat(dateStr);
  const valEl = box.querySelector("#codOpenFloatValue");
  const hintEl = box.querySelector("#codOpenFloatHint");
  if (valEl) valEl.textContent = fmt(v);

  if (hintEl) {
    if (v > 0) {
      hintEl.textContent = "✔ Opening Balance found for this date.";
      hintEl.style.color = "green";
    } else {
      hintEl.textContent = "No Opening Balance declared for this date.";
      hintEl.style.color = "#b42318";
    }
  }
}

// initial render
renderOpeningFloatReadOnly(today);

// if date changes, refresh the read-only display too
box.querySelector("#codDate")?.addEventListener("change", (e) => {
  renderOpeningFloatReadOnly(e.target.value || today);
});


  // 🔒 IF DRAFT EXISTS → LOCK DATE ONLY & RESUME PHASE B
if (resumeDraft) {
  const dateInput = box.querySelector("#codDate");
  if (dateInput) {
    dateInput.value = resumeDraft.date;
    dateInput.disabled = true;
  }

  // keep read-only float display accurate for the resumed date
  renderOpeningFloatReadOnly(resumeDraft.date);
}


  const modal = document.getElementById("txModal");
document.getElementById("txTitle").textContent = "Close of Day";
document.getElementById("txBody").innerHTML = "";
document.getElementById("txBody").appendChild(box);

modal.querySelectorAll(".tx-ok").forEach(b => b.remove());

const submitBtn = document.createElement("button");
submitBtn.className = "btn tx-ok";
submitBtn.textContent = "Continue";
modal.querySelector(".modal-actions").appendChild(submitBtn);

// 🔁 RESET BUTTON STATE
submitBtn.onclick = null;
submitBtn.disabled = false;
submitBtn.dataset.submitted = "0";

back.style.display = "flex";
 
  // ===== FIRST CLICK ONLY =====
submitBtn.onclick = () => {
  selectedDate = box.querySelector("#codDate")?.value || today;

  const openingFloat = getDeclaredOpeningFloat(selectedDate);
  if (!openingFloat || openingFloat <= 0) {
    showToast("Declare Opening Balance first");
    openDeclareFloatModal(selectedDate);
    return;
  }

  if (!state.codDrafts) state.codDrafts = {};
  const draftKey = `${staff.id}|${selectedDate}`;

  const alreadySubmitted = (state.cod || []).some(
    c => c.staffId === staff.id && c.date === selectedDate
  );
  const hasDraft = state.codDrafts[draftKey];

  if (alreadySubmitted) {
    showToast("Close of Day already submitted for this date");
    return;
  }

  if (hasDraft && !alreadySubmitted) {
    delete state.codDrafts[draftKey];
    save();
  }

  const existingDraft = state.codDrafts[draftKey];
  if (existingDraft) {
    renderPhaseB({ box, submitBtn, staff, selectedDate, openingFloat });
    return;
  }

  state.codDrafts[draftKey] = {
    staffId: staff.id,
    date: selectedDate,
    startedAt: new Date().toISOString()
  };

  box.querySelector("#codDate")?.setAttribute("disabled", true);
  save();

  renderPhaseB({ box, submitBtn, staff, selectedDate, openingFloat });
};
}
 

function renderPhaseB({
  box,
  submitBtn,
  staff,
  selectedDate,
  openingFloat
}) {
  // ✅ use APPROVED approvals for this staff & date (source of truth)
const approved = (state.approvals || []).filter(a =>
  a.status === "approved" &&
  (a.requestedBy === staff.id || a.createdBy === staff.id) &&
  String(a.processedAt || "").startsWith(selectedDate)
);

// 🔴 FLOAT-IMPACTING (SOURCE OF TRUTH)
const credits = approved
  .filter(t => t.type === "credit")
  .reduce((s, t) => s + Number(t.amount || 0), 0);

// 🔎 INFO-ONLY (DO NOT AFFECT FLOAT)
const withdrawals = approved
  .filter(t => t.type === "withdraw")
  .reduce((s, t) => s + Number(t.amount || 0), 0);

const empowerments = approved
  .filter(t => t.type === "empowerment")
  .reduce((s, t) => s + Number(t.amount || 0), 0);

// ✅ EXPECTED CASH = OPENING FLOAT - CREDITS ONLY (CRITICAL RULE)
const opening = Number(openingFloat || 0);
const expectedRaw = opening - credits;        // can be negative
const expectedCash = Math.max(0, expectedRaw); // physical cash expectation (never negative)
const overdraw = Math.max(0, -expectedRaw);    // owed amount

  // ===== PHASE B UI =====
  box.innerHTML = `
    <div class="small"><b>Staff:</b> ${staff.name}</div>
    <div class="small"><b>Date:</b> ${selectedDate}</div>

    <div class="card" style="margin-top:10px">
      <div class="small">System Credits (cash given out): ${fmt(credits)}</div>
      <div class="small">Withdrawals (info): ${fmt(withdrawals)}</div>
      <div class="small">Empowerments (info): ${fmt(empowerments)}</div>
      <div class="small"><b>Expected Closing Cash:</b> ${fmt(expectedCash)}</div>
${overdraw > 0 ? `<div class="small" style="color:#ed6c02"><b>Overdraw (owed):</b> ${fmt(overdraw)}</div>` : ""}
    </div>

    <input
  id="finalDeclared"
  class="input"
  value="${expectedCash}"
  placeholder="Enter Closing Cash Counted"
  style="margin-top:8px"
/>

    <textarea
      id="codNote"
      class="input"
      placeholder="Explain variance (required if mismatch)"
      style="margin-top:10px;display:none"
    ></textarea>

    <div id="finalErr" class="small danger" style="margin-top:8px;display:none"></div>
  `;
  

  submitBtn.textContent = "Submit";

  const finalDeclaredInput = box.querySelector("#finalDeclared");
  const noteBox = box.querySelector("#codNote");
  const finalErr = box.querySelector("#finalErr");

  // 🔁 Variance indicator
  const indicator = document.createElement("div");
  indicator.className = "small";
  indicator.style.marginTop = "6px";
  box.insertBefore(indicator, noteBox);

  function recalcVariance() {
  const declared = Math.max(0, moneyNumber(finalDeclaredInput.value));
  const v = declared - expectedCash;

  // If there is overdraw, NEVER show Balanced
  if (v === 0 && overdraw > 0) {
    indicator.textContent = `Overdrawn (owed) ${fmt(overdraw)}`;
    indicator.style.color = "orange";
    noteBox.style.display = "block";
    return;
  }

  if (v === 0) {
    indicator.textContent = "Balanced ✔";
    indicator.style.color = "green";
    noteBox.style.display = "none";
  } else if (v > 0) {
    indicator.textContent = `Excess ${fmt(v)}`;
    indicator.style.color = "orange";
    noteBox.style.display = "block";
  } else {
    indicator.textContent = `Shortage ${fmt(Math.abs(v))}`;
    indicator.style.color = "red";
    noteBox.style.display = "block";
  }
}

  finalDeclaredInput.oninput = recalcVariance;
  recalcVariance();

 // ===== FINAL SUBMIT =====
submitBtn.onclick = () => {
  // stop double click
  if (submitBtn.dataset.submitted === "1") return;
  submitBtn.dataset.submitted = "1";

  const dateKey = normDate(selectedDate);

  // ✅ latest approvals at submit-time
  const approvedNow = (state.approvals || []).filter(a =>
    a.status === "approved" &&
    (a.requestedBy === staff.id || a.createdBy === staff.id) &&
    normDate(a.processedAt || a.requestedAt || "") === dateKey
  );

  // credits affect float
  const creditsNow = approvedNow
    .filter(t => t.type === "credit")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  // info-only
  const withdrawalsInfo = approvedNow
    .filter(t => t.type === "withdraw")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const empowermentsInfo = approvedNow
    .filter(t => t.type === "empowerment")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  // ✅ float rule
  const opening = Number(openingFloat || 0);
  const expectedCashNow = opening - Number(creditsNow || 0);

  // ✅ overdraw is separate from cash variance
  const overdraw = Math.max(0, Number(creditsNow || 0) - opening);

  const finalDeclared = moneyNumber(finalDeclaredInput?.value);
  const cashVariance = finalDeclared - expectedCashNow;

  finalErr.style.display = "none";

  // ✅ NOTE ENFORCEMENT:
  // require note if cash mismatch OR teller overdrawn
  if ((cashVariance !== 0 || overdraw > 0) && !noteBox.value.trim()) {
    finalErr.textContent = overdraw > 0
      ? `Explanation is required (Overdrawn: ${fmt(overdraw)})`
      : "Explanation is required for variance";
    finalErr.style.display = "block";
    submitBtn.dataset.submitted = "0";
    return;
  }

  // ✅ block duplicate COD for same staff/date
  state.cod = Array.isArray(state.cod) ? state.cod : [];
  const already = state.cod.some(c =>
    String(c.staffId) === String(staff.id) &&
    normDate(c.date) === dateKey
  );
  if (already) {
    showToast("Close of Day already submitted for this date");
    submitBtn.dataset.submitted = "0";
    return;
  }

  const status = (cashVariance === 0 && overdraw === 0) ? "balanced" : "flagged";

  state.cod.push({
    id: uid("cod"),
    staffId: String(staff.id),
    staffName: staff.name,
    role: staff.role,
    date: dateKey,

    snapshot: {
  credits: Number(creditsNow || 0),
  withdrawals: Number(withdrawalsInfo || 0),
  empowerments: Number(empowermentsInfo || 0),
  overdrawOwed: Math.max(0, Number(creditsNow || 0) - Number(openingFloat || 0))
},

    openingFloat: opening,

    // ✅ cash math
    systemExpected: expectedCashNow,
    staffDeclared: finalDeclared,
    variance: cashVariance,

    // ✅ overdraw tracking (NEW)
    overdraw,                 // teller exceeded opening
    isOverdrawn: overdraw > 0,

    staffNote: noteBox.value.trim(),

    status,
    resolvedAmount: null,
    resolutionNote: "",
    resolvedBy: null,
    resolvedAt: null,

    createdAt: new Date().toISOString()
  });

  // cleanup draft
  if (state.codDrafts) delete state.codDrafts[`${staff.id}|${dateKey}`];

  save?.();

window.activeCODDate = dateKey;

renderCODForDate?.(dateKey);
renderManagerCODSummary?.(dateKey);
renderDashboard?.();

showToast("Close of Day submitted");
closeTxModal?.();
};
}

function openCODResolutionModal(codId) {
  console.log("STEP 3: openCODResolutionModal ENTERED", codId);

  if (!isManager()) {
    showToast("Only managers can resolve COD");
    return;
  }

  const cod = (state.cod || []).find(c => c.id === codId);
  if (!cod) {
    showToast("COD record not found");
    console.error("COD not found in state:", codId, state.cod);
    return;
  }

  const acc = ensureStaffAccount(cod.staffId);

  const openingFloat = Number(cod.openingFloat || 0);
  const credits = Number(cod.snapshot?.credits || 0);
  const withdrawals = Number(cod.snapshot?.withdrawals || 0);
  const empowerments = Number(cod.snapshot?.empowerments || 0);

  const walletBalance = Number(acc.walletBalance || 0);
  const debtBalance = Number(acc.balance || 0);

  const repaymentsMade = (acc.entries || [])
    .filter(e =>
      String(e.type || "").toLowerCase() === "debt_repayment" &&
      normDate(e.date) === normDate(cod.date)
    )
    .reduce((s, e) => s + Math.abs(Number(e.amount || 0)), 0);

  const back = document.getElementById("txModalBack");
  const modal = document.getElementById("txModal");
  const body = document.getElementById("txBody");
  const title = document.getElementById("txTitle");

  if (!back || !modal || !body || !title) {
    console.error("Resolve COD modal elements missing");
    return;
  }

  title.textContent = "Resolve Close of Day Variance";

  body.innerHTML = `
    <div class="small">
      <b>Staff:</b> ${cod.staffName}<br/>
      <b>Date:</b> ${cod.date}
    </div>

    <div class="card" style="margin-top:10px">
      <div class="small"><b>Opening Float:</b> ${fmt(openingFloat)}</div>
      <div class="small"><b>Credits:</b> ${fmt(credits)}</div>
      <div class="small"><b>Withdrawals (info):</b> ${fmt(withdrawals)}</div>
      <div class="small"><b>Empowerments (info):</b> ${fmt(empowerments)}</div>

      <div class="small" style="margin-top:8px"><b>System Expected:</b> ${fmt(Number(cod.systemExpected || 0))}</div>
      <div class="small"><b>Staff Declared:</b> ${fmt(Number(cod.staffDeclared || 0))}</div>
      <div class="small danger"><b>Variance:</b> ${fmt(Number(cod.variance || 0))}</div>

      <div class="small" style="margin-top:8px"><b>Staff Wallet Balance:</b> ${fmt(walletBalance)}</div>
      <div class="small"><b>Staff Debt Balance:</b> ${fmt(debtBalance)}</div>
      <div class="small"><b>Repayments Already Made:</b> ${fmt(repaymentsMade)}</div>

      ${
        cod.staffNote
          ? `<div class="small muted" style="margin-top:8px"><b>Staff Note:</b> ${cod.staffNote}</div>`
          : ``
      }
    </div>

    <input
      id="resolvedAmount"
      class="input"
      style="margin-top:10px"
      value="${Number(cod.systemExpected || 0)}"
      placeholder="Final accepted cash amount"
      type="number"
    />

    <textarea
      id="resolutionNote"
      class="input"
      placeholder="Resolution note (required)"
      style="margin-top:8px"
    ></textarea>

    <div class="small muted" style="margin-top:8px">
      If staff still owes after discussion, post the agreed debt separately to staff account.
    </div>
  `;

  modal.querySelectorAll(".tx-ok").forEach(b => b.remove());

  const btn = document.createElement("button");
  btn.className = "btn success tx-ok";
  btn.textContent = "Resolve COD";

  btn.onclick = () => {
    const resolvedAmount = Number(document.getElementById("resolvedAmount")?.value || 0);
    const note = document.getElementById("resolutionNote")?.value.trim();

    if (!note) {
      showToast("Resolution note is required");
      return;
    }

    cod.resolvedAmount = resolvedAmount;
    cod.resolutionNote = note;
    cod.resolvedBy = currentStaff()?.name || "Manager";
    cod.resolvedAt = new Date().toISOString();
    cod.status = "resolved";
    cod.variance = resolvedAmount - Number(cod.systemExpected || 0);

    // ✅ no automatic debt posting here
    // manager and staff determine separately whether to post debt

    save?.();

    const dateKey = normDate(window.activeCODDate || cod.date);
    renderCODForDate?.(dateKey);
    renderManagerCODSummary?.(dateKey);
    renderDashboard?.();

    back.style.display = "none";
    showToast("COD resolved");
  };

  modal.querySelector(".modal-actions")?.appendChild(btn);
  back.style.display = "flex";
}
window.openCODResolutionModal = openCODResolutionModal;


function getStaffAccount(staffId) {
  state.staffAccounts = state.staffAccounts || {};
  if (!state.staffAccounts[staffId]) {
    state.staffAccounts[staffId] = { balance: 0, entries: [] }; // balance > 0 means staff owes company
  }
  return state.staffAccounts[staffId];
}
window.getStaffAccount = getStaffAccount;

function postStaffCharge(staffId, amount, note, codId) {
  const acc = getStaffAccount(staffId);
  const n = Math.abs(Number(amount || 0));
  if (!n) return false;

  acc.balance = Number(acc.balance || 0) + n;
  acc.entries.unshift({
    id: uid("sa"),
    staffId,
    amount: n,
    note: note || "COD shortage charge",
    codId: codId || null,
    date: new Date().toISOString()
  });
  return true;
}
window.postStaffCharge = postStaffCharge;

function renderApprovals() {
     const el = document.getElementById("approvals");
  if (!el) return;

  const staff = currentStaff();
  const isApprover = staff && canApprove(); // manager or CEO

  const pending = state.approvals
  .filter(a => a.status === "pending")
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

  if (pending.length === 0) {
    el.innerHTML = `<div class="small muted">No pending approvals</div>`;
    return;
  }

  let html = "";

  pending.forEach(a => {
    const cust =
  (a.type === "customer_creation")
    ? { name: a.payload?.name || "New Customer" }
    : state.customers.find(c => c.id === a.customerId);

    html += `
      <div class="approval-item card" style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-weight:700">
              ${a.type.toUpperCase()} ${a.amount ? "— " + fmt(a.amount) : ""}
            </div>

            <div class="small">
              Customer: <b>${cust ? cust.name : "Unknown"}</b>
            </div>

            <div class="small">
              Requested by: <b>${a.requestedByName || a.requestedBy}</b>
            </div>

            <div class="small muted">
              Requested at: ${new Date(a.requestedAt).toLocaleString()}
            </div>
          </div>

          ${
            isApprover
              ? `
                <div style="display:flex;gap:6px">
                  <button
                    class="btn"
                    onclick="processApproval('${a.id}', 'approve')">
                    Approve
                  </button>

                  <button
                    class="btn ghost danger"
                    onclick="processApproval('${a.id}', 'reject')">
                    Reject
                  </button>
                </div>
              `
              : `
                <div class="small muted" style="margin-top:4px">
                  ⏳ Awaiting manager review
                </div>
              `
          }
        </div>
      </div>
    `;
  });

  el.innerHTML = html;
}


function renderCustomerKycApprovals() {
  const box = document.getElementById("customerKycApprovals");
  if (!box) return;

  const staff = currentStaff();
  const isApprover = staff && canApprove();

  const pending = (state.approvals || [])
    .filter(a => a.type === "customer_creation" && a.status === "pending")
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

  if (pending.length === 0) {
    box.innerHTML = `<div class="small muted">No new customer requests</div>`;
    return;
  }

  let html = "";

  pending.forEach(a => {
    const p = a.payload || {};

    html += `
      <div class="card" style="
        margin-bottom:10px;
        padding:10px;
        border-left:4px solid #0f766e;
      ">

        <div style="display:flex; gap:10px; align-items:flex-start">

          ${
            p.photo
              ? `<img src="${p.photo}"
                      style="width:48px;height:48px;border-radius:8px;
                             object-fit:cover;border:1px solid #e5e7eb;">`
              : `<div style="width:48px;height:48px;border-radius:8px;
                             background:#f3f4f6;display:flex;
                             align-items:center;justify-content:center;
                             font-size:10px;color:#9ca3af;">
                   No Photo
                 </div>`
          }

          <div style="flex:1; font-size:12px; line-height:1.4">
            <div style="font-weight:700; margin-bottom:4px;">NEW CUSTOMER</div>

            <div><b>Name:</b> ${p.name || "—"}</div>
            <div><b>Phone:</b> ${p.phone || "—"}</div>
            <div><b>NIN:</b> ${p.nin || "—"}</div>
            <div style="word-break:break-word;">
              <b>Address:</b> ${p.address || "—"}
            </div>

            <div class="small muted" style="margin-top:4px">
              By: ${a.createdByName || a.requestedBy || "Staff"}
            </div>

            <div class="small muted">
              ${(() => {
                const d = a.createdAt || a.date;
                return d ? new Date(d).toLocaleString() : "—";
              })()}
            </div>
          </div>
        </div>

        ${
          isApprover
            ? `
              <div style="display:flex; gap:8px; margin-top:10px;">
                <button
                  class="btn solid approve"
                  style="opacity:1 !important;"
                  onclick="processApproval('${a.id}','approve')"
                >
                  Approve
                </button>

                <!-- ✅ MATCH TRANSACTION REJECT STYLE -->
                <button
                  class="btn danger reject"
                  style="opacity:1 !important;"
                  onclick="processApproval('${a.id}','reject')"
                >
                  Reject
                </button>
              </div>
            `
            : `<div class="small muted" style="margin-top:10px">
                 Awaiting manager approval
               </div>`
        }

      </div>
    `;
  });

  box.innerHTML = html;
}
window.renderCustomerKycApprovals = renderCustomerKycApprovals;


function renderCustomerCreationApprovals() {
  const el = document.getElementById("approvals");
  if (!el) return;

  const staff = currentStaff();
  const isApprover = staff && canApprove();

  const pendingCustomers = (state.approvals || [])
    .filter(a => a.status === "pending" && a.type === "customer_creation")
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

  if (pendingCustomers.length === 0) return;

  let html = `<div style="font-weight:700;margin:10px 0">New Customer Requests</div>`;

  pendingCustomers.forEach(a => {
    const p = a.payload || {};

    html += `
      <div class="approval-item card" style="margin-bottom:10px;border-left:4px solid #0f766e">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          
          <div>
            <div style="font-weight:700">
              NEW CUSTOMER REQUEST
            </div>

            <div class="small">
              Name: <b>${p.name || "—"}</b>
            </div>

            <div class="small">
              Phone: <b>${p.phone || "—"}</b>
            </div>

            <div class="small">
              NIN: <b>${p.nin || "—"}</b>
            </div>

            <div class="small">
              Address: <b>${p.address || "—"}</b>
            </div>

            <div class="small">
              Requested by: <b>${a.requestedBy || a.createdBy || "—"}</b>
            </div>

            <div class="small muted">
              Requested at: ${
                a.createdAt
                  ? new Date(a.createdAt).toLocaleString()
                  : "—"
              }
            </div>
          </div>

          ${
            isApprover
              ? `
              <div style="display:flex;gap:6px">
                <button class="btn"
                  onclick="handleApprovalAction('${a.id}', 'approve')">
                  Approve
                </button>

                <button class="btn ghost danger"
                  onclick="handleApprovalAction('${a.id}', 'reject')">
                  Reject
                </button>
              </div>
            `
              : `<div class="small muted">⏳ Awaiting approval</div>`
          }

        </div>
      </div>
    `;
  });

  // 🔥 APPEND instead of replace (so financial approvals stay intact)
  el.innerHTML = html + el.innerHTML;
}

window.renderCustomerCreationApprovals = renderCustomerCreationApprovals;


  function renderCustomers() {
  // =========================
  // EXISTING CUSTOMER LOGIC
  // =========================
  const list = $("#custList");
  list.innerHTML = "";

  const q = ($("#search")?.value || "").toLowerCase().trim();      // name/phone search
const qa = ($("#searchAcc")?.value || "").toLowerCase().trim();  // account number search
  let arr = state.customers.slice();

  if ($("#sort").value === "balDesc") arr.sort((a, b) => (b.balance || 0) - (a.balance || 0));
  else arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  // ✅ Search: name + phone + account number
  arr = arr.filter(c => {
  if (c.archived) return false; // ✅ hide from customer list

  const name = (c.name || "").toLowerCase();
  const phone = String(c.phone || "");
  const acct = String(c.accountNumber || "").toLowerCase();

  const hitNamePhone = !q || name.includes(q) || phone.includes(q);
  const hitAccount = !qa || acct.includes(qa);

  return hitNamePhone && hitAccount;
});

  arr.forEach((c) => {
    const r = document.createElement("div");
    r.className = "citem";

    if ((c.balance || 0) < 0) {
      r.style.background = "#fdecea";
      r.style.border = "1px solid #f5c2c7";
    }

    const nameBtn = document.createElement("button");
    nameBtn.className = "input";
    nameBtn.style.background = "transparent";
    nameBtn.style.border = "0";
    nameBtn.style.padding = "0";
    nameBtn.style.fontWeight = "700";
    nameBtn.style.cursor = "pointer";

    nameBtn.innerHTML = `
  ${c.name || "—"}

  ${
    (c.status === "closed")
      ? `<span class="badge" style="margin-left:6px;background:#fee2e2;color:#991b1b">CLOSED</span>`
      : (c.frozen
          ? `<span class="badge" style="margin-left:6px;background:#e0f2fe;color:#075985">FROZEN</span>`
          : "")
  }

  ${
    (() => {
      const activeLoan = (state.empowerments || []).find(
        (e) => e.customerId === c.id && e.status !== "completed"
      );
      if (!activeLoan) return "";

      const principalLeft = (activeLoan.principalGiven || 0) - (activeLoan.principalRepaid || 0);
      const interestLeft = (activeLoan.expectedInterest || 0) - (activeLoan.interestRepaid || 0);
      const totalLeft = principalLeft + interestLeft;
      if (totalLeft <= 0) return "";

      return `<span class="badge" style="
                margin-left:6px;
                background:#fff3cd;
                color:#7a5c00
              ">
                EMPOWERMENT ${fmt(totalLeft)}
              </span>`;
    })()
  }

  ${
    (c.balance || 0) < 0
      ? `<span class="badge danger" style="margin-left:6px">
           NEGATIVE ${fmt(Math.abs(c.balance || 0))}
         </span>`
      : ""
  }
`;


    nameBtn.onclick = () => openCustomerModal(c.id);

    const left = document.createElement("div");

    const meta = document.createElement("div");
    meta.className = "small";
    // ✅ numbers only (no ₦), also show account number clearly
    meta.textContent = `${c.phone || "—"} • Acct: ${c.accountNumber || "—"} • Bal: ${fmt(c.balance || 0)}`;

    left.appendChild(nameBtn);
    left.appendChild(meta);
    r.appendChild(left);

    const actions = document.createElement("div");

    const view = document.createElement("button");
    view.className = "btn";
    view.textContent = "View";
    view.onclick = () => openCustomerModal(c.id);

    const tx = document.createElement("button");
    tx.className = "input";
    tx.textContent = "Tx";
    tx.onclick = () => {
      $("#custSel").value = c.id;
      showToast("Selected " + (c.name || "Customer"));
    };

    actions.appendChild(view);
actions.appendChild(tx);
    r.appendChild(actions);

    list.appendChild(r);
  });

  // Rebuild customer dropdown
  $("#custSel").innerHTML = "";
  state.customers.forEach((c) => {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = `${c.name || "—"} • ${fmt(c.balance || 0)}`;
    $("#custSel").appendChild(o);
  });

  $("#custCount").textContent = state.customers.length;

  $("#totalBal").textContent = fmt(
    state.customers.reduce((s, c) => s + Number(c.balance || 0), 0)
  );

  $("#mobileBal").textContent = state.customers[0]
    ? fmt(state.customers[0].balance || 0)
    : fmt(0);
}


function showDashboard() {
  state.ui.dashboardMode = true;

  const dash = document.getElementById("dashboardView");
  const app = document.getElementById("app");

  if (dash) dash.style.display = "block";
  if (app) app.style.display = "none";

  forceFullUIRefresh(); // enough
}

function hideDashboard() {
  state.ui.dashboardMode = false;

  const dash = document.getElementById("dashboardView");
  const app = document.getElementById("app");

  if (dash) dash.style.display = "none";
  if (app) app.style.display = "block";

  forceFullUIRefresh();
}



function renderAttentionRequired() {

  const grid = document.getElementById("attentionGrid");

  if (!grid) return;



  const frozen = state.customers.filter(c => c.frozen).length;



  const _today = new Date().toISOString().slice(0, 10);

  let largeWithdrawals = 0;



  state.customers.forEach(c => {

    (c.transactions || []).forEach(t => {

      if (

        t.type === "withdraw" &&

        t.amount >= 50000 &&

        t.date?.startsWith(_today)

      ) {

        largeWithdrawals++;

      }

    });

  });



  grid.innerHTML = `
  <div class="dash-card">
    <div class="small">Large Withdrawals Today</div>
    <h3>${largeWithdrawals}</h3>
  </div>

  <div class="dash-card">
    <div class="small">Frozen Accounts</div>
    <h3>${frozen}</h3>
  </div>
`;

}

function wireDashboardClicks() {
  const pending = document.getElementById("att-pending");
  const large = document.getElementById("att-large");
  const frozen = document.getElementById("att-frozen");

  if (large) {
    large.onclick = () => showToast("Large withdrawals filter coming next");
  }

  if (frozen) {
    frozen.onclick = () => showToast("Frozen account filter coming next");
  }
}

function renderDashboardKPIs() {
  const box = document.getElementById("dashboardKPIs");
  if (!box) return;

  const pendingCount = (state.approvals || []).filter(a => a.status === "pending").length;

  const totalCustomers = state.customers.length;
  const totalBalance = state.customers.reduce((s, c) => s + Number(c.balance || 0), 0);

  const _today = new Date().toISOString().slice(0, 10);
  let inflow = 0;
  let outflow = 0;

  state.customers.forEach(c => {
    (c.transactions || []).forEach(t => {
      if (t.date?.startsWith(_today)) {
        if (t.type === "credit") inflow += Number(t.amount || 0);
        if (t.type === "withdraw") outflow += Number(t.amount || 0);
      }
    });
  });

  box.innerHTML = `
    <div class="dash-card">
      <div class="small">Customers</div>
      <h3>${totalCustomers}</h3>
    </div>

    <div class="dash-card">
      <div class="small">Funds Under Management</div>
      <div class="small muted">Currency: NGN</div>
      <h3>${fmt(totalBalance)}</h3>
    </div>

    <div class="dash-card clickable" data-kpi="approvals">
      <div class="small">Approvals Pending</div>
      <h3>${pendingCount}</h3>
    </div>

    <div class="dash-card">
      <div class="small">Today Inflow</div>
      <h3>${fmt(inflow)}</h3>
    </div>

    <div class="dash-card">
      <div class="small">Today Outflow</div>
      <h3>${fmt(outflow)}</h3>
    </div>
  `;

  const ap = box.querySelector('[data-kpi="approvals"]');
  if (ap) ap.onclick = scrollToApprovals;
}


function scrollToApprovals() {
  const layout = document.getElementById("layoutRoot");
  if (!layout) return;

  const dashboardVisible =
    document.getElementById("dashboardView")?.style.display !== "none";

  const target = dashboardVisible
    ? document.getElementById("dashboardApprovals")
    : document.getElementById("approvalsCard");

  if (!target) return;

  const top =
    target.getBoundingClientRect().top -
    layout.getBoundingClientRect().top +
    layout.scrollTop -
    20;

  layout.scrollTo({
    top,
    behavior: "smooth"
  });
}


function generateCustomerAccountNumber() {
  const customers = state.customers || [];

  // Extract ONLY valid numeric account numbers
  const numericAccounts = customers
    .map(c => parseInt(c.accountNumber, 10))
    .filter(n => !isNaN(n) && n >= 1000); // ignore legacy weird formats

  // Start from 1000 if none exist
  const nextNumber = numericAccounts.length > 0
    ? Math.max(...numericAccounts) + 1
    : 1000;

  return String(nextNumber);
}


function openApproval(customerId, approvalId) {
  activeCustomerId = customerId;

  // Open customer modal
  openCustomerModal(customerId);

  // Store approval being reviewed
  window.activeApprovalId = approvalId;

  // Switch directly to tools tab
  setActiveTab("tools");
}

function handleApprovalAction(id, action) {
  const approval = state.approvals.find(a => a.id === id);
  if (!approval) return;

  // ✅ DO NOT set approval.status here.
  // Status must be set only when the action is actually finalized,
  // especially because customer_creation uses a confirmation modal.

  // ===============================
  // ✅ CUSTOMER MAINTENANCE APPROVAL
  // ===============================
  // ===============================
// ✅ CUSTOMER MAINTENANCE APPROVAL
// ===============================
if (approval.type === "customer_maintenance") {
  const data = approval.payload || {};

  // ✅ robust customer lookup:
  // 1) approval.customerId
  // 2) payload.customerId
  // 3) payload.accountNumber
  const custId = approval.customerId || data.customerId || "";
  const acctNo = String(data.accountNumber || approval.accountNumber || "").trim();

  let cust = null;

  if (custId) {
    cust = (state.customers || []).find(x => x.id === custId);
  }

  if (!cust && acctNo) {
    cust = (state.customers || []).find(x => String(x.accountNumber || "").trim() === acctNo);
  }

  if (!cust) {
    showToast("Missing customer for this request");
    return;
  }

  // APPROVE
  if (action === "approve") {
    const patch = data.patch || {};
    const reqAction = data.action || ""; // edit | freeze | unfreeze | closure | hide | restore

    // 1) apply patch
    Object.keys(patch).forEach((k) => {
      cust[k] = patch[k];
    });

    // 2) enforce consistency (single source)
    if (reqAction === "closure") {
      cust.status = "closed";
      cust.frozen = true;
      cust.closedAt = new Date().toISOString();
      cust.closedBy = (currentStaff?.()?.id || approval.requestedBy || approval.createdBy || "system");
    }

    if (reqAction === "freeze") {
      cust.frozen = true;
      if (!cust.status) cust.status = "frozen";
    }

    if (reqAction === "unfreeze") {
      if (cust.status !== "closed") {
        cust.frozen = false;
        if (cust.status === "frozen") cust.status = "";
      }
    }

    if (reqAction === "hide") {
      cust.archived = true;
      cust.archivedAt = new Date().toISOString();
    }

    if (reqAction === "restore") {
      cust.archived = false;
      cust.restoredAt = new Date().toISOString();
    }

    cust.updatedAt = new Date().toISOString();
    cust.updatedBy = approval.requestedByName || approval.createdByName || "System";

    approval.resolvedCustomerId = cust.id;
    approval.customerId = cust.id; // ✅ backfill so tools/filters work
    approval.status = "approved";

    save?.();
    renderCustomers?.();
    renderApprovals?.();
    renderDashboard?.();
    renderAudit?.();

    showToast("Maintenance request approved and applied");
    return;
  }

  // REJECT
  approval.status = "rejected";
  save?.();
  renderApprovals?.();
  showToast("Maintenance request rejected");
  return;
}

  // ==========================================
  // 🎯 CUSTOMER KYC APPROVAL (CREATE CUSTOMER)
  // ==========================================
  if (approval.type === "customer_creation") {
    // Reject is immediate
    if (action !== "approve") {
      approval.status = "rejected";
      save?.();
      renderApprovals?.();
      renderCustomerKycApprovals?.();
      showToast("Customer creation rejected");
      return;
    }

    const data = approval.payload || {};

    // 🪪 REVIEW CARD BEFORE ACCOUNT CREATION (CLIENT REQUIREMENT)
    const review = document.createElement("div");
    review.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;gap:12px;align-items:flex-start">
          ${
            data.photo
              ? `<img src="${data.photo}"
                   style="width:70px;height:70px;border-radius:12px;
                          object-fit:cover;border:1px solid #e5e7eb;">`
              : `<div style="width:70px;height:70px;border-radius:12px;
                             background:#f3f4f6;display:flex;
                             align-items:center;justify-content:center;
                             font-size:11px;color:#9ca3af;">
                   No Photo
                 </div>`
          }

          <div style="flex:1">
            <div><b>Name:</b> ${data.name || "—"}</div>
            <div><b>Phone:</b> ${data.phone || "—"}</div>
            <div><b>NIN:</b> ${data.nin || "—"}</div>
            <div><b>Address:</b> ${data.address || "—"}</div>
            <div><b>Opening Balance:</b> ${fmt(Number(data.openingBalance || 0))}</div>
          </div>
        </div>

        <div class="small muted">
          Please review customer details before opening account.
        </div>
      </div>
    `;

    openModalGeneric(
      "Review & Approve New Customer",
      review,
      "Approve & Open Account",
      true
    ).then((confirmed) => {
      if (!confirmed) {
        // ✅ If manager cancels, do NOT mark approved
        return;
      }

      // 🔢 ACCOUNT NUMBER STARTS FROM 1000 (NO PREFIX)
      const existingNumbers = (state.customers || [])
        .map(c => Number(c.accountNumber) || 999);

      const max = existingNumbers.length
        ? Math.max(...existingNumbers)
        : 999;

      const newCustomer = {
        id: uid("c"), // ✅ IMPORTANT: customer ids must start with "c"
        accountNumber: String(max + 1), // 1000, 1001, 1002...
        name: data.name || "Unnamed",
        phone: data.phone || "",
        nin: data.nin || "",
        address: data.address || "",
        photo: data.photo || "",
        balance: Number(data.openingBalance || 0),
        frozen: false,
        status: "",
        archived: false,
        transactions: [],
        createdAt: new Date().toISOString(),
        createdBy: approval.requestedByName || approval.createdByName || "System",
      };

      state.customers = state.customers || [];
      state.customers.push(newCustomer);

      approval.resolvedCustomerId = newCustomer.id;
      approval.status = "approved";

      save?.();

      // 🔥 FULL UI SYNC
      renderCustomers?.();
      renderApprovals?.();
      renderCustomerKycApprovals?.();
      renderDashboardApprovals?.();
      renderDashboard?.();
      renderAudit?.();

      showToast("Customer account opened successfully");
    });

    return; // ✅ stop legacy flow
  }

  // ==========================
  // DEFAULT (OTHER APPROVALS)
  // ==========================
  approval.status = (action === "approve") ? "approved" : "rejected";
  save?.();
  renderApprovals?.();
}
window.processApproval = function(id, action) {
  handleApprovalAction(id, action);
};


// ================================
// EMPOWERMENT MODEL SAFETY
// ================================
function ensureEmpowermentModel(c) {
  if (!c.empowerment) {
    c.empowerment = {
      active: false,
      principal: 0,
      balance: 0,
      interestRate: 0.1, // 10% default (can change later)
      tenureMonths: 6,
      startDate: null,
      monthlyDue: 0,
      status: "inactive",
      history: []
    };
  }
}

function forceFullUIRefresh() {
  renderCustomerKycApprovals?.();
  renderDashboardApprovals?.();
  renderApprovals?.();
  renderDashboard?.();
  renderCustomers?.();
  renderAudit?.();
  updateChartData?.();
}
window.forceFullUIRefresh = forceFullUIRefresh;


function calculateEmpowermentSchedule(c) {
  const e = c.empowerment;
  const interest = e.principal * e.interestRate;
  const totalPayable = e.principal + interest;

  e.monthlyDue = Math.ceil(totalPayable / e.tenureMonths);
}

function initEmpowermentModel(c, config = {}) {
  if (!c.empowerment) {
    c.empowerment = {
      active: false,
      principal: 0,
      balance: 0,
      tenureMonths: 0,
      interestRate: 0,
      monthlyDue: 0,
      status: "none",
      history: []
    };
  }

  // Apply config only if provided
  if (config.tenureMonths) c.empowerment.tenureMonths = config.tenureMonths;
  if (config.interestRate !== undefined) c.empowerment.interestRate = config.interestRate;

  // Recalculate monthly due safely
  if (c.empowerment.tenureMonths > 0) {
    const interest =
      c.empowerment.principal * (c.empowerment.interestRate || 0);
    const totalPayable = c.empowerment.principal + interest;

    c.empowerment.monthlyDue =
      Math.ceil(totalPayable / c.empowerment.tenureMonths);
  }
}

function applyEmpowermentRepayment(c, amount) {
  const activeLoan = state.empowerments.find(e =>
    e.customerId === c.id && e.status !== "completed"
  );

  if (!activeLoan) return amount;

  state.transactions = state.transactions || [];

  let remainingAmount = amount;

  const principalLeft = activeLoan.principalGiven - activeLoan.principalRepaid;
  const interestLeft = activeLoan.expectedInterest - activeLoan.interestRepaid;

  // PAY PRINCIPAL FIRST
  const principalPay = Math.min(remainingAmount, principalLeft);
  if (principalPay > 0) {
    activeLoan.principalRepaid += principalPay;

    state.transactions.push({
      id: uid("tx"),
      type: "empowerment_repayment_principal",
      amount: principalPay,
      date: new Date().toISOString(),
      desc: "Empowerment Principal Repayment",
      customerId: c.id
    });

    remainingAmount -= principalPay;
  }

  // PAY INTEREST AFTER PRINCIPAL
  const interestRemaining = activeLoan.expectedInterest - activeLoan.interestRepaid;
  const interestPay = Math.min(remainingAmount, interestRemaining);

  if (interestPay > 0) {
    activeLoan.interestRepaid += interestPay;

    state.transactions.push({
      id: uid("tx"),
      type: "empowerment_repayment_interest",
      amount: interestPay,
      date: new Date().toISOString(),
      desc: "Empowerment Interest Repayment",
      customerId: c.id
    });

    remainingAmount -= interestPay;
  }

  const now = new Date().toISOString();
activeLoan.updatedAt = now;
activeLoan.lastPaymentAt = now; // 🔹 ensures history always has a valid timestamp


  if (
    activeLoan.principalRepaid >= activeLoan.principalGiven &&
    activeLoan.interestRepaid >= activeLoan.expectedInterest
  ) {
    activeLoan.status = "completed";
  }

  save();
  return remainingAmount;
}

window.applyEmpowermentRepayment = applyEmpowermentRepayment;


function reject(id) {
  const a = state.approvals.find(x => x.id === id);
  if (!a) return;

  openModalGeneric(
    "Reject Approval",
    "<div class='small'>Reject this request?</div>",
    "Reject"
  ).then(ok => {
    if (!ok) return;

    a.status = "rejected";
    a.rejectedBy = currentStaff().name;
    a.dateRejected = Date.now();

    save();
    renderApprovals();
  });
}


  function renderAudit() {
      const staff = currentStaff();
  const el = document.getElementById("audit");
  if (!el) return;

  // Manager / CEO see everything, others see own
  const visibleAudits = isManager()
    ? state.audit
    : state.audit.filter(a => a.actorId === staff.id);

  el.innerHTML = "";

  visibleAudits
    .slice()
    .reverse()
    .forEach(a => {
      const row = document.createElement("div");
      row.style.padding = "8px";
      row.style.borderBottom = "1px solid rgba(11,27,43,0.06)";

      let detail = "";
      const details =
        typeof a.details === "object" && a.details !== null
          ? a.details
          : null;

      // ✅ TRANSACTION SUBMITTED (TELLER)
      if (a.action === "tx_sent_for_approval" && details) {
        detail = `
          <div style="font-size:13px">
            <b>Sent for approval</b><br/>
            ${(details.txType || "").toUpperCase()} — ${fmt(details.amount)}<br/>
            Customer: <b>${details.customerName || "Unknown"}</b>
          </div>
        `;
      }

      // ✅ APPROVAL / REJECTION (MANAGER / CEO)
      else if (a.action?.startsWith("approval_") && details) {
        detail = `
          <div style="font-size:13px">
            <b>${(details.decision || "").toUpperCase()}</b><br/>
            ${(details.txType || "").toUpperCase()} — ${fmt(details.amount)}<br/>
            Customer: <b>${details.customerName || "Unknown"}</b>
          </div>
        `;
      }

      // ✅ CLOSE OF DAY
      else if (a.action === "close_day" && details) {
        detail = `
          <div style="font-size:13px">
            <b>Close of Day</b><br/>
            Expected: ${fmt(details.expectedCash)}<br/>
            Declared: ${fmt(details.finalDeclared)}<br/>
            Variance: ${fmt(details.variance)}
          </div>
        `;
      }

      // 🔁 Fallback (never crash)
      else {
        detail = `<div style="font-size:13px">${a.action}</div>`;
      }

      row.innerHTML = `
        <div class="small">
          ${new Date(a.time).toLocaleString()}
          • ${a.actor || "System"}
          • ${a.role || "system"}
        </div>
        ${detail}
      `;

      el.appendChild(row);
    });
}

function formatAuditMessage(a) {
  const d = a.details || {};

  if (a.action === "approval") {
    return `
      ${d.decision === "approve" ? "Approved" : "Rejected"}
      ₦${Number(d.amount || 0).toLocaleString()}
      for <b>${d.customerName || "Unknown customer"}</b>
    `;
  }

  if (a.action === "transaction") {
    return `
      ${d.txType.toUpperCase()}
      ₦${Number(d.amount || 0).toLocaleString()}
      for <b>${d.customerName || "Unknown customer"}</b>
    `;
  }

  return a.action;
}


// ---- DEBUG MARK ----
  const modalBack = $("#modalBack"),
  modal = $("#modal"),
  mTitle = $("#mTitle"),
  mMeta = $("#mMeta"),
  mBody = $("#mBody"),
  txModalBack = document.getElementById("txModalBack");
    // ---- Customer Modal Close Logic ----
    // ✅ Customer modal click-away (SAFE)
modalBack.onclick = (e) => {
  if (e.target === modalBack) {
    closeCustomerModal();
  }
};

// Close button inside customer modal
document.getElementById("mCancel").onclick = () => {
  closeCustomerModal();
};

 let activeCustomerId = null;
 window.forceModalTab = null;



async function confirmAccountClosure(customerId) {
  const c = (state.customers || []).find(x => x.id === customerId);
  if (!c) return showToast("Customer not found");

  const ok = await openModalGeneric(
    "Account Closure",
    `
      <div class="small">
        You are about to place <b>${c.name}</b> (Acct: <b>${c.accountNumber || "—"}</b>)
        into <b>Account Closure</b> state.<br/><br/>
        This will freeze the account (no postings) but keeps records for audit.
      </div>
    `,
    "Proceed",
    true
  );

  if (!ok) return;

  // Protocol: closure behaves like freeze + label
  c.frozen = true;
  c.closedAt = new Date().toISOString();
  c.closedBy = currentStaff()?.id || "system";

  await pushAudit(
    currentStaff()?.name || "System",
    currentStaff()?.role || "system",
    "account_closure",
    { customerId: c.id, accountNumber: c.accountNumber, customerName: c.name }
  );

  save();
  forceFullUIRefresh?.();
  showToast("Account placed on closure (frozen)");
}
window.confirmAccountClosure = confirmAccountClosure;


function openCustomerMaintenance(customerId) {
  const c = (state.customers || []).find(x => x.id === customerId);
  if (!c) return showToast("Customer not found");

  const box = document.createElement("div");

  box.innerHTML = `
    <div class="small muted" style="margin-bottom:10px">
      All maintenance requests require manager approval.
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div>
        <label class="small">Full name</label>
        <input id="mName" class="input" value="${(c.name || "").replace(/"/g, "&quot;")}">
      </div>

      <div>
        <label class="small">Phone</label>
        <input id="mPhone" class="input" value="${(c.phone || "").replace(/"/g, "&quot;")}">
      </div>

      <div>
        <label class="small">NIN</label>
        <input id="mNIN" class="input" value="${(c.nin || "").replace(/"/g, "&quot;")}">
      </div>

      <div>
        <label class="small">Address</label>
        <input id="mAddress" class="input" value="${(c.address || "").replace(/"/g, "&quot;")}">
      </div>
    </div>

    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" id="btnReqFreeze">${c.frozen ? "Request Unfreeze" : "Request Freeze"}</button>
      <button class="btn danger" id="btnReqClosure">Request Account Closure</button>
      <button class="btn ghost" id="btnReqHide">${c.archived ? "Request Restore to Customer List" : "Request Hide from Customer List"}</button>
    </div>

    <div style="margin-top:12px">
      <label class="small">Reason / Note <span class="req">*</span></label>
      <textarea id="mReason" class="input" style="height:90px" placeholder="Explain why this maintenance is needed"></textarea>
    </div>
  `;

  const reasonEl = box.querySelector("#mReason");
if (reasonEl) reasonEl.addEventListener("input", () => reasonEl.classList.remove("invalid"));

  let requestedAction = "edit"; // edit | freeze | unfreeze | closure | hide | restore

  box.querySelector("#btnReqFreeze").onclick = () => {
    requestedAction = c.frozen ? "unfreeze" : "freeze";
    showToast(`Selected: ${requestedAction.toUpperCase()} request`);
  };

  box.querySelector("#btnReqClosure").onclick = () => {
    requestedAction = "closure";
    showToast("Selected: ACCOUNT CLOSURE request");
  };

  box.querySelector("#btnReqHide").onclick = () => {
    requestedAction = c.archived ? "restore" : "hide";
    showToast(`Selected: ${requestedAction.toUpperCase()} request`);
  };

  // ✅ IMPORTANT: set showCancel=false so you don't get Cancel + Close together
  const validate = () => {
  const reason = (box.querySelector("#mReason")?.value || "").trim();
  if (!reason) {
    showToast("Reason is required");
    box.querySelector("#mReason")?.focus();
    return false;
  }

  // If "edit", ensure there is at least one real change
  if (requestedAction === "edit") {
    const name = (box.querySelector("#mName")?.value || "").trim();
    const phone = (box.querySelector("#mPhone")?.value || "").trim();
    const nin = (box.querySelector("#mNIN")?.value || "").trim();
    const address = (box.querySelector("#mAddress")?.value || "").trim();

    const hasChange =
      (name && name !== (c.name || "")) ||
      (phone !== (c.phone || "")) ||
      (nin !== (c.nin || "")) ||
      (address !== (c.address || ""));

    if (!hasChange) {
      showToast("No changes detected");
      return false;
    }
  }

  return true;
};

openModalGeneric(
  "Customer Service & Maintenance",
  box,
  "Send Request",
  false,         // ✅ only one close method (clickaway)
  validate       // ✅ prevents promise from resolving on invalid
).then(async (ok) => {
  if (!ok) return;

  // ✅ from here, reason is guaranteed present and (if edit) changes exist
  const staff = currentStaff?.();
  if (!staff) return showToast("Select staff");

  const name = (box.querySelector("#mName")?.value || "").trim();
  const phone = (box.querySelector("#mPhone")?.value || "").trim();
  const nin = (box.querySelector("#mNIN")?.value || "").trim();
  const address = (box.querySelector("#mAddress")?.value || "").trim();
  const reason = (box.querySelector("#mReason")?.value || "").trim();

  const patch = {};

  if (requestedAction === "edit") {
    if (name && name !== (c.name || "")) patch.name = name;
    if (phone !== (c.phone || "")) patch.phone = phone;
    if (nin !== (c.nin || "")) patch.nin = nin;
    if (address !== (c.address || "")) patch.address = address;
  }

  if (requestedAction === "freeze") {
    patch.frozen = true;
    patch.status = "frozen";
  }

  if (requestedAction === "unfreeze") {
    patch.frozen = false;
    if (c.status !== "closed") patch.status = "";
  }

  if (requestedAction === "closure") {
    patch.frozen = true;
    patch.status = "closed";
    patch.closedAt = new Date().toISOString();
    patch.closedBy = staff.id;
  }

  if (requestedAction === "hide") {
    patch.archived = true;
    patch.archivedAt = new Date().toISOString();
  }

  if (requestedAction === "restore") {
    patch.archived = false;
    patch.restoredAt = new Date().toISOString();
  }

  const now = new Date().toISOString();

  state.approvals = state.approvals || [];
  state.approvals.unshift({
    id: uid("ap"),
    type: "customer_maintenance",
    status: "pending",
    requestedAt: now,
    requestedBy: staff.id,
    requestedByName: staff.name,
    createdAt: now,
    createdBy: staff.id,
    createdByName: staff.name,
    customerId: c.id,
    customerName: c.name,
    accountNumber: c.accountNumber,
    amount: 0,
    payload: {
      customerId: c.id,
      accountNumber: c.accountNumber,
      customerName: c.name,
      action: requestedAction,
      reason,
      patch
    }
  });

  await pushAudit(
    staff.name,
    staff.role,
    "customer_maintenance_requested",
    { customerId: c.id, action: requestedAction, patch, reason }
  );

  save?.();
  renderApprovals?.();
  showToast("Maintenance request sent for approval");
});
}
window.openCustomerMaintenance = openCustomerMaintenance;



function openCustomerModal(id) {
  document.getElementById("custList").style.display = "block";

  const c = state.customers.find(x => x.id === id);
  if (!c) return;

  activeCustomerId = id;
  mTitle.textContent = c.name;
  mMeta.textContent = `ID: ${c.id}` + (c.frozen ? " • Frozen" : "");

  modalBack.style.display = "flex";
  document.getElementById("txCancel").onclick = () => {
  back.style.display = "none";
};

  // 🔑 SINGLE SOURCE OF TRUTH FOR TAB SELECTION (EDGE SAFE)
  const tab = window.forceModalTab || "profile";
  window.forceModalTab = null;

  setTimeout(() => {
    setActiveTab(tab);
  }, 0);
}


  function renderCustomerTimeline(cust) {
    const events = [];

    // --- Account Creation Event ---
    events.push({
      type: "create",
      title: "Account Created",
      desc: `${cust.name} was added to SmartContribution system.`,
      date: cust.createdAt || cust.dateCreated || Date.now(),
    });

    // --- Freeze / Unfreeze Events ---
    if (cust.freezeHistory && cust.freezeHistory.length) {
      cust.freezeHistory.forEach((entry) => {
        events.push({
          type: entry.frozen ? "freeze" : "unfreeze",
          title: entry.frozen ? "Account Frozen" : "Account Unfrozen",
          desc: `Action performed by ${entry.actor}.`,
          date: entry.date,
        });
      });
    }

    // --- Transaction Events ---
    if (cust.transactions && cust.transactions.length) {
      cust.transactions.forEach((t) => {
        events.push({
          type: t.type.startsWith("reverse") ? "reverse" : t.type,
          title:
            t.type === "credit"
              ? "Credit Posted"
              : t.type === "withdraw"
              ? "Withdrawal Posted"
              : t.type.startsWith("reverse")
              ? "Reversal Applied"
              : "Balance Adjustment",
          desc: `₦${Number(t.amount).toLocaleString()} — ${t.desc || ""}`,
          date: t.date,
        });
      });
    }

    // --- Approval Events (if applicable) ---
    if (cust.approvalHistory && cust.approvalHistory.length) {
      cust.approvalHistory.forEach((a) => {
        events.push({
          type: "approval",
          title:
            a.status === "approved" ? "Approval Granted" : "Approval Requested",
          desc: `${a.actor} — ${a.status.toUpperCase()}`,
          date: a.date,
        });
      });
    }

    // --- COD Impacts (Optional) ---
    if (cust.codHistory && cust.codHistory.length) {
      cust.codHistory.forEach((cd) => {
        events.push({
          type: "cod",
          title: "Close Of Day Impact",
          desc: cd.desc,
          date: cd.date,
        });
      });
    }

    // --- SORT EVENTS (Newest → Oldest) ---
    events.sort((a, b) => b.date - a.date);

    // --- RENDER INTO mBody ---
    let html = `<div class="timeline-wrap">`;

    events.forEach((e) => {
      html += `
      <div class="timeline-item timeline-${e.type}">
        <div class="timeline-dot"></div>
        <div class="timeline-time">${new Date(e.date).toLocaleString()}</div>
        <div class="timeline-title">${e.title}</div>
        <div class="timeline-desc">${e.desc}</div>
      </div>
    `;
    });

    html += `</div>`;

    mBody.innerHTML = html;
  }

  function drillDownApproval(a) {
  window.activeApprovalId = a.id;
  activeCustomerId = a.customerId;

  openCustomerModal(a.customerId);
  setActiveTab("tools");
}

  function closeCustomerModal() {
  modalBack.style.display = "none";
  activeCustomerId = null;
}


function renderProfileTab() {
  const c = state.customers.find(x => x.id === activeCustomerId);

  if (!c) {
    mBody.innerHTML = `<div class="small muted">Customer not found</div>`;
    return;
  }

  const savingsBalance = Number(c.balance || 0);

  // =========================
  // LOAD CUSTOMER EMPOWERMENT LOANS
  // =========================
  const loans = (state.empowerments || []).filter(e => e.customerId === c.id);

  // ✅ compute totals across ALL active loans (single source of truth for profile)
  const empTotals = (() => {
    const active = loans.filter(l => l.status !== "completed");

    const principalLeft = active.reduce((sum, l) => {
      const left = Number(l.principalGiven || 0) - Number(l.principalRepaid || 0);
      return sum + (left > 0 ? left : 0);
    }, 0);

    const interestLeft = active.reduce((sum, l) => {
      const left = Number(l.expectedInterest || 0) - Number(l.interestRepaid || 0);
      return sum + (left > 0 ? left : 0);
    }, 0);

    return {
      principalLeft,
      interestLeft,
      outstanding: principalLeft + interestLeft
    };
  })();

  // 🔑 get pending approvals
  const pendingApprovals = (state.approvals || [])
    .filter(a => a.customerId === c.id && a.status === "pending")
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

  const latestApproval = pendingApprovals[0];

  let html = `
<div class="card" style="margin-bottom:12px">
  <div style="display:flex;gap:14px;align-items:center">

    <!-- CUSTOMER PHOTO -->
    ${
      c.photo
        ? `<img src="${c.photo}"
                style="width:80px;height:80px;border-radius:12px;
                       object-fit:cover;border:2px solid #e5e7eb;">`
        : `<div style="width:80px;height:80px;border-radius:12px;
                       background:#f3f4f6;display:flex;
                       align-items:center;justify-content:center;
                       color:#9ca3af;font-size:12px">
             No Photo
           </div>`
    }

    <!-- CUSTOMER DETAILS -->
    <div>
      <h4 style="margin:0;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span>${c.name}</span>

        ${
          c.archived
            ? `<span class="badge" style="background:#f3f4f6;color:#374151">REMOVED</span>`
            : (c.status === "closed"
                ? `<span class="badge" style="background:#fee2e2;color:#991b1b">CLOSED</span>`
                : (c.frozen
                    ? `<span class="badge" style="background:#e0f2fe;color:#075985">FROZEN</span>`
                    : ""))
        }
      </h4>

      <div class="small">Account No: ${c.accountNumber || "—"}</div>
      <div class="small">Customer ID: ${c.id}</div>
      <div class="small">Phone: ${c.phone || "—"}</div>
      <div class="small">NIN: ${c.nin || "—"}</div>
      <div class="small">Address: ${c.address || "—"}</div>
    </div>

  </div>
</div>
`;

  html += `
<div class="card" style="margin-bottom:12px">
  <div class="kv">
    <div class="kv-label">Account Balance</div>
    <div class="kv-value">${fmt(savingsBalance)}</div>
  </div>
`;

  // =========================
  // EMPOWERMENT BALANCE (NEGATIVE) — INCLUDE INTEREST
  // =========================
  if (empTotals.outstanding > 0) {
    html += `
      <div class="kv" style="margin-top:6px">
        <div class="kv-label">Empowerment Balance</div>
        <div class="kv-value" style="color:#b42318">
          -${fmt(empTotals.outstanding)}
        </div>
      </div>
    `;
  }

  html += `</div>`;

  // =========================
  // PENDING APPROVAL CARD
  // =========================
  if (latestApproval) {
    const aAmt = Number(
      latestApproval.amount ??
      latestApproval.payload?.amount ??
      latestApproval.payload?.principal ??
      0
    );

    html += `
      <div class="card warning" style="
        margin:12px 0;
        border-left:4px solid #f59e0b;
        padding:12px;
      ">
        <div class="small"><b>Pending Approval</b></div>

        <div class="small" style="margin-top:6px">
          ${latestApproval.type.toUpperCase()} — ${fmt(aAmt)}
        </div>

        <div class="small muted">
          Requested by: ${latestApproval.requestedByName || latestApproval.requestedBy || "—"}
        </div>

        <div class="small muted">
          ${new Date(latestApproval.requestedAt).toLocaleString()}
        </div>

        <div style="margin-top:8px">
          <button
            id="goToApprovalActions"
            class="btn btn-sm"
            data-approval-id="${latestApproval.id}">
            Go to Approval Actions
          </button>
        </div>
      </div>
    `;
  }

  // =========================
  // EMPOWERMENT HISTORY — SHOW INTEREST LEFT
  // =========================
  if (loans.length > 0) {
    html += `
      <div class="card" style="margin-top:12px">
        <h4>Empowerment History</h4>
        ${loans
          .sort((a,b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
          .map(l => {
            const pLeft = Number(l.principalGiven || 0) - Number(l.principalRepaid || 0);
            const iLeft = Number(l.expectedInterest || 0) - Number(l.interestRepaid || 0);
            const totalLeft = (pLeft > 0 ? pLeft : 0) + (iLeft > 0 ? iLeft : 0);
            const d = new Date(l.createdAt || l.date || Date.now());
            const rate =
  (l.interestRate !== undefined && l.interestRate !== null && l.interestRate !== "")
    ? Number(l.interestRate)
    : (Number(l.principalGiven || 0) > 0
        ? (Number(l.expectedInterest || 0) / Number(l.principalGiven || 0)) * 100
        : null);

const rateText =
  (rate === null || isNaN(rate))
    ? fmt(l.expectedInterest)
    : (Math.round(rate * 100) / 100) + "%"; // keeps 7.5% etc

           return `
 <div class="small" style="margin-top:6px">
   ${isNaN(d) ? "Unknown Date" : d.toLocaleString()} —
   Given: <b>${fmt(l.principalGiven)}</b>,
   Interest: <b>${rateText}</b>,
   Principal Left: <b>${fmt(pLeft)}</b>,
   Interest Left: <b>${fmt(iLeft)}</b>,
   Outstanding: <b style="color:${totalLeft>0?'#b42318':'#027a48'}">${fmt(totalLeft)}</b>
 </div>
`;
          }).join("")}
      </div>
    `;
  }

  mBody.innerHTML = html;

  const btn = document.getElementById("goToApprovalActions");
  if (btn) {
    btn.onclick = (e) => {
      e.stopPropagation();
      activeCustomerId = c.id;
      window.activeApprovalId = btn.dataset.approvalId;
      setActiveTab("tools");
    };
  }
}

  function setActiveTab(tab) {
  // 1️⃣ force tab highlight
  $$(".tab-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.tab === tab)
  );

  // 2️⃣ ALWAYS clear body before render (critical)
  mBody.innerHTML = "";

  // 3️⃣ render explicitly
  switch (tab) {
    case "profile":
      renderProfileTab();
      break;

    case "tx":
      renderTransactionsTab();
      break;

    case "tools":
      renderToolsTab();
      break;

    case "timeline": {
      const c = state.customers.find(c => c.id === activeCustomerId);
      if (c) renderCustomerTimeline(c);
      break;
    }
  }
}



  // profile tab
function renderToolsTab() {
  const c = (state.customers || []).find(x => x.id === activeCustomerId);
  if (!c) return;

  const staff = currentStaff?.();
  const canAct = staff && (staff.role === "manager" || staff.role === "ceo");

  const getApCustId = (a) => a?.customerId || a?.payload?.customerId || "";

  const approvals = (state.approvals || [])
    .filter(a =>
  (a.customerId === c.id || a.payload?.customerId === c.id) &&
  a.status === "pending"
)
    .sort((a, b) => new Date(b.requestedAt || b.createdAt || 0) - new Date(a.requestedAt || a.createdAt || 0));

  const approval =
    approvals.find(a => a.id === window.activeApprovalId) ||
    approvals[0] ||
    null;

  let approvalHTML = "";

  if (approval && canAct) {
    const reqAt = approval.requestedAt || approval.createdAt;
    const reqBy = approval.requestedByName || approval.requestedBy || approval.createdByName || approval.createdBy || "—";
    // 🔥 RESOLVE AMOUNT PROPERLY (Tools tab was missing this)
  const baseAmount = Number(
    approval.amount ??
    approval.payload?.amount ??
    approval.payload?.principal ??
    0
  );

  // 🔥 Support empowerment interest display
  const interestAmount = Number(
    approval.interest ??
    approval.payload?.interest ??
    0
  );

  // 🔥 Final amount to show in Tools (matches Profile behavior)
  const displayAmount =
    approval.type === "empowerment"
      ? (baseAmount + interestAmount)
      : baseAmount;

    // maintenance summary (so you see patch)
    let summary = "";
    if (approval.type === "customer_maintenance") {
      const p = approval.payload || {};
      const patch = p.patch || {};
      const act = p.action || "edit";
      const reason = p.reason || "";

      summary = `
        <div class="card warning" style="margin-top:10px">
          <div class="small"><b>Maintenance Summary</b></div>
          <div class="small muted">Action: ${String(act).toUpperCase()}</div>
          ${reason ? `<div class="small muted" style="margin-top:4px">Note: ${reason}</div>` : ""}
          <ul class="small" style="margin-top:8px">
            ${Object.keys(patch).length
              ? Object.keys(patch).map(k => `<li><b>${k}:</b> ${String(patch[k])}</li>`).join("")
              : `<li class="muted">No patch fields</li>`
            }
          </ul>
        </div>
      `;
    }

    approvalHTML = `
      <div class="card danger" style="margin-bottom:12px">
        <h4>Pending Approval</h4>

        ${approvals.length > 1 ? `
          <div class="small" style="margin-bottom:6px">
            Select approval:
            <select id="approvalSelect" class="input">
              ${approvals.map(a => `
                <option value="${a.id}" ${a.id === approval.id ? "selected" : ""}>
                  ${a.type.toUpperCase()} — ${fmt(a.amount || 0)}
                </option>
              `).join("")}
            </select>
          </div>
        ` : ""}

        <div class="small" style="margin-top:6px">
  ${approval.type.toUpperCase()} — ${fmt(displayAmount)}
</div>
        <div class="small muted">Requested by: ${reqBy}</div>
        <div class="small muted">${reqAt ? new Date(reqAt).toLocaleString() : "—"}</div>

        ${summary}

        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="btn" id="approveBtn">Approve</button>
          <button class="btn danger" id="rejectBtn">Reject</button>
        </div>
      </div>
    `;
  }

  // ✅ Print statement safe-call (works even if function name differs)
  const printFnCall = `
    (function(){
      const fn =
        window.printCustomerStatement ||
        window.openCustomerStatement ||
        window.openAccountStatement ||
        window.openStatementModal ||
        window.openAccountStatementModal;

      if (typeof fn !== "function") {
        showToast("Print statement function not found");
        return;
      }
      fn('${c.id}');
    })()
  `;

  const toolButtons = `
  <button class="btn" onclick="openActionModal('credit')">Credit</button>
  <button class="btn" onclick="openActionModal('withdraw')">Withdraw</button>
  <button class="btn" onclick="openEmpowermentModal()">Empowerment</button>

  <button class="btn" onclick="printStatement('${c.id}')">
    Print Statement
  </button>

  <button class="btn" style="margin-top:8px" onclick="openCustomerMaintenance('${c.id}')">
   Customer Service & Maintenance
 </button>

 <button class="btn danger" onclick="requestRemoveCustomerFromList('${c.id}')">
 Delete
</button>

  <button class="btn danger" onclick="confirmAccountClosure('${c.id}')">
    Account Closure
  </button>
`;

  mBody.innerHTML = `
    ${approvalHTML}
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${toolButtons}
    </div>
  `;

  if (approval && canAct) {
    const approveBtn = document.getElementById("approveBtn");
    const rejectBtn = document.getElementById("rejectBtn");

    if (approveBtn) {
  approveBtn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    approveBtn.disabled = true;

    await processApproval(approval.id, "approve");
    window.activeApprovalId = null;
    renderToolsTab();
  };
}

    if (rejectBtn) {
  rejectBtn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    rejectBtn.disabled = true;

    await processApproval(approval.id, "reject");
    window.activeApprovalId = null;
    renderToolsTab();
  };
}

    const sel = document.getElementById("approvalSelect");
    if (sel) {
      sel.onchange = () => {
        window.activeApprovalId = sel.value;
        renderToolsTab();
      };
    }
  }
}
window.renderToolsTab = renderToolsTab;



// ============================================================
// QUICK ACTION LOGIC — CREDIT, WITHDRAW, FREEZE, DELETE, REFRESH
// ============================================================

// 1. Open credit/withdraw modal *with correct customer context*
async function openActionModal(type) {
  const staff = currentStaff?.();
if (staff && staff.role === "teller") {
  const d = new Date().toISOString().slice(0,10);
  const refOpen = `OPENFLOAT|${staff.id}|${d}`;
  const acc = ensureStaffAccount(staff.id);
  const hasOpen = (acc.entries || []).some(e => e.refId === refOpen && e.type === "opening_float");
  if (!hasOpen) {
    showToast("Declare Opening Balance first");
    openDeclareFloatModal(d);
    return;
  }
}
  const c = state.customers.find(x => x.id === activeCustomerId);
  if (!c) return;
  if (c.frozen) return showToast("Account is frozen");

  let lastAmount = "";
  let lastDesc = "";

  while (true) {
    const f = document.createElement("div");
    f.innerHTML = `
      <div style="display:flex;gap:8px">
        <input id="actAmt" class="input" placeholder="Amount" value="${lastAmount}" />
      </div>
      <div style="margin-top:8px">
        <input id="actDesc" class="input" placeholder="Description (required)" value="${lastDesc}" />
      </div>
    `;

    const ok = await openModalGeneric(
      (type === "credit" ? "Credit " : "Withdraw ") + c.name,
      f,
      type === "credit" ? "Credit" : "Withdraw"
    );

    if (!ok) {
      closeTxModal?.();
      return;
    }

    const amtRaw = f.querySelector("#actAmt").value;
    const descRaw = f.querySelector("#actDesc").value;

    const amt = Number(amtRaw || 0);
    const desc = (descRaw || "").trim();

    // preserve for next loop
    lastAmount = amtRaw;
    lastDesc = descRaw;

    if (amt <= 0) {
      showToast("Enter valid amount");
      continue;
    }

    if (!desc) {
      showToast("Description is required for audit");
      continue;
    }

    await processTransaction({
      type,
      customerId: c.id,
      amount: amt,
      desc
    });

    // ✅ success: stop loop
    break;
  }

  // Extra safety: ensure modal is closed even if processTransaction changes later
  closeTxModal?.();
}


// 4. Reload profile tab after credit / withdraw
function refreshAfterTransaction() {
  renderProfileTab();
  renderTransactionsTab();
  renderCustomers();
}

 
  function renderTransactionsTab() {
    const c = state.customers.find((x) => x.id === activeCustomerId);
    if (!c) return;
    mBody.innerHTML = "";
    const list = document.createElement("div");
    if (!c.transactions || !c.transactions.length)
      list.innerHTML = '<div class="small">No transactions</div>';
    else {
      for (const t of c.transactions.slice().reverse()) {
  const r = document.createElement("div");
  r.className = "tx-row clickable";
  r.style.cursor = "pointer";

  r.innerHTML = `
    <div style="display:flex;justify-content:space-between">
      <div>
        <strong>${t.type}</strong>
        <div class="small muted">${t.desc || ""}</div>
      </div>
      <div><b>${fmt(t.amount)}</b></div>
    </div>
    <div class="small muted">
      ${new Date(t.date).toLocaleString()} • ${t.actor || "—"}
    </div>
  `;

  r.onclick = () => openTransactionDetails(t.id);
  list.appendChild(r);
}
    mBody.appendChild(list);
  }
  }

  function refreshCustomerProfile(forceTab = "profile") {
  // Only run if customer modal is open
  const modalBack = document.getElementById("custModalBack");
  if (!modalBack || modalBack.style.display !== "flex") return;

  // Force the tab to truly render (not just highlight)
  window.forceModalTab = forceTab;

  // Ensure DOM is ready before switching tab
  setTimeout(() => {
    if (typeof setActiveTab === "function") {
      setActiveTab(forceTab);   // ✅ this renders + highlights correctly
    } else {
      // fallback: at least render profile content
      if (typeof renderProfileTab === "function") renderProfileTab();
    }
  }, 0);
}
window.refreshCustomerProfile = refreshCustomerProfile;

async function requestRemoveCustomerFromList(customerId) {
  const c = (state.customers || []).find(x => x.id === customerId);
  if (!c) return showToast("Customer not found");

  if (c.archived) {
    showToast("Customer already removed from list");
    return;
  }

  const staff = currentStaff?.();
  if (!staff) return showToast("Select staff");

  // Confirm
  const ok = await openModalGeneric(
    "Delete Customer (Remove from List)",
    `
      <div class="small">
        You are about to <b>remove</b> <b>${c.name}</b> (Acct: <b>${c.accountNumber || "—"}</b>)
        from the customer list.<br/><br/>
        <b>Note:</b> Records will remain for audit and statements.
      </div>
    `,
    "Send Request",
    true
  );
  if (!ok) return;

  // Ask for reason (required)
  const box = document.createElement("div");
  box.innerHTML = `
    <div class="small">
      Reason / Note <span class="req">*</span>
    </div>
    <textarea id="delReason" class="input" style="height:90px" placeholder="Why are you removing this customer from list?"></textarea>
  `;

  const ok2 = await openModalGeneric("Reason Required", box, "Submit", true);
  if (!ok2) return;

  const reason = (box.querySelector("#delReason")?.value || "").trim();
  if (!reason) return showToast("Reason is required");

  const now = new Date().toISOString();

  const patch = {
    archived: true,
    archivedAt: now
  };

  state.approvals = state.approvals || [];
  state.approvals.unshift({
    id: uid("ap"),
    type: "customer_maintenance",
    status: "pending",

    requestedAt: now,
    requestedBy: staff.id,
    requestedByName: staff.name,

    createdAt: now,
    createdBy: staff.id,
    createdByName: staff.name,

    customerId: c.id,
    customerName: c.name,
    accountNumber: c.accountNumber,
    amount: 0,

    payload: {
      customerId: c.id,
      accountNumber: c.accountNumber,
      customerName: c.name,
      action: "hide",     // ✅ your handleApprovalAction already supports hide/restore
      reason,
      patch
    }
  });

  await pushAudit(
    staff.name,
    staff.role,
    "customer_remove_from_list_requested",
    { customerId: c.id, action: "hide", reason }
  );

  save?.();
  renderApprovals?.();
  showToast("Delete request sent for approval");
}
window.requestRemoveCustomerFromList = requestRemoveCustomerFromList;

  // transaction modal
  function openTransactionModal(txId, custId) {
    const c = state.customers.find((x) => x.id === custId);
    if (!c) return;
    const t = c.transactions.find((x) => x.id === txId);
    if (!t) return;

    // Determine TX badge
    let badgeClass = "tx-credit";
    if (t.type === "withdraw") badgeClass = "tx-withdraw";
    if (t.type === "adjust") badgeClass = "tx-adjust";
    if (t.type.startsWith("reverse")) badgeClass = "tx-reverse";

    txModalBack.style.display = "flex";

    txTitle.innerHTML = `
    <span class="tx-badge ${badgeClass}">${t.type.toUpperCase()}</span>
  `;

    // Modal body layout with metadata
    txBody.innerHTML = `
    <div class="modal-section">
      <div class="kv-col">
        <div class="kv-label">Amount</div>
        <div class="kv-value">${fmt(t.amount)}</div>
      </div>

      <div class="kv-col">
        <div class="kv-label">Date</div>
        <div class="kv-value">${new Date(t.date).toLocaleString()}</div>
      </div>
    </div>

    <div class="modal-section">
      <div class="kv-col">
        <div class="kv-label">Transaction ID</div>
        <div class="kv-value">${t.id}</div>
        <button class="copy-btn" onclick="navigator.clipboard.writeText('${
          t.id
        }')">Copy ID</button>
      </div>

      <div class="kv-col">
        <div class="kv-label">Customer ID</div>
        <div class="kv-value">${c.id}</div>
      </div>

      <div class="kv-col">
        <div class="kv-label">Performed By</div>
        <div class="kv-value">${t.actor}</div>
      </div>

      <div class="kv-col">
        <div class="kv-label">Description</div>
        <div class="kv-label" style="margin-top:10px;">Audit Hash</div>
<div class="kv-value" style="word-break:break-all;">${t.hash || "N/A"}</div>
<button class="copy-btn" onclick="navigator.clipboard.writeText('${
      t.hash || ""
    }')">Copy Hash</button>

        <div class="kv-value">${t.desc || ""}</div>
      </div>
    </div>
  `;

    // Role-based actions
    const cur = currentStaff();
    if (cur && (cur.role === "manager" || cur.role === "ceo")) {
      const dangerZone = document.createElement("div");
      dangerZone.className = "modal-section";

      const btnRev = document.createElement("button");
      btnRev.className = "btn";
      btnRev.style.background = "#e67e22";
      btnRev.textContent = "Reverse Transaction";
      btnRev.onclick = () => {
        reverseTransaction(custId, txId);
        closeTxModal();
      };

      const btnDel = document.createElement("button");
      btnDel.className = "input";
      btnDel.style.border = "1px solid #e74c3c";
      btnDel.style.color = "#e74c3c";
      btnDel.textContent = "Delete Transaction";
      btnDel.onclick = () => {
        deleteTransaction(custId, txId);
        closeTxModal();
      };

      dangerZone.appendChild(btnRev);
      dangerZone.appendChild(btnDel);
      txBody.appendChild(dangerZone);
    }
  }
  window.openTransactionModal = openTransactionModal;
  
  function closeTxModal() {
  const back = document.getElementById("txModalBack");
  if (back) back.style.display = "none";
}
window.closeTxModal = closeTxModal;

  async function openEditCustomer(id) {
    const c = state.customers.find((x) => x.id === id);
    if (!c) return;
    const f = document.createElement("div");
    f.innerHTML = `<div style="display:flex;gap:8px"><input id="eName" class="input" value="${c.name}"/><input id="ePhone" class="input" value="${c.phone}"/></div>`;
    const ok = await openModalGeneric("Edit Customer", f, "Save");
    if (ok) {
      c.name = f.querySelector("#eName").value.trim();
      c.phone = f.querySelector("#ePhone").value.trim();
      pushAudit(
        currentStaff().name,
        currentStaff().role,
        "edit_customer",
        JSON.stringify({ id: c.id, name: c.name, phone: c.phone })
      );
      save();
      renderCustomers();
      showToast("Saved");
      mTitle.textContent = c.name;
    }
  }

  async function toggleFreeze(id) {
  const c = state.customers.find(x => x.id === id);
  if (!c) return;

  const ok = await openModalGeneric(
    c.frozen ? "Unfreeze Account" : "Freeze Account",
    `<div class="small">
      Are you sure you want to ${c.frozen ? "unfreeze" : "freeze"} this account?
    </div>`,
    "Confirm"
  );

  if (!ok) return;

  state.approvals.push({
    id: uid("ap"),
    type: "freeze",
    action: c.frozen ? "unfreeze" : "freeze",
    customerId: c.id,
    requestedBy: currentStaff().id,
    requestedAt: new Date().toISOString(),
    status: "pending"
  });

  save();
  renderApprovals();
  showToast("Freeze action sent for approval");
}

function refreshEmpowermentDrilldownHeader() {
  const totals = calculateFilteredEmpowermentTotals();

  document.getElementById("empCapGiven").textContent = fmt(totals.capitalGiven);
  document.getElementById("empCapRepaid").textContent = fmt(totals.principalRepaid);
  document.getElementById("empIntEarned").textContent = fmt(totals.interestEarned);
  document.getElementById("empOutstanding").textContent = fmt(totals.outstandingCapital);
}
window.refreshEmpowermentDrilldownHeader = refreshEmpowermentDrilldownHeader;

  async function openEmpowermentModal() {
  const c = state.customers.find(x => x.id === activeCustomerId);
  if (!c) return showToast("No customer selected");

  let lastAmount = "";
  let lastPurpose = "";
  let lastInterestRate = ""; // percent

  while (true) {
    const box = document.createElement("div");
    box.innerHTML = `
      <div class="small">Request Empowerment</div>

      <div style="margin-top:8px">
        <input id="empAmt" class="input" placeholder="Amount" value="${lastAmount}"/>
        <input id="empInterestRate" class="input" placeholder="Interest (%)" value="${lastInterestRate}"/>
      </div>

      <div style="margin-top:8px">
        <input id="empPurpose" class="input" placeholder="Purpose (required)" value="${lastPurpose}"/>
      </div>

      <div class="small muted" style="margin-top:8px">
        Example: 10 means 10% of the amount.
      </div>
    `;

    const ok = await openModalGeneric("Empowerment Request", box, "Submit");
    if (!ok) {
      closeTxModal?.();
      return;
    }

    const amtRaw = box.querySelector("#empAmt")?.value;
    const purposeRaw = box.querySelector("#empPurpose")?.value;
    const rateRaw = box.querySelector("#empInterestRate")?.value;

    const amount = Number(amtRaw || 0);
    const purpose = (purposeRaw || "").trim();

    // allow decimals like 7.5
    const interestRate = Number(rateRaw || 0);

    // preserve for next loop
    lastAmount = amtRaw || "";
    lastPurpose = purposeRaw || "";
    lastInterestRate = rateRaw || "";

    if (amount <= 0) {
      showToast("Enter a valid amount");
      continue;
    }

    if (!purpose) {
      showToast("Purpose is required for empowerment audit");
      continue;
    }

    if (isNaN(interestRate) || interestRate < 0) {
      showToast("Enter a valid interest percentage");
      continue;
    }

    // optional guard (edit if you want to allow >100%)
    if (interestRate > 100) {
      showToast("Interest % cannot exceed 100");
      continue;
    }

    // ✅ CRITICAL: keep engine stable by sending naira interest too
    const interest = Math.round((amount * interestRate) / 100);

    await processTransaction({
      type: "empowerment",
      customerId: c.id,
      amount,
      desc: purpose,

      // for display/reference
      interestRate,

      // for existing approval + loan engine
      interest
    });

    break;
  }

  closeTxModal?.();
}


function openTransactionSummaryModal() {
  const entries = (state.accountEntries || [])
    .filter(e => entryMatchesFilter(e.date))
    .sort((a,b) => new Date(b.date) - new Date(a.date));

  if (!entries.length) {
    openModalGeneric("Transactions", "<div class='small muted'>No transactions in this period.</div>");
    return;
  }

  const rows = entries.map(e => `
  <div style="padding:12px; border-radius:8px; margin-bottom:10px; cursor:pointer;"
       onclick="jumpToAccountEntry('${e.accountId}', '${e.id}')">
      <b>${formatDateTime(e.date)}</b>
      Amount: <b>${fmt(e.amount)}</b><br/>
      Type: ${e.type}
    </div>
  `).join("");

  openModalGeneric(
  "Transaction Summary",
  `<div style="max-height:65vh; overflow-y:auto; padding-right:6px;">${rows}</div>`
);
}
window.openTransactionSummaryModal = openTransactionSummaryModal;


function openCreditAllocationModal(cust, amount) {
  return new Promise(resolve => {

    // 🔥 GET REAL OUTSTANDING FROM NEW ENGINE
    const activeLoan = (state.empowerments || []).find(e =>
      e.customerId === cust.id && e.status !== "completed"
    );

    let maxEmp = 0;

    if (activeLoan) {
      const principalLeft = activeLoan.principalGiven - activeLoan.principalRepaid;
      const interestLeft = (state.empowerments || []).reduce((sum, e) => {
  if (e.status === "completed") return sum;
  if (e.customerId !== cust.id) return sum; // ✅ critical filter
  const remaining = Number(e.expectedInterest || 0) - Number(e.interestRepaid || 0);
  return sum + (remaining > 0 ? remaining : 0);
}, 0);
      maxEmp = principalLeft + interestLeft;
    }

    const wrapper = document.createElement("div");

    wrapper.innerHTML = `
      <div class="small" style="margin-bottom:10px">
        Credit Amount: <b>${fmt(amount)}</b>
      </div>

      <div class="kv">
  <div class="kv-label">Repay Empowerment</div>
  <input id="allocEmp" class="input" type="number" min="0" placeholder="0" style="width:100%">
</div>

      <div class="kv" style="margin-top:8px">
  <div class="kv-label">Credit Balance</div>
  <input id="allocBal" class="input" type="number" min="0" value="${amount}" style="width:100%">
</div>

      <div class="small muted" style="margin-top:10px">
        Outstanding Empowerment: <b>${fmt(maxEmp)}</b>
      </div>

      <div id="allocError" class="small danger" style="margin-top:8px;display:none"></div>
    `;

    openModalGeneric("Split Credit Allocation", wrapper, "Apply")
      .then(ok => {
        if (!ok) return resolve(null);

        const emp = Number(wrapper.querySelector("#allocEmp").value);
        const bal = Number(wrapper.querySelector("#allocBal").value);

        resolve({ emp, bal });
      });

    const empInput = wrapper.querySelector("#allocEmp");
    const balInput = wrapper.querySelector("#allocBal");
    const err = wrapper.querySelector("#allocError");

    function syncFromEmp() {
      let emp = Number(empInput.value || 0);

      if (emp < 0) emp = 0;
      if (emp > maxEmp) emp = maxEmp;
      if (emp > amount) emp = amount;

      empInput.value = emp;
      balInput.value = amount - emp;
      err.style.display = "none";
    }

    function syncFromBal() {
      let bal = Number(balInput.value || 0);

      if (bal > amount) bal = amount;
      if (bal < 0) bal = 0;

      balInput.value = bal;
      empInput.value = amount - bal;

      if (empInput.value > maxEmp) {
        empInput.value = maxEmp;
        balInput.value = amount - maxEmp;
      }

      validate();
    }

    function validate() {
      const emp = Number(empInput.value);
      const bal = Number(balInput.value);

      if (emp + bal !== amount) {
        err.textContent = "Allocation must equal credit amount";
        err.style.display = "block";
        return false;
      }

      err.style.display = "none";
      return true;
    }

    empInput.addEventListener("input", syncFromEmp);
    balInput.addEventListener("input", syncFromBal);
  });
}
window.openCreditAllocationModal = openCreditAllocationModal;


function openEmpowermentSummaryModal() {
  const given = sumEmpowermentDisbursed();
  const principalBack = sumEmpowermentPrincipalRepaid();
  const interest = sumEmpowermentInterest();
  const balance = calculateEmpowermentBalance();

  const html = `
    <div class="card small">
      <div>Empowerment Given: <b>${fmt(given)}</b></div>
      <div>Principal Returned: <b>${fmt(principalBack)}</b></div>
      <div>Interest Earned: <b>${fmt(interest)}</b></div>
      <hr/>
      <div>
        Net Empowerment Position:
        <b style="color:${balance >= 0 ? 'green' : 'red'}">
          ${fmt(balance)}
        </b>
      </div>
    </div>
  `;

  openModalGeneric("Empowerment Balance", html);
}
window.openEmpowermentSummaryModal = openEmpowermentSummaryModal;


async function confirmDeleteCustomer(id) {
    const cur = currentStaff();
    if (!cur) return showToast("Select staff");
    if (cur.role !== "ceo") return showToast("Only CEO can delete");
    const ok = await openModalGeneric(
      "Delete Customer",
      '<div class="small">Are you sure? This will remove customer and transactions.</div>',
      "Delete"
    );
    if (ok) deleteCustomer(id);
  } 


  
  function deleteCustomer(id) {

  const idx = state.customers.findIndex((x) => x.id === id);

  if (idx < 0) return;



  const c = state.customers[idx];

  state.customers.splice(idx, 1);



  pushAudit(

    currentStaff().name,

    currentStaff().role,

    "delete_customer",

    JSON.stringify({ id: c.id, name: c.name })

  );



  save();

  renderCustomers();



  // ✅ ONLY HERE we clear active customer

  activeCustomerId = null;

  closeCustomerModal();



  showToast("Deleted");

}

  function reverseTransaction(custId, txId) {
    const c = state.customers.find((x) => x.id === custId);
    if (!c) return;
    const t = c.transactions.find((x) => x.id === txId);
    if (!t) return;
    const staff = currentStaff();
    if (!(staff && (staff.role === "manager" || staff.role === "ceo")))
      return showToast("Not permitted");
    const now = new Date().toISOString();
    if (t.type === "credit") {
      c.balance -= t.amount;
      c.transactions.push({
        id: uid("tx"),
        type: "reverse_credit",
        amount: -t.amount,
        date: now,
        desc: "Reversal of " + t.id,
        actor: staff.name,
      });
    } else if (t.type === "withdraw") {
      c.balance += t.amount;
      c.transactions.push({
        id: uid("tx"),
        type: "reverse_withdraw",
        amount: t.amount,
        date: now,
        desc: "Reversal of " + t.id,
        actor: staff.name,
      });
    } else return showToast("Cannot reverse");
    pushAudit(
      staff.name,
      staff.role,
      "reverse_tx",
      JSON.stringify({ custId, txId })
    );
    save();
    renderCustomers();
    renderTransactionsTab();
    showToast("Reversed");
    updateChartData();
  }

  function deleteTransaction(custId, txId) {
    const c = state.customers.find((x) => x.id === custId);
    if (!c) return;
    const idx = c.transactions.findIndex((x) => x.id === txId);
    if (idx < 0) return;
    const staff = currentStaff();
    if (!(staff && (staff.role === "manager" || staff.role === "ceo")))
      return showToast("Not permitted");
    const t = c.transactions[idx];
    if (t.type === "credit" || t.type === "adjust") c.balance -= t.amount;
    if (t.type === "withdraw") c.balance += t.amount;
    c.transactions.splice(idx, 1);
    pushAudit(
      staff.name,
      staff.role,
      "delete_tx",
      JSON.stringify({ custId, txId })
    );
    save();
    renderCustomers();
    renderTransactionsTab();
    showToast("Deleted tx");
    updateChartData();
  }

document.getElementById("submitTx").onclick = () => {
  console.log("🔥 SUBMIT BUTTON CLICKED");
};

function _stmtPeriodLine(fromISO, toISO) {
  const f = (fromISO || "").trim();
  const t = (toISO || "").trim();
  if (!f && !t) return ""; // nothing to show
  return `Statement Period: <b>${f || "—"}</b> to <b>${t || "—"}</b>`;
}


function _txInRange(txDate, fromISO, toISO) {
  if (!txDate) return false;
  const d = new Date(txDate);
  if (isNaN(d)) return false;

  // fromISO/toISO are "YYYY-MM-DD"
  const from = fromISO ? new Date(fromISO + "T00:00:00") : null;
  const to = toISO ? new Date(toISO + "T23:59:59") : null;

  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function _isSavingsTx(t) {
  return t && (t.type === "credit" || t.type === "withdraw");
}

function _savingsTxns(customer) {
  // only credit/withdraw affect savings balance
  return (customer.transactions || [])
    .filter(_isSavingsTx)
    .map(t => ({
      ...t,
      amount: Number(t.amount || 0),
      date: t.date
    }))
    .filter(t => t.date) // avoid Invalid Date
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function _netMovement(txns, fromISO, toISO) {
  // net = credits - withdrawals within range
  let net = 0;
  for (const t of txns) {
    if (!_txInRange(t.date, fromISO, toISO)) continue;
    if (t.type === "credit") net += Number(t.amount || 0);
    if (t.type === "withdraw") net -= Number(t.amount || 0);
  }
  return net;
}

function _balanceAtStartOf(customer, fromISO) {
  // Opening at start of "from" = currentBalance - net(from -> today)
  const currentBal = Number(customer.balance || 0);
  if (!fromISO) return currentBal;

  const savings = _savingsTxns(customer);
  const todayISO = new Date().toISOString().slice(0, 10);

  const netFromToToday = _netMovement(savings, fromISO, todayISO);
  return currentBal - netFromToToday;
}

function _balanceAtEndOf(customer, toISO) {
  // Closing at end of "to" = currentBalance - net((to+1 day) -> today)
  const currentBal = Number(customer.balance || 0);
  if (!toISO) return currentBal;

  const savings = _savingsTxns(customer);
  const todayISO = new Date().toISOString().slice(0, 10);

  const nextDay = new Date(toISO + "T00:00:00");
  nextDay.setDate(nextDay.getDate() + 1);
  const afterToISO = nextDay.toISOString().slice(0, 10);

  const netAfterToToToday = _netMovement(savings, afterToISO, todayISO);
  return currentBal - netAfterToToToday;
}


// ✅ Legacy compatibility — DO NOT delete old calls
function printStatement(x) {
  // Accept: customerId | accountNumber | customer object
  let customerId = x;

  if (x && typeof x === "object" && x.id) {
    customerId = x.id;
  }

  // If they passed accountNumber instead of id
  if (typeof customerId === "string" && !customerId.startsWith("c")) {
    const byAcc = (state.customers || []).find(
      c => String(c.accountNumber) === String(customerId)
    );
    if (byAcc) customerId = byAcc.id;
  }

  return printCustomerStatement(customerId);
}
window.printStatement = printStatement;

// Helper: normalize types for display
function prettyTxType(t) {
  const m = {
    credit: "CREDIT",
    withdraw: "WITHDRAW",
    empowerment_disbursement: "EMPOWERMENT (DISBURSE)",
    empowerment_repayment_principal: "EMPOWERMENT (PRINCIPAL REPAY)",
    empowerment_repayment_interest: "EMPOWERMENT (INTEREST REPAY)"
  };
  return m[t] || String(t || "").toUpperCase();
}

// Helper: collect statement txns (customer + empowerment-related)
function _statementTxns(customer) {
  const custTx = (customer.transactions || []).map(t => ({
    ...t,
    _src: "customer",
    amount: Number(t.amount || 0),
    date: t.date,
    type: t.type,
    desc: t.desc || t.note || ""
  }));

  const empTx = (state.transactions || [])
    .filter(t =>
      t &&
      t.customerId === customer.id &&
      (
        t.type === "empowerment_disbursement" ||
        t.type === "empowerment_repayment_principal" ||
        t.type === "empowerment_repayment_interest"
      )
    )
    .map(t => ({
      ...t,
      _src: "state",
      amount: Number(t.amount || 0),
      date: t.date,
      type: t.type,
      desc: t.desc || ""
    }));

  // merge + sort oldest -> newest (avoid invalid date bugs)
  return [...custTx, ...empTx]
    .filter(t => t && t.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ✅ PRINTABLE STATEMENT (bank-style layout)
function printCustomerStatement(customerId, fromISO = "", toISO = "") {
  const customer = (state.customers || []).find(c => c.id === customerId);
  if (!customer) return showToast("Customer not found");

  // ✅ default: TODAY only (prevents huge print by default)
const todayISO = new Date().toISOString().slice(0, 10);

// If no range provided → today
if (!fromISO && !toISO) {
  fromISO = todayISO;
  toISO = todayISO;
}

// If only one side provided → treat as single-day range
if (fromISO && !toISO) toISO = fromISO;
if (!fromISO && toISO) fromISO = toISO;

let txns = _statementTxns(customer);
txns = txns.filter(t => _txInRange(t.date, fromISO, toISO));


  // SAVINGS totals
  // Savings totals (BANK STYLE)
const savingsAll = _savingsTxns(customer);

// Range credits/withdrawals
let credits = 0;
let withdrawals = 0;

for (const t of savingsAll) {
  if (!_txInRange(t.date, fromISO, toISO)) continue;
  if (t.type === "credit") credits += Number(t.amount || 0);
  if (t.type === "withdraw") withdrawals += Number(t.amount || 0);
}

const net = credits - withdrawals;

// ✅ true balances at range boundaries
const openingBal = _balanceAtStartOf(customer, fromISO);
const closingBal = _balanceAtEndOf(customer, toISO);

// ✅ running balance starts from true opening balance
let rb = openingBal;

  // EMPOWERMENT totals
  let empDisbursed = 0;
  let empRepaidPrincipal = 0;
  let empRepaidInterest = 0;

  for (const t of txns) {
    const amt = Number(t.amount || 0);
    if (t.type === "empowerment_disbursement") empDisbursed += amt;
    if (t.type === "empowerment_repayment_principal") empRepaidPrincipal += amt;
    if (t.type === "empowerment_repayment_interest") empRepaidInterest += amt;
  }

  const empRepaidTotal = empRepaidPrincipal + empRepaidInterest;
  const empOutstanding = empDisbursed - empRepaidPrincipal;

  const rows = txns.map((t, i) => {
    if (t.type === "credit") rb += Number(t.amount || 0);
    if (t.type === "withdraw") rb -= Number(t.amount || 0);

    const when = t.date ? new Date(t.date) : null;
    const dateStr = when && !isNaN(when) ? when.toLocaleString() : "—";

    const desc = (t.desc || "").toString()
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return `
      <tr>
        <td>${i + 1}</td>
        <td>${dateStr}</td>
        <td>${customer.name}</td>
        <td class="amount">${fmt(t.amount)}</td>
        <td class="type">${prettyTxType(t.type)}</td>
        <td class="desc">${desc}</td>
        <td class="rb">${fmt(rb)}</td>
      </tr>
    `;
  }).join("");

  const w = window.open("", "", "width=1200,height=900");
  if (!w) return showToast("Popup blocked. Allow popups to print.");

  w.document.write(`
<!doctype html>
<html>
<head>
  <title>Account Statement - ${customer.name}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Arial, sans-serif; padding: 14px; color:#111; }
    h2 { margin: 0 0 4px 0; font-size: 16px; }
    .meta { margin: 0 0 8px 0; font-size: 12px; color:#333; line-height: 1.35; }
    .note { font-size: 11px; color:#555; margin-top: 4px; }
    .section-title { margin: 10px 0 6px 0; font-weight: 700; font-size: 12px; color:#222; }

    .totals{
      display:grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap:8px;
      margin: 6px 0 10px 0;
      font-size: 12px;
    }
    .totals .box{
      border:1px solid #ddd;
      border-radius:8px;
      padding:6px 8px;
      min-width: 0;
    }
    .totals .box b{ font-size:11px; display:block; color:#333; }
    .totals .box div:last-child{ font-weight:700; margin-top:2px; }

    table{
      width:100%;
      border-collapse:collapse;
      font-size: 11.5px;
      table-layout: fixed;
    }
    th, td{ border:1px solid #ddd; padding:6px 7px; vertical-align: top; }
    th{ background:#f5f5f5; text-align:left; font-size: 11px; }

    td.type{
      white-space: nowrap;
      word-break: normal;
    }
    td.desc{
      white-space: normal;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    td.amount, td.rb{
      text-align:right;
      white-space: nowrap;
    }

    .footer { margin-top: 8px; font-size: 11px; color:#666; }
  </style>
</head>
<body>
  <h2>Customer Account Statement</h2>

  <div class="meta">
    <b>${customer.name}</b><br/>
    Account No: <b>${customer.accountNumber || "—"}</b><br/>
    Phone: ${customer.phone || "—"} &nbsp; • &nbsp;
    Date Printed: ${new Date().toLocaleString()}
    <div class="note">${_stmtPeriodLine(fromISO, toISO)}</div>
    <div class="note"><b>Amounts in Naira (₦)</b></div>
  </div>

  <div class="section-title">Savings Summary</div>
  <div class="totals">
    <div class="box"><b>Opening Balance</b><div>${fmt(openingBal)}</div></div>
    <div class="box"><b>Total Credits</b><div>${fmt(credits)}</div></div>
    <div class="box"><b>Total Withdrawals</b><div>${fmt(withdrawals)}</div></div>
    <div class="box"><b>Net Movement</b><div>${fmt(net)}</div></div>
    <div class="box"><b>Closing Balance</b><div>${fmt(closingBal)}</div></div>
  </div>

  <div class="section-title">Empowerment Summary</div>
  <div class="totals">
    <div class="box"><b>Total Disbursed</b><div>${fmt(empDisbursed)}</div></div>
    <div class="box"><b>Repaid Principal</b><div>${fmt(empRepaidPrincipal)}</div></div>
    <div class="box"><b>Repaid Interest</b><div>${fmt(empRepaidInterest)}</div></div>
    <div class="box"><b>Total Repaid</b><div>${fmt(empRepaidTotal)}</div></div>
    <div class="box"><b>Principal Outstanding</b><div>${fmt(empOutstanding)}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px">S/N</th>
        <th style="width:150px">Date</th>
        <th style="width:140px">Customer Name</th>
        <th style="width:110px;text-align:right">Amount</th>
        <th style="width:190px">Type</th>
        <th>Description</th>
        <th style="width:120px;text-align:right">Running Balance</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="7" style="text-align:center;color:#666">No transactions yet</td></tr>`}
    </tbody>
  </table>

  <div class="footer">This statement is system-generated.</div>
  <script>
    window.onload = () => window.print();
  </script>
</body>
</html>
  `);

  w.document.close();
}

// ✅ IN-APP MODAL PREVIEW (fixed columns + fixed footer buttons)
function openCustomerStatement(customerId, fromISO = "", toISO = "") {
  const customer = (state.customers || []).find(c => c.id === customerId);
  if (!customer) return showToast("Customer not found");

  // ✅ default: TODAY only (prevents huge statement by default)
const todayISO = new Date().toISOString().slice(0, 10);

// If no range provided → today
if (!fromISO && !toISO) {
  fromISO = todayISO;
  toISO = todayISO;
}

// If only one side provided → treat as single-day range
if (fromISO && !toISO) toISO = fromISO;
if (!fromISO && toISO) fromISO = toISO;

  const allTxns = _statementTxns(customer);
  const txns = allTxns.filter(t => _txInRange(t.date, fromISO, toISO));

  // Savings totals (BANK STYLE)
const savingsAll = _savingsTxns(customer);

// Range credits/withdrawals
let credits = 0;
let withdrawals = 0;

for (const t of savingsAll) {
  if (!_txInRange(t.date, fromISO, toISO)) continue;
  if (t.type === "credit") credits += Number(t.amount || 0);
  if (t.type === "withdraw") withdrawals += Number(t.amount || 0);
}

const net = credits - withdrawals;

// ✅ true balances at range boundaries
const openingBal = _balanceAtStartOf(customer, fromISO);
const closingBal = _balanceAtEndOf(customer, toISO);

// ✅ running balance starts from true opening balance
let rb = openingBal;

// Empowerment totals
let empDisbursed = 0;
let empRepaidPrincipal = 0;
let empRepaidInterest = 0;

for (const t of txns) {
  const amt = Number(t.amount || 0);
  if (t.type === "empowerment_disbursement") empDisbursed += amt;
  if (t.type === "empowerment_repayment_principal") empRepaidPrincipal += amt;
  if (t.type === "empowerment_repayment_interest") empRepaidInterest += amt;
}

const empRepaidTotal = empRepaidPrincipal + empRepaidInterest;
const empOutstanding = empDisbursed - empRepaidPrincipal;

  const rows = txns.map((t, i) => {
    if (t.type === "credit") rb += Number(t.amount || 0);
    if (t.type === "withdraw") rb -= Number(t.amount || 0);

    const when = t.date ? new Date(t.date) : null;
    const dateStr = when && !isNaN(when) ? when.toLocaleString() : "—";

    const desc = (t.desc || "").toString()
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return `
      <tr>
        <td>${i + 1}</td>
        <td>${dateStr}</td>
        <td>${customer.name}</td>
        <td class="amount">${fmt(t.amount)}</td>
        <td class="type">${prettyTxType(t.type)}</td>
        <td class="desc">${desc}</td>
        <td class="rb">${fmt(rb)}</td>
      </tr>
    `;
  }).join("");

  const wrapper = document.createElement("div");

  wrapper.innerHTML = `
    <div style="font-size:12px;color:#555;margin-bottom:8px">
      <b>Amounts in Naira (₦)</b>
    </div>

    <div style="margin-bottom:10px;line-height:1.4">
      <div style="font-weight:700;font-size:15px">${customer.name}</div>
      <div class="small">Account No: ${customer.accountNumber || "—"}</div>
      <div class="small">Phone: ${customer.phone || "—"}</div>
      <div class="small muted">${_stmtPeriodLine(fromISO, toISO)}</div>
    </div>

    <!-- DATE RANGE FILTER -->
    <div style="display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin:10px 0 12px 0">
      <div>
        <div class="small muted">From</div>
        <input id="stmtFrom" type="date" class="input" value="${fromISO}">
      </div>
      <div>
        <div class="small muted">To</div>
        <input id="stmtTo" type="date" class="input" value="${toISO}">
      </div>
      <button class="btn" id="stmtApply">Filter</button>
      <button class="btn ghost" id="stmtReset">Reset</button>
      <div class="small muted" style="margin-left:auto">
        Showing: <b>${txns.length}</b> of ${allTxns.length}
      </div>
    </div>

    <div style="font-weight:700;margin:10px 0 6px 0;">Savings Summary</div>
    <div style="display:grid;grid-template-columns: repeat(5, minmax(0, 1fr));gap:8px;margin-bottom:14px;">
      <div class="badge">Opening: ${fmt(openingBal)}</div>
      <div class="badge">Credits: ${fmt(credits)}</div>
      <div class="badge">Withdrawals: ${fmt(withdrawals)}</div>
      <div class="badge">Net: ${fmt(net)}</div>
      <div class="badge">Closing: ${fmt(closingBal)}</div>
    </div>

    <div style="font-weight:700;margin:6px 0 6px 0;">Empowerment Summary</div>
    <div style="display:grid;grid-template-columns: repeat(5, minmax(0, 1fr));gap:8px;margin-bottom:14px;">
      <div class="badge">Disbursed: ${fmt(empDisbursed)}</div>
      <div class="badge">Repaid Principal: ${fmt(empRepaidPrincipal)}</div>
      <div class="badge">Repaid Interest: ${fmt(empRepaidInterest)}</div>
      <div class="badge">Total Repaid: ${fmt(empRepaidTotal)}</div>
      <div class="badge">Principal Outstanding: ${fmt(empOutstanding)}</div>
    </div>

    <style>
      table.stmt-modal { width:100%; border-collapse:collapse; table-layout:fixed; font-size:13px; }
      table.stmt-modal th, table.stmt-modal td { padding:8px; border-bottom:1px solid #eef2f7; vertical-align:top; }
      table.stmt-modal th { background:#f8fafc; position:sticky; top:0; z-index:1; text-align:left; }
      table.stmt-modal td.amount, table.stmt-modal td.rb { text-align:right; white-space:nowrap; }
      table.stmt-modal td.type { white-space:nowrap; }
      table.stmt-modal td.desc { white-space:normal !important; word-break:break-word !important; overflow-wrap:anywhere !important; }
    </style>

    <div style="display:flex;flex-direction:column;height:55vh;min-width:0;">
      <div style="flex:1;overflow:auto;min-width:0;border:1px solid #e5e7eb;border-radius:10px;background:#fff;">
        <table class="stmt-modal">
          <colgroup>
            <col style="width:60px">
            <col style="width:170px">
            <col style="width:160px">
            <col style="width:130px">
            <col style="width:220px">
            <col style="width:280px">
            <col style="width:150px">
          </colgroup>
          <thead>
            <tr>
              <th>S/N</th>
              <th>Date</th>
              <th>Customer Name</th>
              <th style="text-align:right">Amount</th>
              <th>Type</th>
              <th>Description</th>
              <th style="text-align:right;white-space:nowrap;">Running Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="7" style="text-align:center;color:#666;padding:14px">No transactions in this range</td></tr>`}
          </tbody>
        </table>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px;padding-top:10px;border-top:1px solid #e5e7eb;background:#fff;">
        <button class="btn" onclick="closeTxModal(); setActiveTab('tools');">Close</button>
        <button class="btn solid" onclick="printCustomerStatement('${customerId}','${fromISO}','${toISO}')">Print</button>
      </div>
    </div>
  `;

  openModalGeneric("Account Statement", wrapper, "", false);

  // Bind filter buttons AFTER modal mounts
  const btnApply = wrapper.querySelector("#stmtApply");
  const btnReset = wrapper.querySelector("#stmtReset");
  const fromEl = wrapper.querySelector("#stmtFrom");
  const toEl = wrapper.querySelector("#stmtTo");

  if (btnApply) {
    btnApply.onclick = () => {
      const f = (fromEl && fromEl.value) || "";
      const t = (toEl && toEl.value) || "";
      openCustomerStatement(customerId, f, t);
    };
  }

  if (btnReset) {
    btnReset.onclick = () => {
      openCustomerStatement(customerId, "", "");
    };
  }
}

window.openCustomerStatement = openCustomerStatement;

window.openCustomerStatement = openCustomerStatement;
window.printCustomerStatement = printCustomerStatement;

  // =========================
// TRANSACTION PROCESSING
// =========================
async function processTransaction({ type, customerId, amount, desc, interest = 0 }) {
  if (isMarketer()) {
    showToast("Marketers cannot post financial transactions");
    return;
  }

  const staff = currentStaff();
  if (!staff) return showToast("Select staff");

  // ✅ Teller must declare Opening Float before sending CREDIT requests
if (type === "credit") {
  const selectedDate = new Date().toISOString().slice(0, 10);
  const refOpen = `OPENFLOAT|${staff.id}|${selectedDate}`;

  const staffAcc = ensureStaffAccount(staff.id);
  const hasOpen = (staffAcc.entries || []).some(e => e.refId === refOpen);

  if (!hasOpen) {
    showToast("Declare Opening Float before sending credit requests");
    openDeclareFloatModal(selectedDate); // prompt immediately
    return;
  }
}

  const cust = state.customers.find(c => c.id === customerId);
  if (!cust) return showToast("Customer missing");
  if (cust.frozen) return showToast("Customer frozen");

  amount = Number(amount || 0);
  if (amount <= 0) return showToast("Invalid amount");

  if (!desc || !desc.trim()) {
    showToast("Description is required for audit purposes");
    return;
  }
 
    const ok = await openModalGeneric(
    "Confirm Transaction",
    `
      <div class="small">
        Confirm <b>${type.toUpperCase()}</b> of
        <b>${fmt(amount)}</b> for <b>${cust.name}</b>?
      </div>
    `,
    "Send for Approval"
  );

  if (!ok) return;

  const now = new Date().toISOString();

  // 🔑 Ensure approvals array exists
  state.approvals = state.approvals || [];

  // 🔑 ALL TRANSACTIONS GO FOR APPROVAL
  state.approvals.push({
    id: uid("ap"),
    type,
    amount,
    interest: Number(interest || 0),
    customerId,
    desc,
    requestedBy: staff.id,
    requestedByName: staff.name,
    requestedAt: now,
    status: "pending"
  });

  await pushAudit(
    staff.name,
    staff.role,
    "tx_sent_for_approval",
    {
      txType: type,
      amount,
      customerId: cust.id,
      customerName: cust.name,
      description: desc
    }
  );

  window.currentEmpowermentInterest = null;

  save();

  // 🔥 FULL UI SYNC
  renderApprovals?.();
  renderDashboardApprovals?.();
  renderCustomerKycApprovals?.();
  renderCustomers?.();
  renderDashboard?.();
  renderAudit?.();
  updateChartData?.();

  closeTxModal(); // ✅ closes confirm modal
  showToast("Transaction sent for approval");
}

function drillDownApproval(approval) {
  // 1️⃣ Open the customer modal
  openCustomerModal(approval.customerId);

  // 2️⃣ Switch to profile tab
  setActiveTab("profile");

  // 3️⃣ Visual cue (optional but powerful)
  setTimeout(() => {
    const badge = document.createElement("div");
    badge.className = "badge warning";
    badge.textContent = "Pending Approval";
    document.getElementById("mMeta")?.appendChild(badge);
  }, 100);
}


function scoreApprovalRisk(app, cust) {
  let score = 0;

  if (app.amount >= 500000) score += 3;
  if (cust.balance < app.amount * 2) score += 2;

  const today = new Date().toDateString();
  const approvalsToday = state.approvals.filter(a =>
    a.customerId === cust.id &&
    a.status === "approved" &&
    new Date(a.processedAt).toDateString() === today
  ).length;

  if (approvalsToday >= 1) score += 2;

  if (cust.frozen) score += 5;

  return score >= 5 ? "high" : score >= 3 ? "medium" : "low";
}

function detectApprovalAnomalies(app, cust) {
  const flags = [];

  const recentTx = cust.transactions
    ?.filter(t => Date.now() - new Date(t.date).getTime() < 3600000) || [];

  if (recentTx.some(t => t.type === "credit"))
    flags.push("Recent credit before approval");

  if (cust.balance - app.amount < 0)
    flags.push("Approval causes negative balance");

  if (app.riskLevel === "high")
    flags.push("High risk approval");

  return flags;
}

function checkEmpowermentCleared(customerId) {
  // old empowerment engine disabled
}


async function processApproval(id, action) {
  const staff = currentStaff();
if (!canApprove()) {
  showToast("You are not authorized to approve transactions");
  return;
}
state.transactions = Array.isArray(state.transactions) ? state.transactions : [];
state.staffAccounts = state.staffAccounts || {};
const closeTxModal = () => {
  const back = document.getElementById("txModalBack");
  if (back) back.style.display = "none";
};
  const idx = state.approvals.findIndex(a => a.id === id);
  if (idx < 0) return showToast("Approval not found");

  const app = state.approvals[idx];
  if (app.status !== "pending") {
    showToast("Already processed");
    return;
  }

// =========================
// CUSTOMER CREATION APPROVAL (KYC PIPELINE)
// =========================
if (app.type === "customer_creation") {
  const p = app.payload || {};

  // Review card (Approve / Reject)
  const review = document.createElement("div");
  review.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;gap:12px;align-items:flex-start">
        ${
          p.photo
            ? `<img src="${p.photo}" style="width:72px;height:72px;border-radius:12px;object-fit:cover;border:1px solid #e5e7eb;">`
            : `<div style="width:72px;height:72px;border-radius:12px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:11px;color:#9ca3af;">No Photo</div>`
        }
        <div style="flex:1">
          <div><b>Name:</b> ${p.name || "—"}</div>
          <div><b>Phone:</b> ${p.phone || "—"}</div>
          <div><b>NIN:</b> ${p.nin || "—"}</div>
          <div><b>Address:</b> ${p.address || "—"}</div>
          <div><b>Opening Balance:</b> ${fmt(Number(p.openingBalance || 0))}</div>
        </div>
      </div>
      <div class="small muted">Please review before approving.</div>
    </div>
  `;

  const ok = await openModalGeneric(
    action === "approve" ? "Review & Approve New Customer" : "Review & Reject New Customer",
    review,
    action === "approve" ? "Approve & Open Account" : "Reject",
    true
  );

  if (!ok) return;

  // Approve -> create real customer
  if (action === "approve") {
    const newCustomer = {
      id: uid("c"),
      accountNumber: generateCustomerAccountNumber(), // ✅ starts at 1000
      name: p.name || "",
      phone: p.phone || "",
      nin: p.nin || "",
      address: p.address || "",
      photo: p.photo || "",
      balance: Number(p.openingBalance || 0),
      frozen: false,
      transactions: []
    };

    state.customers.push(newCustomer);

    // Link approval to created customer (optional but useful)
    app.resolvedCustomerId = newCustomer.id;
  }

  // Mark approval resolved
  app.status = action === "approve" ? "approved" : "rejected";
  app.processedBy = staff.name;
  app.processedAt = new Date().toISOString();

  await pushAudit(
    staff.name,
    staff.role,
    `approval_${app.status}`,
    { approvalId: app.id, decision: action, type: app.type }
  );

  save();

  // ✅ Force UI refresh (no dashboard toggle needed)
  renderCustomers();
  renderCustomerKycApprovals?.();
  renderDashboardApprovals?.();
  renderApprovals();
  renderDashboard?.();
  renderAudit?.();
  updateChartData?.();


  closeTxModal();

  showToast(action === "approve" ? "Customer account opened successfully" : "Customer request rejected");
  return; // 🚨 stop normal approval flow
}
// =========================
// CUSTOMER MAINTENANCE APPROVAL
// =========================
if (app.type === "customer_maintenance") {
  const p = app.payload || {};

  // ✅ Reject should still work even if customer is missing
  const custId = p.customerId || app.customerId;
  let cust = (state.customers || []).find(c => c.id === custId);

  // fallback by account number (prevents "missing customer" issues)
  if (!cust && p.accountNumber) {
    cust = (state.customers || []).find(c => String(c.accountNumber) === String(p.accountNumber));
  }

  const displayName = cust?.name || p.customerName || "Customer";

  // Confirm
  const ok = await openModalGeneric(
    action === "approve" ? "Confirm Approval" : "Confirm Rejection",
    `
      <div class="small">
        <b>${app.type.toUpperCase()}</b><br/>
        Customer: <b>${displayName}</b><br/>
        Note: ${p.reason ? `<span>${String(p.reason).replace(/</g,"&lt;").replace(/>/g,"&gt;")}</span>` : "—"}
      </div>
    `,
    action === "approve" ? "Approve" : "Reject",
    true
  );
  if (!ok) return;

  // ✅ Always resolve the approval status (so it stops being pending)
  app.status = action === "approve" ? "approved" : "rejected";
  app.processedBy = staff.name;
  app.processedAt = new Date().toISOString();

  // Apply patch only on approve AND only if customer exists
  if (action === "approve") {
    if (!cust) {
      // can't apply but still mark approval resolved so UI doesn't hang forever
      await pushAudit(
        staff.name,
        staff.role,
        `approval_${app.status}`,
        { approvalId: app.id, decision: action, type: app.type, note: "Customer missing - patch not applied" }
      );
      save();
      renderApprovals?.();
      renderCustomers?.();
      renderAudit?.();
      renderDashboard?.();

      closeTxModal();
      window.activeApprovalId = null;
      if (typeof renderToolsTab === "function") renderToolsTab();

      showToast("Approved, but customer record was missing (patch not applied)");
      return;
    }

    const patch = p.patch || {};
    const reqAction = p.action || "";

    Object.keys(patch).forEach(k => (cust[k] = patch[k]));

    // consistency rules
    if (reqAction === "freeze") {
      cust.frozen = true;
      if (!cust.status) cust.status = "frozen";
    }
    if (reqAction === "unfreeze") {
      if (cust.status !== "closed") {
        cust.frozen = false;
        if (cust.status === "frozen") cust.status = "";
      }
    }
    if (reqAction === "closure") {
      cust.status = "closed";
      cust.frozen = true;
      cust.closedAt = new Date().toISOString();
      cust.closedBy = staff.id || "system";
    }
    if (reqAction === "hide") {
      cust.archived = true;
      cust.archivedAt = new Date().toISOString();
    }
    if (reqAction === "restore") {
      cust.archived = false;
      cust.restoredAt = new Date().toISOString();
    }

    cust.updatedAt = new Date().toISOString();
    cust.updatedBy = staff.name;

    app.resolvedCustomerId = cust.id;
  }

  await pushAudit(
    staff.name,
    staff.role,
    `approval_${app.status}`,
    { approvalId: app.id, decision: action, type: app.type, customerId: cust?.id || custId }
  );

  save();

  renderApprovals?.();
  renderCustomers?.();
  renderAudit?.();
  renderDashboard?.();

  closeTxModal();

  // ✅ immediate Tools refresh
  window.activeApprovalId = null;
  if (typeof renderToolsTab === "function") renderToolsTab();

  showToast(action === "approve" ? "Maintenance approved" : "Maintenance rejected");
  return;
}

// =========================
// OPERATIONAL ACCOUNT ENTRY APPROVAL (NO CUSTOMER)
// =========================
if (app.type === "account_entry") {

  // confirm
  const ok = await openModalGeneric(
    action === "approve" ? "Confirm Approval" : "Confirm Rejection",
    `
      <div class="small">
        <b>${(app.accountType || app.payload?.type || "ENTRY").toUpperCase()}</b> — ${fmt(app.amount || app.payload?.amount || 0)}<br/>
        Account: <b>${app.accountName || app.payload?.accountName || "—"}</b><br/>
        Requested by: <b>${app.requestedByName || app.createdByName || app.requestedBy || app.createdBy || "—"}</b>
      </div>
    `,
    action === "approve" ? "Approve" : "Reject",
    true
  );
  if (!ok) return;

  // apply decision
  app.status = action === "approve" ? "approved" : "rejected";
  app.processedBy = staff.name;
  app.processedAt = new Date().toISOString();

  if (action === "approve") {
    const p = app.payload || {};
    const accountId = p.accountId || app.accountId;
    const accType = p.type || p.accountType || app.accountType || "income";
    const amt = Math.abs(Number(p.amount ?? app.amount ?? 0));

    if (!accountId || !accType || !amt) {
      showToast("Invalid account entry payload");
      return;
    }

    // ✅ IMPORTANT: this entry belongs to the REQUESTING STAFF, not the approving manager
    const requesterId = app.requestedBy || app.createdBy || "";
    const requesterName = app.requestedByName || app.createdByName || "Staff";

    state.accountEntries = state.accountEntries || [];
    state.accountEntries.unshift({
      id: uid("op"),
      accountId,
      type: accType,                // income | expense
      amount: amt,                  // store positive always
      note: (p.note || "").trim(),
      date: p.date || app.processedAt,
      createdBy: requesterName,
      createdById: requesterId,
      createdAt: app.processedAt,
      approvalId: app.id,
      approvedBy: staff.name,
      approvedAt: app.processedAt
    });
  }

  await pushAudit(
    staff.name,
    staff.role,
    `approval_${app.status}`,
    {
      approvalId: app.id,
      decision: action,
      type: app.type,
      accountId: app.accountId || app.payload?.accountId,
      accountName: app.accountName || app.payload?.accountName,
      amount: app.amount || app.payload?.amount,
      requestedBy: app.requestedBy || app.createdBy
    }
  );

  save?.();
  renderApprovals?.();
  renderOperationalTransactions?.();
  renderOperationalAccountLists?.();
  refreshOperationalHeader?.();
  renderDashboard?.();
  renderAudit?.();

  // ✅ CLOSE the confirm modal immediately after approve/reject
  const back = document.getElementById("txModalBack");
  if (back) back.style.display = "none";

  // ✅ If staff “My Posts” modal is open, rebuild it so pending→approved updates + empty texts update
  if (document.getElementById("myOpApproved") || document.getElementById("myOpPending")) {
    if (typeof openMyOperationalPosts === "function") openMyOperationalPosts();
  }

  showToast(action === "approve" ? "Entry approved and posted" : "Entry rejected");
  return; // ✅ stop normal flow
}

// =========================
// STAFF WALLET APPROVALS (NO CUSTOMER)
// =========================
if (app.type === "staff_wallet_deposit" || app.type === "staff_debt_repayment") {

  const targetStaffId = app.staffId || app.requestedBy;
  const targetStaff =
    (state.staff || []).find(s => String(s.id) === String(targetStaffId)) || null;

  const ok = await openModalGeneric(
    action === "approve" ? "Confirm Approval" : "Confirm Rejection",
    `
      <div class="small">
        <b>${app.type === "staff_wallet_deposit" ? "STAFF DEPOSIT" : "STAFF DEBT REPAYMENT"}</b><br/>
        Staff: <b>${targetStaff?.name || app.staffName || "Unknown Staff"}</b><br/>
        Amount: <b>${fmt(Number(app.amount || 0))}</b>
      </div>
    `,
    action === "approve" ? "Approve" : "Reject",
    true
  );
  if (!ok) return;

  // resolve approval status
  app.status = action === "approve" ? "approved" : "rejected";
  app.processedBy = staff.name;
  app.processedAt = new Date().toISOString();

  if (action === "approve") {
    if (app.type === "staff_wallet_deposit") {
      postStaffPayment(targetStaffId, Number(app.amount || 0), "Approved wallet deposit");
    }

    if (app.type === "staff_debt_repayment") {
      postStaffDebtRepayment(targetStaffId, Number(app.amount || 0));
    }
  }

  await pushAudit(
    staff.name,
    staff.role,
    `approval_${app.status}`,
    {
      approvalId: app.id,
      decision: action,
      type: app.type,
      staffId: targetStaffId,
      staffName: targetStaff?.name || app.staffName || "",
      amount: Number(app.amount || 0)
    }
  );

  save?.();

  renderApprovals?.();
  renderDashboardApprovals?.();
  renderCustomers?.();
  renderAudit?.();
  renderDashboard?.();

  const back = document.getElementById("txModalBack");
  if (back) back.style.display = "none";

  showToast(
    action === "approve"
      ? (app.type === "staff_wallet_deposit" ? "Staff deposit approved" : "Debt repayment approved")
      : "Request rejected"
  );
  return; // ✅ stop before customer flow
}

  const cust = state.customers.find(c => c.id === app.customerId);
  if (!cust) return showToast("Customer missing");

  // ✅ harden legacy records (prevents .push undefined crash)
cust.transactions = Array.isArray(cust.transactions) ? cust.transactions : [];
state.transactions = Array.isArray(state.transactions) ? state.transactions : [];
state.empowerments = Array.isArray(state.empowerments) ? state.empowerments : [];

cust.empowerment = cust.empowerment || {};
cust.empowerment.history = Array.isArray(cust.empowerment.history) ? cust.empowerment.history : [];
 
  // ===== CONFIRM =====
  const ok = await openModalGeneric(
    action === "approve" ? "Confirm Approval" : "Confirm Rejection",
    `
      <div class="small">
        <b>${app.type.toUpperCase()}</b> — ${fmt(app.amount)}<br/>
        Customer: <b>${cust.name}</b>
      </div>
    `,
    action === "approve" ? "Approve" : "Reject"
  );
  if (!ok) return;

  // ===== APPLY DECISION =====
app.status = action === "approve" ? "approved" : "rejected";
app.processedBy = staff.name;
app.processedAt = new Date().toISOString();

// ✅ real actor is the REQUESTER (teller), not the approver (manager)
const actorName = app.requestedByName || app.createdByName || staff.name;
const actorId = app.requestedBy || app.createdBy || staff.id;

 

// =========================
// APPLY EMPOWERMENT APPROVAL (INTEREST AS %)
// =========================
if (action === "approve" && app.type === "empowerment") {

  const principal = Number(app.amount || 0);

  if (isNaN(principal) || principal <= 0) {
    showToast("Invalid empowerment amount");
    return;
  }

  // ✅ Support both NEW (% based) and OLD (amount based) approvals
  // New: app.interestRate (percent) OR app.payload.interestRate
  // Old: app.interest (amount)
  const rateRaw =
    app.interestRate ??
    app.rate ??
    app.payload?.interestRate ??
    app.payload?.rate ??
    0;

  const rate = Number(rateRaw);
  const legacyAmount = Number(app.interest ?? app.payload?.interest ?? 0);

  let interestAmount = 0;
  let storedRate = undefined;

  // Prefer percent if valid (>0)
  if (!isNaN(rate) && rate > 0) {
    interestAmount = (principal * rate) / 100;  // keep decimals internally
    // If you want whole Naira only, uncomment next line:
    // interestAmount = Math.round(interestAmount);
    storedRate = rate;
  } else {
    // fallback for old approvals created before this change
    interestAmount = legacyAmount;
    storedRate = undefined;
  }

  if (isNaN(interestAmount) || interestAmount < 0) {
    showToast("Invalid empowerment interest");
    return;
  }

  // ✅ normalize to number (avoid strings sneaking in)
  interestAmount = Number(interestAmount);

  state.empowerments = state.empowerments || [];

  // ✅ CREATE ONLY ONE LOAN RECORD FOR THIS APPROVAL
  state.empowerments.push({
    id: uid("emp"),
    customerId: cust.id,
    principalGiven: principal,
    principalRepaid: 0,

    // ✅ engine remains AMOUNT-based
    expectedInterest: interestAmount,
    interestRepaid: 0,

    // ✅ store % if available (helps UI show %)
    interestRate: storedRate,

    status: "active",
    createdAt: app.processedAt
  });

  // Keep history ONLY for display timeline
  cust.empowerment = cust.empowerment || {};
  cust.empowerment.history = cust.empowerment.history || [];

  cust.empowerment.history.push({
    approvalId: app.id,
    principal,
    interest: interestAmount,   // amount
    interestRate: storedRate,   // % (optional)
    date: app.processedAt,
    approvedBy: staff.name
  });

  // Record empowerment disbursement as transaction for reporting
  state.transactions = state.transactions || [];
  state.transactions.push({
    id: uid("tx"),
    type: "empowerment_disbursement",
    amount: principal,
    date: app.processedAt,
    desc: "Empowerment Granted",
    customerId: cust.id
  });

  save();

// ✅ Keep your existing refresh hooks
renderCustomers?.();
if (typeof refreshCustomerProfile === "function") refreshCustomerProfile();

// ✅ AFTER EMPOWERMENT APPROVAL: switch modal back to PROFILE immediately
if (typeof activeCustomerId !== "undefined" && activeCustomerId === cust.id) {
  window.activeApprovalId = null;        // clears Tools “pending approval” focus
  window.forceModalTab = "profile";      // makes future modal openings default to profile
  if (typeof setActiveTab === "function") setActiveTab("profile"); // immediate switch + render
}
}

// =========================
// WITHDRAW APPROVAL (ALLOW NEGATIVE)
// =========================
if (action === "approve" && app.type === "withdraw") {

  cust.balance -= app.amount;

  cust.transactions.push({
    id: uid("tx"),
    type: "withdraw",
    amount: app.amount,
    date: app.processedAt,
    desc: "Approved withdrawal",
    actor: actorName,
actorId: actorId,
approvalId: app.id
  });
  state.transactions = state.transactions || [];

state.transactions.push({
  id: uid("tx"),
  type: "business_withdrawal",
  amount: app.amount,
  date: app.processedAt,
  customerId: cust.id,
  desc: "Customer Withdrawal (Business Outflow)",
  actor: actorName,   // ✅ add
  actorId: actorId,   // ✅ add
  approvalId: app.id  // ✅ add (nice for tracing)
});


}

 // =========================
// CREDIT APPROVAL (NEW ENGINE WITH OPTIONAL SPLIT)
// =========================

// =========================
// CREDIT APPROVAL ONLY
// =========================
if (action === "approve" && app.type === "credit") {
// ✅ CREDIT must be backed by teller opening float (credits only)
const tellerId = actorId; // requester (teller), not manager
const todayKey = String(app.processedAt || new Date().toISOString()).slice(0, 10);
const refOpen = `OPENFLOAT|${tellerId}|${todayKey}`;

// must have declared opening float today
const cashAcc = ensureStaffAccount(tellerId);
const hasOpenFloatToday = (cashAcc.entries || []).some(e => e.refId === refOpen);

if (!hasOpenFloatToday) {
  showToast("Declare Opening Float before approving credits");
  return;
}

  let creditedToBalance = app.amount;

  const activeLoan = (state.empowerments || []).find(e =>
  e.customerId === cust.id && e.status !== "completed"
);

if (activeLoan) {
  const allocation = await openCreditAllocationModal(cust, app.amount);
  if (allocation === null) return;

  if (
    typeof allocation.emp !== "number" ||
    typeof allocation.bal !== "number" ||
    allocation.emp + allocation.bal !== app.amount
  ) {
    showToast("Invalid allocation");
    return;
  }

  const repayAmount = allocation.emp;
  creditedToBalance = allocation.bal;

  let remaining = repayAmount;

// 1️⃣ PAY PRINCIPAL FIRST
const principalLeft = activeLoan.principalGiven - activeLoan.principalRepaid;
const principalPay = Math.min(remaining, principalLeft);
activeLoan.principalRepaid += principalPay;
remaining -= principalPay;
// Record principal payment
if (principalPay > 0) {
  state.transactions.push({
    id: uid("tx"),
    type: "empowerment_repayment_principal",
    amount: principalPay,
    date: app.processedAt,
    desc: "Empowerment Principal Repayment",
    customerId: cust.id
  });
}

// 2️⃣ ONLY AFTER PRINCIPAL IS CLEARED, PAY INTEREST
if (principalLeft - principalPay <= 0) {
  const interestLeft = activeLoan.expectedInterest - activeLoan.interestRepaid;
  const interestPay = Math.min(remaining, interestLeft);
  activeLoan.interestRepaid += interestPay;
  remaining -= interestPay;
  // Record interest payment
if (interestPay > 0) {
  state.transactions.push({
    id: uid("tx"),
    type: "empowerment_repayment_interest",
    amount: interestPay,
    date: app.processedAt,
    desc: "Empowerment Interest Repayment",
    customerId: cust.id
  });
}
}

// 3️⃣ CLOSE LOAN ONLY WHEN BOTH ARE FULLY PAID
if (
  activeLoan.principalRepaid >= activeLoan.principalGiven &&
  activeLoan.interestRepaid >= activeLoan.expectedInterest
) {
  activeLoan.status = "completed";
}
}

  cust.balance += creditedToBalance;

  state.transactions = state.transactions || [];

state.transactions.push({
  id: uid("tx"),
  type: "business_credit",
  amount: creditedToBalance,
  date: app.processedAt,
  customerId: cust.id,
  desc: "Customer Credit (Business Inflow)"
});


  cust.transactions.push({
    id: uid("tx"),
    type: "credit",
    amount: app.amount,
    date: app.processedAt,
    desc: "Approved credit",
    actor: actorName,
actorId: actorId,
approvalId: app.id
  });

  // ✅ Deduct teller float by the FULL approved credit amount (credits only)
// 🔒 Prevent double deduction if approval logic re-runs
cashAcc.entries = cashAcc.entries || [];

// ✅ Overdraw split: ONLY the portion above today's opening float becomes debt
const dateKey = normDate(app.processedAt || app.requestedAt || new Date());

cashAcc.entries = cashAcc.entries || [];

// 1) get today's opening float from LEDGER ONLY
const openingFloat = (cashAcc.entries || [])
  .filter(e =>
    String(e.type || "").toLowerCase() === "opening_float" &&
    normDate(e.date) === dateKey
  )
  .reduce((s, e) => s + Math.abs(Number(e.amount || 0)), 0);

// 2) get today's float already used from LEDGER ONLY
const floatUsedAlready = (cashAcc.entries || [])
  .filter(e =>
    String(e.type || "").toLowerCase() === "float_used" &&
    normDate(e.date) === dateKey
  )
  .reduce((s, e) => s + Math.abs(Number(e.amount || 0)), 0);

// 3) split this approval amount into within-float and overdraw parts
const amt = Math.abs(Number(app.amount || 0));
const remainingFloat = Math.max(0, openingFloat - floatUsedAlready);
const withinFloat = Math.min(amt, remainingFloat);
const overdrawPart = Math.max(0, amt - withinFloat);

// 4) record within-float portion as float_used
const infoRef = `FLOATUSED|${app.id}`;
const alreadyInfo = cashAcc.entries.some(
  e =>
    String(e.refId) === String(infoRef) &&
    String(e.type || "").toLowerCase() === "float_used"
);

if (!alreadyInfo && withinFloat > 0) {
  cashAcc.entries.unshift({
    id: uid("sf"),
    staffId: cashAcc.staffId,
    type: "float_used",
    amount: withinFloat,
    delta: 0,
    date: app.processedAt || new Date().toISOString(),
    refId: infoRef,
    note: `Within float for ${dateKey} (approval ${app.id})`
  });
}

// 5) record ONLY overdraw portion as debt
const alreadyDebt = cashAcc.entries.some(
  e =>
    String(e.refId) === String(app.id) &&
    String(e.type || "").toLowerCase() === "credit_out"
);

if (!alreadyDebt && overdrawPart > 0) {
  cashAcc.entries.unshift({
    id: uid("sf"),
    staffId: cashAcc.staffId,
    type: "credit_out",
    amount: overdrawPart,
    delta: -overdrawPart,
    date: app.processedAt || new Date().toISOString(),
    refId: app.id,
    note: `Overdraw portion for ${dateKey}`
  });
}

// 6) recompute debt balance from ledger
cashAcc.balance = (cashAcc.entries || []).reduce((sum, e) => {
  const t = String(e.type || "").toLowerCase();
  if (t === "opening_float" || t === "opening" || t === "float_used") return sum;
  if (t === "credit_out" || t === "credit") return sum - Math.abs(Number(e.amount || 0));
  if (t === "repay" || t === "payin" || t === "credit_in") return sum + Math.abs(Number(e.amount || 0));
  return sum + Number(e.delta || 0);
}, 0);

  
}


  state.transactions = state.transactions || [];

state.transactions.push({
  id: uid("tx"),
  type: "credit",
  amount: app.amount,
  date: app.processedAt,
  desc: "Business Credit",
  customerId: cust.id,
  actor: actorName,      // ✅ change
  actorId: actorId,      // ✅ add
  approvalId: app.id
});

// ===== STAFF WALLET APPROVALS =====

// wallet deposit approval
if (app.type === "staff_wallet_deposit") {
  postStaffPayment(app.staffId, app.amount, "Approved wallet deposit");
}

// debt repayment approval
if (app.type === "staff_debt_repayment") {
  postStaffDebtRepayment(app.staffId, app.amount);
}

// ===== AUDIT (ROLE-AWARE, DETAILED) =====
await pushAudit(
  staff.name,
  staff.role,
  `approval_${app.status}`,
  {
    approvalId: app.id,
    decision: action,          // approve | reject
    customerId: cust.id,
    customerName: cust.name,
    amount: app.amount,
    txType: app.type
  }
);

// NOTE:
// approvals are never deleted.
// status alone determines visibility in UI and COD logic. 
// persist + close confirm modal (for ALL approval types)
save?.();

const back = document.getElementById("txModalBack");
if (back) back.style.display = "none";

// 🔥 MASTER UI SYNC (fixes delayed buttons + panels)
renderApprovals?.();
renderCustomerKycApprovals?.();
renderDashboardApprovals?.();
renderCustomers?.();
renderAudit?.();
renderDashboard?.();

// ✅ If staff posts modal is open, refresh it so "My Approved Posts" updates instantly
if (document.getElementById("myOpApproved") || document.getElementById("myOpPending")) {
  if (typeof openMyOperationalPosts === "function") openMyOperationalPosts();
  else if (typeof renderMyOperationalPosts === "function") renderMyOperationalPosts();
}

// ✅ If Operational drilldown is open, refresh it too
if (document.getElementById("opTxnList")) {
  renderOperationalTransactions?.();
  renderOperationalAccountLists?.();
  refreshOperationalHeader?.();
}

// ✅ force customer modal to render Profile correctly after approval (only if modal is open)
if (typeof activeCustomerId !== "undefined" && activeCustomerId && typeof refreshCustomerProfile === "function") {
  window.activeApprovalId = null;
  refreshCustomerProfile("profile"); // your version calls setActiveTab internally
}

// ✅ Tools pending card must disappear immediately after any approval decision (only if Tools tab exists)
window.activeApprovalId = null;
if (typeof renderToolsTab === "function") renderToolsTab();

showToast(action === "approve" ? "Transaction approved" : "Transaction rejected");
return;
}




  let chartWeek = null;
  function buildChart() {
       try {
      const ctx = document.getElementById("chartWeek").getContext("2d");
      chartWeek = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          datasets: [
            {
              label: "k₦ collections",
              data: [0, 0, 0, 0, 0, 0, 0],
              backgroundColor: "rgba(15,184,201,0.9)",
              borderRadius: 6,
            },
          ],
        },
        options: {
          plugins: { legend: { display: false } },
          onClick: (e) => {
            const pts = chartWeek.getElementsAtEventForMode(
              e,
              "nearest",
              { intersect: true },
              false
            );
            if (pts.length) {
              openModalGeneric(
                "Logs",
                '<div class="small">Showing logs for ' +
                  chartWeek.data.labels[pts[0].index] +
                  "</div>",
                "Close"
              );
            }
          },
        },
      });
    } catch (e) {
      console.error("chart err", e);
    }
  }

  function updateChartData() {
     if (!chartWeek) return;
    const data = [0, 0, 0, 0, 0, 0, 0];
    for (const c of state.customers) {
      for (const t of c.transactions || []) {
        if (t.type === "credit" || t.type === "adjust") {
          const d = new Date(t.date || Date.now());
          const idx = (d.getDay() + 6) % 7;
          data[idx] += t.amount / 1000;
        }
      }
    }
    chartWeek.data.datasets[0].data = data.map((x) => Math.round(x));
    chartWeek.update();
  }

  function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function approveCustomer(pendingId) {

  const pending = state.customerApprovals.find(p => p.id === pendingId);
  if (!pending) return;

  const nextAccountNumber = getNextAccountNumber();

  const newCustomer = {
    id: uid("c"),
    accountNumber: nextAccountNumber,
    name: pending.name,
    phone: pending.phone,
    nin: pending.nin,
    address: pending.address,
    photo: pending.photo,
    balance: pending.openingBalance,
    frozen: false,
    transactions: []
  };

  state.customers.push(newCustomer);

  pending.status = "approved";

  save();
  renderCustomers();
  showToast("Customer approved");
}

function getNextAccountNumber() {
  const base = 1000;

  const numbers = state.customers
    .map(c => Number(c.accountNumber))
    .filter(n => !isNaN(n));

  if (numbers.length === 0) return base;

  return Math.max(...numbers) + 1;
}


  function printAudit() {
    let html =
      '<html><head><title>Audit</title></head><body><h2>Audit</h2><table border="1" cellpadding="6"><tr><th>Time</th><th>Actor</th><th>Role</th><th>Action</th></tr>';
    for (const a of state.audit.slice().reverse()) {
      html += `<tr><td>${new Date(a.time).toLocaleString()}</td><td>${
        a.actor
      }</td><td>${a.role}</td><td>${a.action}</td></tr>`;
    }
    html += "</table></body></html>";
    const w = window.open("");
    w.document.write(html);
    w.document.close();
    w.print();
  }

  function exportCustomerCSV(id) {
    const c = state.customers.find((x) => x.id === id);
    if (!c) return showToast("No customer");
    let rows = [["name", "phone", "balance"]];
    rows.push([c.name, c.phone, c.balance]);
    rows.push([]);
    rows.push(["tx_id", "type", "amount", "date", "desc", "actor"]);
    for (const t of c.transactions || []) {
      rows.push([
        t.id,
        t.type,
        t.amount,
        t.date || "",
        t.desc || "",
        t.actor || "",
      ]);
    }
    const csv = rows
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer_${c.id}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("CSV downloaded");
  }

  function openAuditForCustomer(id) {
    const filtered = state.audit.filter(
      (a) => a.details && a.details.includes(id)
    );
    let html = '<div class="small">Audit entries for customer</div>';
    if (!filtered.length)
      html += '<div class="small">No audit entries for this customer</div>';
    else {
      for (const a of filtered.slice().reverse()) {
        html += `<div class=\"kv\"><div class=\"small\">${new Date(
          a.time
        ).toLocaleString()} • ${a.actor}</div><div class=\"small\">${
          a.action
        }</div></div>`;
      }
    }
    openModalGeneric("Customer Audit", html, "Close");
  }


function isManager() {
  const s = currentStaff();
  return s && (s.role === ROLES.MANAGER || s.role === ROLES.CEO);
}

function isTeller() {
  const s = currentStaff();
  return s && s.role === ROLES.TELLER;
}

function isMarketer() {
  const s = currentStaff();
  return s && s.role === ROLES.MARKETER;
}

function canApprove() {
  return isManager();
}

function canViewDashboard() {
  return isManager();
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}


function initCODDatePicker() {
  const picker = document.getElementById("codDatePicker");
  if (!picker) return;

  // 🔑 single source of truth
  if (!window.activeCODDate) {
    window.activeCODDate = new Date().toISOString().slice(0, 10);
  }

  picker.value = window.activeCODDate;

  picker.onchange = () => {
    window.activeCODDate = picker.value;

    // 🔥 THIS IS WHAT WAS MISSING
    renderCODForDate(window.activeCODDate);
  };

  // 🔥 INITIAL RENDER (CRITICAL)
  renderCODForDate(window.activeCODDate);
}

function setCustomDateRange() {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;

  state.ui.fromDate = from || null;
  state.ui.toDate = to || null;

  state.ui.dateFilter = "custom"; // override buttons
  save();
  renderAccounts();
}

function clearDateRange() {
  state.ui.fromDate = null;
  state.ui.toDate = null;

  document.getElementById("fromDate").value = "";
  document.getElementById("toDate").value = "";

  state.ui.dateFilter = state.ui.dateFilter || "today";
  save();
  renderAccounts();
}

window.setCustomDateRange = setCustomDateRange;
window.clearDateRange = clearDateRange;

function saveManagerCODNote(codId) {
  const note = document.getElementById("managerNoteBox")?.value || "";

  const cod = state.cod.find(c => c.id === codId);
  if (!cod) return;

  cod.managerNote = note.trim();
  cod.managerNotedAt = new Date().toISOString();
  cod.managerNotedBy = currentStaff().name;

  save();
  showToast("Manager note saved");
  renderCODForDate(cod.date);
}


function renderCODForDate(dateStr) {
  const el = document.getElementById("codTodayList");
  if (!el) return;

  const date = dateStr || new Date().toISOString().slice(0, 10);

  const todaysCOD = state.cod.filter(c => c.date === date);
  // =========================
// 🔑 MANAGER SYSTEM TOTALS
// =========================
const systemTotals = todaysCOD.reduce(
  (acc, c) => {
    const expected = Number(c.systemExpected || 0);

    const declared =
      c.status === "resolved"
        ? Number(c.resolvedAmount || 0)
        : Number(c.staffDeclared || 0);

    acc.expected += expected;
    acc.declared += declared;
    acc.variance += declared - expected;

    return acc;
  },
  { expected: 0, declared: 0, variance: 0 }
);

// informational totals (not used for balancing)
const systemInfo = todaysCOD.reduce(
  (acc, c) => {
    acc.withdrawals += Number(c.snapshot?.withdrawals || 0);
    acc.empowerments += Number(c.snapshot?.empowerments || 0);
    return acc;
  },
  { withdrawals: 0, empowerments: 0 }
);

// =========================
// 🔑 SYSTEM SUMMARY CARD
// =========================
summaryHTML = `
  <div
    class="card system-cod"
    style="margin-bottom:16px;border-left:4px solid #1976d2"
  >
    <h4>
      System Close of Day Summary
      <span class="small muted">(system reference)</span>
    </h4>

    <div class="small">
      Expected Cash: <b>${fmt(systemTotals.expected)}</b><br/>
      Declared Cash: <b>${fmt(systemTotals.declared)}</b><br/>
      Net Variance:
      <b style="color:${systemTotals.variance === 0 ? "green" : "red"}">
        ${fmt(systemTotals.variance)}
      </b>
    </div>

    <div class="small muted" style="margin-top:6px">
      Withdrawals (info): ${fmt(systemInfo.withdrawals)}<br/>
      Empowerments (info): ${fmt(systemInfo.empowerments)}
    </div>
  </div>
`;
let html = "";

state.staff.forEach(staff => {
  const rec = todaysCOD.find(c => c.staffId === staff.id);

  // ❌ NOT SUBMITTED
  if (!rec) {
    html += `
      <div class="card warning" style="margin-bottom:8px">
        <b>${staff.name}</b> (${staff.role})<br/>
        <span class="danger">❌ Not submitted</span>
      </div>
    `;
    return;
  }

  // 🔎 DERIVED STATUS (prevents "Balanced" when overdraw exists)
const expected = Number(rec.expectedCash ?? rec.systemExpected ?? 0);

const declared = (rec.status === "resolved" && rec.resolvedAmount != null)
  ? Number(rec.resolvedAmount || 0)
  : Number(rec.staffDeclared || 0);

const varianceNum = declared - expected;
const overdrawNum = Number(rec.overdraw || 0);

// 🔎 STATUS FLAGS (MUST be defined before using in template)
const isResolved = rec.status === "resolved";
const isFlagged  = rec.status === "flagged";

// pull overdraw owed from snapshot (safe defaults)
const overdrawOwed = Math.max(0, Number(rec.snapshot?.overdrawOwed || 0));

// "Balanced" is ONLY when variance is 0 AND not overdrawn AND not resolved
const isTrulyBalanced =
  !isResolved &&
  Number(rec.variance || 0) === 0 &&
  overdrawOwed === 0;

const isOverdrawn = !isResolved && overdrawOwed > 0;

// keep the old variable name so your existing code doesn't crash
const isBalanced = isTrulyBalanced;

const statusLabel =
  isTrulyBalanced
    ? `<span style="color:green">✔ Balanced</span>`
    : isOverdrawn
      ? `<span style="color:#ed6c02">⚠ Overdrawn (owed)</span>`
      : isResolved
        ? `<span style="color:#1976d2">✔ Resolved</span>`
        : `<span style="color:red">⚠ Flagged</span>`;


  html += `
    <div
      class="card cod-card"
      data-staff-id="${rec.staffId}"
      data-date="${rec.date}"
      style="
        margin-bottom:8px;
        cursor:pointer;
       border-left:4px solid ${
  isTrulyBalanced ? '#2e7d32'
  : isResolved ? '#1976d2'
  : isOverdrawn ? '#ed6c02'
  : isFlagged ? '#d32f2f'
  : '#d32f2f'
};
background:${
  isTrulyBalanced ? '#e8f5e9'
  : isResolved ? '#e3f2fd'
  : isOverdrawn ? '#fff3e0'
  : isFlagged ? '#ffebee'
  : '#ffebee'
};

        padding-left:8px;
      "
    >
      <b>${staff.name}</b> (${staff.role})<br/>
      <div class="small">${statusLabel}</div>

     <div class="small" style="margin-top:4px">
  <b>Expected:</b> ${fmt(rec.systemExpected)}<br/>

  ${
    isResolved
      ? `<b style="color:#0a7d2c">Resolved Amount:</b> ${fmt(rec.resolvedAmount)}<br/>
         <span style="opacity:.6">Staff Declared: ${fmt(rec.staffDeclared)}</span><br/>`
      : `<b>Staff Declared:</b> ${fmt(rec.staffDeclared)}<br/>`
  }

        ${
  isResolved && rec.resolutionNote
    ? `<div class="small muted" style="margin-top:4px">
         🧾 ${rec.resolutionNote}
       </div>`
    : isBalanced && rec.managerNote
    ? `<div class="small warning" style="margin-top:4px">
         ⚠ Manager note: ${rec.managerNote}
       </div>`
    : rec.staffNote
    ? `<div class="small muted" style="margin-top:4px">
         📝 ${rec.staffNote}
       </div>`
    : ""
}

      </div>

      ${
        rec.initialDeclared !== undefined
          ? `<div class="small muted" style="margin-top:4px">
               Initial declared: ${fmt(rec.initialDeclared)}
             </div>`
          : ""
      }

      ${
        isManager() && isFlagged
          ? `
            <div style="margin-top:8px">
              <button
                type="button"
                class="btn danger cod-resolve-btn"
                data-cod-id="${rec.id}"
              >
                Resolve
              </button>
            </div>
          `
          : ""
      }
    </div>
  `;
});
       
 // 1️⃣ Render HTML FIRST
el.innerHTML =
  summaryHTML +
  (html || `<div class="small muted">No records</div>`);

// 2️⃣ Bind COD card click (drilldown)
document.querySelectorAll(".cod-card").forEach(card => {
  card.onclick = () => {
    const staffId = card.dataset.staffId;
    const date = card.dataset.date;
    openCODDrillDown(staffId, date);
  };
});

// 3️⃣ Bind Resolve button (STOP propagation)
document.querySelectorAll(".cod-resolve-btn").forEach(btn => {
  btn.onclick = (e) => {
    e.stopPropagation(); // 🔴 CRITICAL
    const codId = btn.dataset.codId;
    openCODResolutionModal(codId);
  };
});
}
window.renderCODForDate = renderCODForDate;



function renderManagerCODSummary(dateStr) {
  const staff = currentStaff();
  if (!staff || !["manager", "ceo"].includes(staff.role)) return;

  const date = normDate(
    dateStr ||
    window.activeCODDate ||
    new Date().toISOString().slice(0, 10)
  );

  const records = (state.cod || []).filter(c => normDate(c.date) === date);

  const submittedCount = records.length;
  const notSubmitted = (state.staff || []).filter(s => s.role !== "marketer").length - submittedCount;

  const el = document.getElementById("managerCODSummary");
  if (!el) return;

  // ✅ If no COD exists, show zeros (DO NOT use approvals as fallback)
  if (!records.length) {
    el.innerHTML = `
      <div class="card" style="margin-bottom:12px">
        <h4>Manager Close of Day Summary</h4>
        <div class="small"><b>Date:</b> ${date}</div>

        <div class="kv"><div class="kv-label">Expected Cash (COD)</div><div>${fmt(0)}</div></div>
        <div class="kv"><div class="kv-label">Declared Cash (COD)</div><div>${fmt(0)}</div></div>
        <div class="kv">
          <div class="kv-label">Net Variance (COD)</div>
          <div style="color:green">${fmt(0)}</div>
        </div>

        <hr/>
        <div class="small">
          Submitted: <b>0</b><br/>
          Not Submitted: <b>${Math.max(0, notSubmitted)}</b>
        </div>
      </div>
    `;
    return;
  }

  // ✅ SOURCE OF TRUTH = COD
  const expectedTotal = records.reduce((s, r) => s + Number(r.systemExpected || 0), 0);

  const declaredTotal = records.reduce((s, r) => {
    const used = (r.status === "resolved" && r.resolvedAmount != null)
      ? Number(r.resolvedAmount || 0)
      : Number(r.staffDeclared || 0);
    return s + used;
  }, 0);

  const varianceTotal = declaredTotal - expectedTotal;

  // ✅ info-only
  const creditsInfo = records.reduce((s, r) => s + Number(r.snapshot?.credits || 0), 0);
  const withdrawalsInfo = records.reduce((s, r) => s + Number(r.snapshot?.withdrawals || 0), 0);
  const empowermentsInfo = records.reduce((s, r) => s + Number(r.snapshot?.empowerments || 0), 0);

  el.innerHTML = `
    <div class="card" style="margin-bottom:12px">
      <h4>Manager Close of Day Summary</h4>

      <div class="small"><b>Date:</b> ${date}</div>

      <div class="kv">
        <div class="kv-label">Expected Cash (COD)</div>
        <div>${fmt(expectedTotal)}</div>
      </div>

      <div class="kv">
        <div class="kv-label">Declared Cash (COD)</div>
        <div>${fmt(declaredTotal)}</div>
      </div>

      <div class="kv">
        <div class="kv-label">Net Variance (COD)</div>
        <div style="color:${varianceTotal === 0 ? "green" : "red"}">
          ${fmt(varianceTotal)}
        </div>
      </div>

      <div class="small muted" style="margin-top:8px">
        Credits (info): ${fmt(creditsInfo)}<br/>
        Withdrawals (info): ${fmt(withdrawalsInfo)}<br/>
        Empowerments (info): ${fmt(empowermentsInfo)}
      </div>

      <hr/>

      <div class="small">
        Submitted: <b>${submittedCount}</b><br/>
        Not Submitted: <b>${Math.max(0, notSubmitted)}</b>
      </div>
    </div>
  `;
}
window.renderManagerCODSummary = renderManagerCODSummary;


function opTxnMatchesFilter(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();

  const sameDay = (a,b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  switch (state.ui?.opDateFilter) {

    case "today":
      return sameDay(d, now);

    case "week": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0,0,0,0);
      return d >= start;
    }

    case "month":
      return d.getMonth() === now.getMonth() &&
             d.getFullYear() === now.getFullYear();

    case "year":
      return d.getFullYear() === now.getFullYear();

    case "custom":
      if (!state.ui?.opFromDate || !state.ui?.opToDate) return true;
      return d >= new Date(state.ui.opFromDate) &&
             d <= new Date(state.ui.opToDate + "T23:59:59");

    case "all":
    default:
      return true;
  }
}

window.opTxnMatchesFilter = opTxnMatchesFilter;


function calculateFilteredOperationalTotals() {

  const entries = (state.accountEntries || []).filter(e =>
    opTxnMatchesFilter(e.date)
  );

  let income = 0;
  let expense = 0;

  entries.forEach(e => {
    const isIncome = state.accounts.income.some(a => a.id === e.accountId);
    const isExpense = state.accounts.expense.some(a => a.id === e.accountId);

    if (isIncome) income += Number(e.amount || 0);
    if (isExpense) expense += Number(e.amount || 0);
  });

  let net = income - expense;

  // 🔹 ADD THIS
  if (state.operational?.includeEmpowerment) {
    net += calculateEmpowermentPosition();
  }

  return { income, expense, net };
}

window.calculateFilteredOperationalTotals = calculateFilteredOperationalTotals;



function calculateOperationalBalance() {
  const t = calculateFilteredOperationalTotals();
  return t.net;
}

window.calculateOperationalBalance = calculateOperationalBalance;

function toggleOperationalEmpowerment(val) {
  state.operational = state.operational || {};
  state.operational.includeEmpowerment = val;
  save();

  // Update dashboard
  renderAccounts();

  // 🔹 If drilldown is open, update header live
  if (document.getElementById("opNet")) {
    refreshOperationalHeader();
  }
}
window.toggleOperationalEmpowerment = toggleOperationalEmpowerment;

function getFilteredOperationalEntries() {

  return (state.accountEntries || [])
    .filter(e => {

      if (!opTxnMatchesFilter(e.date)) return false;

      const isIncome = state.accounts.income
        .some(a => a.id === e.accountId);

      const typeFilter = state.ui.opTypeFilter || "all";

      if (typeFilter === "income" && !isIncome) return false;
      if (typeFilter === "expense" && isIncome) return false;

      return true;
    })
    .sort((a,b) => new Date(b.date) - new Date(a.date));

}

let opTxnLimit = 50;

function renderOperationalTransactions() {

  const container = document.getElementById("opTxnList");
  if (!container) return;

  const entries = getFilteredOperationalEntries()
  .slice(0, opTxnLimit);

  container.innerHTML = entries.map(e => {

    const acc = [...state.accounts.income, ...state.accounts.expense]
      .find(a => a.id === e.accountId);

    const isIncome = state.accounts.income
      .some(a => a.id === e.accountId);

    return `
      <div style="margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:6px">
        ${new Date(e.date).toLocaleString()} —
        <b>${fmt(e.amount)}</b>
        <span style="color:${isIncome ? 'green' : '#b42318'}">
          (${isIncome ? 'Income' : 'Expense'})
        </span>
        <br>
        <span class="muted">
          ${acc ? acc.name : "Unknown Account"}
        </span>
      </div>
    `;
  }).join("");

  const btn = document.getElementById("opLoadMore");
  if (btn) {
    btn.onclick = () => {
      opTxnLimit += 50;
      renderOperationalTransactions();
    };
  }
}

window.renderOperationalTransactions = renderOperationalTransactions;

function exportOperationalCSV() {

  const entries = getFilteredOperationalEntries();

  if (!entries.length) {
    alert("No transactions to export for selected filter.");
    return;
  }

  const rows = [];
  rows.push(["S/N","Date","Time","Account","Type","Amount"]);

  let totalNet = 0;

  entries.forEach((e, index) => {

    const dateObj = new Date(e.date);
    const date = dateObj.toLocaleDateString();
    const time = dateObj.toLocaleTimeString();

    const account = [...state.accounts.income, ...state.accounts.expense]
      .find(a => a.id === e.accountId);

    const isIncome = state.accounts.income
      .some(a => a.id === e.accountId);

    const type = isIncome ? "INCOME" : "EXPENSE";
    const amount = Number(e.amount || 0);

    totalNet += isIncome ? amount : -amount;

    rows.push([
      index + 1,
      date,
      time,
      account ? account.name : "Unknown",
      type,
      amount
    ]);
  });

  rows.push([]);
  rows.push(["","","","","TOTAL", totalNet]);

  const csvContent = rows.map(r => r.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "operational_transactions.csv";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

window.exportOperationalCSV = exportOperationalCSV;


function printOperationalSummary() {

  const entries = getFilteredOperationalEntries();
  const totals = calculateFilteredOperationalTotals();

  const w = window.open("", "_blank");

  w.document.write(`
    <h2>Operational Transaction Summary</h2>

    <p><b>Total Income:</b> ${fmt(totals.income)}</p>
    <p><b>Total Expense:</b> ${fmt(totals.expense)}</p>
    <p><b>Net Balance:</b> ${fmt(totals.net)}</p>

    <hr>

    <table border="1" cellspacing="0" cellpadding="6">
      <tr>
        <th>#</th>
        <th>Date</th>
        <th>Account</th>
        <th>Type</th>
        <th>Amount</th>
      </tr>

      ${entries.map((e,i) => {

        const acc = [...state.accounts.income, ...state.accounts.expense]
          .find(a => a.id === e.accountId);

        const isIncome = state.accounts.income
          .some(a => a.id === e.accountId);

        return `
          <tr>
            <td>${i+1}</td>
            <td>${new Date(e.date).toLocaleString()}</td>
            <td>${acc ? acc.name : "Unknown"}</td>
            <td>${isIncome ? "INCOME" : "EXPENSE"}</td>
            <td>${fmt(e.amount)}</td>
          </tr>
        `;
      }).join("")}

    </table>
  `);

  w.document.close();
  w.print();
}

window.printOperationalSummary = printOperationalSummary;

function openMyOperationalPosts() {
  const staff = currentStaff?.();
  if (!staff) return showToast("Select staff");

  // Managers can still use full business drilldown (optional)
  // If you want managers to also see "My Posts" instead, remove this if block.
  if (["manager", "ceo"].includes(staff.role)) {
    openOperationalDrilldown();
    return;
  }

  const wrapper = document.createElement("div");

  wrapper.innerHTML = `
    <div class="small muted" style="margin-bottom:10px">
      You can only view your own approved posts and your pending requests.
    </div>

    <div class="card" style="margin-bottom:10px">
      <div class="small"><b>Send New Income/Expense Request</b></div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        <select id="myOpType" class="input">
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <select id="myOpAccount" class="input"></select>

        <input id="myOpAmount" class="input" type="number" placeholder="Amount">
        <input id="myOpNote" class="input" placeholder="Note (optional)">
      </div>

      <button id="myOpSend" class="btn solid" style="margin-top:10px;width:100%">
        Send Request
      </button>
    </div>

    <div class="card" style="margin-bottom:10px">
      <div class="small"><b>My Pending Requests</b></div>
      <div id="myOpPending" class="small muted" style="margin-top:8px"></div>
    </div>

    <div class="card">
      <div class="small"><b>My Approved Posts</b></div>
      <div id="myOpApproved" class="small muted" style="margin-top:8px"></div>
    </div>
  `;

  openModalGeneric("Income & Expense", wrapper, null);

  // ---- helpers ----
  function fillAccounts() {
    const type = wrapper.querySelector("#myOpType").value;
    const sel = wrapper.querySelector("#myOpAccount");
    const arr = (state.accounts?.[type] || []);

    sel.innerHTML = arr.map(a =>
      `<option value="${a.id}">${a.accountNumber} — ${a.name}</option>`
    ).join("");
  }

  function renderPending() {
    const box = wrapper.querySelector("#myOpPending");
    const pend = (state.approvals || [])
      .filter(a =>
        a.type === "account_entry" &&
        a.status === "pending" &&
        (a.requestedBy === staff.id || a.createdBy === staff.id)
      )
      .sort((a, b) => new Date(b.requestedAt || b.createdAt || 0) - new Date(a.requestedAt || a.createdAt || 0));

    if (!pend.length) {
      box.innerHTML = `<div class="small muted">No pending requests</div>`;
      return;
    }

    box.innerHTML = pend.map(a => `
      <div style="padding:8px;border-bottom:1px solid #eee">
        <b>${(a.accountType || a.payload?.type || "").toUpperCase()}</b> — ${fmt(a.amount || a.payload?.amount || 0)}<br/>
        <span class="muted">${a.accountName || a.payload?.accountName || "—"}</span><br/>
        <span class="muted">${new Date(a.requestedAt || a.createdAt).toLocaleString()}</span>
      </div>
    `).join("");
  }

  function renderApproved() {
    const box = wrapper.querySelector("#myOpApproved");
    const mine = (state.accountEntries || [])
  .filter(e => (e.createdById || e.staffId) === staff.id)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    if (!mine.length) {
      box.innerHTML = `<div class="small muted">No approved posts yet</div>`;
      return;
    }

    box.innerHTML = mine.slice(0, 100).map(e => {
      const acc = [...(state.accounts?.income || []), ...(state.accounts?.expense || [])]
        .find(a => a.id === e.accountId);

      return `
        <div style="padding:8px;border-bottom:1px solid #eee">
          ${new Date(e.date).toLocaleString()} — <b>${fmt(e.amount)}</b>
          <span class="muted">(${String(e.type || "").toUpperCase()})</span><br/>
          <span class="muted">${acc ? acc.name : "Unknown Account"}</span>
          ${e.note ? `<div class="muted">${e.note}</div>` : ""}
        </div>
      `;
    }).join("");
  }

  // init
  fillAccounts();
  renderPending();
  renderApproved();

  wrapper.querySelector("#myOpType").onchange = fillAccounts;

  wrapper.querySelector("#myOpSend").onclick = () => {
    const type = wrapper.querySelector("#myOpType").value;
    const accountId = wrapper.querySelector("#myOpAccount").value;
    const amt = Number(wrapper.querySelector("#myOpAmount").value || 0);
    const note = wrapper.querySelector("#myOpNote").value || "";
    const date = new Date().toISOString();

    if (!accountId) return showToast("Select account");
    if (!amt || amt <= 0) return showToast("Enter valid amount");

    // ✅ this will create approval for staff (because createAccountEntry now routes by role)
    const ok = createAccountEntry(accountId, type, amt, note, date);
    if (!ok) return;

    // reset fields
    wrapper.querySelector("#myOpAmount").value = "";
    wrapper.querySelector("#myOpNote").value = "";

    // refresh view
    renderPending();
    renderApproved();
  };
}
window.openMyOperationalPosts = openMyOperationalPosts;


function openOperationalDrilldown() {
  state.ui.opDateFilter = state.ui.opDateFilter || "today";
  opTxnLimit = 50;

  const totals = calculateFilteredOperationalTotals();

  const wrapper = document.createElement("div");

  const staff = currentStaff?.();
const myId = staff?.id;

// ✅ Approved/posted entries by me (these are real entries already saved)
const myPosted = (state.accountEntries || [])
  .filter(e => e.staffId === myId)
  .sort((a,b)=> new Date(b.date||0) - new Date(a.date||0))
  .slice(0, 30);

// ✅ My pending requests (before approval)
const myPendingReq = (state.approvals || [])
  .filter(a => a.type === "account_entry" && a.status === "pending" && a.requestedBy === myId)
  .sort((a,b)=> new Date(b.requestedAt||b.createdAt||0) - new Date(a.requestedAt||a.createdAt||0))
  .slice(0, 30);

const myPostedHTML = myPosted.length ? `
  <div class="card" style="margin:10px 0;padding:10px">
    <div class="small"><b>My Posted Entries (Approved)</b></div>
    ${myPosted.map(e => {
      const acc = [...(state.accounts?.income||[]), ...(state.accounts?.expense||[])]
        .find(a => a.id === e.accountId);
      const isIncome = (state.accounts?.income||[]).some(a => a.id === e.accountId);
      return `
        <div class="small" style="margin-top:6px;border-bottom:1px solid #eee;padding-bottom:6px">
          ${new Date(e.date).toLocaleString()} —
          <b>${fmt(e.amount)}</b>
          <span style="color:${isIncome ? 'green' : '#b42318'}">
            (${isIncome ? 'Income' : 'Expense'})
          </span><br/>
          <span class="muted">${acc ? acc.name : "Unknown Account"}</span>
        </div>
      `;
    }).join("")}
  </div>
` : `
  
`;

const myPendingHTML = myPendingReq.length ? `
  <div class="card warning" style="margin:10px 0;padding:10px">
    <div class="small"><b>My Pending Requests</b></div>
    ${myPendingReq.map(a => `
      <div class="small" style="margin-top:6px;border-bottom:1px solid #eee;padding-bottom:6px">
        ${new Date(a.requestedAt||a.createdAt||Date.now()).toLocaleString()} —
        <b>${fmt(a.payload?.amount || a.amount || 0)}</b>
        <span class="muted">(${String(a.payload?.accountType||"").toUpperCase()})</span><br/>
        <span class="muted">${a.payload?.accountName || "Account"}</span>
      </div>
    `).join("")}
  </div>
` : `
  
`;

  wrapper.innerHTML = `
    ${myPendingHTML}
  ${myPostedHTML}
    <div style="margin-bottom:10px">

  <div><b>Total Income:</b>
    <span id="opIncome" style="color:green">
      ${fmt(totals.income)}
    </span>
  </div>

  <div><b>Total Expense:</b>
    <span id="opExpense" style="color:#b42318">
      ${fmt(totals.expense)}
    </span>
  </div>

  <div><b>Net Operational Balance:</b>
    <span id="opNet"
      style="color:${totals.net>=0?'green':'red'}">
      ${fmt(totals.net)}
    </span>
  </div>

  <label style="font-size:12px; margin-top:6px; display:block;">
    <input type="checkbox"
      ${state.operational?.includeEmpowerment ? "checked" : ""}
      onchange="toggleOperationalEmpowerment(this.checked); refreshOperationalHeader();">
    Include Empowerment Position
  </label>

</div>

    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px">
  <button class="btn small solid" style="background:#0f766e;color:white"
    onclick="setOpDateFilter('today')">${labelRange('today')}</button>

  <button class="btn small solid" style="background:#0f766e;color:white"
    onclick="setOpDateFilter('week')">${labelRange('week')}</button>

  <button class="btn small solid" style="background:#0f766e;color:white"
    onclick="setOpDateFilter('month')">${labelRange('month')}</button>

  <button class="btn small solid" style="background:#0f766e;color:white"
    onclick="setOpDateFilter('year')">${labelRange('year')}</button>

  <button class="btn small solid" style="background:#0f766e;color:white"
    onclick="setOpDateFilter('all')">${labelRange('all')}</button>
</div>
  
    <div style="display:flex; gap:6px; margin-bottom:8px">
      <input type="date" id="opFromDate" class="input small">
      <span>to</span>
      <input type="date" id="opToDate" class="input small">

      <button class="btn small solid"
        style="background:#0f766e;color:white"
        onclick="applyOpDateRange()">Apply</button>

      <button class="btn small solid"
        onclick="clearOpDateRange()">Clear</button>
    </div>

        <div style="display:flex; gap:6px; margin-bottom:10px">
      <button class="btn small solid"
        style="background:#0f766e"
        onclick="exportOperationalCSV()">Export CSV</button>

      <button class="btn small solid"
        style="background:#0f766e"
        onclick="printOperationalSummary()">Print Summary</button>
    </div>
    <div style="margin-bottom:8px;">
  <button class="btn small solid"
    onclick="setOpTypeFilter('all')">All</button>

  <button class="btn small solid"
    onclick="setOpTypeFilter('income')">Income</button>

  <button class="btn small solid"
    onclick="setOpTypeFilter('expense')">Expense</button>
</div>
    
    <hr style="margin:14px 0; opacity:0.2">

<div style="display:flex; gap:20px; flex-wrap:wrap;">

  <div style="flex:1; min-width:260px;">
    <h4 style="color:green;">Income Accounts</h4>
    <div id="opIncomeAccounts"></div>
    <button class="btn small solid"
      style="background:#0f766e;color:white"
      onclick="promptCreateAccount('income')">
      + Add Income Account
    </button>
  </div>

  <div style="flex:1; min-width:260px;">
    <h4 style="color:#b42318;">Expense Accounts</h4>
    <div id="opExpenseAccounts"></div>
    <button class="btn small solid"
      style="background:#0f766e;color:white"
      onclick="promptCreateAccount('expense')">
      + Add Expense Account
    </button>
  </div>

</div>

<hr style="margin:14px 0; opacity:0.2">

    <div id="opTxnList" style="max-height:300px; overflow:auto"></div>
    <button id="opLoadMore"
      class="btn small solid"
      style="margin-top:8px;background:#0f766e;color:white">
      See More
    </button>
  `;

  openModalGeneric("Operational Transactions", wrapper, null);
  renderOperationalTransactions();
  renderOperationalAccountLists();
}

window.openOperationalDrilldown = openOperationalDrilldown;

function setOpTypeFilter(type) {
  state.ui.opTypeFilter = type;
  renderOperationalTransactions();
}
window.setOpTypeFilter = setOpTypeFilter;

function setOpDateFilter(range) {
  state.ui.opDateFilter = range;
  state.ui.opFromDate = null;
  state.ui.opToDate = null;

  renderOperationalTransactions();
  refreshOperationalHeader();
}
window.setOpDateFilter = setOpDateFilter;


function applyOpDateRange() {
  state.ui.opDateFilter = "custom";
  state.ui.opFromDate = document.getElementById("opFromDate").value;
  state.ui.opToDate = document.getElementById("opToDate").value;

  renderOperationalTransactions();
  refreshOperationalHeader();
}
window.applyOpDateRange = applyOpDateRange;


function clearOpDateRange() {
  state.ui.opDateFilter = "today";
  state.ui.opFromDate = null;
  state.ui.opToDate = null;

  renderOperationalTransactions();
  refreshOperationalHeader();
}
window.clearOpDateRange = clearOpDateRange;

function refreshOperationalHeader() {
  const totals = calculateFilteredOperationalTotals();

  const inc = document.getElementById("opIncome");
  const exp = document.getElementById("opExpense");
  const net = document.getElementById("opNet");

  if (inc) inc.textContent = fmt(totals.income);
  if (exp) exp.textContent = fmt(totals.expense);

  if (net) {
    net.textContent = fmt(totals.net);
    net.style.color = totals.net >= 0 ? "green" : "red";
  }
}
 
function renderOperationalAccountLists() {

  const incomeBox = document.getElementById("opIncomeAccounts");
  const expenseBox = document.getElementById("opExpenseAccounts");

  if (!incomeBox || !expenseBox) return;

  const renderAccountRow = (a, type) => {
  const total = sumEntries(
    getEntriesByAccount(a.id).filter(e => opTxnMatchesFilter(e.date))
  );

  return `
    <div style="
      padding:8px;
      border-bottom:1px solid #eee;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:10px;
      cursor:pointer;"
      onclick="openAccountEntryModal('${a.id}','${type}')">

      <div>
        <b>${a.accountNumber}</b> — ${a.name}
      </div>

      <div style="display:flex;gap:8px;align-items:center">
        <div style="color:${type==='income'?'green':'#b42318'}">
          ${fmt(total)}
        </div>

        <button
          class="btn small"
          onclick="event.stopPropagation(); openAccountEntryModal('${a.id}','${type}')">
          Post
        </button>
      </div>
    </div>
  `;
};

  incomeBox.innerHTML =
    state.accounts.income
      .slice(0,3)
      .map(a => renderAccountRow(a,'income'))
      .join("") +
    (state.accounts.income.length > 3
      ? `<div style="text-align:center; padding:6px; cursor:pointer; color:#0f766e"
           onclick="expandOpAccounts('income')">See More</div>`
      : "");

  expenseBox.innerHTML =
    state.accounts.expense
      .slice(0,3)
      .map(a => renderAccountRow(a,'expense'))
      .join("") +
    (state.accounts.expense.length > 3
      ? `<div style="text-align:center; padding:6px; cursor:pointer; color:#0f766e"
           onclick="expandOpAccounts('expense')">See More</div>`
      : "");
}
window.renderOperationalAccountLists = renderOperationalAccountLists;


function openEmpowermentDrilldown() {
  // Always start drilldown on TODAY
state.ui.empDateFilter = "today";
state.ui.empFromDate = null;
state.ui.empToDate = null;

empTxnLimit = 50;
  const totals = calculateFilteredEmpowermentTotals();

const capitalGiven = totals.capitalGiven;
const capitalRepaid = totals.principalRepaid;
const interestEarned = totals.interestEarned;
const outstandingCapital = totals.outstandingCapital;


// Interest left = expected interest from disbursed loans minus interest earned
const interestLeft = (state.empowerments || []).reduce((sum, e) => {
  const remaining = (e.expectedInterest || 0) - (e.interestRepaid || 0);
  return sum + (remaining > 0 ? remaining : 0);
}, 0);
// (We leave interestLeft display based on loan engine elsewhere — drilldown focuses on transactions history)

  const wrapper = document.createElement("div");

  wrapper.innerHTML = `
    <div style="margin-bottom:10px">
      <div><b>Capital Given:</b> <span id="empCapGiven">${fmt(capitalGiven)}</span></div>
<div><b>Capital Repaid:</b> <span id="empCapRepaid">${fmt(capitalRepaid)}</span></div>
<div><b>Interest Earned:</b> <span id="empIntEarned" style="color:green">${fmt(interestEarned)}</span></div>
<div><b>Interest Left:</b> <span style="color:red">${fmt(interestLeft)}</span></div>
<div><b>Outstanding Capital:</b> <span id="empOutstanding">${fmt(outstandingCapital)}</span></div>
    </div>

    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px">
  <button class="btn small solid primary"
    onclick="setEmpDateFilter('today')">${labelRange('today')}</button>

  <button class="btn small solid primary"
    onclick="setEmpDateFilter('week')">${labelRange('week')}</button>

  <button class="btn small solid primary"
    onclick="setEmpDateFilter('month')">${labelRange('month')}</button>

  <button class="btn small solid primary"
    onclick="setEmpDateFilter('year')">${labelRange('year')}</button>

  <button class="btn small solid primary"
    onclick="setEmpDateFilter('all')">${labelRange('all')}</button>
</div>

    <div style="display:flex; gap:6px; margin-bottom:8px">
  <input type="date" id="empFromDate" class="input small">
  <span>to</span>
  <input type="date" id="empToDate" class="input small">
  <button class="btn small solid primary" onclick="applyEmpDateRange()">Apply</button>
  <button class="btn small solid" onclick="clearEmpDateRange()">Clear</button>
</div>


    <div style="display:flex; gap:6px; margin-bottom:10px">
      <button class="btn small solid primary" onclick="exportEmpowermentCSV()">Export CSV</button>
      <button class="btn small solid primary" onclick="printEmpowermentSummary()">Print Summary</button>
    </div>

    <div id="empTxnList" style="max-height:300px; overflow:auto"></div>
    <button id="empLoadMore" class="btn small solid primary" style="margin-top:8px">See More</button>
  `;

  openModalGeneric("Empowerment Transactions", wrapper, null);

  renderEmpowermentTransactions();
}
window.openEmpowermentDrilldown = openEmpowermentDrilldown;

function setEmpDateFilter(range) {
  state.ui.empDateFilter = range;
  state.ui.empFromDate = null;
  state.ui.empToDate = null;

  updateEmpowermentHeaderTotals();  // ⭐
  renderEmpowermentTransactions();
}
window.setEmpDateFilter = setEmpDateFilter;


function applyEmpDateRange() {
  const from = document.getElementById("empFromDate").value;
  const to = document.getElementById("empToDate").value;

  state.ui.empDateFilter = "range";
  state.ui.empFromDate = from ? new Date(from) : null;
  state.ui.empToDate = to ? new Date(to) : null;

  updateEmpowermentHeaderTotals();  // ⭐
  renderEmpowermentTransactions();
}
window.applyEmpDateRange = applyEmpDateRange;

function clearEmpDateRange() {
  state.ui.empDateFilter = "today";
  state.ui.empFromDate = null;
  state.ui.empToDate = null;

  document.getElementById("empFromDate").value = "";
  document.getElementById("empToDate").value = "";

  renderEmpowermentTransactions();
}
window.clearEmpDateRange = clearEmpDateRange;


function empTxnMatchesFilter(dateStr) {
  if (!dateStr) return false;

  const d = new Date(dateStr);
  if (isNaN(d)) return false;

  const now = new Date();
  const filter = state.ui.empDateFilter || "today";

  // Normalize times
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  switch (filter) {
    case "today":
      return d >= startOfToday;

    case "week":
      return d >= startOfWeek;

    case "month":
      return d >= startOfMonth;

    case "year":
      return d >= startOfYear;

    case "all":
      return true;

    case "range":
 if (!state.ui.empFromDate || !state.ui.empToDate) return true;

 const from = new Date(state.ui.empFromDate);
 from.setHours(0,0,0,0);

 const to = new Date(state.ui.empToDate);
 to.setHours(23,59,59,999);

 return d >= from && d <= to;

    default:
      return true;
  }
}
window.empTxnMatchesFilter = empTxnMatchesFilter;


function exportEmpowermentCSV() {
  const approvals = (state.approvals || [])
    .filter(a => a.type === "empowerment" && a.status === "approved")
    .map(a => ({
  date: a.processedAt || a.date || a.createdAt || a.requestedAt,
  amount: a.amount,
  desc: "Empowerment Granted"
}));

  const repayments = (state.transactions || [])
  .filter(t =>
    t.type === "empowerment_repayment_principal" ||
    t.type === "empowerment_repayment_interest"
  )
  .map(t => ({
    date: t.date,
    amount: t.amount,
    desc: t.desc
  }));

  const txns = [...approvals, ...repayments]
    .filter(t => empTxnMatchesFilter(t.date))
    .sort((a,b) => new Date(a.date) - new Date(b.date));

  let csv = "S/N,Date,Amount,Description\n";

  txns.forEach((t, i) => {
    csv += `${i+1},${new Date(t.date).toLocaleString()},${t.amount},"${t.desc || ""}"\n`;
  });

  const total = txns.reduce((s,t)=>s+t.amount,0);
  csv += `\n,,TOTAL,${Number(total)}\n`;

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "empowerment_transactions.csv";
  a.click();
}
window.exportEmpowermentCSV = exportEmpowermentCSV;

function printEmpowermentSummary() {
  const repayments = (state.transactions || [])
    .filter(t => t.type === "credit" && t.desc?.toLowerCase().includes("empowerment"))
    .map(t => ({
      date: t.date,
      amount: t.amount,
      desc: t.desc
    }));

  const approvals = (state.approvals || [])
    .filter(a => a.type === "empowerment" && a.status === "approved")
    .map(a => ({
      date: a.processedAt || a.date || a.createdAt || a.requestedAt,
      amount: a.amount,
      desc: "Empowerment Granted"
    }));

  const txns = [...approvals, ...repayments]
    .filter(t => empTxnMatchesFilter(t.date))
    .sort((a,b) => new Date(b.date) - new Date(a.date));

  const total = txns.reduce((s, t) => s + t.amount, 0);

  const w = window.open("", "_blank");
  if (!w) return alert("Popup blocked. Allow popups to print.");

  w.document.write(`
    <html>
    <head>
      <title>Empowerment Summary</title>
      <style>
        body { font-family: Arial; padding:20px }
        h2 { margin-bottom:5px }
        .row { margin-bottom:4px; font-size:14px }
      </style>
    </head>
    <body>
      <h2>Empowerment Summary</h2>
      <p>Total Transactions: ${txns.length}</p>
      <p>Total Amount: ${fmt(total)}</p>
      <hr>
      ${txns.map((t,i) => `
        <div class="row">
          ${i+1}. ${new Date(t.date).toLocaleString()} — ${fmt(t.amount)} — ${t.desc}
        </div>
      `).join("")}
    </body>
    </html>
  `);

  w.document.close();
  w.print();
}
window.printEmpowermentSummary = printEmpowermentSummary;




let empTxnLimit = 50;

function renderEmpowermentTransactions() {
  const container = document.getElementById("empTxnList");
  if (!container) return;

  const txns = (state.transactions || [])
    .filter(t =>
      // accept ALL known empowerment-related records safely
      t &&
      (
        (t.type && t.type.startsWith("empowerment_")) ||
        (t.desc && t.desc.toLowerCase().includes("empowerment"))
      )
    )
    .filter(t => t.date && !isNaN(new Date(t.date))) // only valid dates
    .filter(t => empTxnMatchesFilter(t.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, empTxnLimit);

  if (txns.length === 0) {
    container.innerHTML = `<div class="small muted">No empowerment transactions in this range</div>`;
  } else {
    container.innerHTML = txns.map(t => {
      const customer = (state.customers || []).find(c => c.id === t.customerId);
      const name = customer ? customer.name : "Unknown Customer";

      return `
        <div class="small" style="margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:6px">
          <b>${name}</b> — ${fmt(t.amount || 0)}<br>
          <span class="muted">${t.desc || ""}</span><br>
          <span class="muted">${new Date(t.date).toLocaleString()}</span>
        </div>
      `;
    }).join("");
  }

  const loadMoreBtn = document.getElementById("empLoadMore");
  if (loadMoreBtn) {
    loadMoreBtn.onclick = () => {
      empTxnLimit += 50;
      renderEmpowermentTransactions();
    };
  }
}
window.renderEmpowermentTransactions = renderEmpowermentTransactions;

function bizTxnMatchesFilter(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();

  const sameDay = (a,b) =>
    a.getFullYear()===b.getFullYear() &&
    a.getMonth()===b.getMonth() &&
    a.getDate()===b.getDate();

  switch (state.ui.bizDateFilter) {
    case "today": return sameDay(d, now);

    case "week": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0,0,0,0);
      return d >= start;
    }

    case "month":
      return d.getMonth()===now.getMonth() &&
             d.getFullYear()===now.getFullYear();

    case "year":
      return d.getFullYear()===now.getFullYear();

    case "custom":
      if (!state.ui.bizFromDate || !state.ui.bizToDate) return true;
      return d >= new Date(state.ui.bizFromDate) &&
             d <= new Date(state.ui.bizToDate + "T23:59:59");

    default: return true;
  }
}
window.bizTxnMatchesFilter = bizTxnMatchesFilter;

function refreshBusinessHeaderTotals() {
 const t = calculateFilteredBusinessTotals();

 const c = document.getElementById("bizCredit");
 const w = document.getElementById("bizWithdrawal");
 const n = document.getElementById("bizNet");

 if (c) c.textContent = fmt(t.income);
 if (w) w.textContent = fmt(t.expense);

 if (n) {
   n.textContent = fmt(t.net);
   n.style.color = t.net >= 0 ? "green" : "red";
 }
}
window.refreshBusinessHeaderTotals = refreshBusinessHeaderTotals;

function setBizDateFilter(range) {
 state.ui.bizDateFilter = range;
 state.ui.bizFromDate = null;
 state.ui.bizToDate = null;

 renderBusinessTransactions();
 refreshBusinessHeaderTotals(); // 🔥 NEW
}
window.setBizDateFilter = setBizDateFilter;


function applyBizDateRange() {
 state.ui.bizDateFilter = "custom";
 state.ui.bizFromDate = document.getElementById("bizFromDate").value;
 state.ui.bizToDate = document.getElementById("bizToDate").value;

 renderBusinessTransactions();
 refreshBusinessHeaderTotals(); // 🔥 NEW
}
window.applyBizDateRange = applyBizDateRange;


function clearBizDateRange() {
 state.ui.bizDateFilter = "today";
 state.ui.bizFromDate = null;
 state.ui.bizToDate = null;

 renderBusinessTransactions();
 refreshBusinessHeaderTotals(); // 🔥 NEW
}
window.clearBizDateRange = clearBizDateRange;


function calculateFilteredBusinessTotals() {

  const txns = (state.transactions || []).filter(t =>
    (t.type === "credit" || t.type === "withdraw") &&
    bizTxnMatchesFilter(t.date)
  );

  let credit = 0;
  let withdrawal = 0;

  txns.forEach(t => {
    if (t.type === "credit") credit += Number(t.amount || 0);
    if (t.type === "withdraw") withdrawal += Number(t.amount || 0);
  });

  let net = credit - withdrawal;

  // Include empowerment toggle
  if (state.business?.includeEmpowerment) {
    net += calculateEmpowermentPosition();
  }

  return { income: credit, expense: withdrawal, net };
}
window.calculateFilteredBusinessTotals = calculateFilteredBusinessTotals;



let bizTxnLimit = 50;

function renderBusinessTransactions() {
  const container = document.getElementById("bizTxnList");
  if (!container) return;

  const txns = (state.transactions || [])
    .filter(t => t.type === "credit" || t.type === "withdraw")
    .filter(t => bizTxnMatchesFilter(t.date))
    .sort((a,b) => new Date(a.date) - new Date(b.date)) // oldest → newest for running balance
    .slice(0, bizTxnLimit);

  let running = 0;

  container.innerHTML = txns.map(t => {
    if (t.type === "credit") running += Number(t.amount || 0);
    if (t.type === "withdraw") running -= Number(t.amount || 0);

    const customer = state.customers.find(c => c.id === t.customerId);

    return `
      <div class="small" style="margin-bottom:6px; border-bottom:1px solid #eee; padding-bottom:4px">
        ${new Date(t.date).toLocaleString()} — <b>${fmt(t.amount)}</b><br>
        <span class="muted">${customer ? customer.name : ""} • ${t.type.toUpperCase()}</span><br>
        <span class="muted">Running Balance: 
          <b style="color:${running>=0?'green':'red'}">${fmt(running)}</b>
        </span>
      </div>
    `;
  }).join("");

  const btn = document.getElementById("bizLoadMore");
  if (btn) {
    btn.onclick = () => {
      bizTxnLimit += 50;
      renderBusinessTransactions();
    };
  }
}

window.renderBusinessTransactions = renderBusinessTransactions;


function loadMoreBusinessTransactions() {
  bizTxnLimit += 50;
  renderBusinessTransactions();
}
window.loadMoreBusinessTransactions = loadMoreBusinessTransactions;




function openBusinessDrilldown() {
state.ui.bizDateFilter = "today";
state.ui.bizFromDate = null;
state.ui.bizToDate = null;
bizTxnLimit = 50;

 const bizTxns = (state.transactions || []).filter(t =>
  (t.type === "business_credit" || t.type === "business_withdrawal") &&
  bizTxnMatchesFilter(t.date)
);

let totalCredit = 0;
let totalWithdrawal = 0;

bizTxns.forEach(t => {
  if (t.type === "business_credit") totalCredit += Number(t.amount || 0);
  if (t.type === "business_withdrawal") totalWithdrawal += Number(t.amount || 0);
});

let net = totalCredit - totalWithdrawal;

if (state.business?.includeEmpowerment) {
  net += calculateEmpowermentPosition();
}

const totals = {
  income: totalCredit,
  expense: totalWithdrawal,
  net
};

  const wrapper = document.createElement("div");

  wrapper.innerHTML = `
    <div style="margin-bottom:10px">
  <div><b>Total Credit:</b> <span id="bizCredit">${fmt(totals.income)}</span></div>
<div><b>Total Withdrawal:</b> <span id="bizWithdrawal">${fmt(totals.expense)}</span></div>
<div><b>Net Business Balance:</b>
  <span id="bizNet" style="color:${totals.net>=0?'green':'red'}">${fmt(totals.net)}</span>
  <label style="font-size:12px; display:flex; gap:6px; align-items:center; margin-top:6px;">
  <input type="checkbox"
    ${state.business.includeEmpowerment ? "checked" : ""}
    onchange="toggleBizEmpowerment(this.checked)">
  Include Empowerment Position
</label>
</div>
</div>

    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px">
  <button class="btn small solid" style="background:#6a1b9a;color:white"
    onclick="setBizDateFilter('today')">${labelRange('today')}</button>

  <button class="btn small solid" style="background:#6a1b9a;color:white"
    onclick="setBizDateFilter('week')">${labelRange('week')}</button>

  <button class="btn small solid" style="background:#6a1b9a;color:white"
    onclick="setBizDateFilter('month')">${labelRange('month')}</button>

  <button class="btn small solid" style="background:#6a1b9a;color:white"
    onclick="setBizDateFilter('year')">${labelRange('year')}</button>

  <button class="btn small solid" style="background:#6a1b9a;color:white"
    onclick="setBizDateFilter('all')">${labelRange('all')}</button>
</div>


    <div style="display:flex; gap:6px; margin-bottom:8px">
      <input type="date" id="bizFromDate" class="input small">
      <span>to</span>
      <input type="date" id="bizToDate" class="input small">
      <button class="btn small solid" style="background:#6a1b9a;color:white" onclick="applyBizDateRange()">Apply</button>
      <button class="btn small solid" onclick="clearBizDateRange()">Clear</button>
    </div>

    <div style="display:flex; gap:6px; margin-bottom:10px">
  <button class="btn small solid"
          style="background:#6a1b9a; border-color:#6a1b9a"
          onclick="exportBusinessCSV()">Export CSV</button>

  <button class="btn small solid"
          style="background:#6a1b9a; border-color:#6a1b9a"
          onclick="printBusinessSummary()">Print Summary</button>
</div>

    <div id="bizTxnList" style="max-height:300px; overflow:auto"></div>
    <button id="bizLoadMore" class="btn small solid"
  style="margin-top:8px;background:#6a1b9a;color:white"
  onclick="loadMoreBusinessTransactions()">
  See More
</button>
  `;

  openModalGeneric("Business Transactions", wrapper, null);
  renderBusinessTransactions();
}
window.openBusinessDrilldown = openBusinessDrilldown;

function updateBusinessHeaderTotals() {
  const t = calculateFilteredBusinessTotals();

  const c = document.getElementById("bizCredit");
  const w = document.getElementById("bizWithdrawal");
  const n = document.getElementById("bizNet");

  if (c) c.textContent = fmt(t.income);
  if (w) w.textContent = fmt(t.expense);

  if (n) {
    n.textContent = fmt(t.net);
    n.style.color = t.net >= 0 ? "green" : "red";
  }
}
window.updateBusinessHeaderTotals = updateBusinessHeaderTotals;

function toggleBizEmpowerment(val) {
  state.business.includeEmpowerment = val;
  save();

  // Recalculate header
  const t = calculateFilteredBusinessTotals();
  const n = document.getElementById("bizNet");

  if (n) {
    n.textContent = fmt(t.net);
    n.style.color = t.net >= 0 ? "green" : "red";
  }

  // Update card too
  renderAccounts();
}
window.toggleBizEmpowerment = toggleBizEmpowerment;


function exportBusinessCSV() {

  const txns = (state.transactions || [])
    .filter(t => t.type === "credit" || t.type === "withdraw")
    .filter(t => bizTxnMatchesFilter(t.date))
    .sort((a,b) => new Date(a.date) - new Date(b.date));

  let csv = "S/N,DateTime,Customer,Amount,Type,Description\n";

  let totalCredit = 0;
  let totalWithdraw = 0;

  txns.forEach((t, i) => {

    const customer = state.customers.find(c => c.id === t.customerId);

    const dateTime = new Date(t.date)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);

    const amount = Number(t.amount || 0);

    if (t.type === "credit") totalCredit += amount;
    if (t.type === "withdraw") totalWithdraw += amount;

    csv += [
      i + 1,
      dateTime,
      customer ? customer.name : "",
      amount,
      t.type.toUpperCase(),
      `"${t.desc || ""}"`
    ].join(",") + "\n";
  });

  const net = totalCredit - totalWithdraw;

  // 🔹 Add totals row
  csv += "\n";
  csv += `,,,TOTAL CREDIT,${totalCredit},\n`;
  csv += `,,,TOTAL WITHDRAWAL,${totalWithdraw},\n`;
  csv += `,,,NET BALANCE,${net},\n`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "business_transactions.csv";
  a.click();

  URL.revokeObjectURL(url);
}

window.exportBusinessCSV = exportBusinessCSV;



function printBusinessSummary() {
  const txns = (state.transactions || [])
    .filter(t => t.type === "credit" || t.type === "withdraw")
    .filter(t => bizTxnMatchesFilter(t.date))
    .sort((a,b) => new Date(a.date) - new Date(b.date));

  let rows = txns.map((t,i) => {
    const customer = state.customers.find(c => c.id === t.customerId);
    return `
      <tr>
        <td>${i+1}</td>
        <td>${new Date(t.date).toLocaleString()}</td>
        <td>${customer ? customer.name : ""}</td>
        <td>${t.type}</td>
        <td>${fmt(t.amount)}</td>
        <td>${t.desc || ""}</td>
      </tr>
    `;
  }).join("");

  const totals = calculateFilteredBusinessTotals();

  const win = window.open("", "", "width=900,height=700");
  win.document.write(`
    <h2>Business Transaction Summary</h2>
    <table border="1" cellspacing="0" cellpadding="6" width="100%">
      <thead style="background:#6a1b9a;color:white">
        <tr>
          <th>#</th><th>Date</th><th>Customer</th><th>Type</th><th>Amount</th><th>Description</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <h3>Net Business Change: ${fmt(totals.net)}</h3>
  `);

  win.document.close();
  win.print();
}
window.printBusinessSummary = printBusinessSummary;


function openCODDrillDown(staffId, date) {
  const modal = document.getElementById("txModal");
  const body = document.getElementById("txBody");
  const title = document.getElementById("txTitle");
  const back = document.getElementById("txModalBack");

  const cod = state.cod.find(
    c => c.staffId === staffId && c.date === date
  );

  if (!cod) {
    showToast("COD record not found");
    return;
  }

  // 🔒 SNAPSHOT (SOURCE OF TRUTH)
  const snap = cod.snapshot || {
    credits: 0,
    withdrawals: 0,
    empowerments: 0
  };

  // 🔑 ALL TRANSACTIONS BY STAFF FOR DATE (APPROVED + PENDING)
  const txs = (state.approvals || [])
    .filter(a =>
      a.requestedBy === staffId &&
      (a.processedAt || a.requestedAt)?.startsWith(date)
    )
    .sort(
      (a, b) =>
        new Date(b.processedAt || b.requestedAt) -
        new Date(a.processedAt || a.requestedAt)
    );

  title.textContent = "Close of Day — Breakdown (Read-only)";

  // 🔒 LOCK MODAL HEIGHT (SCROLL FIX)
  body.style.height = "70vh";
  body.style.overflow = "hidden";
  body.style.display = "flex";
  body.style.flexDirection = "column";

  body.innerHTML = `
    <!-- HEADER -->
    <div class="small" style="display:flex;gap:12px;flex-wrap:wrap">
      <div><b>Staff:</b> ${cod.staffName}</div>
      <div><b>Date:</b> ${cod.date}</div>
      <div><b>Expected:</b> ${fmt(cod.systemExpected)}</div>
      <div><b>Declared:</b> ${fmt(cod.staffDeclared)}</div>
    </div>

    ${
      cod.status === "resolved"
        ? `
          <div class="small muted" style="margin-top:4px">
            <b>Resolved:</b> ${fmt(cod.resolvedAmount)}
            — 🧾 ${cod.resolutionNote || "—"}
          </div>
        `
        : cod.staffNote
        ? `
          <div class="small muted" style="margin-top:4px">
            📝 ${cod.staffNote}
          </div>
        `
        : ""
    }

    <!-- SNAPSHOT SUMMARY -->
    <div class="small" style="margin-top:8px">
      Credits: <b>${fmt(snap.credits)}</b><br/>
      Withdrawals (info): ${fmt(snap.withdrawals)}<br/>
      Empowerments (info): ${fmt(snap.empowerments)}
    </div>

    <h4 style="margin:8px 0 4px">Transactions</h4>

    <!-- SCROLL AREA -->
    <div
      style="
        flex:1;
        overflow-y:auto;
        padding-right:10px;
      "
    >
      ${
        txs.length
          ? txs.map(t => `
            <div class="small" style="border-bottom:1px solid #eee;padding:6px 0">
              <b>${t.type.toUpperCase()}</b> — ${fmt(t.amount)}<br/>
              <span class="muted">
                ${new Date(t.processedAt || t.requestedAt).toLocaleString()}
                — ${t.status.toUpperCase()}
              </span>
            </div>
          `).join("")
          : `<div class="small muted">No transactions</div>`
      }
    </div>

    ${
      isManager()
        ? `
          <div style="margin-top:10px">
            <label class="small muted">Manager note (optional)</label>

            <textarea
              id="managerNoteInput"
              class="input"
              style="margin-top:4px;min-height:60px"
              placeholder="Internal note (visible to staff)"
            >${cod.managerNote || ""}</textarea>

            <button
              id="saveManagerNoteBtn"
              class="btn"
              style="margin-top:6px"
            >
              Save Note
            </button>
          </div>
        `
        : ""
    }
  `;

  modal.querySelectorAll(".tx-ok").forEach(b => b.remove());
  back.style.display = "flex";

  // 💾 SAVE MANAGER NOTE
  const saveBtn = document.getElementById("saveManagerNoteBtn");
  if (saveBtn) {
    saveBtn.onclick = () => {
  const input = document.getElementById("managerNoteInput");
  if (!input) return;

  cod.managerNote = input.value.trim();
  cod.managerNoteAt = new Date().toISOString();
  cod.managerNoteBy = currentStaff()?.name || "";

  save();

  input.value = ""; // ✅ CLEAR FIELD AFTER SAVE

  showToast("Manager note saved");
  renderCODForDate(cod.date);
};
  }
}

window.openCODDrillDown = openCODDrillDown;



function openTransactionDetails(txId) {
  const cust = state.customers.find(c => c.id === activeCustomerId);
  if (!cust) return;

  const tx = cust.transactions.find(t => t.id === txId);
  if (!tx) return;

  let approvalInfo = "";

  if (tx.approvalId) {
    const approval = state.approvals.find(a => a.id === tx.approvalId);
    if (approval) {
      approvalInfo += `
        <div class="small"><b>Approval Type:</b> ${approval.type}</div>
        <div class="small"><b>Requested By:</b> ${approval.requestedBy}</div>
        <div class="small"><b>Status:</b> ${approval.status}</div>
      `;
    }
  }

  if (tx.type === "credit" && tx.desc && tx.desc.toLowerCase().includes("empowerment")) {
    approvalInfo += `
      <div class="small" style="margin-top:6px"><b>This credit was split between:</b></div>
      <div class="small">• Empowerment repayment</div>
      <div class="small">• Main balance credit</div>
    `;
  }

  openModalGeneric(
  "Transaction Details",
  `
    <div class="small"><b>Amount:</b> ${fmt(tx.amount)}</div>
    <div class="small"><b>Date:</b> ${new Date(tx.date).toLocaleString()}</div>
    <div class="small"><b>Description:</b> ${tx.desc || "—"}</div>
    <div class="small"><b>Processed By:</b> ${tx.actor || "—"}</div>
    ${approvalInfo}
  `,
  "Close",
  false   // 🔥 hides Cancel button ONLY here
);
}

function forceFullUIRefresh() {
  renderCustomers();
  renderApprovals();
  renderCustomerKycApprovals();
  renderDashboardApprovals();
  renderDashboardActivity && renderDashboardActivity();
  renderAudit && renderAudit();
  renderDashboard();
}

function renderDashboard() {
 const dash = document.getElementById("dashboardView");
 if (!dash) return; // 🔥 allow rendering even when hidden

 if (!canViewDashboard()) return;

 renderDashboardKPIs();
 renderAttentionRequired();
  renderDashboardActivity();
 initCODDatePicker();
 bindCODButtons();
 renderManagerCODSummary(window.activeCODDate);
 renderCODForDate(window.activeCODDate);
 renderApprovals?.();
renderDashboardApprovals?.();
renderCustomerKycApprovals(); // stays last
}


function renderDashboardApprovals() {
  const box = document.getElementById("dashboardApprovals");
  if (!box) return;

  box.innerHTML = "";

  // 🔥 INCLUDE ALL approvals (including customer_creation)
  const pending = (state.approvals || [])
    .filter(a => a.status === "pending")
    .sort((a, b) => new Date(b.createdAt || b.requestedAt) - new Date(a.createdAt || a.requestedAt));

  if (!pending.length) {
    box.innerHTML = `<div class="small">No approvals requiring action</div>`;
    return;
  }

  pending.forEach(a => {
    const cust = state.customers.find(c => c.id === a.customerId);
    const isKyc = a.type === "customer_creation";
    const p = a.payload || {};

    const dateRaw = a.createdAt || a.requestedAt || a.date;
    const date = dateRaw ? new Date(dateRaw).toLocaleString() : "—";

    const row = document.createElement("div");
    row.className = "approval-row large";

    // 🔥 FIX: Only calculate risk for monetary transactions
    const risk =
      !isKyc && a.amount >= 500000
        ? `<span class="badge danger">HIGH RISK</span>`
        : "";

    // 🔥 FIX: Proper title handling (NO NaN, NO weird chars)
    const title = isKyc
      ? "NEW CUSTOMER REQUEST"
      : `${a.type.toUpperCase()} — ${fmt(a.amount)}`;

    // 🔥 FIX: Proper customer name resolution
    const customerName = isKyc
      ? (p.name || "Pending KYC")
      : (cust?.name || "Unknown");

    // 🔥 FIX: Requested by field (supports both pipelines)
    const requestedBy =
      a.createdByName || a.requestedByName || a.requestedBy || "—";

    row.innerHTML = `
      <div class="approval-info">
        <strong>${title}</strong> ${risk}

        <div class="small"><b>Customer:</b> ${customerName}</div>
        <div class="small"><b>Requested by:</b> ${requestedBy}</div>
        <div class="small muted">${date}</div>
      </div>

      <div class="approval-actions">
        <button class="btn approve">Approve</button>
        <button class="btn danger reject">Reject</button>
      </div>
    `;

    // 🔥 ACTION HANDLERS (supports KYC + transactions)
    row.querySelector(".approve").onclick = () =>
      confirmApproval(a, "approved");

    row.querySelector(".reject").onclick = () =>
      confirmApproval(a, "rejected");

    // 🔥 Only open customer modal for real customers (not KYC yet)
    row.querySelector(".approval-info").onclick = () => {
      if (!isKyc && cust) {
        openCustomerModal(cust.id);
      }
    };

    box.appendChild(row);
  });
}


function renderDashboardActivity() {
  const box = document.getElementById("dashboardActivity");
  if (!box) return;

  const logs = state.audit.slice(-6).reverse();

  if (!logs.length) {
    box.innerHTML = `<div class="small muted">No recent activity</div>`;
    
    if (["manager", "ceo"].includes(currentStaff()?.role)) {
  renderAccounts();
}
    return;
  }

  box.innerHTML = logs.map(a => `
    <div class="small">
      ${new Date(a.time).toLocaleString()} —
      <b>${a.actor}</b> (${a.role}) →
      ${a.action}
    </div>
  `).join("");
  // 🔑 Always render accounts for manager/CEO
if (["manager", "ceo"].includes(currentStaff()?.role)) {
  renderAccounts();
}
}

function renderAccountEntries(accountId) {

  // Ensure entry limit storage exists
if (!state.ui.entryDisplayLimit) {
  state.ui.entryDisplayLimit = {};
}

const limitMap = state.ui.entryDisplayLimit;

if (!limitMap[accountId]) {
  limitMap[accountId] = 50; // default visible entries
}

  const entries = (state.accountEntries || [])
    .filter(e => e.accountId === accountId)
    .filter(e => entryMatchesFilter(e.date)) // respect date filter
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // oldest first

  const visibleEntries = entries.slice(-limitMap[accountId]); // last N entries

  let running = 0;

  const formatDateTime = (iso) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    const time = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit"
    });
    return `${date}, ${time}`;
  };

  const rows = visibleEntries.map(e => {
    const amount = Number(e.amount || 0);
    running += amount;

    const isPositive = amount >= 0;
    const sign = isPositive ? "+" : "−";
    const color = isPositive ? "green" : "red";

    return `
      <div class="entry-row" data-entry="${e.id}"
      style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #eee;">
        <div style="flex:1">
          <div><b>${formatDateTime(e.date)}</b> — ${e.note || "Entry"}</div>
          <div style="font-size:12px; color:#666;">
            Amount: <span style="color:${color}">${sign}${fmt(Math.abs(amount))}</span>
          </div>
        </div>
        <div style="text-align:right; font-weight:bold;">
          ${fmt(running)}
        </div>
      </div>
    `;
  });

  const hasMore = entries.length > visibleEntries.length;

  return rows.length
    ? `<div style="max-height:260px; overflow-y:auto; padding-right:4px;">
         ${rows.reverse().join("")}
         ${hasMore ? `
           <div style="text-align:center; padding:8px;">
             <button class="btn small solid"
               onclick="loadMoreEntries('${accountId}')">
               Load More
             </button>
           </div>
         ` : ``}
       </div>`
    : `<div class="small muted">No entries yet</div>`;
}

window.renderAccountEntries = renderAccountEntries;

function loadMoreEntries(accountId) {
  state.ui.entryDisplayLimit[accountId] += 50;
  renderAccounts();
}
window.loadMoreEntries = loadMoreEntries;

function loadMoreOperationalTransactions() {
  state.ui.operationalTxLimit += 50;
  openOperationalDrilldown();
}
window.loadMoreOperationalTransactions = loadMoreOperationalTransactions;

function createEmpowerment(clientName, amount, note="") {
  const staff = currentStaff();
  if (!staff || !["manager","ceo"].includes(staff.role)) {
    showToast("Not authorized");
    return;
  }

  amount = Number(amount);
  if (!amount || amount <= 0) {
    showToast("Invalid amount");
    return;
  }

  state.empowerments.push({
    id: uid("emp"),
    clientName,
    note,
    principalGiven: amount,
    principalRepaid: 0,
    interestRepaid: 0,
    status: "active",
    createdAt: new Date().toISOString(),
    createdBy: staff.name,
    history: [
      {
        type: "disbursement",
        amount,
        date: new Date().toISOString(),
        by: staff.name
      }
    ]
  });

  save();
  renderEmpowermentBalance();
  showToast("Empowerment created");
}

window.createEmpowerment = createEmpowerment;

function recordEmpowermentRepayment(empId, principal=0, interest=0) {
  const emp = state.empowerments.find(e => e.id === empId);
  if (!emp) return;

  principal = Number(principal) || 0;
  interest = Number(interest) || 0;

  emp.principalRepaid += principal;
  emp.interestRepaid += interest;

  emp.history.push({
    type: "repayment",
    principal,
    interest,
    date: new Date().toISOString(),
    by: currentStaff().name
  });

  // Auto complete if fully repaid
  const totalRepaid = emp.principalRepaid + emp.interestRepaid;
const totalOwed = emp.principalGiven + (emp.expectedInterest || 0);

if (totalRepaid >= totalOwed) {
  emp.status = "completed";
}

  save();
  renderEmpowermentBalance();
}

window.recordEmpowermentRepayment = recordEmpowermentRepayment;


function sumEmpowermentDisbursed() {
  return (state.empowerments || []).reduce((s,e)=> s + (e.principalGiven || 0), 0);
}

function sumEmpowermentRepaid() {
  return (state.empowerments || []).reduce((s,e)=> 
    s + (e.principalRepaid || 0) + (e.interestRepaid || 0)
  , 0);
}

function hasActiveEmpowerment(customerId) {
  return (state.customers || []).some(c =>
    c.id === customerId && c.empowermentActive
  );
}

function sumEmpowermentInterest() {
  const totalGiven = sumEmpowermentDisbursed();
  const totalRepaid = sumEmpowermentRepaid();

  return Math.max(0, totalRepaid - totalGiven);
}


function calculateEmpowermentPosition() {
  const capitalGiven = sumEmpowermentDisbursed();
  const totalRepaid = sumEmpowermentRepaid();
  return totalRepaid - capitalGiven;
}
window.calculateEmpowermentPosition = calculateEmpowermentPosition;

 function calculateEmpowermentBalance() {
  const loans = state.empowerments || [];

  let totalGivenOut = 0;
  let totalReturnedCapital = 0;
  let totalInterestEarned = 0;

  loans.forEach(l => {
    totalGivenOut += Number(l.principalGiven || 0);
    totalReturnedCapital += Number(l.principalRepaid || 0);
    totalInterestEarned += Number(l.interestRepaid || 0);
  });

  return {
    totalGivenOut,
    totalReturnedCapital,
    totalInterestEarned,
    netPosition: totalGivenOut - totalReturnedCapital
  };
}
window.calculateEmpowermentBalance = calculateEmpowermentBalance;

function calculateFilteredEmpowermentTotals() {
  const loans = state.empowerments || [];

  let capitalGiven = 0;
  let principalRepaid = 0;
  let interestEarned = 0;
  let outstandingCapital = 0;

  loans.forEach(e => {
    const disbursedDate = new Date(e.createdAt);
    const repaidDate = new Date(e.updatedAt || e.createdAt);

    // CAPITAL GIVEN
    if (empTxnMatchesFilter(disbursedDate)) {
      capitalGiven += Number(e.principalGiven || 0);
    }

    // REPAYMENTS
    if (empTxnMatchesFilter(repaidDate)) {
      principalRepaid += Number(e.principalRepaid || 0);
      interestEarned += Number(e.interestRepaid || 0);
    }

    // OUTSTANDING AS OF FILTER RANGE
    const remaining = (e.principalGiven || 0) - (e.principalRepaid || 0);
    if (remaining > 0 && empTxnMatchesFilter(disbursedDate)) {
      outstandingCapital += remaining;
    }
  });

  return { capitalGiven, principalRepaid, interestEarned, outstandingCapital };
}

window.calculateFilteredEmpowermentTotals = calculateFilteredEmpowermentTotals;


function renderEmpowermentBalance() {
  const el = document.getElementById("empowermentPanel");
  if (!el) return;

  const b = calculateEmpowermentBalance();

  el.innerHTML = `
    <div class="card" style="border-left:4px solid #6a1b9a; margin-bottom:12px;">
      <h4>Empowerment Balance</h4>

      <div>Capital Given Out: <b>${fmt(b.totalGivenOut)}</b></div>
      <div>Capital Repaid: <b>${fmt(b.totalReturnedCapital)}</b></div>
      <div>Interest Earned: <b style="color:green">${fmt(b.totalInterestEarned)}</b></div>

      <hr/>

      <div>
        Outstanding Capital:
        <b style="color:${b.deployedCapital>0?'red':'green'}">
          ${fmt(b.deployedCapital)}
        </b>
      </div>
    </div>
  `;
}

window.renderEmpowermentBalance = renderEmpowermentBalance;

function renderAccountList(type) {
  return state.accounts[type]
    .filter(a => !a.archived)
    .map(a => `
      <div id="acc-${a.id}" class="card small">
        <b>${a.accountNumber}</b> — ${a.name}<br/>

        <div class="small muted" style="margin:4px 0">
          Total: <b>
            ${fmt(
              sumEntries(
                getEntriesByAccount(a.id)
              )
            )}
          </b>
        </div>

        <button class="btn small solid"
          onclick="event.stopPropagation(); openAccountEntryModal('${a.id}', '${type}')">
          + Add Entry
        </button>
      </div>
    `).join("");
}

window.renderAccountList = renderAccountList;

function renderAccounts() {
const totalIncome = sumEntries(
  state.accountEntries.filter(e =>
    state.accounts.income.some(a => a.id === e.accountId) &&
    entryMatchesFilter(e.date)
  )
);

const totalExpense = sumEntries(
  state.accountEntries.filter(e =>
    state.accounts.expense.some(a => a.id === e.accountId) &&
    entryMatchesFilter(e.date)
  )
);

const accountTotals = [];

["income","expense"].forEach(type => {
  state.accounts[type].forEach(a => {
    const total = sumEntries(
      getEntriesByAccount(a.id).filter(e => entryMatchesFilter(e.date))
    );
    accountTotals.push(total);
  });
});

const maxAccountTotal = Math.max(...accountTotals, 1);
  // 🔒 DOUBLE GUARD — legacy safety
  if (!Array.isArray(state.accounts.income)) state.accounts.income = [];
  if (!Array.isArray(state.accounts.expense)) state.accounts.expense = [];
  
  const el = document.getElementById("accountsPanel");
  if (!el) return;

 const active = state.ui.dateFilter || "today";

el.innerHTML = `

<!-- OPERATIONAL BALANCE -->
<div class="card"
     style="margin-bottom:12px; border-left:4px solid #0f766e; cursor:pointer;"
     onclick="openOperationalDrilldown()">

 ${(() => {
  const totals = calculateFilteredOperationalTotals();

  return `
    <div class="small muted">Operational Balance</div>

    <div style="font-size:22px; font-weight:bold;">
      ${fmt(totals.net)}
    </div>

    <div style="font-size:12px; margin-top:4px;">
      <span style="color:green">
        Income: ${fmt(totals.income)}
      </span>
      &nbsp; | &nbsp;
      <span style="color:#b42318">
        Expense: ${fmt(totals.expense)}
      </span>
    </div>
  `;
})()}


 <label style="font-size:12px;">
   <input type="checkbox"
     ${state.operational?.includeEmpowerment ? "checked" : ""}
     onclick="event.stopPropagation(); toggleOperationalEmpowerment(this.checked)">
   Include Empowerment Position
 </label>

</div>
  
<!-- EMPOWERMENT BALANCE -->
<div class="card" style="margin-bottom:12px; border-left:4px solid #1976d2; cursor:pointer;" onclick="openEmpowermentDrilldown()">
  ${(() => {
    const capitalGiven = sumEmpowermentDisbursed();
    const totalRepaid = sumEmpowermentRepaid();

    const interestEarned = (state.empowerments || []).reduce((sum, e) => {
      return sum + (e.interestRepaid || 0);
    }, 0);

    const outstandingCapital = (state.empowerments || []).reduce((sum, e) => {
      const remaining = (e.principalGiven || 0) - (e.principalRepaid || 0);
      return sum + (remaining > 0 ? remaining : 0);
    }, 0);

    const interestLeft = (state.empowerments || []).reduce((sum, e) => {
      if (e.status === "completed") return sum;

      const principalRemaining = (e.principalGiven || 0) - (e.principalRepaid || 0);

      if (principalRemaining > 0) {
        return sum + (e.expectedInterest || 0);
      }

      const remainingInterest = (e.expectedInterest || 0) - (e.interestRepaid || 0);
      return sum + Math.max(0, remainingInterest);
    }, 0);

    const position = calculateEmpowermentPosition();

    return `
      <div class="small muted">Empowerment Balance</div>

      <div>Capital Given: <b>${fmt(capitalGiven)}</b></div>
      <div>Total Repaid: <b>${fmt(totalRepaid)}</b></div>

      <div>
        Interest Earned:
        <b style="color:green">${fmt(interestEarned)}</b>
        <span class="small" style="color:${interestLeft > 0 ? '#b42318' : '#667085'}">
          (Interest Left: ${fmt(interestLeft)})
        </span>
      </div>

      <div style="margin-top:6px;">
        Outstanding Capital:
        <b style="color:${outstandingCapital > 0 ? 'red' : 'green'}">
          ${fmt(outstandingCapital)}
        </b>
      </div>

      <div style="margin-top:6px;">
        Empowerment Position:
        <b style="color:${position >= 0 ? 'green' : 'red'}">
          ${fmt(position)}
        </b>
      </div>
    `;
  })()}
</div>


<!-- BUSINESS BALANCE -->
<div class="card" style="margin-bottom:12px; border-left:4px solid #6a1b9a; cursor:pointer;"
     onclick="openBusinessDrilldown()">
  <div style="display:flex; flex-direction:column; gap:10px">
    <div>
      ${(() => {
  const totals = calculateFilteredBusinessTotals();

  return `
    <div class="small muted">Business Balance</div>

    <div style="font-size:22px; font-weight:bold;">
      ${fmt(totals.net)}
    </div>

    <div style="font-size:12px; margin-top:4px;">
      <span style="color:green">
        Credit: ${fmt(totals.income)}
      </span>
      &nbsp; | &nbsp;
      <span style="color:#b42318">
        Withdrawal: ${fmt(totals.expense)}
      </span>
    </div>
  `;
})()}
    </div>

    <label style="font-size:12px;">
      <input type="checkbox"
        ${state.business.includeEmpowerment ? "checked" : ""}
        onclick="event.stopPropagation(); toggleEmpowermentImpact(this.checked)">
      Include Empowerment
    </label>
  </div>
</div>

`;
}
window.renderAccounts = renderAccounts;


function filterAccounts(query) {
  query = query.toLowerCase().trim();

  document.querySelectorAll("[id^='acc-']").forEach(card => {
    const text = card.innerText.toLowerCase();
    card.style.display = text.includes(query) ? "" : "none";
  });
}

window.filterAccounts = filterAccounts;

function updateEmpowermentHeaderTotals() {
  const t = calculateFilteredEmpowermentTotals();

  document.getElementById("empCapGiven").textContent = fmt(t.capitalGiven);
  document.getElementById("empCapRepaid").textContent = fmt(t.principalRepaid);
  document.getElementById("empIntEarned").textContent = fmt(t.interestEarned);
  document.getElementById("empOutstanding").textContent = fmt(t.outstandingCapital);
}
window.updateEmpowermentHeaderTotals = updateEmpowermentHeaderTotals;

function calculateBusinessBalance() {
  const txns = (state.transactions || []).filter(t =>
    t.type === "credit" || t.type === "withdraw"
  );

  let credit = 0;
  let withdrawal = 0;

  txns.forEach(t => {
    if (t.type === "credit") credit += Number(t.amount || 0);
    if (t.type === "withdraw") withdrawal += Number(t.amount || 0);
  });

  let net = credit - withdrawal;

  if (state.business?.includeEmpowerment) {
    net += calculateEmpowermentPosition();
  }

  return net;
}
window.calculateBusinessBalance = calculateBusinessBalance;


function toggleEmpowermentImpact(val) {
  state.business.includeEmpowerment = val;
  save();
  renderDashboard(); // or main render function
}
window.toggleEmpowermentImpact = toggleEmpowermentImpact;

function updateAccountTotals() {
  document.querySelectorAll("[data-account-id]").forEach(card => {
    const accountId = card.dataset.accountId;
    const totalEl = card.querySelector(".account-total");
    if (totalEl) {
      totalEl.textContent = fmt(sumEntries(getEntriesByAccount(accountId)));
    }
  });

  // Also refresh header totals
  const totalIncome = sumByType("income");
  const totalExpense = sumByType("expense");
  const net = totalIncome - totalExpense;

  document.getElementById("accTotalIncome").textContent = fmt(totalIncome);
  document.getElementById("accTotalExpense").textContent = fmt(totalExpense);
  document.getElementById("accNet").textContent = fmt(net);
}
window.updateAccountTotals = updateAccountTotals;


  function showToast(msg, ms = 1800) {
    const t = $("#toast");
    t.textContent = msg;
    t.style.display = "block";
    setTimeout(() => (t.style.display = "none"), ms);
  }

  function openModalGeneric(title, content, okText = "OK", showCancel = true, validateFn = null) {
  const back = document.getElementById("txModalBack");
  const modal = document.getElementById("txModal");
  const titleEl = document.getElementById("txTitle");
  const bodyEl = document.getElementById("txBody");
  const actions = modal.querySelector(".modal-actions");
  const cancelBtn = document.getElementById("txCancel");

  // Show or hide cancel button depending on modal type
  cancelBtn.style.display = showCancel ? "inline-flex" : "none";

  // reset modal completely
  titleEl.textContent = title;
  bodyEl.innerHTML = "";
  actions.querySelectorAll(".tx-ok").forEach(b => b.remove());

  if (typeof content === "string") bodyEl.innerHTML = content;
  else bodyEl.appendChild(content);

  let okBtn = null;

  if (okText) {
    okBtn = document.createElement("button");
    okBtn.className = "btn solid tx-ok";
    okBtn.textContent = okText;
    actions.appendChild(okBtn);
  }

  back.style.display = "flex";

  return new Promise(resolve => {
    const cleanup = () => {
      back.style.display = "none";
      if (okBtn) okBtn.onclick = null;
      cancelBtn.onclick = null;
      back.onclick = null;
    };

    if (okBtn) {
  okBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // ✅ Run validation (if provided). If it fails, do NOT resolve/close.
    if (typeof validateFn === "function") {
      const passed = validateFn();
      if (!passed) return; // keep modal open
    }

    // 🔥 DO NOT auto close — let caller decide
    resolve(true);
  };
}

    if (showCancel) {
      cancelBtn.onclick = (e) => {
        e.stopPropagation();
        cleanup();
        resolve(false);
      };
    } else {
      cancelBtn.onclick = null;
    }

    back.onclick = (e) => {
      if (e.target === back) {
        cleanup();
        resolve(false);
      }
    };
  });
}


// ============================
// GLOBAL TAB CLICK HANDLER
// ============================
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  const tab = btn.dataset.tab;
  if (tab) {
    setActiveTab(tab);
  }
});
  // UI events
const btn = document.getElementById("btnCOD");
if (btn) {
  btn.onclick = async () => {
    console.log("BTN COD CLICKED");
    await openCloseDayModal();
  };
}

window.openCloseDayModal = openCloseDayModal;


function bindDashboardButton() {
  const btn = document.getElementById("btnDashboard");
  if (!btn) return;

  btn.onclick = () => {
    const dash = document.getElementById("dashboardView");
    const app = document.getElementById("app");
    if (!dash || !app) return;

    const opening = dash.style.display !== "block";

    // persist UI mode
    state.ui = state.ui || {};
    state.ui.dashboardMode = opening;

    if (opening) {
      dash.style.display = "block";
      app.style.display = "none";
      renderDashboard?.();
    } else {
      dash.style.display = "none";
      app.style.display = "grid";
    }

    save?.();
  };
}
window.bindDashboardButton = bindDashboardButton;


function jumpToAccountEntry(accountId, entryId) {
  const accountCard = document.getElementById(`acc-${accountId}`);
  if (!accountCard) return;

  accountCard.scrollIntoView({ behavior: "smooth", block: "center" });

  setTimeout(() => {
    const row = accountCard.querySelector(`.entry-row[data-entry='${entryId}']`);
    if (!row) return;

    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.style.background = "#ffeeba";
    setTimeout(() => row.style.background = "", 2000);
  }, 400);
}



function exportTransactionsCSV() {
  const rows = [["Date","Account","Type","Amount","Note"]];

  const accountsMap = {};
  ["income","expense"].forEach(type => {
    state.accounts[type].forEach(a => accountsMap[a.id] = a.name);
  });

  (state.accountEntries || [])
    .filter(e => entryMatchesFilter(e.date))
    .forEach(e => {
      rows.push([
        e.date,
        accountsMap[e.accountId] || "Unknown",
        e.type,
        e.amount,
        e.note || ""
      ]);
    });

  const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "transactions_report.csv";
  a.click();

  URL.revokeObjectURL(url);
}

window.exportTransactionsCSV = exportTransactionsCSV;

function printSummaryReport() {
  const incomeTotal = sumByType("income");
  const expenseTotal = sumByType("expense");
  const net = incomeTotal - expenseTotal;

  const accountsMap = {};
  ["income","expense"].forEach(type => {
    state.accounts[type].forEach(a => accountsMap[a.id] = a.name);
  });

  const entries = (state.accountEntries || [])
    .filter(e => entryMatchesFilter(e.date))
    .map(e => `
      <tr>
        <td>${e.date}</td>
        <td>${accountsMap[e.accountId] || "Unknown"}</td>
        <td>${e.type}</td>
        <td>${fmt(e.amount)}</td>
        <td>${e.note || ""}</td>
      </tr>
    `).join("");

  const win = window.open("", "", "width=900,height=700");
  win.document.write(`
    <html>
    <head>
      <title>Financial Summary Report</title>
      <style>
        body { font-family: Arial; padding:20px; }
        table { width:100%; border-collapse: collapse; margin-top:20px; }
        th, td { border:1px solid #ccc; padding:6px; text-align:left; }
        th { background:#f0f0f0; }
        h2 { margin-bottom:5px; }
      </style>
    </head>
    <body>
      <h2>Financial Summary Report</h2>
      <p><strong>Total Income:</strong> ${fmt(incomeTotal)}</p>
      <p><strong>Total Expense:</strong> ${fmt(expenseTotal)}</p>
      <p><strong>Net:</strong> ${fmt(net)}</p>

      <table>
        <tr>
          <th>Date</th>
          <th>Account</th>
          <th>Type</th>
          <th>Amount</th>
          <th>Note</th>
        </tr>
        ${entries}
      </table>
    </body>
    </html>
  `);

  win.document.close();
  win.print();
}

window.printSummaryReport = printSummaryReport;

function renderMiniBar(amount, max) {
  const percent = max > 0 ? (amount / max) * 100 : 0;
  return `
    <div style="margin-top:6px;">
      <div style="background:#e0e0e0; height:6px; border-radius:4px; overflow:hidden;">
        <div style="width:${percent}%; height:100%; background:#1976d2;"></div>
      </div>
      <div class="small muted">${fmt(amount)}</div>
    </div>
  `;
}
window.renderMiniBar = renderMiniBar;


 // ===== OPEN CUSTOMER ACCOUNT (CLEAN SINGLE HANDLER) =====
document.getElementById("btnNew").addEventListener("click", async () => {
  if (window.__sendingNewCustomer) return;
  window.__sendingNewCustomer = true;

  try {
    window.capturedKycPhoto = null;

    const formWrapper = document.createElement("div");
    formWrapper.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px">

        <div>
          <label class="small">Full name <span class="req">*</span></label>
          <input id="nName" class="input" placeholder="Enter full name">
        </div>

        <div>
          <label class="small">Phone number <span class="req">*</span></label>
          <input id="nPhone" class="input" placeholder="Enter phone number">
        </div>

        <div>
          <label class="small">NIN <span class="req">*</span></label>
          <input id="nNIN" class="input" placeholder="Enter NIN">
        </div>

        <div>
          <label class="small">Address <span class="req">*</span></label>
          <input id="nAddress" class="input" placeholder="Enter address">
        </div>

        <div>
          <label class="small muted">Customer Photo <span class="req">*</span></label>
          <input id="nPhoto" type="file" accept="image/*" capture="user" class="input">
        </div>

        <!-- ✅ LIVE PREVIEW (hidden until photo is available) -->
        <div id="kycPreviewBox" style="
          display:none;
          margin-top:4px;
          padding:8px;
          border:1px solid #e5e7eb;
          border-radius:12px;
          background:#f9fafb;
        ">
          <div class="small muted" style="margin-bottom:6px">Photo preview</div>
          <img id="kycPreviewImg"
               src=""
               alt="Preview"
               style="width:110px;height:110px;border-radius:12px;object-fit:cover;border:1px solid #e5e7eb;">
        </div>

        <button
          id="btnOpenCamera"
          class="btn solid"
          type="button"
          style="justify-content:center"
        >
          📷 Use Camera (Recommended)
        </button>

        <div>
          <label class="small muted">Opening Balance (optional)</label>
          <input id="nBal" class="input" placeholder="0.00">
        </div>

      </div>
    `;

    // Live invalid clearing
    ["#nName", "#nPhone", "#nNIN", "#nAddress"].forEach((id) => {
      const el = formWrapper.querySelector(id);
      if (!el) return;
      el.addEventListener("input", () => el.classList.remove("invalid"));
    });

    // ✅ Preview helpers
    const previewBox = formWrapper.querySelector("#kycPreviewBox");
    const previewImg = formWrapper.querySelector("#kycPreviewImg");
    const showPreview = (src) => {
      if (!previewBox || !previewImg) return;
      previewImg.src = src || "";
      previewBox.style.display = src ? "block" : "none";
    };

    // ✅ File upload → preview immediately
    const photoInput = formWrapper.querySelector("#nPhoto");
    if (photoInput) {
      photoInput.onchange = async () => {
        const f = photoInput.files?.[0];
        if (!f) return showPreview("");
        const b64 = await toBase64Compressed(f);
        window.capturedKycPhoto = b64; // unify pipeline
        showPreview(b64);
      };
    }

    // ✅ Camera capture → preview immediately
    const camBtn = formWrapper.querySelector("#btnOpenCamera");
    if (camBtn) {
      camBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (typeof openCameraCapture !== "function") {
          showToast("Camera function not available");
          return;
        }

        const b64 = await openCameraCapture(); // your function sets window.capturedKycPhoto too
        if (b64) showPreview(b64);
      };
    }

    // Open main form modal
    const ok = await openModalGeneric(
  "Open Customer Account",
  formWrapper,
  "Create",
  true,
  () => {
    const nameEl = formWrapper.querySelector("#nName");
    const phoneEl = formWrapper.querySelector("#nPhone");
    const ninEl = formWrapper.querySelector("#nNIN");
    const addrEl = formWrapper.querySelector("#nAddress");

    const name = (nameEl?.value || "").trim();
    const phone = (phoneEl?.value || "").trim();
    const nin = (ninEl?.value || "").trim();
    const address = (addrEl?.value || "").trim();

    // clear old invalid
    [nameEl, phoneEl, ninEl, addrEl].forEach(el => el?.classList.remove("invalid"));

    if (!name) {
      nameEl?.classList.add("invalid");
      nameEl?.focus();
      showToast("Full name is required");
      return false;
    }
    if (!phone) {
      phoneEl?.classList.add("invalid");
      phoneEl?.focus();
      showToast("Phone number is required");
      return false;
    }
    if (!nin) {
      ninEl?.classList.add("invalid");
      ninEl?.focus();
      showToast("NIN is required");
      return false;
    }
    if (!address) {
      addrEl?.classList.add("invalid");
      addrEl?.focus();
      showToast("Address is required");
      return false;
    }

    // photo: accept file OR captured
    const photoEl = formWrapper.querySelector("#nPhoto");
    const hasFile = !!photoEl?.files?.[0];
    const hasCaptured = !!window.capturedKycPhoto;

    if (!hasFile && !hasCaptured) {
      showToast("Customer photo is required");
      return false;
    }

    return true;
  }
);

    if (!ok) return;

    // Collect values
    const nameInput = formWrapper.querySelector("#nName");
    const phoneInput = formWrapper.querySelector("#nPhone");
    const ninInput = formWrapper.querySelector("#nNIN");
    const addressInput = formWrapper.querySelector("#nAddress");
    const balInput = formWrapper.querySelector("#nBal");

    // Clear invalid state
    [nameInput, phoneInput, ninInput, addressInput].forEach((inp) =>
      inp?.classList.remove("invalid")
    );

    const name = (nameInput?.value || "").trim();
    const phone = (phoneInput?.value || "").trim();
    const nin = (ninInput?.value || "").trim();
    const address = (addressInput?.value || "").trim();
    const bal = Number((balInput?.value || "0").trim() || 0);

   
    // Photo source: uploaded OR camera OR stored preview base64
    let photoBase64 = "";
    const uploadedFile = photoInput?.files?.[0];

    if (uploadedFile) {
      photoBase64 = await toBase64Compressed(uploadedFile);
      window.capturedKycPhoto = photoBase64;
      showPreview(photoBase64);
    } else if (window.capturedKycPhoto) {
      photoBase64 = window.capturedKycPhoto;
    } 

    // Review modal
    const review = document.createElement("div");
    review.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;gap:12px;align-items:flex-start">
          ${
            photoBase64
              ? `<img src="${photoBase64}" style="width:70px;height:70px;border-radius:12px;object-fit:cover;border:1px solid #e5e7eb;">`
              : `<div style="width:70px;height:70px;border-radius:12px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:11px;color:#9ca3af;">No Photo</div>`
          }
          <div style="flex:1">
            <div><b>Name:</b> ${name}</div>
            <div><b>Phone:</b> ${phone}</div>
            <div><b>NIN:</b> ${nin}</div>
            <div><b>Address:</b> ${address}</div>
            <div><b>Opening Balance:</b> ${fmt(Number(bal || 0))}</div>
          </div>
        </div>
        <div class="small muted">
          Please confirm to send this request for manager approval.
        </div>
      </div>
    `;

    const confirmSend = await openModalGeneric(
      "Review New Customer",
      review,
      "Send for approval",
      true
    );

    if (!confirmSend) return;

    // ✅ FORCE-CLOSE the review modal so you return to the previous state cleanly
    const back = document.getElementById("txModalBack");
    if (back) back.style.display = "none";

    // Push approval
    state.approvals = state.approvals || [];
    state.approvals.unshift({
      id: uid("ap"),
      type: "customer_creation",
      status: "pending",
      createdAt: new Date().toISOString(),
      createdBy: currentStaff().id,
      createdByName: currentStaff().name,
      payload: {
        name,
        phone,
        nin,
        address,
        photo: photoBase64,
        openingBalance: bal,
      },
    });

    // Clear form + preview to prevent re-submission
    window.capturedKycPhoto = null;
    if (nameInput) nameInput.value = "";
    if (phoneInput) phoneInput.value = "";
    if (ninInput) ninInput.value = "";
    if (addressInput) addressInput.value = "";
    if (balInput) balInput.value = "";
    if (photoInput) photoInput.value = "";
    showPreview("");

    await pushAudit(
      currentStaff().name,
      currentStaff().role,
      "request_customer_creation",
      name
    );

    save();
    forceFullUIRefresh?.();

    showToast("Customer sent for approval");
  } finally {
    window.__sendingNewCustomer = false;
  }
});

document.getElementById("btnVerify").addEventListener("click", async () => {
    const probs = await verifyAudit();
    if (!probs.length) showToast("Audit OK");
    else
      openModalGeneric(
        "Audit issues",
        '<div class="small">Problems detected</div>',
        "Close"
      );
  });
  document.getElementById("btnDeclareFloat")?.addEventListener("click", () => {
  openDeclareFloatModal();
});
  document.getElementById("btnMyOps")?.addEventListener("click", () => {
  openMyOperationalPosts();
});
  document
    .getElementById("mobileContrib")
    .addEventListener("click", async () => {
      const f = document.createElement("div");
      f.innerHTML =
        '<div class="small">Mobile contribution</div><div style="margin-top:8px"><input id="mobAmt" class="input" placeholder="Amount"/></div>';
      const ok = await openModalGeneric(
  "Mobile contribution",
  f,
  "Submit",
  true,
  () => {
    const v = Number(f.querySelector("#mobAmt")?.value || 0);
    if (v <= 0) {
      showToast("Enter amount");
      return false;
    }
    return true;
  }
);

      if (ok) {
        const v = Number(f.querySelector("#mobAmt").value || 0);
        const c = state.customers[0];
        c.balance += v;
        c.transactions.push({
          id: uid("tx"),
          type: "credit",
          amount: v,
          date: new Date().toISOString(),
          desc: "mobile contrib",
          actor: currentStaff().name,
        });
        await pushAudit(
          currentStaff().name,
          currentStaff().role,
          "mobile_contrib",
          JSON.stringify({ customer: c.id, amount: v })
        );
        save();
        renderCustomers();
        updateChartData();
        showToast("Thanks");
      }
    });
  document
    .getElementById("printStmt")
    .addEventListener("click", () => printStatement());
  document
    .getElementById("printAudit")
    .addEventListener("click", () => printAudit());
  document
    .getElementById("txCancel")
    .addEventListener("click", () => closeTxModal());
  txModalBack.addEventListener("click", (e) => {
  e.stopPropagation(); // 🔑 THIS IS THE KEY
  if (e.target === txModalBack) {
    txModalBack.style.display = "none";
  }
});
  // init
  
 try {
    load();
    // DATE RANGE FILTER WIRING
const fromInput = document.getElementById("fromDate");
const toInput   = document.getElementById("toDate");

if (fromInput) {
  fromInput.addEventListener("change", e => {
    state.ui.fromDate = e.target.value || null;
    renderAccounts();
  });
}

if (toInput) {
  toInput.addEventListener("change", e => {
    state.ui.toDate = e.target.value || null;
    renderAccounts();
  });
}
   
state.accountEntries = Array.isArray(state.accountEntries) ? state.accountEntries : [];

state.ui = state.ui || { current: null };
state.ui.dateFilter = state.ui.dateFilter || "today";
state.ui.fromDate = state.ui.fromDate || null;
state.ui.toDate = state.ui.toDate || null;

// ✅ ADD THESE RIGHT HERE
state.ui.empDateFilter = state.ui.empDateFilter || "today";
state.ui.empFromDate = state.ui.empFromDate || null;
state.ui.empToDate = state.ui.empToDate || null;;

// 🟣 Business drilldown filters
state.ui.bizDateFilter = state.ui.bizDateFilter || "today";
state.ui.bizFromDate = state.ui.bizFromDate || null;
state.ui.bizToDate = state.ui.bizToDate || null;

state.ui = state.ui || {};

state.ui.opDateFilter = state.ui.opDateFilter || "today";
state.ui.opFromDate = state.ui.opFromDate || null;
state.ui.opToDate = state.ui.opToDate || null;

state.operational = state.operational || {};
state.operational.includeEmpowerment = state.operational.includeEmpowerment || false;

  if (!Array.isArray(state.approvals)) state.approvals = [];
  if (!Array.isArray(state.audit)) state.audit = [];
  if (!state.ui) state.ui = {};

  if (!state.staff.length || !state.customers.length) seed();

  renderStaff();
  renderCustomers();
  renderApprovals();
  renderAudit();
  buildChart();
  updateChartData();
  renderEmpowermentBalance();
  renderCustomerKycApprovals();
  
  bindCODButtons();
  bindDashboardButton();      // controls show/hide dashboard
  bindStaffSelectForDashboard();
  syncDashboardVisibility();  // shows dashboard button only for managers

 
} catch (e) {
  console.error("INIT ERROR", e);
}


  // ===============================
// 🔑 FORCE EDGE-SAFE BINDING
// ===============================
(function bindCloseDayButton() {
  const btn = document.getElementById("btnCOD");
  if (!btn) return;

  // remove any old handlers Edge may have dropped
  btn.onclick = null;

  // force-enable (Edge respects this strictly)
  btn.disabled = false;
  btn.style.pointerEvents = "auto";

  // bind explicitly
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openCloseDayModal();
  });
})();

  if (!state.activeStaffId && state.staff.length) {
    state.activeStaffId = state.staff[0].id;
    save();
  }

  const staffSelect = document.getElementById("staffSelect");
  if (staffSelect) {
    staffSelect.value = state.activeStaffId;

   staffSelect.onchange = (e) => {
  state.activeStaffId = e.target.value;
  save();

  hideDashboard();            // hide first so UI state is consistent
  forceFullUIRefresh();       // then refresh everything
};
  }


  function bindStaffSelectForDashboard() {
  const sel = document.getElementById("staffSelect");
  if (!sel) return;

  sel.addEventListener("change", () => {
    // your app likely already uses staffSelect directly,
    // but we still force UI sync immediately:
    syncDashboardVisibility();

    // If dashboard is open and user is allowed, refresh it
    if (state.ui?.dashboardMode && canViewDashboard()) {
      renderDashboard?.();
    }
  });
}
window.bindStaffSelectForDashboard = bindStaffSelectForDashboard;


function bindCODButtons() {
  const staff = currentStaff();
  if (!staff) return;

  const btnCOD = document.getElementById("btnCOD");
  const btnMyCOD = document.getElementById("btnMyCOD");

  // Bind Close Day (all staff)
  if (btnCOD) {
    btnCOD.onclick = async () => {
      await openCloseDayModal();
    };
  }

  // Staff-only: My Close of Day
  if (btnMyCOD) {
    if (!["manager", "ceo"].includes(staff.role)) {
      btnMyCOD.style.display = "inline-block";
      btnMyCOD.onclick = () => openMyCOD();
    } else {
      btnMyCOD.style.display = "none";
    }
  }
}


function resetCODForDate(dateStr) {
  if (!canApprove()) {
    showToast("Not authorized");
    return;
  }

  state.cod = (state.cod || []).filter(
    c => c.date !== dateStr
  );

  save();
  renderCODForDate(dateStr);

  showToast(`COD reset for ${dateStr}`);
}
window.resetCODForDate = resetCODForDate;

function resetCODDraftForStaffDate(staffId, dateStr) {
  if (!state.codDrafts) return;

  const key = `${staffId}|${dateStr}`;
  delete state.codDrafts[key];

  save();
}
window.resetCODDraftForStaffDate = resetCODDraftForStaffDate;


async function openCameraCapture() {
  // This camera UI is a separate overlay and DOES NOT reuse your app modal,
  // so it won’t destroy/replace your "Open Customer Account" form.

  let stream = null;

  // overlay
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.75)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "99999";

  const card = document.createElement("div");
  card.style.width = "min(520px, 92vw)";
  card.style.background = "white";
  card.style.borderRadius = "14px";
  card.style.padding = "12px";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.gap = "10px";

  const title = document.createElement("div");
  title.style.fontWeight = "700";
  title.textContent = "Capture Photo";

  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  video.style.width = "100%";
  video.style.borderRadius = "12px";
  video.style.background = "#111";

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "8px";
  actions.style.justifyContent = "flex-end";

  const btnCancel = document.createElement("button");
  btnCancel.className = "btn ghost";
  btnCancel.type = "button";
  btnCancel.textContent = "Cancel";

  const btnCapture = document.createElement("button");
  btnCapture.className = "btn solid primary";
  btnCapture.type = "button";
  btnCapture.textContent = "Capture";

  actions.appendChild(btnCancel);
  actions.appendChild(btnCapture);

  card.appendChild(title);
  card.appendChild(video);
  card.appendChild(actions);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const cleanup = () => {
    try {
      if (stream) stream.getTracks().forEach(t => t.stop());
    } catch {}
    overlay.remove();
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    video.srcObject = stream;

    // wait for video dimensions to be ready
    await new Promise((res) => {
      const t = setInterval(() => {
        if (video.videoWidth && video.videoHeight) {
          clearInterval(t);
          res(true);
        }
      }, 50);
      setTimeout(() => {
        clearInterval(t);
        res(true);
      }, 1500);
    });

    return await new Promise((resolve) => {
      btnCancel.onclick = () => {
        cleanup();
        resolve(null);
      };

      btnCapture.onclick = () => {
        try {
          const w = video.videoWidth || 640;
          const h = video.videoHeight || 480;

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, w, h);

          const base64 = canvas.toDataURL("image/jpeg", 0.9);

          // store globally for any other flow
          window.capturedKycPhoto = base64;

          cleanup();
          showToast("Photo captured ✓");
          resolve(base64);
        } catch (e) {
          console.error(e);
          showToast("Could not capture photo");
          cleanup();
          resolve(null);
        }
      };

      // click outside card closes
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(null);
        }
      };
    });

  } catch (err) {
    console.error(err);
    cleanup();
    showToast("Camera not available / permission denied");
    return null;
  }
}
window.openCameraCapture = openCameraCapture;


// =========================
// EXPOSE FOR DEBUG
// =========================
window.SmartContrib = { state, save, pushAudit };

  // ============================================================
// EXPOSE ACTION FUNCTIONS TO GLOBAL SCOPE (HTML onclick support)
// ============================================================
window.openActionModal = openActionModal;
window.toggleFreeze = toggleFreeze;
window.confirmDeleteCustomer = confirmDeleteCustomer;
window.printStatement = printStatement;
window.refreshAfterTransaction = refreshAfterTransaction;
window.openEmpowermentModal = openEmpowermentModal;
window.openEditCustomer = openEditCustomer;
window.processApproval = processApproval;

window.addEventListener("focus", () => {
  syncDashboardVisibility();
});

window.addEventListener("DOMContentLoaded", () => {
  bindCustomerSearchInputs();
});

})();


/* ===== Ducess final revision overrides ===== */
const DUCESS_THEMES = {
  classic: "Classic",
  "ducess-sheet": "Ducess Sheet",
  forest: "Forest",
  sunset: "Sunset"
};

function applyTheme(themeName) {
  const theme = DUCESS_THEMES[themeName] ? themeName : "classic";
  document.body.setAttribute("data-theme", theme);
  state.ui = state.ui || {};
  state.ui.theme = theme;
  save?.();
}
window.applyTheme = applyTheme;

function initThemeSelector() {
  const sel = document.getElementById("themeSelect");
  if (!sel) return;
  sel.innerHTML = Object.entries(DUCESS_THEMES).map(([v, label]) => `<option value="${v}">${label}</option>`).join("");
  const active = state.ui?.theme || "classic";
  sel.value = DUCESS_THEMES[active] ? active : "classic";
  applyTheme(sel.value);
  sel.onchange = () => applyTheme(sel.value);
}
window.initThemeSelector = initThemeSelector;

function getActiveStaffPool() {
  return (state.staff || []).filter(s => s.active !== false);
}

function renderStaff() {
  const sel = document.getElementById("staffSelect");
  if (!sel) return;

  const pool = getActiveStaffPool();
  sel.innerHTML = "";

  pool.forEach((s) => {
    const o = document.createElement("option");
    o.value = s.id;
    o.textContent = `${s.name} — ${s.role}`;
    sel.appendChild(o);
  });

  if (!pool.length) {
    state.activeStaffId = null;
    sel.innerHTML = '<option value="">No active staff</option>';
    return;
  }

  if (!state.activeStaffId || !pool.some(s => s.id === state.activeStaffId)) {
    state.activeStaffId = pool[0].id;
    save?.();
  }

  sel.value = state.activeStaffId;
  sel.onchange = () => {
    state.activeStaffId = sel.value;
    save?.();
    hideDashboard?.();
    forceFullUIRefresh?.();
    syncDashboardVisibility?.();
  };

  syncDashboardVisibility?.();
}
window.renderStaff = renderStaff;

function syncDashboardVisibility() {
  const btnDash = document.getElementById("btnDashboard");
  const dash = document.getElementById("dashboardView");
  const app = document.getElementById("app");
  const btnMyCOD = document.getElementById("btnMyCOD");
  const btnStaffDir = document.getElementById("btnStaffDirectory");
  const staff = currentStaff?.();
  const role = (staff?.role || "").toLowerCase();

  const canSeeMyCOD = !!staff && role !== "marketer";
  if (btnMyCOD) btnMyCOD.style.display = canSeeMyCOD ? "inline-block" : "none";
  if (btnStaffDir) btnStaffDir.style.display = ["manager","ceo"].includes(role) ? "inline-block" : "none";

  if (!btnDash) return;
  const allowed = (typeof canViewDashboard === "function") ? canViewDashboard() : false;
  btnDash.style.display = allowed ? "inline-block" : "none";

  if (!allowed && dash && app) {
    dash.style.display = "none";
    app.style.display = "grid";
    state.ui = state.ui || {};
    state.ui.dashboardMode = false;
    save?.();
  }
}
window.syncDashboardVisibility = syncDashboardVisibility;

function openStaffDirectory() {
  const staff = currentStaff?.();
  if (!staff || !["manager","ceo"].includes(staff.role)) {
    return showToast("Only managers can manage staff");
  }

  const wrapper = document.createElement("div");
  const activeList = (state.staff || []).slice().sort((a,b)=> (a.active===false)-(b.active===false) || a.name.localeCompare(b.name));
  wrapper.innerHTML = `
    <div class="small muted" style="margin-bottom:10px">
      Add new staff, deactivate old staff, and keep your working team current.
    </div>
    <div class="staff-directory-list">
      ${activeList.map(s => `
        <div class="row">
          <div>
            <div><b>${s.name}</b> <span class="staff-pill">${s.role}</span></div>
            <div class="small muted">${s.phone || "No phone"} • ${s.active === false ? "Inactive" : "Active"}</div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn ghost" type="button" onclick="toggleStaffActive('${s.id}')">${s.active === false ? "Activate" : "Deactivate"}</button>
          </div>
        </div>
      `).join("")}
    </div>
    <div style="margin-top:14px;border-top:1px solid rgba(0,0,0,0.08);padding-top:12px">
      <h3 style="margin-bottom:8px">Add Staff</h3>
      <div class="row">
        <input id="newStaffName" class="input" placeholder="Staff full name"/>
        <select id="newStaffRole" class="input">
          <option value="teller">Teller</option>
          <option value="marketer">Marketer</option>
          <option value="vault">Vault</option>
          <option value="manager">Manager</option>
          <option value="ceo">CEO</option>
        </select>
      </div>
      <div class="row" style="margin-top:8px">
        <input id="newStaffPhone" class="input" placeholder="Phone number"/>
        <button class="btn" type="button" onclick="addStaffFromDirectory()">Add Staff</button>
      </div>
    </div>
  `;
  openModalGeneric("Staff Directory", wrapper, "", false);
}
window.openStaffDirectory = openStaffDirectory;

function addStaffFromDirectory() {
  const name = (document.getElementById("newStaffName")?.value || "").trim();
  const role = (document.getElementById("newStaffRole")?.value || "teller").trim();
  const phone = (document.getElementById("newStaffPhone")?.value || "").trim();
  if (!name) return showToast("Staff name is required");

  const newStaff = {
    id: uid("st"),
    name,
    role,
    phone,
    active: true
  };
  state.staff = state.staff || [];
  state.staff.push(newStaff);
  if (role === "teller") ensureStaffAccount(newStaff.id);
  save?.();
  renderStaff?.();
  syncDashboardVisibility?.();
  showToast("Staff added");
  setTimeout(() => openStaffDirectory(), 50);
}
window.addStaffFromDirectory = addStaffFromDirectory;

function toggleStaffActive(staffId) {
  const target = (state.staff || []).find(s => s.id === staffId);
  if (!target) return;
  target.active = target.active === false ? true : false;

  if (target.active === false && state.activeStaffId === target.id) {
    const fallback = getActiveStaffPool()[0];
    state.activeStaffId = fallback ? fallback.id : null;
  }

  save?.();
  renderStaff?.();
  syncDashboardVisibility?.();
  showToast(target.active === false ? "Staff deactivated" : "Staff activated");
  setTimeout(() => openStaffDirectory(), 50);
}
window.toggleStaffActive = toggleStaffActive;

renderEmpowermentBalance = function() { return; };
window.renderEmpowermentBalance = renderEmpowermentBalance;

function renderAccounts() {
  const el = document.getElementById("accountsPanel");
  if (!el) return;
  const operational = calculateFilteredOperationalTotals?.() || {income:0, expense:0, net:0};
  const business = calculateFilteredBusinessTotals?.() || {income:0, expense:0, net:0};

  el.innerHTML = `
    <div class="card" style="margin-bottom:12px; border-left:4px solid #6a1b9a; cursor:pointer;" onclick="openBusinessDrilldown()">
      <div class="small muted">Business Balance</div>
      <div style="font-size:22px; font-weight:bold;">${fmt(business.net)}</div>
      <div style="font-size:12px; margin-top:4px;">
        <span style="color:green">Credit: ${fmt(business.income)}</span>
        &nbsp; | &nbsp;
        <span style="color:#b42318">Withdrawal: ${fmt(business.expense)}</span>
      </div>
      <div class="theme-hint">Export CSV • Print Summary • Daily/Weekly/Monthly/All/Custom</div>
    </div>

    <div class="card" style="margin-bottom:12px; border-left:4px solid #0f766e; cursor:pointer;" onclick="openOperationalDrilldown()">
      <div class="small muted">Operational Balance</div>
      <div style="font-size:22px; font-weight:bold;">${fmt(operational.net)}</div>
      <div style="font-size:12px; margin-top:4px;">
        <span style="color:green">Income: ${fmt(operational.income)}</span>
        &nbsp; | &nbsp;
        <span style="color:#b42318">Expense: ${fmt(operational.expense)}</span>
      </div>
      <div class="theme-hint">Export CSV • Print Summary • Daily/Weekly/Monthly/All/Custom</div>
    </div>
  `;
}
window.renderAccounts = renderAccounts;

const __originalRenderCODForDate = window.renderCODForDate;
window.renderCODForDate = function(dateStr) {
  __originalRenderCODForDate?.(dateStr);
  const date = normDate(dateStr || window.activeCODDate || new Date().toISOString().slice(0,10));
  document.querySelectorAll(".cod-card").forEach(card => {
    const staffId = card.dataset.staffId;
    const rec = (state.cod || []).find(c => String(c.staffId) === String(staffId) && normDate(c.date) === date);
    if (!rec) return;
    if ((rec.fieldPapers || []).length) {
      const note = document.createElement("div");
      note.className = "small muted";
      note.style.marginTop = "6px";
      note.textContent = `Field paper uploads: ${(rec.fieldPapers || []).length}`;
      card.appendChild(note);
    }
  });
};

function renderPhaseB({ box, submitBtn, staff, selectedDate, openingFloat }) {
  const approved = (state.approvals || []).filter(a =>
    a.status === "approved" &&
    (a.requestedBy === staff.id || a.createdBy === staff.id) &&
    normDate(a.processedAt || a.requestedAt || "") === normDate(selectedDate)
  );

  const credits = approved.filter(t => t.type === "credit").reduce((s,t)=>s+Number(t.amount||0),0);
  const withdrawals = approved.filter(t => t.type === "withdraw").reduce((s,t)=>s+Number(t.amount||0),0);
  const opening = Number(openingFloat || 0);
  const expectedCash = Math.max(0, opening - credits);
  const overdraw = Math.max(0, credits - opening);

  box.innerHTML = `
    <div class="small"><b>Staff:</b> ${staff.name}</div>
    <div class="small"><b>Date:</b> ${selectedDate}</div>
    <div class="card" style="margin-top:10px">
      <div class="small"><b>Opening Balance:</b> ${fmt(opening)}</div>
      <div class="small">Approved Credits: ${fmt(credits)}</div>
      <div class="small">Approved Withdrawals (info): ${fmt(withdrawals)}</div>
      <div class="small"><b>Expected Closing Cash:</b> ${fmt(expectedCash)}</div>
      ${overdraw > 0 ? `<div class="small" style="color:#ed6c02"><b>Overdraw (owed):</b> ${fmt(overdraw)}</div>` : ``}
    </div>

    <label class="small" style="display:block;margin-top:10px"><b>Actual Cash Count</b></label>
    <input id="finalDeclared" class="input" value="${expectedCash}" placeholder="Enter actual cash counted" style="margin-top:6px"/>

    <label class="small" style="display:block;margin-top:10px"><b>Field Paper Upload</b> <span class="muted">(up to 2 pages or more)</span></label>
    <input id="codFieldPaper" class="input" type="file" accept="image/*" multiple style="margin-top:6px"/>
    <div id="codPreview" class="cod-upload-grid"></div>

    <textarea id="codNote" class="input" placeholder="Explain shortage, excess, or overdraw if any" style="margin-top:10px;display:none"></textarea>
    <div id="finalErr" class="small danger" style="margin-top:8px;display:none"></div>
  `;

  submitBtn.textContent = "Submit";
  const finalDeclaredInput = box.querySelector("#finalDeclared");
  const noteBox = box.querySelector("#codNote");
  const finalErr = box.querySelector("#finalErr");
  const uploadInput = box.querySelector("#codFieldPaper");
  const preview = box.querySelector("#codPreview");
  let cachedFieldPapers = [];

  uploadInput.onchange = async () => {
    const files = Array.from(uploadInput.files || []);
    cachedFieldPapers = [];
    preview.innerHTML = "";
    for (const file of files) {
      const b64 = await toBase64Compressed(file, 900, 0.8);
      cachedFieldPapers.push(b64);
      const img = document.createElement("img");
      img.src = b64;
      preview.appendChild(img);
    }
  };

  const indicator = document.createElement("div");
  indicator.className = "small";
  indicator.style.marginTop = "6px";
  box.insertBefore(indicator, noteBox);

  function recalcVariance() {
    const actual = Math.max(0, moneyNumber(finalDeclaredInput.value));
    const variance = actual - expectedCash;
    if (variance === 0 && overdraw === 0) {
      indicator.textContent = "Balanced ✔";
      indicator.style.color = "green";
      noteBox.style.display = "none";
    } else if (variance < 0) {
      indicator.textContent = `Shortage ${fmt(Math.abs(variance))}${overdraw>0 ? ` • Overdraw ${fmt(overdraw)}` : ""}`;
      indicator.style.color = "red";
      noteBox.style.display = "block";
    } else if (variance > 0) {
      indicator.textContent = `Excess ${fmt(variance)}${overdraw>0 ? ` • Overdraw ${fmt(overdraw)}` : ""}`;
      indicator.style.color = "#ed6c02";
      noteBox.style.display = "block";
    } else {
      indicator.textContent = `Overdraw ${fmt(overdraw)}`;
      indicator.style.color = "#ed6c02";
      noteBox.style.display = "block";
    }
  }
  finalDeclaredInput.oninput = recalcVariance;
  recalcVariance();

  submitBtn.onclick = async () => {
    if (submitBtn.dataset.submitted === "1") return;
    submitBtn.dataset.submitted = "1";
    finalErr.style.display = "none";

    const dateKey = normDate(selectedDate);
    const actual = Math.max(0, moneyNumber(finalDeclaredInput.value));
    const variance = actual - expectedCash;

    if ((variance !== 0 || overdraw > 0) && !noteBox.value.trim()) {
      finalErr.textContent = "Explanation is required for shortage, excess, or overdraw.";
      finalErr.style.display = "block";
      submitBtn.dataset.submitted = "0";
      return;
    }

    const already = (state.cod || []).some(c => String(c.staffId) === String(staff.id) && normDate(c.date) === dateKey);
    if (already) {
      showToast("Close of Day already submitted for this date");
      submitBtn.dataset.submitted = "0";
      return;
    }

    state.cod.push({
      id: uid("cod"),
      staffId: String(staff.id),
      staffName: staff.name,
      role: staff.role,
      date: dateKey,
      snapshot: { credits, withdrawals, overdrawOwed: overdraw },
      openingFloat: opening,
      systemExpected: expectedCash,
      staffDeclared: actual,
      variance,
      overdraw,
      isOverdrawn: overdraw > 0,
      fieldPapers: cachedFieldPapers,
      staffNote: noteBox.value.trim(),
      status: (variance === 0 && overdraw === 0) ? "balanced" : "flagged",
      resolvedAmount: null,
      resolutionNote: "",
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date().toISOString()
    });

    if (state.codDrafts) delete state.codDrafts[`${staff.id}|${dateKey}`];
    save?.();
    window.activeCODDate = dateKey;
    renderCODForDate?.(dateKey);
    renderManagerCODSummary?.(dateKey);
    renderDashboard?.();
    showToast("Close of Day submitted");
    closeTxModal?.();
  };
}
window.renderPhaseB = renderPhaseB;

function initDucessEnhancements() {
  initThemeSelector?.();

  const btnStaff = document.getElementById("btnStaffDirectory");
  if (btnStaff) btnStaff.onclick = () => openStaffDirectory();

  // keep dashboard welcome card wording fresh
  const dashboardCard = document.querySelector("#dashboardView .card .small");
  if (dashboardCard && dashboardCard.textContent.includes("Operational overview")) {
    dashboardCard.innerHTML = `WELCOME TO DUCESS ENTERPRISE LEDGER WORKFLOW<br>Please note that this application is very robust and can detect non-compliance and fraudulent activities. Transparency is encouraged.`;
  }

  renderStaff?.();
  renderAccounts?.();
  syncDashboardVisibility?.();
}
setTimeout(initDucessEnhancements, 120);
