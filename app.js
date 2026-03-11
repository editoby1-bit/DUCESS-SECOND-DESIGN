(() => {
  const STORAGE_KEY = 'duces_enterprise_ledger_v1';
  const DATE_FMT = new Intl.DateTimeFormat('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const money = (n) => Number(n || 0).toLocaleString();
  const uid = (p='id') => `${p}_${Math.random().toString(36).slice(2,9)}${Date.now().toString(36).slice(-4)}`;
  const today = () => new Date().toISOString().slice(0,10);
  const byId = (id) => document.getElementById(id);
  const q = (sel, root=document) => root.querySelector(sel);
  const qq = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const ROLE_LABELS = {
    customer_service: 'Customer Service Officer',
    teller: 'Teller',
    approving_officer: 'Approving Officer',
    admin_officer: 'Administrative Officer',
    report_officer: 'Report Officer'
  };

  const MODULES = {
    customer_service: {
      title: 'Customer Service',
      desc: 'Check balance, open, maintain, reactivate accounts and print statements.',
      icon: '👤',
      tools: ['check_balance','account_opening','account_maintenance','account_reactivation','account_statement']
    },
    tellering: {
      title: 'Tellering',
      desc: 'Credit and debit customers through a journal workflow with approved float control.',
      icon: '💳',
      tools: ['check_balance','credit','debit']
    },
    approvals: {
      title: 'Approval',
      desc: 'Approve or reject every submitted request, including float, posting and administration actions.',
      icon: '✅',
      tools: ['approval_queue']
    },
    administration: {
      title: 'Administration',
      desc: 'Manage working tools, temporary grants, operational accounts, and staff settings.',
      icon: '🛠️',
      tools: ['permissions','operational_accounts','staff_directory']
    },
    balances: {
      title: 'Balances',
      desc: 'Review business balance and operational balance with filters and teller summaries.',
      icon: '📊',
      tools: ['business_balance','operational_balance','teller_balances']
    }
  };

  const TOOL_LABELS = {
    check_balance: 'Check Balance',
    account_opening: 'Account Opening',
    account_maintenance: 'Account Maintenance',
    account_reactivation: 'Account Reactivation',
    account_statement: 'Account Statement',
    credit: 'Credit',
    debit: 'Debit',
    approval_queue: 'Approval Queue',
    permissions: 'Permissions Matrix',
    operational_accounts: 'Income & Expense Accounts',
    staff_directory: 'Staff Directory',
    business_balance: 'Business Balance',
    operational_balance: 'Operational Balance',
    teller_balances: 'Teller Balances'
  };

  const DEFAULT_PERMS = {
    customer_service: ['check_balance','account_opening','account_maintenance','account_reactivation','account_statement'],
    teller: ['check_balance','account_statement','credit','debit'],
    approving_officer: ['check_balance','account_statement','account_opening','account_maintenance','account_reactivation','credit','debit','approval_queue','business_balance','operational_balance'],
    admin_officer: ['check_balance','account_opening','account_maintenance','account_reactivation','account_statement','credit','debit','approval_queue','permissions','operational_accounts','staff_directory','business_balance','operational_balance','teller_balances'],
    report_officer: ['check_balance','account_statement','business_balance','operational_balance','teller_balances']
  };

  const state = load() || seed();
  state.ui = state.ui || { module: 'customer_service', tool: 'check_balance', selectedCustomerId: null, theme: 'classic', businessFilter: { preset: 'daily', from: '', to: '' }, operationalFilter: { preset: 'all', from: '', to: '', type: 'all' } };
  ensureState();

  function seed() {
    const s = {
      staff: [
        { id:'st1', name:'Daniel Johnson', role:'customer_service', active:true },
        { id:'st2', name:'Mary Daniel', role:'teller', active:true },
        { id:'st3', name:'Francis Etta', role:'approving_officer', active:true },
        { id:'st4', name:'Admin Officer', role:'admin_officer', active:true }
      ],
      customers: [
        { id:'c1', accountNumber:'1000', oldAccountNumber:'A-221', name:'Emma Johnson', address:'14 Palm Street', nin:'12345678901', bvn:'2200114422', phone:'08012345678', balance:32000, photo:'', active:true, createdAt:new Date().toISOString(), transactions:[
          txObj('credit', 15000, 'Opening contribution', 'SYSTEM', 'system', null, 'customer', today()),
          txObj('credit', 17000, 'Cash contribution', 'SYSTEM', 'system', null, 'customer', today())
        ] },
        { id:'c2', accountNumber:'1001', oldAccountNumber:'A-222', name:'Uduak Peters', address:'Market Road', nin:'22345678901', bvn:'2200118899', phone:'08022223333', balance:6500, photo:'', active:true, createdAt:new Date().toISOString(), transactions:[
          txObj('credit', 6500, 'Savings credit', 'SYSTEM', 'system', null, 'customer', today())
        ] }
      ],
      approvals: [],
      audit: [],
      staffAccounts: {},
      operations: { incomeAccounts: [], expenseAccounts: [], entries: [] },
      cod: [],
      tempGrants: [],
      businessExtras: [],
      activeStaffId: 'st4'
    };
    s.operations.incomeAccounts.push({ id:'ia1', name:'Commission', accountNumber:'INC-2000', createdAt:new Date().toISOString() });
    s.operations.expenseAccounts.push({ id:'ea1', name:'Transport Expense', accountNumber:'EXP-3000', createdAt:new Date().toISOString() });
    s.staff.forEach(st => ensureStaffAccount(st.id, s));
    s.audit.push(auditEntry('System', 'seed', 'Initial demo data created'));
    return s;
  }

  function txObj(type, amount, details, postedBy, postedById, approvedBy, counterparty, dateISO, extra={}) {
    return {
      id: uid('tx'),
      type,
      amount: Number(amount||0),
      details: details || '',
      postedBy,
      postedById,
      approvedBy,
      counterparty: counterparty || '',
      date: `${dateISO || today()}T12:00:00.000Z`,
      balanceAfter: null,
      ...extra
    };
  }

  function ensureState() {
    state.staff ||= [];
    state.customers ||= [];
    state.approvals ||= [];
    state.audit ||= [];
    state.operations ||= { incomeAccounts: [], expenseAccounts: [], entries: [] };
    state.operations.incomeAccounts ||= [];
    state.operations.expenseAccounts ||= [];
    state.operations.entries ||= [];
    state.cod ||= [];
    state.tempGrants ||= [];
    state.staffAccounts ||= {};
    state.businessExtras ||= [];
    state.ui.businessFilter ||= { preset:'daily', from:'', to:'' };
    state.ui.operationalFilter ||= { preset:'all', from:'', to:'', type:'all' };
    if (!state.ui.operationalFilter.type) state.ui.operationalFilter.type = 'all';
    state.staff.forEach(st => ensureStaffAccount(st.id));
    recalcAllCustomerBalances();
    recalcAllTellerBalances();
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function currentStaff() {
    return state.staff.find(s => s.id === state.activeStaffId) || state.staff[0] || null;
  }

  function ensureStaffAccount(staffId, sourceState=state) {
    sourceState.staffAccounts ||= {};
    if (!sourceState.staffAccounts[staffId]) {
      sourceState.staffAccounts[staffId] = {
        staffId,
        accountNumber: String(4000 + Object.keys(sourceState.staffAccounts).length),
        entries: [],
        balance: 0,
        walletBalance: 0,
        debtBalance: 0
      };
    }
    const acc = sourceState.staffAccounts[staffId];
    if (typeof acc.walletBalance !== 'number') acc.walletBalance = 0;
    if (typeof acc.debtBalance !== 'number') acc.debtBalance = 0;
    return acc;
  }

  function auditEntry(actor, action, details) {
    return { id: uid('aud'), at: new Date().toISOString(), actor, action, details };
  }

  function pushAudit(action, details) {
    const st = currentStaff();
    state.audit.unshift(auditEntry(st?.name || 'System', action, details));
    save();
  }

  function hasPermission(tool, staff=currentStaff()) {
    if (!staff) return false;
    if (tool === 'check_balance') return true;
    const base = DEFAULT_PERMS[staff.role] || [];
    const grantOn = state.tempGrants.some(g => g.staffId === staff.id && g.tool === tool && g.enabled);
    return base.includes(tool) || grantOn;
  }

  function moduleAllowed(moduleKey, staff=currentStaff()) {
    return MODULES[moduleKey].tools.some(t => hasPermission(t, staff));
  }

  function showToast(msg) {
    const el = byId('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => el.classList.add('hidden'), 2800);
  }

  function openModal(title, bodyHtml, actions=[]) {
    byId('modalTitle').textContent = title;
    byId('modalBody').innerHTML = bodyHtml;
    const box = byId('modalActions');
    box.innerHTML = '';
    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.textContent = a.label;
      btn.className = a.className || '';
      btn.onclick = a.onClick;
      box.appendChild(btn);
    });
    byId('modalBack').classList.remove('hidden');
  }
  function closeModal() { byId('modalBack').classList.add('hidden'); }

  function fmtDate(iso) {
    const d = new Date(iso);
    return isNaN(d) ? iso : DATE_FMT.format(d);
  }

  function recalcCustomerBalance(customer) {
    let bal = 0;
    (customer.transactions || []).sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(tx => {
      if (tx.type === 'credit') bal += Number(tx.amount || 0);
      if (tx.type === 'debit') bal -= Number(tx.amount || 0);
      tx.balanceAfter = bal;
    });
    customer.balance = bal;
  }

  function recalcAllCustomerBalances() {
    state.customers.forEach(recalcCustomerBalance);
    save();
  }

  function recalcStaffBalance(staffId) {
    const acc = ensureStaffAccount(staffId);
    let bal = 0;
    acc.entries.sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(e => {
      bal += Number(e.delta || 0);
      e.balanceAfter = bal;
    });
    acc.balance = bal;
  }
  function recalcAllTellerBalances() { Object.keys(state.staffAccounts).forEach(recalcStaffBalance); save(); }

  function addStaffEntry(staffId, type, amount, delta, note, extra={}) {
    const acc = ensureStaffAccount(staffId);
    acc.entries.push({
      id: uid('se'),
      type,
      amount: Number(amount || 0),
      delta: Number(delta || 0),
      note: note || '',
      date: new Date().toISOString(),
      postedBy: currentStaff()?.name || 'System',
      ...extra
    });
    recalcStaffBalance(staffId);
  }

  function getCustomerByAccountNo(accountNumber) {
    return state.customers.find(c => c.accountNumber === String(accountNumber || '').trim());
  }

  function searchCustomersByName(term) {
    const q = String(term || '').trim().toLowerCase();
    if (!q) return [];
    return state.customers.filter(c => c.name.toLowerCase().includes(q) || c.accountNumber.includes(q));
  }

  function createRequest(type, payload, meta={}) {
    const staff = currentStaff();
    const req = {
      id: uid('rq'),
      type,
      status: 'pending',
      payload,
      requestedAt: new Date().toISOString(),
      requestedBy: staff?.id || 'system',
      requestedByName: staff?.name || 'System',
      ...meta
    };
    state.approvals.unshift(req);
    pushAudit('request_created', `${type} by ${req.requestedByName}`);
    save();
    return req;
  }

  function approveRequest(id) {
    const req = state.approvals.find(r => r.id === id);
    if (!req || req.status !== 'pending') return;
    req.status = 'approved';
    req.approvedAt = new Date().toISOString();
    req.approvedBy = currentStaff()?.name || 'System';
    applyRequest(req);
    pushAudit('request_approved', `${req.type} approved`);
    save();
    render();
  }

  function rejectRequest(id) {
    const req = state.approvals.find(r => r.id === id);
    if (!req || req.status !== 'pending') return;
    req.status = 'rejected';
    req.approvedAt = new Date().toISOString();
    req.approvedBy = currentStaff()?.name || 'System';
    pushAudit('request_rejected', `${req.type} rejected`);
    save();
    render();
  }

  function applyRequest(req) {
    switch (req.type) {
      case 'account_opening': {
        const p = req.payload;
        state.customers.push({
          id: uid('c'),
          accountNumber: p.generatedAccountNumber,
          oldAccountNumber: p.oldAccountNumber || '',
          name: p.name,
          address: p.address,
          nin: p.nin,
          bvn: p.bvn,
          phone: p.phone,
          photo: p.photo || '',
          active: true,
          createdAt: new Date().toISOString(),
          transactions: []
        });
        break;
      }
      case 'account_maintenance': {
        const c = state.customers.find(x => x.id === req.payload.customerId);
        if (c) Object.assign(c, req.payload.patch);
        break;
      }
      case 'account_reactivation': {
        const c = state.customers.find(x => x.id === req.payload.customerId);
        if (c) c.active = true;
        break;
      }
      case 'float_declaration': {
        if (!hasOpeningBalanceForDate(req.payload.staffId, req.payload.date)) {
          addStaffEntry(req.payload.staffId, 'approved_float', req.payload.amount, req.payload.amount, `Approved opening balance for ${req.payload.date}`, { floatDate: req.payload.date });
        }
        break;
      }
      case 'customer_credit': {
        const c = state.customers.find(x => x.id === req.payload.customerId);
        if (!c) break;
        c.transactions.push(txObj('credit', req.payload.amount, req.payload.details, req.requestedByName, req.requestedBy, currentStaff()?.name || '', 'customer', req.payload.date, {
          receivedOrPaidBy: req.payload.receivedOrPaidBy,
          postedBy: req.requestedByName,
          approvedBy: currentStaff()?.name || ''
        }));
        recalcCustomerBalance(c);
        addStaffEntry(req.payload.staffId, 'customer_credit', req.payload.amount, -req.payload.amount, `Customer credit ${c.accountNumber}`, { customerId: c.id, date: `${req.payload.date}T12:00:00.000Z` });
        break;
      }
      case 'customer_debit': {
        const c = state.customers.find(x => x.id === req.payload.customerId);
        if (!c) break;
        c.transactions.push(txObj('debit', req.payload.amount, req.payload.details, req.requestedByName, req.requestedBy, currentStaff()?.name || '', 'customer', req.payload.date, {
          receivedOrPaidBy: req.payload.receivedOrPaidBy,
          postedBy: req.requestedByName,
          approvedBy: currentStaff()?.name || ''
        }));
        recalcCustomerBalance(c);
        if (req.payload.payoutSource === 'teller') {
          addStaffEntry(req.payload.staffId, 'customer_debit', req.payload.amount, req.payload.amount, `Customer debit ${c.accountNumber}`, { customerId: c.id, date: `${req.payload.date}T12:00:00.000Z` });
        }
        break;
      }
      case 'operational_entry': {
        state.operations.entries.unshift({
          id: uid('op'),
          kind: req.payload.kind,
          accountId: req.payload.accountId,
          accountName: req.payload.accountName,
          amount: req.payload.amount,
          note: req.payload.note,
          date: `${req.payload.date}T12:00:00.000Z`,
          postedBy: req.requestedByName,
          approvedBy: currentStaff()?.name || '',
          relatedRequestId: req.id
        });
        break;
      }
      case 'create_operational_account': {
        const dest = req.payload.category === 'income' ? state.operations.incomeAccounts : state.operations.expenseAccounts;
        dest.push({ id: uid('oa'), name: req.payload.name, accountNumber: req.payload.accountNumber, createdAt: new Date().toISOString() });
        break;
      }
      case 'close_of_day': {
        const variance = Number(req.payload.actualCash||0) - Number(req.payload.expectedCash||0);
        state.cod.unshift({
          id: uid('cod'),
          staffId: req.payload.staffId,
          staffName: req.payload.staffName,
          date: req.payload.date,
          actualCash: req.payload.actualCash,
          expectedCash: req.payload.expectedCash,
          variance,
          overdraw: req.payload.overdraw || 0,
          note: req.payload.note,
          fieldPapers: req.payload.fieldPapers,
          status: variance === 0 ? 'balanced' : 'flagged',
          approvedAt: new Date().toISOString(),
          approvedBy: currentStaff()?.name || ''
        });
        break;
      }
      case 'wallet_fund': {
        const acc = ensureStaffAccount(req.payload.staffId);
        acc.walletBalance = Number(acc.walletBalance||0) + Number(req.payload.amount||0);
        addStaffEntry(req.payload.staffId, 'wallet_fund', req.payload.amount, 0, req.payload.note || 'Wallet funded');
        break;
      }
      case 'debt_repayment': {
        const acc = ensureStaffAccount(req.payload.staffId);
        acc.walletBalance = Math.max(0, Number(acc.walletBalance||0) - Number(req.payload.amount||0));
        acc.debtBalance = Math.max(0, Number(acc.debtBalance||0) - Number(req.payload.amount||0));
        addStaffEntry(req.payload.staffId, 'debt_repayment', req.payload.amount, 0, req.payload.note || 'Debt repaid');
        state.businessExtras ||= [];
        state.businessExtras.unshift({ date:new Date().toISOString(), accountNumber: acc.accountNumber, details:'Staff debt repayment', kind:'credit', amount:Number(req.payload.amount||0), balanceAfter:0, receivedOrPaidBy: req.requestedByName, postedBy: currentStaff()?.name || req.requestedByName });
        break;
      }
      case 'temp_grant': {
        const existing = state.tempGrants.find(g => g.staffId === req.payload.staffId && g.tool === req.payload.tool);
        if (existing) existing.enabled = req.payload.enabled;
        else state.tempGrants.push({ ...req.payload });
        break;
      }
    }
    recalcAllCustomerBalances();
    recalcAllTellerBalances();
  }

  function nextCustomerAccountNumber() {
    const nums = state.customers.map(c => Number(c.accountNumber || 0)).filter(Boolean);
    return String((nums.length ? Math.max(...nums) : 999) + 1);
  }

  function lookupFill(root, customer) {
    const map = {
      name: customer?.name || '',
      phone: customer?.phone || '',
      balance: customer ? money(customer.balance) : '',
      address: customer?.address || '',
      nin: customer?.nin || '',
      bvn: customer?.bvn || ''
    };
    Object.entries(map).forEach(([k,v]) => {
      const el = q(`[data-fill="${k}"]`, root);
      if (el) el.textContent = v || '—';
    });
    const photo = q('[data-fill="photo"]', root);
    if (photo) photo.innerHTML = customer?.photo ? `<img src="${customer.photo}" alt="photo">` : '<span>No Photo</span>';
  }

  function render() {
    bindHeader();
    renderHero();
    renderModules();
    renderWorkspace();
  }

  function bindHeader() {
    const staffSel = byId('staffSelect');
    staffSel.innerHTML = state.staff.map(s => `<option value="${s.id}">${s.name} — ${ROLE_LABELS[s.role] || s.role}</option>`).join('');
    staffSel.value = state.activeStaffId;
    staffSel.onchange = () => { state.activeStaffId = staffSel.value; save(); render(); };
    byId('btnTodayFloat').onclick = openFloatModal;
    byId('btnCOD').onclick = openCODModal;
    byId('btnAudit').onclick = openAuditModal;
    const themes = ['classic','ducess-sheet','ocean','dark-slate','neutral-stone'];
    const themeBtn = byId('btnThemeCycle');
    const updateThemeBtn = () => { if (themeBtn) themeBtn.textContent = `Theme: ${prettyThemeName(state.ui.theme || 'classic')}`; };
    updateThemeBtn();
    if (themeBtn) themeBtn.onclick = () => {
      const idx = themes.indexOf(state.ui.theme || 'classic');
      const next = themes[(idx + 1) % themes.length];
      applyTheme(next, true);
      updateThemeBtn();
      showToast(`Theme changed to ${prettyThemeName(next)}`);
    };
    byId('globalNameSearch').oninput = (e) => {
      const results = searchCustomersByName(e.target.value);
      if (!e.target.value.trim()) return;
      openCustomerSearchModal(results);
    };
    byId('modalClose').onclick = closeModal;
    byId('modalBack').onclick = (e) => { if (e.target === byId('modalBack')) closeModal(); };
  }

  function renderHero() {
    const businessCredit = allApprovedCustomerTx('credit').reduce((s,t)=>s+t.amount,0);
    const businessDebit = allApprovedCustomerTx('debit').reduce((s,t)=>s+t.amount,0);
    const operationalIncome = state.operations.entries.filter(e => e.kind === 'income').reduce((s,e)=>s+Number(e.amount||0),0);
    const operationalExpense = state.operations.entries.filter(e => e.kind === 'expense').reduce((s,e)=>s+Number(e.amount||0),0);
    const pending = state.approvals.filter(a => a.status === 'pending').length;
    const acc = ensureStaffAccount(currentStaff()?.id || '');
    const openingToday = getOpeningBalanceForDate(currentStaff()?.id, today());
    const remaining = Number(acc.balance || 0);
    byId('heroStats').innerHTML = [
      cardMetric('My Balance', money(Number(acc.walletBalance||0)), `Wallet ${money(acc.walletBalance||0)} • Debt ${money(acc.debtBalance||0)} • Opening ${money(openingToday)} • Remaining ${money(remaining)}`, 'my-balance'),
      cardMetric('My Close of Day', money(staffCODRecords((currentStaff()||{}).id).length), `${pending} pending approvals`, 'my-cod'),
      cardMetric('Operational Income', money(operationalIncome), `${state.operations.incomeAccounts.length} income accounts`, 'post-income'),
      cardMetric('Operational Expense', money(operationalExpense), `${state.operations.expenseAccounts.length} expense accounts`, 'post-expense')
    ].join('');
    qq('[data-hero-card]').forEach(el => el.onclick = () => {
      const act = el.dataset.heroCard;
      if (act === 'my-balance') openMyBalanceModal();
      if (act === 'my-cod') openMyCODModal();
      if (act === 'post-income') { state.ui.module = 'administration'; state.ui.tool = 'operational_accounts'; state.ui.operationalFocus = 'income'; save(); render(); }
      if (act === 'post-expense') { state.ui.module = 'administration'; state.ui.tool = 'operational_accounts'; state.ui.operationalFocus = 'expense'; save(); render(); }
    });
  }

  function cardMetric(label, value, hint, action='') {
    return `<div class="summary-card ${action ? 'clickable' : ''}" ${action ? `data-hero-card="${action}"` : ''}><div class="section-label">${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></div>`;
  }

  function renderModules() {
    const current = state.ui.module;
    byId('moduleGrid').innerHTML = Object.entries(MODULES).map(([key,m]) => {
      const allowed = moduleAllowed(key);
      return `<div class="module-card ${current===key?'active':''} ${allowed?'':'disabled'}" data-module="${key}">
        <div class="module-icon">${m.icon}</div>
        <div class="module-title">${m.title}</div>
        <div class="module-desc">${m.desc}</div>
      </div>`;
    }).join('');
    qq('.module-card').forEach(card => {
      card.onclick = () => {
        const key = card.dataset.module;
        if (!moduleAllowed(key)) return showToast('No access for this section');
        state.ui.module = key;
        state.ui.tool = MODULES[key].tools.find(t => hasPermission(t)) || MODULES[key].tools[0];
        save();
        render();
      };
    });
  }

  function renderWorkspace() {
    const module = MODULES[state.ui.module];
    byId('workspaceLabel').textContent = module.title;
    byId('workspaceTitle').textContent = TOOL_LABELS[state.ui.tool] || module.title;
    const tabs = `<div class="tool-tabs">${module.tools.map(t => `<button class="tool-tab ${state.ui.tool===t?'active':''}" data-tool="${t}" ${hasPermission(t)?'':'disabled'}>${TOOL_LABELS[t]}</button>`).join('')}</div>`;
    byId('workspace').innerHTML = tabs + renderTool(state.ui.tool);
    qq('.tool-tab').forEach(btn => btn.onclick = () => {
      state.ui.tool = btn.dataset.tool;
      save();
      renderWorkspace();
    });
    bindToolHandlers();
  }

  function renderTool(tool) {
    switch(tool) {
      case 'check_balance': return renderCheckBalance();
      case 'account_opening': return renderAccountOpening();
      case 'account_maintenance': return renderAccountMaintenance();
      case 'account_reactivation': return renderAccountReactivation();
      case 'account_statement': return renderAccountStatement();
      case 'credit': return renderJournalTool('credit');
      case 'debit': return renderJournalTool('debit');
      case 'approval_queue': return renderApprovals();
      case 'permissions': return renderPermissions();
      case 'operational_accounts': return renderOperationalAccounts();
      case 'staff_directory': return renderStaffDirectory();
      case 'business_balance': return renderBusinessBalance();
      case 'operational_balance': return renderOperationalBalance();
      case 'teller_balances': return renderTellerBalances();
      default: return '<div class="note">Tool not found.</div>';
    }
  }

  function renderCheckBalance() {
    return `
      <div class="layout-grid two">
        <div class="form-card">
          <h3>Check Balance</h3>
          <div class="form-grid two">
            <div class="field"><label>Account Number</label><input id="lookupAcc" class="entry-input" placeholder="Type account number" /></div>
            <div class="field"><label>Search</label><button id="lookupBtn">Search</button></div>
          </div>
          <div class="action-row"><button class="secondary" id="searchByNameBtn">Search by Name</button><button class="ghost-btn" id="openStatementBtn">Statement</button></div>
        </div>
        <div class="record-card">
          <div class="lookup-card">
            <div class="photo-box" data-fill="photo"><span>No Photo</span></div>
            <div class="stack">
              <div class="info-grid">
                <div class="info-item"><div class="k">Account Name</div><div class="v" data-fill="name">—</div></div>
                <div class="info-item"><div class="k">Phone Number</div><div class="v" data-fill="phone">—</div></div>
                <div class="info-item"><div class="k">Available Balance</div><div class="v" data-fill="balance">—</div></div>
                <div class="info-item"><div class="k">Address</div><div class="v" data-fill="address">—</div></div>
              </div>
              <div class="note">Coloured spaces are for input. White spaces are auto-filled by the system.</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderAccountOpening() {
    const nextNo = nextCustomerAccountNumber();
    return `
      <div class="form-card">
        <h3>Account Opening</h3>
        <div class="form-grid three">
          <div class="field"><label>Account Name</label><input id="openName" class="entry-input"></div>
          <div class="field"><label>Address</label><input id="openAddress" class="entry-input"></div>
          <div class="field"><label>Phone Number</label><input id="openPhone" class="entry-input"></div>
          <div class="field"><label>NIN</label><input id="openNin" class="entry-input"></div>
          <div class="field"><label>BVN</label><input id="openBvn" class="entry-input"></div>
          <div class="field"><label>Old Account Number</label><input id="openOldAccount" class="entry-input"></div>
          <div class="field"><label>New Account Number</label><div class="display-field" id="generatedAccountNumber">${nextNo}</div></div>
          <div class="field"><label>Photo Upload</label><input id="openPhoto" class="entry-input" type="file" accept="image/*"></div>
          <div class="field"><label>Live Capture</label><button type="button" class="secondary" id="openCaptureBtn">Capture From Camera</button></div>
          <div class="field"><label>Preview</label><div class="photo-box small" id="openPhotoPreview"><span>No Photo</span></div></div>
        </div>
        <div class="action-row"><button id="submitOpening">Submit for Approval</button></div>
      </div>`;
  }

  function renderAccountMaintenance() {
    return maintenanceCommon('maintenance', 'Save Changes', 'Submit Maintenance');
  }
  function renderAccountReactivation() {
    return maintenanceCommon('reactivation', 'Activate', 'Submit Reactivation');
  }
  function maintenanceCommon(prefix, actionLabel, btnLabel) {
    return `
      <div class="layout-grid two">
        <div class="form-card">
          <h3>${prefix === 'maintenance' ? 'Account Maintenance' : 'Account Reactivation'}</h3>
          <div class="form-grid three">
            <div class="field"><label>Account Number</label><input id="${prefix}Acc" class="entry-input"></div>
            <div class="field"><label>Search</label><button id="${prefix}Search">Search</button></div>
            <div class="field"><label>Action</label><button class="secondary" id="${prefix}Submit">${btnLabel}</button></div>
            <div class="field"><label>Account Name</label><input id="${prefix}Name" class="entry-input"></div>
            <div class="field"><label>Address</label><input id="${prefix}Address" class="entry-input"></div>
            <div class="field"><label>Phone Number</label><input id="${prefix}Phone" class="entry-input"></div>
            <div class="field"><label>NIN</label><input id="${prefix}Nin" class="entry-input"></div>
            <div class="field"><label>BVN</label><input id="${prefix}Bvn" class="entry-input"></div>
            <div class="field"><label>Old Account Number</label><input id="${prefix}OldAccount" class="entry-input"></div>
          </div>
          <div class="note">${prefix === 'maintenance' ? 'Search first, update details, then submit.': 'Search account, confirm details, and submit reactivation.'}</div>
        </div>
        <div class="record-card">
          <h3>System Display</h3>
          <div class="info-grid">
            <div class="info-item"><div class="k">Account Name</div><div class="v" id="${prefix}DisplayName">—</div></div>
            <div class="info-item"><div class="k">Phone Number</div><div class="v" id="${prefix}DisplayPhone">—</div></div>
            <div class="info-item"><div class="k">Current Status</div><div class="v" id="${prefix}DisplayStatus">—</div></div>
            <div class="info-item"><div class="k">Action</div><div class="v">${actionLabel}</div></div>
          </div>
        </div>
      </div>`;
  }

  function renderAccountStatement() {
    return `
      <div class="stack">
        <div class="form-card">
          <h3>Account Statement</h3>
          <div class="form-grid three">
            <div class="field"><label>Account Number</label><input id="stmtAcc" class="entry-input"></div>
            <div class="field"><label>From Date</label><input id="stmtFrom" class="entry-input" type="date"></div>
            <div class="field"><label>To Date</label><input id="stmtTo" class="entry-input" type="date"></div>
          </div>
          <div class="action-row"><button id="stmtGenerate">Generate Statement</button><button class="secondary" id="stmtPrintBtn">Print Statement</button></div>
        </div>
        <div id="statementArea"></div>
      </div>`;
  }

  function renderJournalTool(kind) {
    const title = kind === 'credit' ? 'Credit' : 'Debit';
    return `
      <div class="layout-grid two">
        <div class="stack">
          <div class="form-card">
            <h3>${title}</h3>
            <div class="form-grid three">
              <div class="field"><label>Account Number</label><input id="txAcc" class="entry-input"></div>
              <div class="field"><label>Search</label><button id="txSearch">Search</button></div>
              <div class="field"><label>Generate Journal</label><button class="secondary" id="txJournalAdd">Generate Journal</button></div>
              <div class="field"><label>Account Name</label><div class="display-field" id="txName">—</div></div>
              <div class="field"><label>Available Balance</label><div class="display-field" id="txBalance">—</div></div>
              <div class="field"><label>Amount</label><input id="txAmount" class="entry-input" type="number"></div>
              <div class="field"><label>Received or Paid By</label><input id="txCounterparty" class="entry-input"></div>
              <div class="field"><label>Details</label><input id="txDetails" class="entry-input"></div>
              ${kind === 'debit' ? `<div class="field"><label>Payout Source</label><select id="txPayoutSource" class="entry-input"><option value="teller">Teller Cash</option><option value="other">Other Source</option></select></div>` : `<div class="field"><label>Date</label><div class="display-field">${today()}</div></div>`}
            </div>
            <div class="note">Posting is blocked until the posting staff has approved float for today.</div>
          </div>
        </div>
        <div class="table-card">
          <h3>Journal Generated</h3>
          <div class="table-wrap"><table class="table"><thead><tr><th>S/N</th><th>Account Name</th><th>Account Number</th><th>Amount</th><th></th></tr></thead><tbody id="journalRows"></tbody></table></div>
          <div class="action-row"><button id="journalSubmit">Post</button><button class="secondary" id="journalClear">Clear Journal</button></div>
          <div class="note">The journal only submits requests. Approval officers finalize them.</div>
        </div>
      </div>`;
  }

  function renderApprovals() {
    const rows = state.approvals.map((a, i) => `
      <tr>
        <td>${i+1}</td>
        <td>${prettyApprovalType(a.type)}</td>
        <td>${a.requestedByName}</td>
        <td>${requestSummary(a)}</td>
        <td>${fmtDate(a.requestedAt)}</td>
        <td><span class="badge ${a.status}">${a.status}</span></td>
        <td>${a.status === 'pending' ? `<button data-approve="${a.id}" class="success">Approve</button> <button data-reject="${a.id}" class="danger">Reject</button>` : a.approvedBy || '—'}</td>
      </tr>`).join('');
    const codRows = currentStaff()?.role === 'admin_officer' ? (state.cod || []).filter(c => c.status === 'flagged').map((c, i) => `
      <tr>
        <td>${i+1}</td><td>${fmtDate(c.date)}</td><td>${c.staffName}</td><td>${money(c.expectedCash)}</td><td>${money(c.actualCash||0)}</td><td>${money(c.variance||0)}</td><td>${c.note || '—'}</td><td><button data-resolve-cod="${c.id}" class="success">Resolve</button></td>
      </tr>`).join('') : '';
    return `
      <div class="stack">
        <div class="table-card">
          <h3>Approval Queue</h3>
          <div class="table-wrap"><table class="table"><thead><tr><th>S/N</th><th>Request</th><th>Submitted By</th><th>Details</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="muted">No requests yet</td></tr>'}</tbody></table></div>
        </div>
        ${currentStaff()?.role === 'admin_officer' ? `<div class="table-card"><h3>COD Resolution Queue</h3><div class="table-wrap"><table class="table"><thead><tr><th>S/N</th><th>Date</th><th>Staff</th><th>Expected</th><th>Actual</th><th>Variance</th><th>Note</th><th>Action</th></tr></thead><tbody>${codRows || '<tr><td colspan="8">No flagged COD awaiting resolution</td></tr>'}</tbody></table></div></div>` : ''}
      </div>`;
  }

  function prettyApprovalType(type) {
    return {
      account_opening:'Account Opening', account_maintenance:'Account Maintenance', account_reactivation:'Account Reactivation',
      customer_credit:'Credit', customer_debit:'Debit', float_declaration:'Opening Float', operational_entry:'Operational Entry',
      create_operational_account:'Operational Account', close_of_day:'Close of Day', temp_grant:'Temporary Grant'
    }[type] || type;
  }

  function requestSummary(a) {
    const p = a.payload || {};
    if (a.type === 'float_declaration') return `${money(p.amount)} for ${p.date}`;
    if (a.type === 'customer_credit' || a.type === 'customer_debit') return `${p.accountNumber} • ${money(p.amount)}`;
    if (a.type === 'account_opening') return `${p.name} • ${p.generatedAccountNumber}`;
    if (a.type === 'account_maintenance') return `${p.accountNumber} • update`; 
    if (a.type === 'account_reactivation') return `${p.accountNumber} • reactivate`; 
    if (a.type === 'operational_entry') return `${p.accountName} • ${money(p.amount)}`;
    if (a.type === 'create_operational_account') return `${p.category} • ${p.name}`;
    if (a.type === 'close_of_day') return `${p.staffName} • ${p.date} • Actual ${money(p.actualCash)} • Expected ${money(p.expectedCash)}`;
    if (a.type === 'temp_grant') return `${staffName(p.staffId)} • ${TOOL_LABELS[p.tool]} = ${p.enabled ? 'ON' : 'OFF'}`;
    if (a.type === 'wallet_fund') return `${staffName(p.staffId)} • Wallet fund • ${money(p.amount)}`;
    if (a.type === 'debt_repayment') return `${staffName(p.staffId)} • Debt repayment • ${money(p.amount)}`;
    return '—';
  }

  function renderPermissions() {
    const tools = ['check_balance','account_opening','account_maintenance','account_reactivation','account_statement','credit','debit','approval_queue','business_balance'];
    return `
      <div class="stack">
        <div class="table-card">
          <h3>Administrative Working Tools</h3>
          <div class="table-wrap"><table class="table"><thead><tr><th>S/N</th><th>Staff</th><th>Office</th>${tools.map(t=>`<th>${TOOL_LABELS[t]}</th>`).join('')}</tr></thead>
          <tbody>${state.staff.map((s,i)=>`<tr><td>${i+1}</td><td>${s.name}</td><td>${ROLE_LABELS[s.role] || s.role}</td>${tools.map(t=>`<td>${hasPermission(t,s)?'YES':'NO'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        </div>
        <div class="form-card">
          <h3>Temporary Access Grant</h3>
          <div class="form-grid three">
            <div class="field"><label>Staff</label><select id="grantStaff" class="entry-input">${state.staff.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
            <div class="field"><label>Tool</label><select id="grantTool" class="entry-input">${Object.keys(TOOL_LABELS).map(t=>`<option value="${t}">${TOOL_LABELS[t]}</option>`).join('')}</select></div>
            <div class="field"><label>Switch</label><select id="grantEnabled" class="entry-input"><option value="true">Grant Access</option><option value="false">Switch Off</option></select></div>
          </div>
          <div class="action-row"><button id="grantSubmit">Send Grant Request</button></div>
        </div>
      </div>`;
  }

  function renderOperationalAccounts() {
    const allAccts = [
      ...state.operations.incomeAccounts.map(a=>({...a,category:'income'})),
      ...state.operations.expenseAccounts.map(a=>({...a,category:'expense'}))
    ];
    return `
      <div class="stack">
        <div class="layout-grid two">
          <div class="form-card">
            <h3>Create Account</h3>
            <div class="form-grid three">
              <div class="field"><label>Category</label><select id="oaCategory" class="entry-input"><option value="income" ${state.ui.operationalFocus==='income'?'selected':''}>Income</option><option value="expense" ${state.ui.operationalFocus==='expense'?'selected':''}>Expense</option></select></div>
              <div class="field"><label>Account Name</label><input id="oaName" class="entry-input"></div>
              <div class="field"><label>Account Number</label><div class="display-field" id="oaNumberPreview">INC-2001</div></div>
            </div>
            <div class="action-row"><button id="oaCreate">Submit for Approval</button></div>
          </div>
          <div class="form-card">
            <h3>Post into Account</h3>
            <div class="form-grid three">
              <div class="field"><label>Account</label><select id="oeAccount" class="entry-input">${allAccts.map(a=>`<option value="${a.id}">${a.accountNumber} — ${a.name}</option>`).join('')}</select></div>
              <div class="field"><label>Amount</label><input id="oeAmount" class="entry-input" type="number"></div>
              <div class="field"><label>Date</label><input id="oeDate" class="entry-input" type="date" value="${today()}"></div>
              <div class="field"><label>Note</label><input id="oeNote" class="entry-input"></div>
              <div class="field"><label>Type</label><div class="display-field" id="oeKindDisplay">Auto from account</div></div>
            </div>
            <div class="action-row"><button id="oeSubmit">Submit for Approval</button></div>
          </div>
        </div>
        <div class="table-card">
          <h3>Existing Accounts</h3>
          <div class="table-wrap"><table class="table"><thead><tr><th>Type</th><th>Account Number</th><th>Name</th><th>Entries</th></tr></thead><tbody>${allAccts.map(a=>`<tr><td>${a.category}</td><td>${a.accountNumber}</td><td>${a.name}</td><td>${state.operations.entries.filter(e=>e.accountId===a.id).length}</td></tr>`).join('') || '<tr><td colspan="4">No accounts</td></tr>'}</tbody></table></div>
        </div>
      </div>`;
  }

  function renderStaffDirectory() {
    return `
      <div class="table-card">
        <div class="action-inline"><h3 style="margin:0">Staff Directory</h3><button id="addStaffBtn">ADD STAFF</button></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>S/N</th><th>Staff</th><th>Office</th><th>Status</th><th>Teller Account</th><th>Wallet</th><th>Debt</th><th>Remaining Float</th><th>Action</th></tr></thead><tbody>${state.staff.map((s,i)=>{
          const acc = ensureStaffAccount(s.id);
          return `<tr><td>${i+1}</td><td>${s.name}</td><td>${ROLE_LABELS[s.role] || s.role}</td><td>${s.active === false ? 'Inactive' : 'Active'}</td><td>${acc.accountNumber}</td><td>${money(acc.walletBalance)}</td><td>${money(acc.debtBalance)}</td><td>${money(acc.balance)}</td><td><button class="secondary" data-staff-toggle="${s.id}">${s.active === false ? 'Reactivate' : 'Deactivate'}</button></td></tr>`;
        }).join('')}</tbody></table></div>
      </div>`;
  }

  function renderBusinessBalance() {
    const filtered = filterByDate(flattenBusinessEntries(), state.ui.businessFilter || { preset: 'all', from: '', to: '' });
    const credits = filtered.filter(t => t.kind === 'credit').reduce((s,t)=>s+Number(t.amount||0),0);
    const debits = filtered.filter(t => t.kind === 'debit').reduce((s,t)=>s+Number(t.amount||0),0);
    return `
      <div class="stack">
        ${renderBalanceFilters('business')}
        <div class="kpi-row">
          <div class="kpi"><div class="label">Total Credit</div><div class="number">${money(credits)}</div></div>
          <div class="kpi"><div class="label">Total Debit</div><div class="number">${money(debits)}</div></div>
          <div class="kpi"><div class="label">Entries</div><div class="number">${filtered.length}</div></div>
          <div class="kpi"><div class="label">Net Book Balance</div><div class="number">${money(credits-debits)}</div></div>
        </div>
        <div class="table-card"><h3>Business Entries</h3><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Account</th><th>Details</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Received/Paid By</th><th>Posted By</th></tr></thead><tbody>${filtered.slice(0,500).map(t=>`<tr><td>${fmtDate(t.date)}</td><td>${t.accountNumber || '—'}</td><td>${t.details}</td><td>${t.kind==='debit'?money(t.amount):''}</td><td>${t.kind==='credit'?money(t.amount):''}</td><td>${money(t.balanceAfter || 0)}</td><td>${t.receivedOrPaidBy || '—'}</td><td>${t.postedBy || '—'}</td></tr>`).join('') || '<tr><td colspan="8">No entries</td></tr>'}</tbody></table></div></div>
      </div>`;
  }

  function renderOperationalBalance() {
    const opFilter = state.ui.operationalFilter || { preset: 'all', from: '', to: '', type: 'all' };
    const dateFiltered = filterByDate(state.operations.entries || [], opFilter);
    const filtered = dateFiltered.filter(e => opFilter.type === 'all' ? true : e.kind === opFilter.type);
    const income = filtered.filter(e=>e.kind==='income');
    const expense = filtered.filter(e=>e.kind==='expense');
    return `
      <div class="stack">
        ${renderBalanceFilters('operational')}
        <div class="kpi-row">
          <div class="kpi"><div class="label">Total Income</div><div class="number">${money(income.reduce((s,e)=>s+Number(e.amount||0),0))}</div></div>
          <div class="kpi"><div class="label">Total Expense</div><div class="number">${money(expense.reduce((s,e)=>s+Number(e.amount||0),0))}</div></div>
          <div class="kpi"><div class="label">Net Operational</div><div class="number">${money(income.reduce((s,e)=>s+Number(e.amount||0),0)-expense.reduce((s,e)=>s+Number(e.amount||0),0))}</div></div>
          <div class="kpi"><div class="label">Entries</div><div class="number">${filtered.length}</div></div>
        </div>
        <div class="table-card"><h3>Operational Entries</h3><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Account</th><th>Type</th><th>Amount</th><th>Note</th><th>Posted By</th><th>Approved By</th></tr></thead><tbody>${filtered.map(e=>`<tr><td>${fmtDate(e.date)}</td><td>${e.accountName}</td><td>${e.kind}</td><td>${money(e.amount)}</td><td>${e.note||'—'}</td><td>${e.postedBy}</td><td>${e.approvedBy}</td></tr>`).join('') || '<tr><td colspan="7">No entries</td></tr>'}</tbody></table></div></div>
      </div>`;
  }

  function renderTellerBalances() {
    return `<div class="table-card"><h3>Teller and Posting Accounts</h3><div class="table-wrap"><table class="table"><thead><tr><th>Staff</th><th>Office</th><th>Account Number</th><th>Balance</th><th>Today Approved Float</th><th>Recent Activity</th></tr></thead><tbody>${state.staff.map(s=>{
      const acc = ensureStaffAccount(s.id);
      const floatToday = acc.entries.filter(e=>e.type==='approved_float' && e.floatDate===today()).reduce((sum,e)=>sum+Number(e.amount||0),0);
      const recent = [...acc.entries].slice(-1)[0];
      return `<tr><td>${s.name}</td><td>${ROLE_LABELS[s.role] || s.role}</td><td>${acc.accountNumber}</td><td>${money(acc.balance)}</td><td>${money(floatToday)}</td><td>${recent ? `${recent.type} • ${money(recent.amount)}` : '—'}</td></tr>`;
    }).join('')}</tbody></table></div></div>`;
  }

  function allApprovedCustomerTx(kind) {
    return flattenCustomerTx().filter(t => t.type === kind);
  }
  function flattenCustomerTx() {
    return state.customers.flatMap(customer => (customer.transactions||[]).map(tx => ({ ...tx, customer })) ).sort((a,b)=>new Date(b.date)-new Date(a.date));
  }

  function bindToolHandlers() {
    switch (state.ui.tool) {
      case 'check_balance': bindCheckBalance(); break;
      case 'account_opening': bindAccountOpening(); break;
      case 'account_maintenance': bindMaintenance('maintenance'); break;
      case 'account_reactivation': bindMaintenance('reactivation'); break;
      case 'account_statement': bindStatement(); break;
      case 'credit': bindJournal('credit'); break;
      case 'debit': bindJournal('debit'); break;
      case 'approval_queue': bindApprovals(); break;
      case 'permissions': bindPermissions(); break;
      case 'operational_accounts': bindOperationalAccounts(); break;
      case 'staff_directory': bindStaffDirectory(); break;
      case 'business_balance': bindBalanceFilters('business'); break;
      case 'operational_balance': bindBalanceFilters('operational'); break;
    }
  }

  function bindCheckBalance() {
    const doLookup = () => {
      const c = getCustomerByAccountNo(byId('lookupAcc').value);
      if (!c) return showToast('Customer not found. Use name search.');
      state.ui.selectedCustomerId = c.id;
      save();
      lookupFill(byId('workspace'), c);
    };
    byId('lookupBtn').onclick = doLookup;
    byId('openStatementBtn').onclick = () => { state.ui.tool = 'account_statement'; renderWorkspace(); setTimeout(()=>{ byId('stmtAcc').value = getSelectedCustomer()?.accountNumber || ''; }, 30); };
    byId('searchByNameBtn').onclick = () => openCustomerSearchModal(state.customers);
    const selected = getSelectedCustomer();
    if (selected) lookupFill(byId('workspace'), selected);
  }

  function bindAccountOpening() {
    const updatePreview = (src) => {
      const prev = byId('openPhotoPreview');
      if (prev) prev.innerHTML = src ? `<img src="${src}" alt="preview">` : '<span>No Photo</span>';
    };
    byId('openPhoto').onchange = async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const b64 = await toBase64(f);
      byId('openPhoto').dataset.base64 = b64;
      updatePreview(b64);
    };
    const capBtn = byId('openCaptureBtn');
    if (capBtn) capBtn.onclick = () => openCameraCapture((b64) => {
      byId('openPhoto').dataset.base64 = b64;
      updatePreview(b64);
    });
    byId('submitOpening').onclick = () => {
      const payload = {
        name: byId('openName').value.trim(),
        address: byId('openAddress').value.trim(),
        phone: byId('openPhone').value.trim(),
        nin: byId('openNin').value.trim(),
        bvn: byId('openBvn').value.trim(),
        oldAccountNumber: byId('openOldAccount').value.trim(),
        generatedAccountNumber: byId('generatedAccountNumber').textContent.trim(),
        photo: byId('openPhoto').dataset.base64 || ''
      };
      if (!payload.name || !payload.address || !payload.phone || !payload.nin || !payload.bvn) return showToast('Complete all required fields');
      confirmAction('Submit account opening request?', () => {
        createRequest('account_opening', payload);
        render();
        showToast('Account opening sent for approval');
      });
    };
  }

  function bindMaintenance(prefix) {
    const search = () => {
      const c = getCustomerByAccountNo(byId(`${prefix}Acc`).value);
      if (!c) return showToast('Customer not found');
      state.ui.selectedCustomerId = c.id;
      save();
      byId(`${prefix}Name`).value = c.name;
      byId(`${prefix}Address`).value = c.address;
      byId(`${prefix}Phone`).value = c.phone;
      byId(`${prefix}Nin`).value = c.nin;
      byId(`${prefix}Bvn`).value = c.bvn;
      byId(`${prefix}OldAccount`).value = c.oldAccountNumber || '';
      byId(`${prefix}DisplayName`).textContent = c.name;
      byId(`${prefix}DisplayPhone`).textContent = c.phone;
      byId(`${prefix}DisplayStatus`).textContent = c.active ? 'Active' : 'Inactive';
    };
    byId(`${prefix}Search`).onclick = search;
    byId(`${prefix}Submit`).onclick = () => {
      const c = getSelectedCustomer() || getCustomerByAccountNo(byId(`${prefix}Acc`).value);
      if (!c) return showToast('Search for an account first');
      if (prefix === 'maintenance') {
        createRequest('account_maintenance', {
          customerId: c.id,
          accountNumber: c.accountNumber,
          patch: {
            name: byId(`${prefix}Name`).value.trim(),
            address: byId(`${prefix}Address`).value.trim(),
            phone: byId(`${prefix}Phone`).value.trim(),
            nin: byId(`${prefix}Nin`).value.trim(),
            bvn: byId(`${prefix}Bvn`).value.trim(),
            oldAccountNumber: byId(`${prefix}OldAccount`).value.trim()
          }
        });
        showToast('Maintenance request sent for approval');
      } else {
        createRequest('account_reactivation', { customerId: c.id, accountNumber: c.accountNumber });
        showToast('Reactivation request sent for approval');
      }
      render();
    };
  }

  function bindStatement() {
    byId('stmtGenerate').onclick = () => {
      const c = getCustomerByAccountNo(byId('stmtAcc').value);
      if (!c) return showToast('Customer not found');
      const from = byId('stmtFrom').value;
      const to = byId('stmtTo').value;
      const rows = (c.transactions || []).filter(tx => {
        const d = tx.date.slice(0,10);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      }).map((tx, i) => `<tr><td>${i+1}</td><td>${fmtDate(tx.date)}</td><td>${tx.details || ''}</td><td>${tx.type==='debit'?money(tx.amount):''}</td><td>${tx.type==='credit'?money(tx.amount):''}</td><td>${money(tx.balanceAfter)}</td><td>${tx.receivedOrPaidBy || '—'}</td><td>${tx.postedBy || tx.postedById || '—'}</td><td>${tx.approvedBy || '—'}</td></tr>`).join('');
      byId('statementArea').innerHTML = `
        <div class="record-card">
          <div class="lookup-card">
            <div class="photo-box">${c.photo ? `<img src="${c.photo}" alt="photo">` : '<span>No Photo</span>'}</div>
            <div class="stack">
              <div class="info-grid">
                <div class="info-item"><div class="k">A/C Name</div><div class="v">${c.name}</div></div>
                <div class="info-item"><div class="k">Phone No</div><div class="v">${c.phone}</div></div>
                <div class="info-item"><div class="k">Address</div><div class="v">${c.address}</div></div>
                <div class="info-item"><div class="k">Available Balance</div><div class="v">${money(c.balance)}</div></div>
              </div>
            </div>
          </div>
          <div class="table-wrap" style="margin-top:16px"><table class="table"><thead><tr><th>S/N</th><th>Date</th><th>Details</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Received/Paid By</th><th>Posted By</th><th>Approved By</th></tr></thead><tbody>${rows || '<tr><td colspan="9">No entries in range</td></tr>'}</tbody></table></div>
        </div>`;
    };

    byId('stmtPrintBtn').onclick = () => {
      const area = byId('statementArea').innerHTML;
      if (!area.trim()) return showToast('Generate statement first');
      printHtml(`<h2>Customer Statement</h2>${area}`);
    };
  }

  function hasApprovedFloat(staffId, date=today()) {
    const acc = ensureStaffAccount(staffId);
    return acc.entries.some(e => e.type === 'approved_float' && e.floatDate === date);
  }

  function approvedCreditsForDate(staffId, date=today()) {
    return flattenCustomerTx().filter(t => t.type === 'credit' && t.postedById === staffId && String(t.date).slice(0,10) === date && t.approvedBy).reduce((s,t)=>s+Number(t.amount||0),0);
  }

  function computeExpectedCashForDate(staffId, date=today()) {
    const opening = getOpeningBalanceForDate(staffId, date);
    const credits = approvedCreditsForDate(staffId, date);
    return opening + credits;
  }

  function currentFloatAvailable(staffId, date=today()) {
    return computeExpectedCashForDate(staffId, date);
  }

  function bindJournal(kind) {
    const journal = state.ui[`${kind}Journal`] ||= [];
    const rerenderJournal = () => {
      byId('journalRows').innerHTML = journal.map((row, i) => `<tr><td>${i+1}</td><td>${row.customerName}</td><td>${row.accountNumber}</td><td>${money(row.amount)}</td><td><span class="linklike" data-remove-row="${row.id}">Remove</span></td></tr>`).join('') || '<tr><td colspan="5">No journal entries yet</td></tr>';
      qq('[data-remove-row]').forEach(el => el.onclick = () => {
        const idx = journal.findIndex(r => r.id === el.dataset.removeRow);
        if (idx >= 0) { journal.splice(idx,1); rerenderJournal(); }
      });
    };
    const search = () => {
      const c = getCustomerByAccountNo(byId('txAcc').value);
      if (!c) return showToast('Customer not found');
      state.ui.selectedCustomerId = c.id; save();
      byId('txName').textContent = c.name;
      byId('txBalance').textContent = money(c.balance);
    };
    byId('txSearch').onclick = search;
    if (byId('globalNameSearch')) byId('globalNameSearch').oninput = (e) => {
      const results = searchCustomersByName(e.target.value);
      if (!e.target.value.trim()) return;
      openCustomerSearchModal(results);
    };
    byId('txJournalAdd').onclick = () => {
      const customer = getSelectedCustomer() || getCustomerByAccountNo(byId('txAcc').value);
      if (!customer) return showToast('Search for customer first');
      const amount = Number(byId('txAmount').value || 0);
      if (!(amount > 0)) return showToast('Enter a valid amount');
      journal.push({
        id: uid('jr'), customerId: customer.id, customerName: customer.name, accountNumber: customer.accountNumber,
        amount, details: byId('txDetails').value.trim(), receivedOrPaidBy: byId('txCounterparty').value.trim(),
        payoutSource: byId('txPayoutSource')?.value || 'teller', date: today()
      });
      rerenderJournal();
    };
    byId('journalClear').onclick = () => { journal.splice(0); rerenderJournal(); };
    byId('journalSubmit').onclick = () => {
      const st = currentStaff();
      if (!hasPermission(kind)) return showToast('No access to post');
      if (!hasApprovedFloat(st.id)) return showToast('Approved opening balance required before posting');
      if (!journal.length) return showToast('Generate journal first');
      confirmAction(`Submit ${kind} journal for approval?`, () => {
        journal.forEach(row => {
          createRequest(kind === 'credit' ? 'customer_credit' : 'customer_debit', {
            customerId: row.customerId,
            accountNumber: row.accountNumber,
            amount: row.amount,
            details: row.details,
            receivedOrPaidBy: row.receivedOrPaidBy,
            payoutSource: row.payoutSource,
            staffId: st.id,
            date: row.date
          });
        });
        journal.splice(0);
        rerenderJournal();
        showToast(`${kind === 'credit' ? 'Credit' : 'Debit'} requests sent for approval`);
        render();
      });
    };
    rerenderJournal();
  }

  function bindApprovals() {
    qq('[data-approve]').forEach(btn => btn.onclick = () => {
      if (!hasPermission('approval_queue')) return showToast('No approval rights');
      confirmAction('Approve this request?', () => approveRequest(btn.dataset.approve));
    });
    qq('[data-reject]').forEach(btn => btn.onclick = () => {
      if (!hasPermission('approval_queue')) return showToast('No approval rights');
      confirmAction('Reject this request?', () => rejectRequest(btn.dataset.reject));
    });
    qq('[data-resolve-cod]').forEach(btn => btn.onclick = () => {
      if (currentStaff()?.role !== 'admin_officer') return showToast('Administrative Officer resolves COD');
      openCODResolutionModal(btn.dataset.resolveCod);
    });
  }

  function bindPermissions() {
    byId('grantSubmit').onclick = () => {
      createRequest('temp_grant', {
        staffId: byId('grantStaff').value,
        tool: byId('grantTool').value,
        enabled: byId('grantEnabled').value === 'true'
      });
      showToast('Temporary grant request sent for approval');
      render();
    };
  }

  function nextOperationalNumber(category) {
    const list = category === 'income' ? state.operations.incomeAccounts : state.operations.expenseAccounts;
    const base = category === 'income' ? 2000 : 3000;
    return `${category === 'income' ? 'INC' : 'EXP'}-${base + list.length}`;
  }

  function bindOperationalAccounts() {
    const updatePreview = () => {
      const cat = byId('oaCategory').value;
      byId('oaNumberPreview').textContent = nextOperationalNumber(cat);
    };
    updatePreview();
    byId('oaCategory').onchange = updatePreview;
    byId('oaCreate').onclick = () => {
      const category = byId('oaCategory').value;
      const name = byId('oaName').value.trim();
      if (!name) return showToast('Enter account name');
      createRequest('create_operational_account', { category, name, accountNumber: nextOperationalNumber(category) });
      showToast('Operational account request sent');
      render();
    };
    const syncKind = () => {
      const id = byId('oeAccount').value;
      const income = state.operations.incomeAccounts.find(a=>a.id===id);
      byId('oeKindDisplay').textContent = income ? 'Income' : 'Expense';
    };
    syncKind();
    byId('oeAccount').onchange = syncKind;
    byId('oeSubmit').onclick = () => {
      const accountId = byId('oeAccount').value;
      const amount = Number(byId('oeAmount').value || 0);
      const date = byId('oeDate').value || today();
      const note = byId('oeNote').value.trim();
      if (!(amount > 0)) return showToast('Enter amount');
      const account = [...state.operations.incomeAccounts, ...state.operations.expenseAccounts].find(a=>a.id===accountId);
      if (!account) return showToast('Select account');
      const kind = state.operations.incomeAccounts.some(a=>a.id===accountId) ? 'income' : 'expense';
      createRequest('operational_entry', { accountId, accountName: account.name, kind, amount, note, date });
      showToast('Operational posting sent for approval');
      render();
    };
  }

  function openFloatModal() {
    const st = currentStaff();
    const requiresFloat = hasPermission('credit') || hasPermission('debit');
    if (!requiresFloat) return showToast('Current staff does not need posting float');
    if (hasFloatDeclaredOrPending(st.id, today())) return showToast('Opening Balance already declared for today');
    openModal('Opening Balance', `
      <div class="form-grid three">
        <div class="field"><label>Staff</label><div class="display-field">${st.name}</div></div>
        <div class="field"><label>Date</label><div class="display-field">${today()}</div></div>
        <div class="field"><label>Amount</label><input id="floatAmount" class="entry-input" type="number"></div>
      </div>
      <div class="note">Posting cannot begin until this float is approved.</div>
    `, [
      { label: 'Cancel', className: 'secondary', onClick: closeModal },
      { label: 'Submit', onClick: () => {
          const amount = Number(byId('floatAmount').value || 0);
          if (!(amount > 0)) return showToast('Enter valid float');
          if (hasFloatDeclaredOrPending(st.id, today())) return showToast('Opening Balance already declared for today');
          createRequest('float_declaration', { staffId: st.id, amount, date: today() });
          closeModal();
          render();
          showToast('Float declaration sent for approval');
      }}
    ]);
  }

  async function openCODModal() {
    const st = currentStaff();
    if (!(hasPermission('credit') || hasPermission('debit'))) return showToast('Current staff does not submit close of day');
    if (!hasApprovedFloat(st.id)) return showToast('Approved opening balance required before closing day');
    if (hasCODForDate(st.id, today())) return showToast('Close of Day already submitted for today');
    const expectedCash = computeExpectedCashForDate(st.id, today());
    const overdraw = 0;
    openModal('Close of Day', `
      <div class="stack">
        <div class="form-grid three">
          <div class="field"><label>Staff</label><div class="display-field">${st.name}</div></div>
          <div class="field"><label>Date</label><div class="display-field">${today()}</div></div>
          <div class="field"><label>Expected Cash</label><div class="display-field">${money(expectedCash)}</div></div>
          <div class="field"><label>Actual Cash Count</label><input id="codActual" class="entry-input" type="number"></div>
          <div class="field"><label>Field Paper Upload</label><input id="codFiles" class="entry-input" type="file" multiple accept="image/*,.pdf"></div>
          <div class="field"><label>Note</label><textarea id="codNote" class="entry-input"></textarea></div>
        </div>
        <div class="note">Shortage or excess requires note. Overdraw occurs when approved postings exceed opening balance.</div>
        <div id="codUploads" class="upload-list"></div>
      </div>
    `, [
      { label: 'Cancel', className:'secondary', onClick: closeModal },
      { label: 'Submit', onClick: async () => {
          const actualCash = Number(byId('codActual').value || 0);
          const note = byId('codNote').value.trim();
          if (actualCash < 0) return showToast('Enter valid actual cash count');
          const files = Array.from(byId('codFiles').files || []);
          const fieldPapers = await Promise.all(files.map(toBase64));
          const variance = actualCash - expectedCash;
          if ((variance !== 0 || overdraw > 0) && !note) return showToast('Add note for shortage or excess');
          if (hasCODForDate(st.id, today())) return showToast('Close of Day already submitted for today');
          createRequest('close_of_day', { staffId: st.id, staffName: st.name, date: today(), actualCash, expectedCash, variance, overdraw, note, fieldPapers });
          closeModal();
          render();
          showToast('Close of Day sent for approval');
      }}
    ]);
    byId('codFiles').onchange = () => {
      const files = Array.from(byId('codFiles').files || []);
      byId('codUploads').innerHTML = files.map(f => `<div class="upload-pill">${f.name}</div>`).join('');
    };
  }

  function openAuditModal() {
    openModal('Audit Trail', `<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Actor</th><th>Action</th><th>Details</th></tr></thead><tbody>${state.audit.map(a=>`<tr><td>${fmtDate(a.at)}</td><td>${a.actor}</td><td>${a.action}</td><td>${a.details}</td></tr>`).join('')}</tbody></table></div>`, [{label:'Close', onClick: closeModal}]);
  }

  function staffName(id) { return state.staff.find(s=>s.id===id)?.name || id; }
  function getSelectedCustomer() { return state.customers.find(c => c.id === state.ui.selectedCustomerId) || null; }

  function openCustomerSearchModal(list) {
    openModal('Customer Search', `<div class="table-wrap"><table class="table"><thead><tr><th>Account Number</th><th>Name</th><th>Phone</th><th></th></tr></thead><tbody>${list.map(c=>`<tr><td>${c.accountNumber}</td><td>${c.name}</td><td>${c.phone}</td><td><span class="linklike" data-pick="${c.id}">Select</span></td></tr>`).join('')}</tbody></table></div>`, [{label:'Close', className:'secondary', onClick: closeModal}]);
    qq('[data-pick]').forEach(el => el.onclick = () => {
      state.ui.selectedCustomerId = el.dataset.pick;
      save();
      closeModal();
      applySelectedCustomerToActiveTool();
    });
  }

  function openCameraCapture(onUse) {
    openModal('Capture Photo', `<div class="stack"><video id="camVideo" class="camera-video" autoplay playsinline></video><canvas id="camCanvas" class="hidden"></canvas><div class="note">Allow camera access, position the face, then capture.</div></div>`, [
      {label:'Close', className:'secondary', onClick:()=>{ stopCamera(); closeModal(); }},
      {label:'Capture', onClick:()=>{
        const video = byId('camVideo'); const canvas = byId('camCanvas');
        if (!video || !canvas) return;
        canvas.width = video.videoWidth || 320; canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext('2d'); ctx.drawImage(video,0,0,canvas.width,canvas.height);
        const data = canvas.toDataURL('image/png');
        stopCamera(); closeModal(); if (onUse) onUse(data);
      }}
    ]);
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' }, audio: false }).then(stream => {
      window.__ducesCamStream = stream;
      const vid = byId('camVideo'); if (vid) { vid.srcObject = stream; vid.play().catch(()=>{}); }
    }).catch(() => showToast('Camera access denied or unavailable'));
  }

  function stopCamera() {
    const s = window.__ducesCamStream;
    if (s) { s.getTracks().forEach(t => t.stop()); window.__ducesCamStream = null; }
  }

  async function toBase64(file) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }


  function prettyThemeName(theme) {
    return ({ 'classic':'Classic', 'ducess-sheet':'Ducess Sheet', 'ocean':'Ocean', 'dark-slate':'Dark Slate', 'neutral-stone':'Neutral Stone' })[theme] || theme;
  }

  function applyTheme(theme, persist=true) {
    state.ui.theme = theme || 'classic';
    document.body.setAttribute('data-theme', state.ui.theme === 'classic' ? '' : state.ui.theme);
    if (persist) save();
  }

  function hasFloatDeclaredOrPending(staffId, dateStr) {
    return hasOpeningBalanceForDate(staffId, dateStr) || state.approvals.some(r => r.type === 'float_declaration' && r.status === 'pending' && r.payload.staffId === staffId && r.payload.date === dateStr);
  }

  function hasOpeningBalanceForDate(staffId, dateStr) {
    const acc = ensureStaffAccount(staffId);
    return acc.entries.some(e => e.type === 'approved_float' && e.floatDate === dateStr);
  }

  function getOpeningBalanceForDate(staffId, dateStr) {
    const acc = ensureStaffAccount(staffId);
    return acc.entries.filter(e => e.type === 'approved_float' && e.floatDate === dateStr).reduce((s,e)=>s+Number(e.amount||0),0);
  }

  function staffCODRecords(staffId) {
    return (state.cod || []).filter(c => c.staffId === staffId);
  }

  function hasCODForDate(staffId, dateStr=today()) {
    return (state.cod || []).some(c => c.staffId === staffId && c.date === dateStr) || state.approvals.some(r => r.type === 'close_of_day' && r.status === 'pending' && r.payload.staffId === staffId && r.payload.date === dateStr);
  }

  function openMyBalanceModal() {
    const st = currentStaff();
    const acc = ensureStaffAccount(st.id);
    openModal('My Balance', `
      <div class="stack">
        <div class="kpi-row">
          <div class="kpi"><div class="label">Wallet Balance</div><div class="number">${money(acc.walletBalance||0)}</div></div>
          <div class="kpi"><div class="label">Debt Balance</div><div class="number">${money(acc.debtBalance||0)}</div></div>
          <div class="kpi"><div class="label">Today's Opening Balance</div><div class="number">${money(getOpeningBalanceForDate(st.id, today()))}</div></div>
          <div class="kpi"><div class="label">Remaining Float Today</div><div class="number">${money(acc.balance||0)}</div></div>
        </div>
        <div class="form-grid three">
          <div class="field"><label>Wallet Funding Amount</label><input id="walletFundAmt" class="entry-input" type="number"></div>
          <div class="field"><label>Debt Repayment Amount</label><input id="walletRepayAmt" class="entry-input" type="number"></div>
          <div class="field"><label>Note</label><input id="walletNote" class="entry-input"></div>
        </div>
      </div>
    `,[
      {label:'Close', className:'secondary', onClick: closeModal},
      {label:'Fund Wallet', onClick: ()=> {
        const amt = Number(byId('walletFundAmt').value||0); if(!(amt>0)) return showToast('Enter amount');
        createRequest('wallet_fund',{staffId:st.id,amount:amt,note:byId('walletNote').value.trim()}); closeModal(); render(); showToast('Wallet funding sent for approval');
      }},
      {label:'Pay Debt', onClick: ()=> {
        const amt = Number(byId('walletRepayAmt').value||0); if(!(amt>0)) return showToast('Enter amount');
        if (amt > Number(acc.walletBalance||0)) return showToast('Insufficient wallet balance');
        if (amt > Number(acc.debtBalance||0)) return showToast('Amount exceeds debt');
        createRequest('debt_repayment',{staffId:st.id,amount:amt,note:byId('walletNote').value.trim()}); closeModal(); render(); showToast('Debt repayment sent for approval');
      }}
    ]);
  }

  function openMyCODModal() {
    const rows = staffCODRecords((currentStaff()||{}).id).map(c => `<tr><td>${fmtDate(c.date)}</td><td>${money(c.expectedCash)}</td><td>${money(c.actualCash||0)}</td><td>${money(c.variance||0)}</td><td><small class="${c.status==='flagged' ? 'status-flagged' : 'status-balanced'}">${c.status || 'balanced'}</small></td><td>${c.resolutionNote || c.note || '—'}</td><td>${c.status==='flagged' ? 'Awaiting Administrative Resolution' : '—'}</td></tr>`).join('') || '<tr><td colspan="7">No close of day records</td></tr>';
    openModal('My Close of Day', `<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Expected</th><th>Actual</th><th>Variance</th><th>Status</th><th>Note / Resolution</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`, [{label:'Close', className:'secondary', onClick: closeModal}]);
  }

  function openCODResolutionModal(codId) {
    const cod = state.cod.find(c => c.id === codId);
    if (!cod) return;
    openModal('Resolve Close of Day', `
      <div class="stack">
        <div class="kpi-row">
          <div class="kpi"><div class="label">Expected Cash</div><div class="number">${money(cod.expectedCash)}</div></div>
          <div class="kpi"><div class="label">Actual Cash</div><div class="number">${money(cod.actualCash)}</div></div>
          <div class="kpi"><div class="label">Variance</div><div class="number">${money(cod.variance)}</div></div>
          <div class="kpi"><div class="label">Overdraw</div><div class="number">${money(cod.overdraw||0)}</div></div>
        </div>
        <div class="field"><label>Resolution Note</label><textarea id="codResolutionNote" class="entry-input"></textarea></div>
      </div>
    `,[
      {label:'Close', className:'secondary', onClick: closeModal},
      {label:'Resolve', onClick: ()=> {
        const note = byId('codResolutionNote').value.trim();
        if (!note) return showToast('Resolution note required');
        cod.status = 'resolved';
        cod.resolutionNote = note;
        cod.resolvedBy = currentStaff()?.name || 'System';
        cod.resolvedAt = new Date().toISOString();
        const shortage = Math.max(0, -(Number(cod.variance||0)));
        const overdraw = Number(cod.overdraw||0);
        const debtAmt = shortage + overdraw;
        if (debtAmt > 0) {
          const acc = ensureStaffAccount(cod.staffId);
          acc.debtBalance = Number(acc.debtBalance||0) + debtAmt;
          addStaffEntry(cod.staffId, 'cod_resolution_debt', debtAmt, 0, `COD debt recorded: ${note}`);
        }
        save(); closeModal(); showToast('COD resolved');
      }}
    ]);
  }

  function flattenBusinessEntries() {
    const blocked = new Set((state.cod || []).filter(c => c.status === 'flagged').map(c => `${c.staffId}|${c.date}`));
    const txRows = flattenCustomerTx().filter(t => !blocked.has(`${t.postedById}|${String(t.date).slice(0,10)}`)).map(t => ({
      date: t.date,
      accountNumber: t.customer.accountNumber,
      details: t.details,
      kind: t.type,
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      receivedOrPaidBy: t.receivedOrPaidBy,
      postedBy: t.postedBy || t.postedById || ''
    }));
    const extras = (state.businessExtras || []).map(e => ({...e, accountNumber: e.accountNumber || 'STAFF'}));
    return [...txRows, ...extras].sort((a,b)=>new Date(b.date)-new Date(a.date));
  }

  function renderBalanceFilters(kind) {
    const filter = state.ui[`${kind}Filter`] || { preset:'all', from:'', to:'', type:'all' };
    const presets = [['daily','Daily'],['weekly','Weekly'],['monthly','Monthly'],['all','All']];
    const typeChips = kind === 'operational' ? `<div class="action-inline" style="margin-top:10px"><button class="filter-chip ${filter.type==='all'?'active':'secondary'}" data-op-type="all">All</button><button class="filter-chip ${filter.type==='income'?'active':'secondary'}" data-op-type="income">Income</button><button class="filter-chip ${filter.type==='expense'?'active':'secondary'}" data-op-type="expense">Expense</button></div>` : '';
    return `<div class="form-card"><div class="action-inline">${presets.map(([k,l])=>`<button class="filter-chip ${filter.preset===k?'active':'secondary'}" data-filter-kind="${kind}" data-filter-preset="${k}">${l}</button>`).join('')}<label class="inline-field"><span>From</span><input id="${kind}From" type="date" value="${filter.from||''}"></label><label class="inline-field"><span>To</span><input id="${kind}To" type="date" value="${filter.to||''}"></label><button class="secondary" id="${kind}CustomApply">Apply Custom</button><button class="secondary" id="${kind}ExportCsv">Export CSV</button><button class="secondary" id="${kind}PrintSummary">Print Summary</button></div>${typeChips}</div>`;
  }

  function bindBalanceFilters(kind) {
    qq(`[data-filter-kind="${kind}"]`).forEach(btn => btn.onclick = () => {
      const prev = state.ui[`${kind}Filter`] || {};
      state.ui[`${kind}Filter`] = { preset: btn.dataset.filterPreset, from:'', to:'', type: prev.type || 'all' }; save(); renderWorkspace();
    });
    if (kind === 'operational') qq('[data-op-type]').forEach(btn => btn.onclick = () => {
      state.ui.operationalFilter = { ...(state.ui.operationalFilter || { preset:'all', from:'', to:'', type:'all' }), type: btn.dataset.opType };
      save(); renderWorkspace();
    });
    byId(`${kind}CustomApply`).onclick = () => {
      const prev = state.ui[`${kind}Filter`] || {};
      state.ui[`${kind}Filter`] = { preset:'custom', from:byId(`${kind}From`).value, to:byId(`${kind}To`).value, type: prev.type || 'all' };
      save(); renderWorkspace();
    };
    byId(`${kind}ExportCsv`).onclick = () => {
      const rows = kind === 'business' ? filterByDate(flattenBusinessEntries(), state.ui.businessFilter || { preset: 'daily', from: '', to: '' }) : filterByDate(state.operations.entries || [], state.ui.operationalFilter || { preset: 'all', from: '', to: '', type:'all' });
      const finalRows = kind === 'operational' ? rows.filter(e => (state.ui.operationalFilter?.type || 'all') === 'all' ? true : e.kind === state.ui.operationalFilter.type) : rows;
      exportCsvWithTotals(finalRows, `${kind}_balance.csv`, kind);
    };
    byId(`${kind}PrintSummary`).onclick = () => printBalanceSummary(kind);
  }

  function filterByDate(rows, filter) {
    const now = new Date();
    return rows.filter(r => {
      const d = new Date(r.date);
      const iso = d.toISOString().slice(0,10);
      if (filter.preset === 'daily') return iso === today();
      if (filter.preset === 'weekly') {
        const start = new Date(now); start.setDate(now.getDate()-6); start.setHours(0,0,0,0); return d >= start;
      }
      if (filter.preset === 'monthly') return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth();
      if (filter.preset === 'custom') {
        if (filter.from && iso < filter.from) return false;
        if (filter.to && iso > filter.to) return false;
      }
      return true;
    });
  }

  function exportCsvWithTotals(rows, filename, kind='business') {
    if (!rows.length) return showToast('Nothing to export');
    const cols = Object.keys(rows[0]);
    const header = [cols.join(',')];
    const body = rows.map(r => cols.map(k => JSON.stringify(r[k] ?? '')).join(','));
    const totalAmt = rows.reduce((s,r)=>s+Number(r.amount||0),0);
    const credits = rows.filter(r=>r.kind==='credit' || r.kind==='income').reduce((s,r)=>s+Number(r.amount||0),0);
    const debits = rows.filter(r=>r.kind==='debit' || r.kind==='expense').reduce((s,r)=>s+Number(r.amount||0),0);
    const totals = ['', '', 'TOTALS', kind==='business' ? money(debits) : money(debits), kind==='business' ? money(credits) : money(credits), kind==='business' ? money(credits-debits) : money(credits-debits)];
    const csv = header.concat(body).concat(['']).concat([`"Summary",,"Entries",${rows.length}`]).concat([`"Summary",,"Credits/Income",${credits}`]).concat([`"Summary",,"Debits/Expense",${debits}`]).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    a.download = filename; a.click();
  }

  function printBalanceSummary(kind) {
    const rows = kind === 'business' ? filterByDate(flattenBusinessEntries(), state.ui.businessFilter || { preset:'daily', from:'', to:'' }) : filterByDate(state.operations.entries || [], state.ui.operationalFilter || { preset:'all', from:'', to:'', type:'all' });
    const finalRows = kind === 'operational' ? rows.filter(e => (state.ui.operationalFilter?.type || 'all') === 'all' ? true : e.kind === state.ui.operationalFilter.type) : rows;
    const credits = finalRows.filter(r=>r.kind==='credit' || r.kind==='income').reduce((s,r)=>s+Number(r.amount||0),0);
    const debits = finalRows.filter(r=>r.kind==='debit' || r.kind==='expense').reduce((s,r)=>s+Number(r.amount||0),0);
    const title = kind === 'business' ? 'Business Balance Summary' : 'Operational Balance Summary';
    const filter = state.ui[`${kind}Filter`] || {};
    const range = filter.preset ? filter.preset.toUpperCase() : 'CUSTOM';
    const html = `<div class="print-summary"><h2>${title}</h2><div class="note">Range: ${range}${filter.from ? ` • From ${filter.from}` : ''}${filter.to ? ` • To ${filter.to}` : ''}${kind==='operational' ? ` • Type ${(state.ui.operationalFilter?.type || 'all').toUpperCase()}` : ''}</div><div class="kpi-row"><div class="kpi"><div class="label">Entries</div><div class="number">${finalRows.length}</div></div><div class="kpi"><div class="label">Credits/Income</div><div class="number">${money(credits)}</div></div><div class="kpi"><div class="label">Debits/Expense</div><div class="number">${money(debits)}</div></div><div class="kpi"><div class="label">Net</div><div class="number">${money(credits-debits)}</div></div></div><div class="table-wrap"><table class="table"><thead><tr>${kind==='business' ? '<th>Date</th><th>Account</th><th>Details</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Received/Paid By</th><th>Posted By</th>' : '<th>Date</th><th>Account</th><th>Type</th><th>Amount</th><th>Note</th><th>Posted By</th><th>Approved By</th>'}</tr></thead><tbody>${finalRows.map(r => kind==='business' ? `<tr><td>${fmtDate(r.date)}</td><td>${r.accountNumber||'—'}</td><td>${r.details||'—'}</td><td>${r.kind==='debit'?money(r.amount):''}</td><td>${r.kind==='credit'?money(r.amount):''}</td><td>${money(r.balanceAfter||0)}</td><td>${r.receivedOrPaidBy||'—'}</td><td>${r.postedBy||'—'}</td></tr>` : `<tr><td>${fmtDate(r.date)}</td><td>${r.accountName}</td><td>${r.kind}</td><td>${money(r.amount)}</td><td>${r.note||'—'}</td><td>${r.postedBy||'—'}</td><td>${r.approvedBy||'—'}</td></tr>`).join('') || '<tr><td colspan="8">No entries</td></tr>'}</tbody></table></div></div>`;
    printHtml(html);
  }

  function exportCsv(rows, filename) {
    if (!rows.length) return showToast('Nothing to export');
    const cols = Object.keys(rows[0]);
    const csv = [cols.join(',')].concat(rows.map(r => cols.map(k => JSON.stringify(r[k] ?? '')).join(','))).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    a.download = filename; a.click();
  }

  function printHtml(html) {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Print</title><link rel="stylesheet" href="app.css"></head><body><div class="shell">${html}</div></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  function confirmAction(message, onYes) {
    openModal('Confirm Action', `<div class="note">${message}</div>`, [{label:'Cancel', className:'secondary', onClick: closeModal},{label:'Confirm', onClick:()=>{closeModal(); onYes();}}]);
  }

  function applySelectedCustomerToActiveTool() {
    const c = getSelectedCustomer();
    if (!c) return;
    if (state.ui.tool === 'check_balance') { render(); return; }
    if (state.ui.tool === 'credit' || state.ui.tool === 'debit') {
      if (byId('txAcc')) byId('txAcc').value = c.accountNumber;
      if (byId('txName')) byId('txName').textContent = c.name;
      if (byId('txBalance')) byId('txBalance').textContent = money(c.balance);
      return;
    }
    if (state.ui.tool === 'account_statement') {
      if (byId('stmtAcc')) byId('stmtAcc').value = c.accountNumber;
      return;
    }
  }

  function bindStaffDirectory() {
    const addBtn = byId('addStaffBtn');
    if (addBtn) addBtn.onclick = () => openModal('Add Staff', `
      <div class="form-grid three">
        <div class="field"><label>Name</label><input id="newStaffName" class="entry-input"></div>
        <div class="field"><label>Role</label><select id="newStaffRole" class="entry-input">${Object.keys(ROLE_LABELS).map(k=>`<option value="${k}">${ROLE_LABELS[k]}</option>`).join('')}</select></div>
        <div class="field"><label>Status</label><div class="display-field">Active</div></div>
      </div>
    `,[{label:'Cancel', className:'secondary', onClick: closeModal},{label:'Add Staff', onClick:()=>{ const name=byId('newStaffName').value.trim(); const role=byId('newStaffRole').value; if(!name) return showToast('Enter staff name'); state.staff.push({id:uid('st'), name, role, active:true}); ensureStaffAccount(state.staff[state.staff.length-1].id); save(); closeModal(); render(); showToast('Staff added'); }}]);
    qq('[data-staff-toggle]').forEach(btn => btn.onclick = ()=> {
      const st = state.staff.find(s=>s.id===btn.dataset.staffToggle); if(!st) return; st.active = st.active === false ? true : false; save(); render(); showToast(`Staff ${st.active===false?'deactivated':'reactivated'}`);
    });
  }

  applyTheme(state.ui.theme || 'classic', false);
  render();
})();
