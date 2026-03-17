(() => {
  const STORAGE_KEY = 'duces_enterprise_ledger_v1';
  const DATE_FMT = new Intl.DateTimeFormat('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const THEMES = ['classic','ducess-sheet','ocean','dark-slate','neutral-stone'];
  const THEME_LABELS = { classic:'Classic', 'ducess-sheet':'Ducess Sheet', ocean:'Ocean', 'dark-slate':'Dark Slate', 'neutral-stone':'Neutral Stone' };
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
      tools: ['permissions','staff_directory']
    },
    balances: {
      title: 'Balances',
      desc: 'Review business balance and operational balance with filters and teller summaries.',
      icon: '📊',
      tools: ['business_balance','operational_balance','operational_accounts','teller_balances']
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
    approving_officer: ['check_balance','account_opening','account_maintenance','account_reactivation','account_statement','credit','debit','approval_queue','business_balance','operational_balance'],
    admin_officer: ['check_balance','account_opening','account_maintenance','account_reactivation','account_statement','credit','debit','approval_queue','permissions','operational_accounts','staff_directory','business_balance','operational_balance','teller_balances'],
    report_officer: ['check_balance','account_statement','business_balance','operational_balance','teller_balances']
  };

  const state = load() || seed();
  state.ui = state.ui || { module: 'customer_service', tool: 'check_balance', selectedCustomerId: null, theme: 'classic', businessFilter: { preset: 'all', from: '', to: '' }, operationalFilter: { preset: 'all', from: '', to: '' }, approvalsLimit: 20, businessEntriesLimit: 20, operationalEntriesLimit: 20, tellerEntriesLimit: 20, approvalsSection:'tellering' };
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
      businessDate: today(),
      dayClosures: [],
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
    state.businessDate ||= today();
    state.dayClosures ||= [];
    state.staff.forEach(st => { ensureStaffWalletCustomer(st.id); ensureStaffAccount(st.id); });
    normalizeStaffWalletAccounts();
    syncAllStaffWallets();
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
  function businessDate() { return state.businessDate || today(); }
  function nextDate(iso) { const d=new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+1); return d.toISOString().slice(0,10); }
  function staffById(id){ return state.staff.find(s=>s.id===id) || null; }
  function customerName(id){ return state.customers.find(c=>c.id===id)?.name || ''; }
  function getStaffWalletCustomer(staffId){ const acc=ensureStaffAccount(staffId); return state.customers.find(c=>c.id===acc.linkedCustomerId) || null; }
  function ensureStaffWalletCustomer(staffId, sourceState=state){
    const st=(sourceState.staff||[]).find(x=>x.id===staffId); if(!st) return null;
    sourceState.customers ||= [];
    const existing=sourceState.customers.find(c=>c.staffId===staffId && c.accountType==='staff_wallet');
    if(existing) return existing;
    const idx=sourceState.customers.filter(c=>String(c.accountType||'')==='staff_wallet').length + 1;
    const c={ id: uid('c'), accountNumber: `${4000000 + idx}`, oldAccountNumber:'', name: st.name, address:'', nin:'', bvn:'', phone:'', photo:'', active:true, createdAt:new Date().toISOString(), transactions:[], staffId, accountType:'staff_wallet'};
    sourceState.customers.push(c); return c;
  }
  function syncStaffWallet(staffId){ const acc=ensureStaffAccount(staffId); const c=getStaffWalletCustomer(staffId); if(c){ acc.walletBalance=Number(c.balance||0); } }
  function syncAllStaffWallets(){ Object.keys(state.staffAccounts||{}).forEach(syncStaffWallet); }
  function normalizeStaffWalletAccounts(){
    (state.staff||[]).forEach((st, idx) => {
      const wallet = ensureStaffWalletCustomer(st.id);
      const acctNo = String(4000 + idx);
      if (wallet) wallet.accountNumber = acctNo;
      const acc = ensureStaffAccount(st.id);
      acc.accountNumber = acctNo;
      acc.linkedCustomerId = wallet?.id || acc.linkedCustomerId || null;
    });
  }
  function canCloseBusinessDay(staff=currentStaff()){ return !!staff && ['admin_officer','approving_officer'].includes(staff.role); }

  function ensureStaffAccount(staffId, sourceState=state) {
    sourceState.staffAccounts ||= {};
    const st=(sourceState.staff||[]).find(x=>x.id===staffId);
    if (!sourceState.staffAccounts[staffId]) {
      const wallet = ensureStaffWalletCustomer(staffId, sourceState);
      sourceState.staffAccounts[staffId] = {
        staffId,
        accountNumber: wallet?.accountNumber || `${4000000 + Object.keys(sourceState.staffAccounts).length + 1}`,
        linkedCustomerId: wallet?.id || null,
        entries: [],
        balance: 0,
        walletBalance: wallet?.balance || 0,
        debtBalance: 0
      };
    }
    const acc = sourceState.staffAccounts[staffId];
    if (!acc.linkedCustomerId) acc.linkedCustomerId = ensureStaffWalletCustomer(staffId, sourceState)?.id || null;
    if (typeof acc.walletBalance !== 'number') acc.walletBalance = 0;
    if (typeof acc.debtBalance !== 'number') acc.debtBalance = 0;
    return acc;
  }

  function auditEntry(actor, action, details) {
    return { id: uid('aud'), at: new Date().toISOString(), actorId: currentStaff()?.id || 'system', actor, action, details };
  }

  function pushAudit(action, details) {
    const st = currentStaff();
    state.audit.unshift(auditEntry(st?.name || 'System', action, details));
    save();
  }

  function hasPermission(tool, staff=currentStaff()) {
    if (!staff) return false;
    if (tool === 'check_balance' || tool === 'operational_accounts') return true;
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
  function recalcAllTellerBalances() { Object.keys(state.staffAccounts).forEach(recalcStaffBalance); syncAllStaffWallets(); save(); }

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
        if (!c || isCustomerFrozen(c)) break;
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
        if (!c || isCustomerFrozen(c)) break;
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
      case 'customer_credit_journal': {
        (req.payload.rows || []).forEach(row => applyRequest({
          type:'customer_credit',
          payload:{...row, staffId:req.payload.staffId, date:req.payload.date},
          requestedByName:req.requestedByName,
          requestedBy:req.requestedBy
        }));
        break;
      }
      case 'customer_debit_journal': {
        (req.payload.rows || []).forEach(row => applyRequest({
          type:'customer_debit',
          payload:{...row, staffId:req.payload.staffId, date:req.payload.date},
          requestedByName:req.requestedByName,
          requestedBy:req.requestedBy
        }));
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
          approvedBy: currentStaff()?.name || ''
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
          status: variance === 0 && !(req.payload.overdraw>0) ? 'balanced' : 'flagged',
          approvedAt: new Date().toISOString(),
          approvedBy: currentStaff()?.name || ''
        });
        break;
      }
      case 'wallet_fund': {
        const acc = ensureStaffAccount(req.payload.staffId); const wallet=getStaffWalletCustomer(req.payload.staffId);
        if (wallet) { wallet.transactions.push(txObj('credit', req.payload.amount, req.payload.note || 'Wallet funded', req.requestedByName, req.requestedBy, currentStaff()?.name || '', 'staff_wallet', businessDate())); recalcCustomerBalance(wallet); acc.walletBalance = Number(wallet.balance||0); }
        addStaffEntry(req.payload.staffId, 'wallet_fund', req.payload.amount, 0, req.payload.note || 'Wallet funded');
        break;
      }
      case 'debt_repayment': {
        const acc = ensureStaffAccount(req.payload.staffId); const wallet=getStaffWalletCustomer(req.payload.staffId);
        if (wallet) { wallet.transactions.push(txObj('debit', req.payload.amount, req.payload.note || 'Debt repaid', req.requestedByName, req.requestedBy, currentStaff()?.name || '', 'staff_wallet', businessDate())); recalcCustomerBalance(wallet); acc.walletBalance = Number(wallet.balance||0); }
        acc.debtBalance = Math.max(0, Number(acc.debtBalance||0) - Number(req.payload.amount||0));
        addStaffEntry(req.payload.staffId, 'debt_repayment', req.payload.amount, 0, req.payload.note || 'Debt repaid');
        state.businessExtras ||= []; state.businessExtras.unshift({ date:new Date().toISOString(), accountNumber: acc.accountNumber, details:'Staff debt repayment', kind:'credit', amount:Number(req.payload.amount||0), balanceAfter:0, receivedOrPaidBy: req.requestedByName, postedBy: currentStaff()?.name || req.requestedByName });
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
      balance: customer ? balanceHtml(customer.balance) : '—',
      address: customer?.address || '',
      nin: customer?.nin || '',
      bvn: customer?.bvn || ''
    };
    Object.entries(map).forEach(([k,v]) => {
      const el = q(`[data-fill="${k}"]`, root);
      if (el) { if(k==='balance') el.innerHTML = v || '—'; else el.textContent = v || '—'; }
    });
    const photo = q('[data-fill="photo"]', root);
    if (photo) photo.innerHTML = customer?.photo ? `<img src="${customer.photo}" alt="photo">` : '<span>No Photo</span>';
    const nm = q('[data-fill="name"]', root);
    if (nm && customer && isCustomerFrozen(customer)) nm.innerHTML = `${customer.name} <span class="badge rejected">Frozen</span>`;
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
    byId('btnCOD').onclick = () => canCloseBusinessDay() ? confirmAction(`Close business date ${businessDate()}? This will open ${nextDate(businessDate())}.`, openCODModal) : showToast('Only Approval Officer or Admin can close day');
    byId('btnCOD').disabled = !canCloseBusinessDay();
    byId('btnAudit').onclick = openAuditModal;
    const themeBtn = byId('btnThemeCycle');
    if (themeBtn) {
      themeBtn.textContent = `Theme: ${THEME_LABELS[state.ui.theme || 'classic'] || 'Classic'}`;
      themeBtn.onclick = () => {
        const curr = state.ui.theme || 'classic';
        const idx = THEMES.indexOf(curr);
        const next = THEMES[(idx + 1) % THEMES.length];
        applyTheme(next, true);
        showToast(`Theme: ${THEME_LABELS[next]}`);
      };
    }
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
    const openingToday = getOpeningBalanceForDate(currentStaff()?.id, businessDate());
    const remaining = currentFloatAvailable(currentStaff()?.id, businessDate());
    byId('heroStats').innerHTML = [
      cardMetric('My Balance', money(Number(acc.walletBalance||0)), `Wallet ${money(acc.walletBalance||0)} • Debt -${money(acc.debtBalance||0)} • Business Day ${businessDate()} • Opening ${money(openingToday)}`, 'my-balance'),
      cardMetric('My Close of Day', businessDate(), `View your close-of-day summaries and manager notes`, 'my-cod'),
      cardMetric('Operational Income', money(operationalIncome), `${state.operations.incomeAccounts.length} income accounts`, 'operational-accounts'),
      cardMetric('Operational Expense', money(operationalExpense), `${state.operations.expenseAccounts.length} expense accounts`, 'operational-accounts')
    ].join('');
    qq('[data-hero-card]').forEach(el => el.onclick = () => {
      const act = el.dataset.heroCard;
      if (act === 'my-balance') openMyBalanceModal();
      if (act === 'my-cod') { openMyCODModal(); }
      if (act === 'operational-balance') { state.ui.module = 'balances'; state.ui.tool = 'operational_balance'; save(); render(); setTimeout(()=>byId('workspace')?.scrollIntoView({behavior:'smooth', block:'start'}),80); }
      if (act === 'operational-accounts') { state.ui.module = 'balances'; state.ui.tool = 'operational_accounts'; save(); render(); setTimeout(()=>byId('workspace')?.scrollIntoView({behavior:'smooth', block:'start'}),80); }
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
      <div class="tellering-sheet check-balance-sheet">
        <div class="sheet-title">*Check Balance</div>
        <div class="sheet-grid check-grid">
          <div class="sheet-label">Account Number</div><input id="lookupAcc" class="entry-input sheet-input short-code" />
          <button id="lookupBtn" class="sheet-btn">Search</button><button id="searchPhotoBtn" class="sheet-btn secondary">Photo</button><button id="openStatementBtn" class="sheet-btn secondary">Statement</button>
          <div class="sheet-label">Account Name</div><div class="display-field span-3" data-fill="name">—</div>
          <div class="sheet-label">Phone Number</div><div class="display-field" data-fill="phone">—</div><div class="sheet-spacer"></div><div class="photo-box inline-photo hidden" data-fill="photo"><span>No Photo</span></div>
          <div class="sheet-label">Available Balance</div><div class="display-field" data-fill="balance">—</div><div class="sheet-spacer"></div><div class="sheet-spacer"></div>
        </div>
        <div class="action-row"><button class="secondary" id="searchByNameBtn">Search by Name</button></div>
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
          <div class="field"><label>Photo</label><input id="openPhoto" class="entry-input" type="file" accept="image/*"></div>
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
    const st = currentStaff();
    const opening = getOpeningBalanceForDate(st?.id, businessDate());
    return `
      <div class="tellering-stack">
        <div class="tellering-sheet journal-sheet">
          <div class="sheet-super">TELLERING</div>
          <div class="sheet-title">${title}</div>
          <div class="sheet-grid credit-sheet-grid">
            <div class="sheet-label">Account Number</div><input id="txAcc" class="entry-input sheet-input short-code" />
            <button id="txSearch" class="sheet-btn">Search</button><button id="txJournalAdd" class="sheet-btn secondary">Generate Journal</button>
            <div class="sheet-label">Account Name</div><div class="display-field span-3" id="txName">—</div>
            <div class="sheet-label">Available Balance</div><div class="display-field" id="txBalance">—</div>
            <div class="sheet-label inline-label">Amount</div><input id="txAmount" class="entry-input sheet-input medium-amt" type="number" /><button id="txPostSingle" class="sheet-btn secondary">Post</button>
          </div>
        </div>
        <div class="tellering-lower compact-layout">
          <div class="tellering-left form-card compact-left">
            <div class="form-grid two compact-fields">
              <div class="field"><label>Received or Paid By</label><input id="txCounterparty" class="entry-input"></div>
              ${kind === 'debit' ? `<div class="field"><label>Payout Source</label><select id="txPayoutSource" class="entry-input"><option value="teller">Teller</option><option value="other">Other Source</option></select></div>` : `<div class="field"><label>Business Date</label><div class="display-field">${businessDate()}</div></div>`}
              <div class="field span-two"><label>Details</label><input id="txDetails" class="entry-input"></div>
            </div>
          </div>
          <div class="journal-pane form-card">
            <div class="journal-kpis">
              <div class="kpi small"><div class="label">Opening Balance</div><div class="number">${money(opening)}</div></div>
              <div class="kpi small"><div class="label">Running Float</div><div class="number" id="journalRunningFloat">${money(opening)}</div></div>
              <div class="kpi small"><div class="label">Variance</div><div class="number balance-negative" id="journalVariance">0</div></div>
            </div>
            <h3>Journal Generated</h3>
            <div class="table-wrap"><table class="table journal-table"><thead><tr><th>S/N</th><th>Account Name</th><th>Account Number</th><th>Amount</th><th>Run Float</th><th></th></tr></thead><tbody id="journalRows"></tbody></table></div>
            <div class="action-row"><button id="journalSubmit">Submit Journal</button><button class="secondary" id="journalClear">Clear Journal</button></div>
            <div class="note">Single Post creates an individual approval. Generate Journal adds rows, then Submit Journal sends one ledger approval.</div>
          </div>
        </div>
      </div>`;
  }

  function renderApprovals() {
    state.ui.codAdminDate ||= businessDate();
    const categories = { customer_service: ['account_opening','account_maintenance','account_reactivation'], tellering: ['customer_credit','customer_debit','customer_credit_journal','customer_debit_journal','float_declaration'], others: ['operational_entry','create_operational_account','close_of_day','temp_grant','wallet_fund','debt_repayment'] };
    const currentSection = state.ui.approvalsSection || 'tellering';
    const allRows = state.approvals.filter(a => categories[currentSection].includes(a.type));
    const limit = state.ui.approvalsLimit || 20;
    const approvals = allRows.slice(0, limit);
    const rows = approvals.map((a, i) => `<tr><td>${i+1}</td><td>${prettyApprovalType(a.type)}</td><td>${approvalSubmittedBy(a)}</td><td>${approvalDetails(a)}</td><td>${fmtDate(a.requestedAt)}</td><td><span class="badge ${a.status}">${a.status}</span></td><td>${a.type.includes('_journal') ? `<div class="stack-actions"><button data-inspect-journal="${a.id}" class="secondary">Inspect</button>${a.status === 'pending' ? `<div class="inline-actions"><button data-approve="${a.id}" class="success">Approve</button> <button data-reject="${a.id}" class="danger">Reject</button></div>`:''}</div>`:''}${['account_opening','account_maintenance','account_reactivation'].includes(a.type) ? `<button data-inspect-request="${a.id}" class="secondary">View</button> `:''}${!a.type.includes('_journal') ? (a.status === 'pending' ? `<button data-approve="${a.id}" class="success">Approve</button> <button data-reject="${a.id}" class="danger">Reject</button>` : a.approvedBy || '—') : ''}</td></tr>`).join('');
    const codRows=(state.cod||[]).filter(c=>c.status==='flagged').map((c,i)=>`<tr><td>${i+1}</td><td>${fmtDate(c.date)}</td><td>${c.staffName}</td><td>${money(c.expectedCash||0)}</td><td>${money(c.actualCash||0)}</td><td class="${Number(c.runningFloat||0)<0?'balance-negative':''}">${money(c.runningFloat||0)}</td><td class="${Number(c.variance||0)<0?'balance-negative':''}">${money(c.variance||0)}</td><td class="${Number(c.overdraw||0)>0?'balance-negative':''}">${money(c.overdraw||0)}</td><td>${c.note||'—'}</td><td>${(canCloseBusinessDay())?`<button data-cod-resolve="${c.id}" class="warning">Resolve</button>`:'Awaiting Resolution'}</td></tr>`).join('');
    const selected = state.ui.codAdminDate;
    const codStatusRows = state.staff.filter(s => (DEFAULT_PERMS[s.role]||[]).includes('credit') || (DEFAULT_PERMS[s.role]||[]).includes('debit')).map((s,i)=>{ const rec=(state.cod||[]).find(c=>c.staffId===s.id && c.date===selected); const status=rec?(rec.status==='resolved'?'Resolved':rec.status==='flagged'?'Flagged':'Submitted'):'Missing'; return `<tr><td>${i+1}</td><td>${s.name}</td><td>${ROLE_LABELS[s.role]||s.role}</td><td>${status}</td><td>${rec?money(rec.expectedCash||0):'—'}</td><td>${rec?money(rec.actualCash||0):'—'}</td></tr>`; }).join('');
    const moreLess = `<div class="action-row">${allRows.length > limit ? `<button id="approvalsMore" class="secondary">Show More</button>`:''}${limit > 20 ? `<button id="approvalsLess" class="secondary">Show Less</button>`:''}</div>`;
    return `<div class="stack">${codRows?`<div class="table-card"><h3>COD Resolution Queue</h3><div class="table-wrap"><table class="table"><thead><tr><th>S/N</th><th>Date</th><th>Staff</th><th>Expected Cash</th><th>Actual Cash</th><th>Running Float</th><th>Variance</th><th>Overdraw</th><th>Note</th><th>Action</th></tr></thead><tbody>${codRows}</tbody></table></div></div>`:''}<div class="tool-tabs approvals-sections">${[['customer_service','Customer Service'],['tellering','Tellering'],['others','Others']].map(([k,l])=>`<button class="tool-tab ${currentSection===k?'active':''}" data-approval-section="${k}">${l}</button>`).join('')}</div><div class="table-card"><h3>Approval Queue</h3><div class="table-wrap"><table class="table"><thead><tr><th>S/N</th><th>Request</th><th>Submitted By</th><th>Details</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="muted">No requests yet</td></tr>'}</tbody></table></div>${moreLess}</div>${canCloseBusinessDay()?`<div class="table-card"><h3>COD Daily Submission Status</h3><div class="action-inline"><div class="inline-field compact"><span>COD Date</span><input type="date" id="codAdminDate" value="${selected}"></div></div><div class="table-wrap"><table class="table"><thead><tr><th>S/N</th><th>Staff</th><th>Office</th><th>Status</th><th>Expected Cash</th><th>Actual Cash</th></tr></thead><tbody>${codStatusRows}</tbody></table></div></div>`:''}</div>`;
  }

  function approvalSubmittedBy(a) {
    const p = a.payload || {};
    const staffId = p.staffId || a.requestedBy;
    const staff = (state.staff || []).find(s => s.id === staffId) || {};
    const roleLabel = ROLE_LABELS[staff.role] || staff.role || '';
    const name = a.requestedByName || staffName(staffId);
    if (a.type === 'customer_credit_journal' || a.type === 'customer_debit_journal') return `${name} • ${roleLabel || 'Staff'} • Journal`;
    return `${name} • ${roleLabel || 'Staff'}`;
  }
  function approvalDetails(a) {
    const p = a.payload || {};
    if (a.type === 'customer_credit') return `${money(p.amount)} to ${customerName(p.customerId) || p.accountNumber}${p.details ? ' • ' + p.details : ''}`;
    if (a.type === 'customer_debit') return `${money(p.amount)} from ${customerName(p.customerId) || p.accountNumber}${p.details ? ' • ' + p.details : ''}`;
    if (a.type === 'customer_credit_journal' || a.type === 'customer_debit_journal') { const rows = p.rows || []; const total = rows.reduce((s,r)=>s+Number(r.amount||0),0); return `${rows.length} item${rows.length===1?'':'s'} • Total ${money(total)}`; }
    if (a.type === 'wallet_fund') return `${staffName(p.staffId)} • Wallet fund • ${money(p.amount)}`;
    if (a.type === 'debt_repayment') return `${staffName(p.staffId)} • Debt repayment • ${money(p.amount)}`;
    return requestSummary(a);
  }

  function prettyApprovalType(type) {
    return {
      account_opening:'Account Opening', account_maintenance:'Account Maintenance', account_reactivation:'Account Reactivation',
      customer_credit:'Credit', customer_debit:'Debit', customer_credit_journal:'Credit Journal', customer_debit_journal:'Debit Journal', float_declaration:'Opening Float', operational_entry:'Operational Entry',
      create_operational_account:'Operational Account', close_of_day:'Close of Day', temp_grant:'Temporary Grant'
    }[type] || type;
  }

  function requestSummary(a) {
    const p = a.payload || {};
    if (a.type === 'float_declaration') return `${money(p.amount)} for ${p.date}`;
    if (a.type === 'customer_credit' || a.type === 'customer_debit') return `${p.accountNumber} • ${money(p.amount)}`;
    if (a.type === 'account_opening') return `${p.name} • Phone ${p.phone || '—'} • NIN ${p.nin || '—'} • BVN ${p.bvn || '—'} • ${p.generatedAccountNumber}`;
    if (a.type === 'account_maintenance') return `${p.accountNumber} • update`; 
    if (a.type === 'account_reactivation') return `${p.accountNumber} • reactivate`; 
    if (a.type === 'operational_entry') return `${p.accountName} • ${money(p.amount)}`;
    if (a.type === 'create_operational_account') return `${p.category} • ${p.name}`;
    if (a.type === 'close_of_day') return `${p.staffName} • ${p.date} • Actual ${money(p.actualCash)} • Expected Cash ${money(p.expectedCash)}`;
    if (a.type === 'temp_grant') return `${staffName(p.staffId)} • ${TOOL_LABELS[p.tool]} = ${p.enabled ? 'ON' : 'OFF'}`;
    if (a.type === 'wallet_fund') return `${staffName(p.staffId)} • Wallet fund • ${money(p.amount)}`;
    if (a.type === 'debt_repayment') return `${staffName(p.staffId)} • Debt repayment • ${money(p.amount)}`;
    return '—';
  }

  function openJournalApprovalModal(reqId){
    const req = state.approvals.find(r=>r.id===reqId); if(!req) return;
    const rows = req.payload?.rows || [];
    const total = rows.reduce((s,r)=>s+Number(r.amount||0),0);
    const opening = getOpeningBalanceForDate(req.payload?.staffId, req.payload?.date);
    let running = opening;
    const bodyRows = rows.map((r,i)=>{ running -= Number(r.amount||0); return `<tr><td>${i+1}</td><td>${r.customerName}</td><td>${r.accountNumber}</td><td>${money(r.amount)}</td><td class="${running<0?'balance-negative':''}">${money(running)}</td></tr>`; }).join('');
    const actions = [{label:'Close', className:'secondary', onClick: closeModal}];
    if (req.status === 'pending') {
      actions.unshift({label:'Reject Journal', className:'danger', onClick: ()=>{ rejectRequest(req.id); closeModal(); }});
      actions.unshift({label:'Approve Journal', className:'success', onClick: ()=>{ approveRequest(req.id); closeModal(); }});
    }
    openModal('Journal Approval', `<div class="stack"><div class="kpi-row"><div class="kpi"><div class="label">Posted By</div><div class="number">${req.requestedByName}</div></div><div class="kpi"><div class="label">Opening Balance</div><div class="number">${money(opening)}</div></div><div class="kpi"><div class="label">Total</div><div class="number">${money(total)}</div></div><div class="kpi"><div class="label">Overdraw</div><div class="number ${running<0?'balance-negative':''}">${money(Math.max(0,-running))}</div></div></div><div class="table-wrap"><table class="table"><thead><tr><th>S/N</th><th>Customer</th><th>Account</th><th>Amount</th><th>Run Float</th></tr></thead><tbody>${bodyRows}</tbody></table></div></div>`, actions);
  }

  function openRequestDetailModal(reqId){
    const req = state.approvals.find(r=>r.id===reqId); if(!req) return; const p=req.payload||{};
    const html = req.type==='account_opening' ? `<div class="form-grid two"><div class="field"><label>Name</label><div class="display-field">${p.name||'—'}</div></div><div class="field"><label>Phone</label><div class="display-field">${p.phone||'—'}</div></div><div class="field"><label>Address</label><div class="display-field">${p.address||'—'}</div></div><div class="field"><label>NIN</label><div class="display-field">${p.nin||'—'}</div></div><div class="field"><label>BVN</label><div class="display-field">${p.bvn||'—'}</div></div><div class="field"><label>Generated Account</label><div class="display-field">${p.generatedAccountNumber||'—'}</div></div></div>` : `<pre>${JSON.stringify(p,null,2)}</pre>`;
    openModal(prettyApprovalType(req.type), html, [{label:'Close', className:'secondary', onClick: closeModal}]);
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
          ${currentStaff()?.role === 'admin_officer' ? `<div class="form-card">
            <h3>Create Account</h3>
            <div class="form-grid three">
              <div class="field"><label>Category</label><select id="oaCategory" class="entry-input"><option value="income">Income</option><option value="expense">Expense</option></select></div>
              <div class="field"><label>Account Name</label><input id="oaName" class="entry-input"></div>
              <div class="field"><label>Account Number</label><div class="display-field" id="oaNumberPreview">INC-2001</div></div>
            </div>
            <div class="action-row"><button id="oaCreate">Submit for Approval</button></div>
          </div>` : ''}
          <div class="form-card">
            <h3>Post into Account</h3>
            <div class="form-grid three">
              <div class="field"><label>Account</label><select id="oeAccount" class="entry-input">${allAccts.map(a=>`<option value="${a.id}">${a.accountNumber} — ${a.name}</option>`).join('')}</select></div>
              <div class="field"><label>Amount</label><input id="oeAmount" class="entry-input" type="number"></div>
              <div class="field"><label>Date</label><input id="oeDate" class="entry-input" type="date" value="${businessDate()}"></div>
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
          return `<tr><td>${i+1}</td><td>${s.name}</td><td>${ROLE_LABELS[s.role] || s.role}</td><td>${s.active === false ? 'Inactive' : 'Active'}</td><td>${acc.accountNumber}</td><td>${money(acc.walletBalance)}</td><td class="${Number(acc.debtBalance||0)>0?'balance-negative':''}">-${money(acc.debtBalance)}</td><td>${money(acc.balance)}</td><td><button class="secondary" data-staff-toggle="${s.id}">${s.active === false ? 'Reactivate' : 'Deactivate'}</button></td></tr>`;
        }).join('')}</tbody></table></div>
      </div>`;
  }

  function renderBusinessBalance() {
    const rawBusiness = filterByDate(flattenBusinessEntries(), state.ui.businessFilter || { preset: 'all', from: '', to: '' });
    const typeFilter = state.ui.businessType || 'all';
    const filtered = rawBusiness.filter(t => typeFilter==='all' ? true : t.kind===typeFilter);
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
        <div class="table-card"><h3>Business Entries</h3><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Account</th><th>Details</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Received/Paid By</th><th>Posted By</th></tr></thead><tbody>${filtered.slice(0,state.ui.businessEntriesLimit || 20).map(t=>`<tr><td>${fmtDate(t.date)}</td><td>${t.accountNumber || '—'}</td><td>${t.details}</td><td>${t.kind==='debit'?money(t.amount):''}</td><td>${t.kind==='credit'?money(t.amount):''}</td><td>${money(t.balanceAfter || 0)}</td><td>${t.receivedOrPaidBy || '—'}</td><td>${t.postedBy || '—'}</td></tr>`).join('') || '<tr><td colspan="8">No entries</td></tr>'}</tbody></table></div><div class="action-row">${filtered.length > (state.ui.businessEntriesLimit || 20) ? `<button id="businessMore" class="secondary">Show More</button>` : ''}${(state.ui.businessEntriesLimit || 20) > 20 ? `<button id="businessLess" class="secondary">Show Less</button>` : ''}</div></div>
      </div>`;
  }

  function renderOperationalBalance() {
    const rawOperational = filterByDate(state.operations.entries || [], state.ui.operationalFilter || { preset: 'all', from: '', to: '' });
    const kindFilter = state.ui.operationalType || 'all';
    const filtered = rawOperational.filter(e => kindFilter==='all' ? true : e.kind===kindFilter);
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
        <div class="table-card"><h3>Operational Entries</h3><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Account</th><th>Type</th><th>Amount</th><th>Note</th><th>Posted By</th><th>Approved By</th></tr></thead><tbody>${filtered.slice(0,state.ui.operationalEntriesLimit || 20).map(e=>`<tr><td>${fmtDate(e.date)}</td><td>${e.accountName}</td><td>${e.kind}</td><td>${money(e.amount)}</td><td>${e.note||'—'}</td><td>${e.postedBy}</td><td>${e.approvedBy}</td></tr>`).join('') || '<tr><td colspan="7">No entries</td></tr>'}</tbody></table></div><div class="action-row">${filtered.length > (state.ui.operationalEntriesLimit || 20) ? `<button id="operationalMore" class="secondary">Show More</button>` : ''}${(state.ui.operationalEntriesLimit || 20) > 20 ? `<button id="operationalLess" class="secondary">Show Less</button>` : ''}</div></div>
      </div>`;
  }

  function renderTellerBalances() {
    const rows = state.staff.slice(0, state.ui.tellerEntriesLimit || 20).map(s=>{
      const acc = ensureStaffAccount(s.id);
      const floatToday = acc.entries.filter(e=>e.type==='approved_float' && e.floatDate===today()).reduce((sum,e)=>sum+Number(e.amount||0),0);
      const recent = [...acc.entries].slice(-1)[0];
      return `<tr><td>${s.name}</td><td>${ROLE_LABELS[s.role] || s.role}</td><td>${acc.accountNumber}</td><td>${money(acc.balance)}</td><td>${money(floatToday)}</td><td>${recent ? `${recent.type} • ${money(recent.amount)}` : '—'}</td></tr>`;
    }).join('');
    return `<div class="table-card"><h3>Teller and Posting Accounts</h3><div class="table-wrap"><table class="table"><thead><tr><th>Staff</th><th>Office</th><th>Account Number</th><th>Balance</th><th>Today Approved Float</th><th>Recent Activity</th></tr></thead><tbody>${rows}</tbody></table></div><div class="action-row">${state.staff.length > (state.ui.tellerEntriesLimit || 20) ? `<button id="tellerMore" class="secondary">Show More</button>` : ''}${(state.ui.tellerEntriesLimit || 20) > 20 ? `<button id="tellerLess" class="secondary">Show Less</button>` : ''}</div></div>`;
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
    const doLookup = (quiet=false) => {
      const val = (byId('lookupAcc')?.value || "").trim();
      if (!val) return lookupFill(byId('workspace'), null);
      const c = getCustomerByAccountNo(val);
      if (!c) { if (!quiet) showToast('Customer not found. Use name search.'); return; }
      state.ui.selectedCustomerId = c.id;
      save();
      lookupFill(byId('workspace'), c);
    };
    byId('lookupBtn').onclick = () => doLookup(false);
    byId('lookupAcc').onchange = () => doLookup(true);
    byId('lookupAcc').onkeyup = (e) => { if (e.key === "Enter") doLookup(false); };
    byId('openStatementBtn').onclick = () => { state.ui.tool = 'account_statement'; renderWorkspace(); setTimeout(()=>{ byId('stmtAcc').value = getSelectedCustomer()?.accountNumber || ''; }, 30); };
    const photoBtn = byId('searchPhotoBtn'); if (photoBtn) photoBtn.onclick = ()=> { const pb = q('[data-fill="photo"]', byId('workspace')); if(pb) pb.classList.toggle('hidden'); };
    byId('searchByNameBtn').onclick = () => openCustomerSearchModal(state.customers);
    const selected = getSelectedCustomer();
    if (selected && state.ui.selectedCustomerId) lookupFill(byId('workspace'), selected); else lookupFill(byId('workspace'), null);
  }

  function bindAccountOpening() {
    byId('openPhoto').onchange = async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      byId('openPhoto').dataset.base64 = await toBase64(f);
    };
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
      if (prefix==='reactivation' && !isCustomerFrozen(c)) return showToast('Account is not frozen');
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
      byId(`${prefix}DisplayStatus`).textContent = isCustomerFrozen(c) ? 'Frozen' : (c.active ? 'Active' : 'Inactive');
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

  function hasApprovedFloat(staffId, date=businessDate()) {
    const acc = ensureStaffAccount(staffId);
    return acc.entries.some(e => e.type === 'approved_float' && e.floatDate === date);
  }


  function bindJournal(kind) {
    const staff = currentStaff();
    state.ui.staffJournals ||= {};
    const key = `${staff.id}:${businessDate()}:${kind}`;
    const journal = state.ui.staffJournals[key] ||= [];
    const resetFields = () => { ['txAcc','txAmount','txDetails','txCounterparty'].forEach(id=>{ if(byId(id)) byId(id).value=''; }); if (byId('txName')) byId('txName').textContent='—'; if (byId('txBalance')) byId('txBalance').innerHTML='—'; state.ui.selectedCustomerId=null; };
    const recalcPreview = () => { const approvedBase = currentFloatAvailable(staff.id, businessDate()); const totalPending = pendingJournalTotal(staff.id, businessDate()); const thisJournalTotal = journal.reduce((s,r)=>s+Number(r.amount||0),0); let running = approvedBase - (totalPending - thisJournalTotal); const rows = journal.map((row, i) => { running -= Number(row.amount||0); return `<tr><td>${i+1}</td><td>${row.customerName}</td><td>${row.accountNumber}</td><td>${money(row.amount)}</td><td class="${running<0?'balance-negative':''}">${money(running)}</td><td><span class="linklike" data-remove-row="${row.id}">Remove</span></td></tr>`; }).join('') || '<tr><td colspan="6">No journal entries yet</td></tr>'; byId('journalRows').innerHTML = rows; const rf=byId('journalRunningFloat'); if(rf) rf.textContent = money(Math.max(0,running)); const vr=byId('journalVariance'); if(vr) vr.textContent = money(Math.max(0,-running)); qq('[data-remove-row]').forEach(el => el.onclick = () => { const idx = journal.findIndex(r => r.id === el.dataset.removeRow); if (idx >= 0) { journal.splice(idx,1); save(); recalcPreview(); } }); };
    const search = () => { const c = getCustomerByAccountNo(byId('txAcc').value); if (!c) return showToast('Customer not found'); if (isCustomerFrozen(c)) return showToast('Account is frozen'); state.ui.selectedCustomerId = c.id; save(); byId('txName').textContent = c.name; byId('txBalance').innerHTML = balanceHtml(c.balance); };
    byId('txSearch').onclick = search; if (byId('txAcc')) { byId('txAcc').onchange = search; byId('txAcc').onkeyup = e => { if(e.key==='Enter') search(); }; }
    byId('txJournalAdd').onclick = () => { const customer = getSelectedCustomer() || getCustomerByAccountNo(byId('txAcc').value); if (!customer) return showToast('Search for customer first'); if (isCustomerFrozen(customer)) return showToast('Frozen account cannot accept transactions'); const amount = Number(byId('txAmount').value || 0); if (!(amount > 0)) return showToast('Enter a valid amount'); journal.push({ id: uid('jr'), customerId: customer.id, customerName: customer.name, accountNumber: customer.accountNumber, amount, details: byId('txDetails').value.trim(), receivedOrPaidBy: byId('txCounterparty').value.trim(), payoutSource: byId('txPayoutSource')?.value || 'teller', date: businessDate() }); save(); recalcPreview(); resetFields(); };
    byId('journalClear').onclick = () => { journal.splice(0); save(); recalcPreview(); resetFields(); };
    byId('txPostSingle').onclick = () => { if (!hasPermission(kind)) return showToast('No access to post'); if (!hasApprovedFloat(staff.id, businessDate())) return showToast('Approved opening balance required before posting'); const customer = getSelectedCustomer() || getCustomerByAccountNo(byId('txAcc').value); if (!customer) return showToast('Search for customer first'); if (isCustomerFrozen(customer)) return showToast('Frozen account cannot accept transactions'); const amount = Number(byId('txAmount').value || 0); if (!(amount > 0)) return showToast('Enter a valid amount'); confirmAction(`Submit single ${kind} request for approval?`, () => { createRequest(kind === 'credit' ? 'customer_credit' : 'customer_debit', { customerId: customer.id, customerName: customer.name, accountNumber: customer.accountNumber, amount, details: byId('txDetails').value.trim(), receivedOrPaidBy: byId('txCounterparty').value.trim(), payoutSource: byId('txPayoutSource')?.value || 'teller', staffId: staff.id, date: businessDate() }); resetFields(); showToast(`${kind === 'credit' ? 'Credit' : 'Debit'} request sent for approval`); render(); }); };
    byId('journalSubmit').onclick = () => { if (!hasPermission(kind)) return showToast('No access to post'); if (!hasApprovedFloat(staff.id, businessDate())) return showToast('Approved opening balance required before posting'); if (!journal.length) return showToast('Generate journal first'); confirmAction(`Submit ${kind} journal for approval?`, () => { createRequest(kind === 'credit' ? 'customer_credit_journal' : 'customer_debit_journal', { staffId: staff.id, date: businessDate(), openingFloat: getOpeningBalanceForDate(staff.id, businessDate()), rows: journal.map(row => ({ customerId: row.customerId, customerName: row.customerName, accountNumber: row.accountNumber, amount: row.amount, details: row.details, receivedOrPaidBy: row.receivedOrPaidBy, payoutSource: row.payoutSource })) }); journal.splice(0); save(); recalcPreview(); resetFields(); showToast(`${kind === 'credit' ? 'Credit' : 'Debit'} journal sent for approval`); render(); }); };
    recalcPreview();
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
    qq('[data-cod-resolve]').forEach(btn => btn.onclick = () => openCODResolutionModal(btn.dataset.codResolve));
    const more = byId('approvalsMore');
    if (more) more.onclick = () => { state.ui.approvalsLimit = (state.ui.approvalsLimit || 20) + 20; save(); renderWorkspace(); };
    const less = byId('approvalsLess');
    if (less) less.onclick = () => { state.ui.approvalsLimit = Math.max(20, (state.ui.approvalsLimit || 20) - 20); save(); renderWorkspace(); };
    const codDate = byId('codAdminDate');
    if (codDate) codDate.onchange = () => { state.ui.codAdminDate = codDate.value || businessDate(); save(); renderWorkspace(); };
    qq('[data-approval-section]').forEach(btn => btn.onclick = ()=>{ state.ui.approvalsSection = btn.dataset.approvalSection; save(); renderWorkspace(); });
    qq('[data-inspect-journal]').forEach(btn => btn.onclick = ()=> openJournalApprovalModal(btn.dataset.inspectJournal));
    qq('[data-inspect-request]').forEach(btn => btn.onclick = ()=> openRequestDetailModal(btn.dataset.inspectRequest));
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
    if (byId('oaCategory')) { updatePreview(); byId('oaCategory').onchange = updatePreview; }
    if (byId('oaCreate')) byId('oaCreate').onclick = () => {
      if (currentStaff()?.role !== 'admin_officer') return showToast('Only admin can create operational accounts');
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
    if (hasFloatDeclaredOrPending(st.id, businessDate())) return showToast('Opening Balance already declared for today');
    openModal('Opening Balance', `
      <div class="form-grid three">
        <div class="field"><label>Staff</label><div class="display-field">${st.name}</div></div>
        <div class="field"><label>Date</label><div class="display-field">${businessDate()}</div></div>
        <div class="field"><label>Amount</label><input id="floatAmount" class="entry-input" type="number"></div>
      </div>
      <div class="note">Posting cannot begin until this float is approved.</div>
    `, [
      { label: 'Cancel', className: 'secondary', onClick: closeModal },
      { label: 'Submit', onClick: () => {
          const amount = Number(byId('floatAmount').value || 0);
          if (!(amount > 0)) return showToast('Enter valid float');
          if (hasFloatDeclaredOrPending(st.id, businessDate())) return showToast('Opening Balance already declared for today');
          createRequest('float_declaration', { staffId: st.id, amount, date: businessDate() });
          closeModal();
          render();
          showToast('Float declaration sent for approval');
      }}
    ]);
  }

  function openCODModal() {
    if (!canCloseBusinessDay()) return showToast('Only Approval Officer or Admin can close day');
    const postingStaff = state.staff.filter(st => hasPermission('credit', st) || hasPermission('debit', st));
    const rows = postingStaff.map(st => { const opening=getOpeningBalanceForDate(st.id,businessDate()); const credits=approvedCreditTotalForDate(st.id,businessDate()); const debits=approvedDebitTotalForDate(st.id,businessDate()); const running=currentFloatAvailable(st.id,businessDate()); const expected=Math.max(0, running); const overdraw=currentFloatOverdraw(st.id,businessDate()); return `<tr><td>${st.name}</td><td>${money(opening)}</td><td>${money(credits)}</td><td>${money(debits)}</td><td class="${running<0?'balance-negative':''}">${money(running)}</td><td>${money(expected)}</td><td class="${overdraw>0?'balance-negative':''}">${money(overdraw)}</td><td><input class="entry-input" data-cod-actual="${st.id}" type="number" placeholder="Enter actual cash"></td><td><input class="entry-input" data-cod-note="${st.id}"></td></tr>`; }).join('');
    openModal('Central Close of Day', `<div class="stack"><div class="note">You are closing business date <strong>${businessDate()}</strong>. Closing opens the next business date immediately.</div><div class="note">Expected Cash is the cash that should physically remain after postings. Running Float shows the ledger position. Overdraw means postings exceeded the opening balance.</div><div class="table-wrap"><table class="table"><thead><tr><th>Staff</th><th>Opening</th><th>Total Credits</th><th>Total Debits</th><th>Running Float</th><th>Expected Cash</th><th>Overdraw</th><th>Actual Cash</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table></div></div>`, [{label:'Cancel', className:'secondary', onClick: closeModal}, {label:'Close Business Day', onClick: ()=> { postingStaff.forEach(st => { const running=currentFloatAvailable(st.id,businessDate()); const expected=Math.max(0,running); const actual=Number(q(`[data-cod-actual="${st.id}"]`)?.value||0); const note=q(`[data-cod-note="${st.id}"]`)?.value?.trim()||''; const variance=actual-expected; state.cod.unshift({id:uid('cod'), staffId:st.id, staffName:st.name, date:businessDate(), actualCash:actual, expectedCash:expected, runningFloat:running, variance, overdraw:Math.max(0,-running), note, fieldPapers:[], status: variance===0 && Math.max(0,-running)===0 ? 'balanced':'flagged', approvedAt:new Date().toISOString(), approvedBy:currentStaff()?.name||''}); }); state.dayClosures.push({date:businessDate(), closedAt:new Date().toISOString(), closedBy:currentStaff()?.name||''}); state.businessDate = nextDate(businessDate()); save(); closeModal(); render(); showToast(`Business day closed. New open date: ${state.businessDate}`); }}]);
  }

  function openAuditModal() {
    const st = currentStaff();
    const rows = state.audit.filter(a => st?.role === 'admin_officer' || a.actorId === st?.id || a.actor === st?.name).map(a=>`<tr><td>${fmtDate(a.at)}</td><td>${a.actor}</td><td>${a.action}</td><td>${a.details}</td></tr>`).join('');
    openModal('Audit Trail', `<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Actor</th><th>Action</th><th>Details</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No audit records</td></tr>'}</tbody></table></div>`, [{label:'Close', onClick: closeModal}]);
  }

  function staffName(id) { return state.staff.find(s=>s.id===id)?.name || id; }
  function customerName(id) { return state.customers.find(c=>c.id===id)?.name || ''; }
  function getSelectedCustomer() { return state.customers.find(c => c.id === state.ui.selectedCustomerId) || null; }
  function balanceHtml(n){ return `<span class="${Number(n)<0 ? 'balance-negative' : ''}">${money(n)}</span>`; }
  function isCustomerFrozen(c){ if(!c) return false; if(c.frozen) return true; const last=(c.transactions||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date))[0]; if(!last) return false; const days=(Date.now()-new Date(last.date).getTime())/86400000; return days>=90; }

  function openCustomerSearchModal(list) {
    const renderRows = arr => arr.map(c=>`<tr><td>${c.accountNumber}</td><td>${c.name}</td><td>${c.phone}</td><td><span class="linklike" data-pick="${c.id}">Select</span></td></tr>`).join('');
    openModal('Customer Search', `<div class="stack"><input id="modalCustomerSearch" class="entry-input" placeholder="Search customer by name or account number"><div class="table-wrap"><table class="table"><thead><tr><th>Account Number</th><th>Name</th><th>Phone</th><th></th></tr></thead><tbody id="modalCustomerRows">${renderRows(list)}</tbody></table></div></div>`, [{label:'Close', className:'secondary', onClick: closeModal}]);
    const bindPicks = () => qq('[data-pick]').forEach(el => el.onclick = () => { state.ui.selectedCustomerId = el.dataset.pick; save(); closeModal(); applySelectedCustomerToActiveTool(); });
    bindPicks();
    const search = byId('modalCustomerSearch');
    if (search) search.oninput = () => {
      const qv = search.value.trim().toLowerCase();
      const filtered = !qv ? list : list.filter(c => String(c.accountNumber).includes(qv) || c.name.toLowerCase().includes(qv));
      byId('modalCustomerRows').innerHTML = renderRows(filtered); bindPicks();
    };
  }

  async function toBase64(file) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }


  function applyTheme(theme, persist=true) {
    state.ui.theme = theme || 'classic';
    document.body.setAttribute('data-theme', state.ui.theme === 'classic' ? '' : state.ui.theme);
    const b = byId('btnThemeCycle'); if (b) b.textContent = `Theme: ${THEME_LABELS[state.ui.theme] || 'Classic'}`;
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

  function approvedCreditTotalForDate(staffId, dateStr) {
    return (state.approvals||[]).filter(r => ['customer_credit','customer_credit_journal'].includes(r.type) && r.status === 'approved' && r.payload?.staffId === staffId && r.payload?.date === dateStr).reduce((s,r)=> s + (r.type==='customer_credit_journal' ? (r.payload.rows||[]).reduce((a,x)=>a+Number(x.amount||0),0) : Number(r.payload?.amount||0)), 0);
  }

  function approvedDebitTotalForDate(staffId, dateStr) {
    return (state.approvals||[]).filter(r => ['customer_debit','customer_debit_journal'].includes(r.type) && r.status === 'approved' && r.payload?.staffId === staffId && r.payload?.date === dateStr).reduce((s,r)=> s + (r.type==='customer_debit_journal' ? (r.payload.rows||[]).reduce((a,x)=>a+Number(x.amount||0),0) : Number(r.payload?.amount||0)), 0);
  }

  function currentFloatAvailable(staffId, date=businessDate()) {
    const opening = getOpeningBalanceForDate(staffId, date);
    const used = approvedCreditTotalForDate(staffId, date);
    const restored = approvedDebitTotalForDate(staffId, date);
    return opening - used - restored;
  }

  function currentFloatOverdraw(staffId, date=businessDate()) {
    return Math.max(0, -currentFloatAvailable(staffId, date));
  }

  function pendingJournalTotal(staffId, date=businessDate()) {
    const journals = state.ui?.staffJournals || {};
    const creditKey = `${staffId}:${date}:credit`;
    const debitKey = `${staffId}:${date}:debit`;
    const total = (arr => (arr||[]).reduce((s,r)=>s+Number(r.amount||0),0));
    return total(journals[creditKey]) + total(journals[debitKey]);
  }

  function staffCODRecords(staffId) {
    return (state.cod || []).filter(c => c.staffId === staffId);
  }

  function openMyBalanceModal() {
    const st = currentStaff();
    const acc = ensureStaffAccount(st.id);
    openModal('My Balance', `
      <div class="stack">
        <div class="kpi-row">
          <div class="kpi"><div class="label">Wallet Balance</div><div class="number">${money(acc.walletBalance||0)}</div></div>
          <div class="kpi"><div class="label">Debt Balance</div><div class="number ${Number(acc.debtBalance||0)>0 ? 'balance-negative' : ''}">-${money(acc.debtBalance||0)}</div></div>
          <div class="kpi"><div class="label">Opening Balance</div><div class="number">${money(getOpeningBalanceForDate(st.id, businessDate()))}</div></div>
          <div class="kpi"><div class="label">Remaining Float Today</div><div class="number">${money(currentFloatAvailable(st.id, businessDate()))}</div></div>
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

  function openMyCODModal(selectedDate=null) {
    state.ui.myCodDate = selectedDate || state.ui.myCodDate || businessDate();
    const st = currentStaff();
    const c = staffCODRecords((st||{}).id).find(x => x.date === state.ui.myCodDate);
    const summary = c ? `
      <div class="kpi-row">
        <div class="kpi"><div class="label">Opening Balance</div><div class="number">${money(getOpeningBalanceForDate(c.staffId, c.date))}</div></div>
        <div class="kpi"><div class="label">Credits</div><div class="number">${money(approvedCreditTotalForDate(c.staffId,c.date))}</div></div>
        <div class="kpi"><div class="label">Debits</div><div class="number">${money(approvedDebitTotalForDate(c.staffId,c.date))}</div></div>
        <div class="kpi"><div class="label">Expected Cash</div><div class="number">${money(c.expectedCash)}</div></div>
        <div class="kpi"><div class="label">Actual Cash</div><div class="number">${money(c.actualCash||0)}</div></div>
        <div class="kpi"><div class="label">Running Float</div><div class="number ${Number(c.runningFloat||0)<0?'balance-negative':''}">${money(c.runningFloat||0)}</div></div><div class="kpi"><div class="label">Variance</div><div class="number ${Number(c.variance||0)<0?'balance-negative':''}">${money(c.variance||0)}</div></div><div class="kpi"><div class="label">Overdraw</div><div class="number ${Number(c.overdraw||0)>0?'balance-negative':''}">${money(c.overdraw||0)}</div></div>
      </div>
      <div class="note"><strong>Status:</strong> ${c.status || 'balanced'} • <strong>Manager Note:</strong> ${c.resolutionNote || c.note || '—'}</div>` : `<div class="note">No close-of-day record for selected date.</div>`;
    openModal('My Close of Day', `<div class="stack"><div class="action-inline"><div class="inline-field compact"><span>COD Date</span><input type="date" id="myCodDate" value="${state.ui.myCodDate}"></div></div>${summary}</div>`, [{label:'Close', className:'secondary', onClick: closeModal}]);
    const picker = byId('myCodDate');
    if (picker) picker.onchange = () => { state.ui.myCodDate = picker.value || businessDate(); save(); openMyCODModal(state.ui.myCodDate); };
  }

  function openCODResolutionModal(codId) {
    const cod = state.cod.find(c => c.id === codId);
    if (!cod) return;
    const totalCredits = approvedCreditTotalForDate(cod.staffId, cod.date);
    const totalDebits = approvedDebitTotalForDate(cod.staffId, cod.date);
    const defaultDebt = Math.max(0, Number(cod.overdraw||0)) + Math.max(0, -(Number(cod.variance||0)));
    openModal('Resolve Close of Day', `
      <div class="stack">
        <div class="note">Running Float shows the ledger position after postings. Expected Cash is the physical cash that should remain in hand. Variance compares Actual Cash against Expected Cash. Overdraw shows how much postings exceeded the opening balance.</div>
        <div class="kpi-row">
          <div class="kpi"><div class="label">Opening Balance</div><div class="number">${money(getOpeningBalanceForDate(cod.staffId, cod.date))}</div></div>
          <div class="kpi"><div class="label">Total Credits</div><div class="number">${money(totalCredits)}</div></div>
          <div class="kpi"><div class="label">Total Debits</div><div class="number">${money(totalDebits)}</div></div>
          <div class="kpi"><div class="label">Running Float</div><div class="number ${Number(cod.runningFloat||0)<0?'balance-negative':''}">${money(cod.runningFloat||0)}</div></div>
          <div class="kpi"><div class="label">Expected Cash</div><div class="number">${money(cod.expectedCash||0)}</div></div>
          <div class="kpi"><div class="label">Actual Cash</div><div class="number">${money(cod.actualCash||0)}</div></div>
          <div class="kpi"><div class="label">Variance</div><div class="number ${Number(cod.variance||0)<0?'balance-negative':''}">${money(cod.variance||0)}</div></div>
          <div class="kpi"><div class="label">Overdraw</div><div class="number ${Number(cod.overdraw||0)>0?'balance-negative':''}">${money(cod.overdraw||0)}</div></div>
        </div>
        <div class="form-grid two">
          <div class="field"><label>Resolved Amount</label><input id="codResolvedAmount" class="entry-input" type="number" placeholder="Enter business-resolved amount"></div>
          <div class="field"><label>Debt Amount</label><input id="codDebtAmount" class="entry-input" type="number" placeholder="Enter teller debt amount"></div>
        </div>
        <div class="form-grid two">
          <div class="field"><label>Create Teller Debt</label><select id="codCreateDebt" class="entry-input"><option value="yes">Yes</option><option value="no">No</option></select></div>
          <div class="field"><label>Resolution Note</label><textarea id="codResolutionNote" class="entry-input"></textarea></div>
        </div>
      </div>
    `,[
      {label:'Close', className:'secondary', onClick: closeModal},
      {label:'Resolve', onClick: ()=> {
        const note = byId('codResolutionNote').value.trim();
        const resolvedAmount = Number(byId('codResolvedAmount').value || 0);
        const debtAmt = Math.max(0, Number(byId('codDebtAmount').value || 0));
        if (!note) return showToast('Resolution note required');
        cod.status = 'resolved';
        cod.resolutionNote = note;
        cod.resolvedBy = currentStaff()?.name || 'System';
        cod.resolvedAt = new Date().toISOString();
        cod.resolvedAmount = resolvedAmount;
        cod.debtAmount = byId('codCreateDebt').value === 'yes' ? debtAmt : 0;
        state.businessExtras ||= [];
        state.businessExtras.unshift({ date:new Date().toISOString(), accountNumber:'COD', details:`COD resolved for ${cod.staffName}`, kind:'credit', amount:resolvedAmount, balanceAfter:0, receivedOrPaidBy:cod.staffName, postedBy:currentStaff()?.name || 'System' });
        const acc = ensureStaffAccount(cod.staffId);
        const existingDebtEntries = (acc.entries||[]).filter(e => e.type === 'cod_resolution_debt' && e.codId === cod.id);
        if (existingDebtEntries.length) {
          const existingAmt = existingDebtEntries.reduce((s,e)=>s+Number(e.amount||0),0);
          acc.entries = (acc.entries||[]).filter(e => !(e.type === 'cod_resolution_debt' && e.codId === cod.id));
          acc.debtBalance = Math.max(0, Number(acc.debtBalance||0) - existingAmt);
        }
        if (byId('codCreateDebt').value === 'yes' && debtAmt > 0) {
          acc.debtBalance = Number(acc.debtBalance||0) + debtAmt;
          addStaffEntry(cod.staffId, 'cod_resolution_debt', debtAmt, 0, `COD debt recorded: ${note}`, { codId: cod.id });
        }
        save(); closeModal(); render(); showToast('COD resolved');
      }}
    ]);
  }

  function flattenBusinessEntries() {
    const txRows = flattenCustomerTx().map(t => ({
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
    const filter = state.ui[`${kind}Filter`] || { preset:'all', from:'', to:'' };
    const presets = [['daily','Daily'],['weekly','Weekly'],['monthly','Monthly'],['all','All']];
    const types = kind==='business' ? [['all','All'],['credit','Credit'],['debit','Debit']] : [['all','All'],['income','Income'],['expense','Expense']]; const activeType = state.ui[`${kind}Type`] || 'all'; return `<div class="form-card"><div class="action-inline">${presets.map(([k,l])=>`<button class="filter-chip ${filter.preset===k?'active':'secondary'}" data-filter-kind="${kind}" data-filter-preset="${k}">${l}</button>`).join('')}<label class="inline-field"><span>From</span><input id="${kind}From" type="date" value="${filter.from||''}"></label><label class="inline-field"><span>To</span><input id="${kind}To" type="date" value="${filter.to||''}"></label><button class="secondary" id="${kind}CustomApply">Apply Custom</button><button class="secondary" id="${kind}ExportCsv">Export CSV</button><button class="secondary" id="${kind}PrintSummary">Print Summary</button></div><div class="action-inline" style="margin-top:10px">${types.map(([k,l])=>`<button class="filter-chip ${activeType===k?'active':'secondary'}" data-type-kind="${kind}" data-type-filter="${k}">${l}</button>`).join('')}</div></div>`;
  }

  function bindBalanceFilters(kind) {
    qq(`[data-filter-kind="${kind}"]`).forEach(btn => btn.onclick = () => {
      state.ui[`${kind}Filter`] = { preset: btn.dataset.filterPreset, from:'', to:'' }; save(); renderWorkspace();
    });
    byId(`${kind}CustomApply`).onclick = () => { state.ui[`${kind}Filter`] = { preset:'custom', from:byId(`${kind}From`).value, to:byId(`${kind}To`).value }; save(); renderWorkspace(); };
    qq(`[data-type-kind="${kind}"]`).forEach(btn => btn.onclick = () => { state.ui[`${kind}Type`] = btn.dataset.typeFilter; save(); renderWorkspace(); });
    const moreBtn = byId(`${kind}More`);
    if (moreBtn) moreBtn.onclick = () => {
      const key = kind === 'business' ? 'businessEntriesLimit' : 'operationalEntriesLimit';
      state.ui[key] = (state.ui[key] || 20) + 20; save(); renderWorkspace();
    };
    const lessBtn = byId(`${kind}Less`);
    if (lessBtn) lessBtn.onclick = () => {
      const key = kind === 'business' ? 'businessEntriesLimit' : 'operationalEntriesLimit';
      state.ui[key] = Math.max(20, (state.ui[key] || 20) - 20); save(); renderWorkspace();
    };
    const tellerMore = byId('tellerMore');
    if (tellerMore) tellerMore.onclick = () => { state.ui.tellerEntriesLimit = (state.ui.tellerEntriesLimit || 20) + 20; save(); renderWorkspace(); };
    const tellerLess = byId('tellerLess');
    if (tellerLess) tellerLess.onclick = () => { state.ui.tellerEntriesLimit = Math.max(20, (state.ui.tellerEntriesLimit || 20) - 20); save(); renderWorkspace(); };
    byId(`${kind}ExportCsv`).onclick = () => {
      const rows = kind === 'business' ? filterByDate(flattenBusinessEntries(), state.ui.businessFilter || { preset: 'all', from: '', to: '' }) : filterByDate(state.operations.entries || [], state.ui.operationalFilter || { preset: 'all', from: '', to: '' });
      exportCsv(rows, `${kind}_balance.csv`);
    };
    byId(`${kind}PrintSummary`).onclick = () => printHtml(byId('workspace').innerHTML);
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
    if (state.ui.tool === 'check_balance') {
      const ws = byId('workspace');
      if (ws) lookupFill(ws, c); else render();
      return;
    }
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
