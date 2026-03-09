
(() => {
const STORAGE_KEY = 'ducess_ledger_v1';
const APPROVER_ROLES = ['manager','approving_officer','administrative_officer'];
const ALL_PERMS = ['check_balance','account_opening','account_maintenance','account_reactivation','statement','credit','debit','approve','report','post_income','post_expense','close_day','staff_admin'];
let state = loadState();
ensureState();
seedIfEmpty();
let currentView = 'customerService';
let tempTheme = (state.ui && Number.isInteger(state.ui.themeIndex)) ? state.ui.themeIndex : 0;
const root = document.getElementById('viewRoot');
const toastEl = document.getElementById('toast');

function ensureState(){
  state.customers ||= [];
  state.staff ||= [];
  state.requests ||= [];
  state.transactions ||= [];
  state.audit ||= [];
  state.cod ||= [];
  state.operationalAccounts ||= {income:[], expense:[]};
  state.operationalEntries ||= [];
  state.tempGrants ||= {};
  state.staffLedger ||= {};
  state.ui ||= {};
}
function loadState(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } }
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); updateTop(); }
function uid(prefix='id'){ return prefix + Math.random().toString(36).slice(2,9); }
function today(){ return new Date().toISOString().slice(0,10); }
function dt(v){ return new Date(v).toLocaleString(); }
function money(n){ return Number(n||0).toLocaleString(); }
function isoNow(){ return new Date().toISOString(); }
function ymd(v){ return new Date(v).toISOString().slice(0,10); }
function currentFilter(){ return state.ui.balanceFilter || {preset:'all',from:'',to:''}; }
function setBalanceFilter(preset, from='', to=''){ state.ui.balanceFilter = {preset,from,to}; saveState(); renderBalances(); }
function inRange(dateStr, filter=currentFilter()){
  const d=new Date(dateStr); const todayD=new Date(); todayD.setHours(23,59,59,999); const start=new Date(todayD); start.setHours(0,0,0,0);
  if(filter.preset==='daily') return d>=start && d<=todayD;
  if(filter.preset==='weekly'){ const s=new Date(start); const day=s.getDay()||7; s.setDate(s.getDate()-day+1); return d>=s && d<=todayD; }
  if(filter.preset==='monthly'){ const s=new Date(start.getFullYear(), start.getMonth(), 1); return d>=s && d<=todayD; }
  if(filter.preset==='custom'){
    const from=filter.from? new Date(filter.from+'T00:00:00'):null;
    const to=filter.to? new Date(filter.to+'T23:59:59'):null;
    return (!from||d>=from)&&(!to||d<=to);
  }
  return true;
}
function downloadCSV(filename, rows){
  const esc=v => '"'+String(v ?? '').replaceAll('"','""')+'"';
  const csv=rows.map(r=>r.map(esc).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
function printHTML(title, inner){
  const w=window.open('','_blank');
  w.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font-family:Arial;padding:24px} h2{margin:0 0 12px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ccc;padding:8px;text-align:left} .muted{color:#666}</style></head><body><h2>${title}</h2>${inner}<script>window.print()<\/script></body></html>`);
  w.document.close();
}
function currentStaff(){ return state.staff.find(s => s.id === state.activeStaffId) || state.staff[0] || null; }
function hasPerm(perm, staff=currentStaff()){
  if(!staff) return false;
  if(perm==='check_balance') return true;
  const rolePerms = staff.permissions || {};
  const t = state.tempGrants[staff.id] || {};
  return !!(rolePerms[perm] || t[perm]);
}
function isApprover(staff=currentStaff()){ return !!staff && APPROVER_ROLES.includes(staff.role); }
function log(action, details){ state.audit.unshift({id:uid('a'), time:isoNow(), actor:currentStaff()?.name||'system', action, details}); if(state.audit.length>400) state.audit.length=400; saveState(); }
function seedIfEmpty(){
  if(state.staff.length || state.customers.length) return;
  state.staff = [
    mkStaff('s1','Manager One','manager'),
    mkStaff('s2','Teller Jane','teller'),
    mkStaff('s3','Approving Officer','approving_officer'),
    mkStaff('s4','Administrative Officer','administrative_officer')
  ];
  state.activeStaffId = 's1';
  state.customers = [
    mkCustomer('Cus A','08030000001','6 Market Road','12345678901','22334455667'),
    mkCustomer('Cus B','08030000002','12 Creek Road','12345678902','22334455668'),
    mkCustomer('Cus C','08030000003','55 Main Street','12345678903','22334455669')
  ];
  state.customers[0].status='active'; state.customers[0].balance=120000;
  state.customers[1].status='active'; state.customers[1].balance=54000;
  state.customers[2].status='inactive'; state.customers[2].balance=0;
  state.operationalAccounts.income = [
    {id:uid('inc'), name:'Commission Income', accountNumber:'INC-2000'},
    {id:uid('inc'), name:'Registration Fee', accountNumber:'INC-2001'}
  ];
  state.operationalAccounts.expense = [
    {id:uid('exp'), name:'Transport Expense', accountNumber:'EXP-3000'},
    {id:uid('exp'), name:'Office Supplies', accountNumber:'EXP-3001'}
  ];
  state.staff.forEach(s => ensureStaffLedger(s.id));
  log('seed','Initial demo data');
}
function mkStaff(id,name,role){
  const perms = Object.fromEntries(ALL_PERMS.map(p=>[p,false]));
  if(role==='manager' || role==='approving_officer' || role==='administrative_officer'){ ALL_PERMS.forEach(p=> perms[p]=true); }
  if(role==='teller'){ ['check_balance','credit','debit','close_day','statement','post_income','post_expense'].forEach(p=> perms[p]=true); }
  return {id,name,role,active:true, permissions:perms};
}
function mkCustomer(name,phone,address,nin,bvn){
  const accountNo = nextCustomerAccount();
  return {id:uid('c'), accountNumber:accountNo, oldAccountNumber:'', name, phone, address, nin, bvn, status:'pending', balance:0, createdAt:isoNow(), transactions:[]};
}
function nextCustomerAccount(){ const max = state.customers.reduce((m,c)=> Math.max(m, Number(c.accountNumber||1000)), 1000); return String(max+1); }
function ensureStaffLedger(staffId){
  state.staffLedger[staffId] ||= {walletBalance:0, debtBalance:0, openingBalances:[], ledger:[]};
  return state.staffLedger[staffId];
}
function setTheme(idx){
  if(typeof idx==='number') tempTheme=idx;
  state.ui.themeIndex = tempTheme % 5;
  const palettes=[
    {name:'Classic',bg:'#eef2f1',bg2:'#e5ece9',card:'#ffffff',soft:'#f4f7f6',primary:'#0f6b63',primary2:'#145d83',input:'#c7dedd',text:'#102523',muted:'#5e716d',line:'#d8e2df'},
    {name:'Ducess Sheet',bg:'#f1ede2',bg2:'#e6ddc7',card:'#fffdf7',soft:'#f5efdf',primary:'#2c5f8d',primary2:'#7f6233',input:'#e1d0a7',text:'#1e2937',muted:'#6b7280',line:'#dfd2bb'},
    {name:'Ocean',bg:'#eef3f8',bg2:'#dfe7ef',card:'#ffffff',soft:'#f3f7fb',primary:'#355c7d',primary2:'#5d7f6a',input:'#d8e3ef',text:'#142536',muted:'#5e6d7f',line:'#d6e0ea'},
    {name:'Dark Slate',bg:'#1f2933',bg2:'#111827',card:'#243240',soft:'#1f2a36',primary:'#5fa8d3',primary2:'#4fd1c5',input:'#324152',text:'#eef2f7',muted:'#b9c3cf',line:'#3b4b5d'},
    {name:'Neutral Stone',bg:'#f5f3ef',bg2:'#ebe7df',card:'#ffffff',soft:'#f8f6f2',primary:'#6c5f4b',primary2:'#9d7f4f',input:'#e5dccf',text:'#2b2a28',muted:'#746f67',line:'#ddd6ca'}
  ];
  const p=palettes[state.ui.themeIndex||0]; const rs=document.documentElement.style;
  rs.setProperty('--bg',p.bg); rs.setProperty('--bg-2',p.bg2); rs.setProperty('--card',p.card); rs.setProperty('--soft',p.soft); rs.setProperty('--primary',p.primary); rs.setProperty('--primary-2',p.primary2); rs.setProperty('--input-fill',p.input); rs.setProperty('--text',p.text); rs.setProperty('--muted',p.muted); rs.setProperty('--line',p.line);
  const sel=document.getElementById('themeSelect'); if(sel) sel.value=String(state.ui.themeIndex||0);
}

function render(){
  renderStaffSelect(); bindTop(); updateTop(); renderView(currentView);
}
function bindTop(){
  document.querySelectorAll('.module-btn').forEach(btn => btn.onclick = () => { currentView = btn.dataset.view; document.querySelectorAll('.module-btn').forEach(b=>b.classList.toggle('active', b===btn)); renderView(currentView); });
  document.querySelectorAll('.quick').forEach(btn => btn.onclick = () => { if(btn.classList.contains('disabled')) return; currentView = btn.dataset.view === 'incomePost' || btn.dataset.view==='expensePost' ? 'balances' : btn.dataset.view; renderView(currentView, btn.dataset.view); });
  const tsel=document.getElementById('themeSelect'); if(tsel){ tsel.value=String(state.ui.themeIndex||0); tsel.onchange=()=>{ setTheme(Number(tsel.value||0)); saveState(); }; }
  document.getElementById('btnSaveState').onclick = ()=>{ saveState(); toast('Saved'); };
  document.getElementById('modalClose').onclick = closeModal;
}
function renderStaffSelect(){
  const sel=document.getElementById('staffSelect');
  sel.innerHTML = state.staff.filter(s=>s.active!==false).map(s=>`<option value="${s.id}">${s.name} — ${s.role.replaceAll('_',' ')}</option>`).join('');
  sel.value = state.activeStaffId || state.staff[0]?.id || '';
  sel.onchange = ()=>{ state.activeStaffId = sel.value; saveState(); updateTop(); renderView(currentView); };
}
function updateTop(){
  document.getElementById('heroCustomers').textContent = state.customers.length;
  document.getElementById('heroPending').textContent = state.requests.filter(r=>r.status==='pending').length;
  document.getElementById('heroFlagged').textContent = state.cod.filter(c=>c.status==='flagged').length;
  const staff = currentStaff(); const led = ensureStaffLedger(staff.id); const ob = openingForDate(staff.id,today()); const used = floatUsedToday(staff.id,today());
  document.getElementById('tileMyBalance').textContent = money(led.walletBalance);
  document.getElementById('tileMyBalanceSub').textContent = `Wallet ${money(led.walletBalance)} • Debt ${money(led.debtBalance)} • Remaining ${money(Math.max(0,ob-used))}`;
  document.getElementById('tileMyCOD').textContent = state.cod.filter(c=>c.staffId===staff.id).length;
  document.getElementById('tileIncomeCount').textContent = state.operationalAccounts.income.length;
  document.getElementById('tileExpenseCount').textContent = state.operationalAccounts.expense.length;
  document.querySelectorAll('.restricted').forEach(el => { const allowed = hasPerm(el.dataset.view==='incomePost' ? 'post_income' : 'post_expense'); el.classList.toggle('disabled', !allowed); });
}
function renderView(view, sub){
  if(view==='customerService') return renderCustomerService();
  if(view==='tellering') return renderTellering();
  if(view==='approvals') return renderApprovals();
  if(view==='administration') return renderAdministration();
  if(view==='balances') return renderBalances(sub);
  if(view==='myBalance') return renderMyBalance();
  if(view==='myCOD') return renderMyCOD();
}
function cardWrap(title, subtitle, inner){ root.innerHTML = `<section class="section-card card"><div class="section-head"><div><h2>${title}</h2><p>${subtitle||''}</p></div></div>${inner}</section>`; }
function renderCustomerService(){
  const rows = state.customers.map(c => `<tr><td>${c.accountNumber}</td><td>${c.name}</td><td>${c.phone}</td><td>${c.status}</td><td>${money(c.balance)}</td><td><div class="inline-actions"><button class="btn secondary" onclick="App.pickCustomer('${c.id}','balance')">Check</button><button class="btn secondary" onclick="App.openStatement('${c.id}')">Statement</button></div></td></tr>`).join('');
  cardWrap('Customer Service Tools','Account opening, maintenance, reactivation, balance checks and statements',`
    <div class="grid-2 equal">
      <div class="panel stack">
        <div>
          <h3>Check Balance</h3>
          <div class="form-grid three">
            <div><label class="label">Account Number</label><input id="cbAccount" class="input" placeholder="Type account number"></div>
            <div><label class="label">Search Customer by Name</label><input id="cbNameSearch" class="input" placeholder="Search name"></div>
            <div class="inline-actions" style="align-items:end"><button class="btn" id="btnCheckBalance">Lookup</button></div>
            <div class="full"><div id="cbSearchResults"></div></div>
            <div><label class="label">Name</label><input id="cbName" class="input readonly" readonly></div>
            <div><label class="label">Phone</label><input id="cbPhone" class="input readonly" readonly></div>
            <div><label class="label">Balance</label><input id="cbBalance" class="input readonly" readonly></div>
            <div><label class="label">Status</label><input id="cbStatus" class="input readonly" readonly></div>
          </div>
        </div>
        <div>
          <h3>Account Opening</h3>
          <div class="form-grid three">
            <div><label class="label">System Account Number</label><input id="aoAccount" class="input readonly" readonly value="${nextCustomerAccount()}"></div>
            <div><label class="label">Old Account Number (Optional)</label><input id="aoOld" class="input"></div>
            <div><label class="label">Full Name</label><input id="aoName" class="input"></div>
            <div><label class="label">Phone</label><input id="aoPhone" class="input"></div>
            <div><label class="label">Address</label><input id="aoAddress" class="input"></div>
            <div><label class="label">NIN</label><input id="aoNin" class="input"></div>
            <div><label class="label">BVN</label><input id="aoBvn" class="input"></div>
            <div class="full inline-actions"><button class="btn" id="btnSubmitOpening">Submit for Approval</button></div>
          </div>
        </div>
      </div>
      <div class="panel stack">
        <div>
          <h3>Account Maintenance</h3>
          <div class="form-grid three">
            <div><label class="label">Account Number</label><input id="amAccount" class="input"></div>
            <div><label class="label">Search Name</label><input id="amNameSearch" class="input"></div>
            <div class="inline-actions" style="align-items:end"><button class="btn secondary" id="btnLoadMaintenance">Load</button></div>
            <div class="full"><div id="amSearchResults"></div></div>
            <div><label class="label">Name</label><input id="amName" class="input readonly" readonly></div>
            <div><label class="label">Phone</label><input id="amPhone" class="input"></div>
            <div><label class="label">Address</label><input id="amAddress" class="input"></div>
            <div><label class="label">NIN</label><input id="amNin" class="input"></div>
            <div><label class="label">BVN</label><input id="amBvn" class="input"></div>
            <div><label class="label">Status</label><input id="amStatus" class="input readonly" readonly></div>
            <div class="full inline-actions"><button class="btn" id="btnSubmitMaintenance">Submit Update for Approval</button></div>
          </div>
        </div>
        <div>
          <h3>Account Reactivation</h3>
          <div class="form-grid three">
            <div><label class="label">Account Number</label><input id="arAccount" class="input"></div>
            <div><label class="label">Search Name</label><input id="arNameSearch" class="input"></div>
            <div class="inline-actions" style="align-items:end"><button class="btn secondary" id="btnLoadReact">Load</button></div>
            <div class="full"><div id="arSearchResults"></div></div>
            <div><label class="label">Name</label><input id="arName" class="input readonly" readonly></div>
            <div><label class="label">Phone</label><input id="arPhone" class="input readonly" readonly></div>
            <div><label class="label">Status</label><input id="arStatus" class="input readonly" readonly></div>
            <div class="full inline-actions"><button class="btn success" id="btnSubmitReact">Submit Reactivation for Approval</button></div>
          </div>
        </div>
        <div>
          <h3>Customer Directory</h3>
          <div class="table-wrap"><table class="table"><thead><tr><th>Acct</th><th>Name</th><th>Phone</th><th>Status</th><th>Balance</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>
        </div>
      </div>
    </div>`);
  bindCustomerService();
}
function fillCheckBalance(customer){ ['cbName','cbPhone','cbBalance','cbStatus'].forEach(id=>document.getElementById(id).value=''); if(!customer) return; document.getElementById('cbAccount').value=customer.accountNumber; document.getElementById('cbName').value=customer.name; document.getElementById('cbPhone').value=customer.phone; document.getElementById('cbBalance').value=money(customer.balance); document.getElementById('cbStatus').value=customer.status; }
function renderSearchResults(inputId,targetId,onPick){ const q=(document.getElementById(inputId)?.value||'').trim().toLowerCase(); const box=document.getElementById(targetId); if(!box) return; if(!q){ box.innerHTML=''; return; } const matches=state.customers.filter(c=>c.name.toLowerCase().includes(q)); box.innerHTML = matches.length ? `<div class="search-results">${matches.map(c=>`<button class="search-pick" data-id="${c.id}">${c.name} • ${c.accountNumber}</button>`).join('')}</div>` : ''; box.querySelectorAll('.search-pick').forEach(btn=> btn.onclick = ()=> onPick(btn.dataset.id)); }
function bindCustomerService(){
  document.getElementById('btnCheckBalance').onclick = ()=> fillCheckBalance(findCustomerByAccount(document.getElementById('cbAccount').value));
  document.getElementById('cbNameSearch').oninput = ()=> renderSearchResults('cbNameSearch','cbSearchResults', id => { const c=findCustomer(id); fillCheckBalance(c); document.getElementById('cbSearchResults').innerHTML=''; });
  document.getElementById('btnSubmitOpening').onclick = submitAccountOpening;
  document.getElementById('amNameSearch').oninput = ()=> renderSearchResults('amNameSearch','amSearchResults', id => pickMaintenance(id));
  document.getElementById('btnLoadMaintenance').onclick = ()=> pickMaintenance((findCustomerByAccount(document.getElementById('amAccount').value)||{}).id);
  document.getElementById('btnSubmitMaintenance').onclick = submitMaintenance;
  document.getElementById('arNameSearch').oninput = ()=> renderSearchResults('arNameSearch','arSearchResults', id => pickReactivation(id));
  document.getElementById('btnLoadReact').onclick = ()=> pickReactivation((findCustomerByAccount(document.getElementById('arAccount').value)||{}).id);
  document.getElementById('btnSubmitReact').onclick = submitReactivation;
}
function pickMaintenance(id){ const c=findCustomer(id); if(!c) return; document.getElementById('amAccount').value=c.accountNumber; document.getElementById('amName').value=c.name; document.getElementById('amPhone').value=c.phone; document.getElementById('amAddress').value=c.address; document.getElementById('amNin').value=c.nin; document.getElementById('amBvn').value=c.bvn; document.getElementById('amStatus').value=c.status; document.getElementById('amSearchResults').innerHTML=''; }
function pickReactivation(id){ const c=findCustomer(id); if(!c) return; document.getElementById('arAccount').value=c.accountNumber; document.getElementById('arName').value=c.name; document.getElementById('arPhone').value=c.phone; document.getElementById('arStatus').value=c.status; document.getElementById('arSearchResults').innerHTML=''; }
function submitAccountOpening(){
  const payload={ accountNumber: nextCustomerAccount(), oldAccountNumber:v('aoOld'), name:v('aoName'), phone:v('aoPhone'), address:v('aoAddress'), nin:v('aoNin'), bvn:v('aoBvn') };
  const missing=['name','phone','address','nin','bvn'].filter(k=>!payload[k]);
  if(missing.length) return toast('All fields except old account number are required');
  confirmDialog('Confirm Account Opening', `<div class="list"><div class="small muted">Please confirm this account opening request before submitting for approval.</div><div><b>${payload.name}</b> • ${payload.phone}</div><div>Address: ${payload.address}</div><div>NIN: ${payload.nin}</div><div>BVN: ${payload.bvn}</div></div>`, ()=> createRequest('account_opening', payload));
}
function submitMaintenance(){ const c=findCustomerByAccount(v('amAccount')); if(!c) return toast('Load customer first'); const payload={customerId:c.id, phone:v('amPhone'), address:v('amAddress'), nin:v('amNin'), bvn:v('amBvn')}; confirmDialog('Confirm Maintenance Update', 'Submit account maintenance request for approval?', ()=> createRequest('account_maintenance', payload)); }
function submitReactivation(){ const c=findCustomerByAccount(v('arAccount')); if(!c) return toast('Load customer first'); confirmDialog('Confirm Reactivation', 'Submit account reactivation request for approval?', ()=> createRequest('account_reactivation', {customerId:c.id})); }

function renderTellering(){
  const journalRows=(state.ui.journal||[]).map((j,i)=>`<tr><td>${i+1}</td><td>${j.customerName}</td><td>${j.accountNumber}</td><td>${j.type}</td><td>${money(j.amount)}</td><td>${j.details||''}</td><td><button class="btn secondary" onclick="App.removeJournal(${i})">Remove</button></td></tr>`).join('');
  cardWrap('Tellering','Prepare journal entries, then submit them for approval. Opening balance must be approved before posting.',`
    <div class="grid-2">
      <div class="panel stack">
        <div>
          <h3>Credit / Debit Form</h3>
          <div class="form-grid three">
            <div><label class="label">Transaction Type</label><select id="txType" class="input"><option value="credit">Credit</option><option value="debit">Debit</option></select></div>
            <div><label class="label">Account Number</label><input id="txAccount" class="input"></div>
            <div><label class="label">Search Name</label><input id="txNameSearch" class="input"></div>
            <div class="full"><div id="txSearchResults"></div></div>
            <div><label class="label">Account Name</label><input id="txName" class="input readonly" readonly></div>
            <div><label class="label">Balance</label><input id="txBalance" class="input readonly" readonly></div>
            <div><label class="label">Amount</label><input id="txAmount" class="input" type="number"></div>
            <div><label class="label">Received / Paid By</label><input id="txReceivedBy" class="input" placeholder="Who brought / received value"></div>
            <div><label class="label">Payout Source (Debit only)</label><select id="txPayoutSource" class="input"><option value="teller_balance">Teller Balance</option><option value="office_cash">Office Cash</option><option value="bank_transfer">Bank Transfer</option><option value="other">Other</option></select></div>
            <div class="full"><label class="label">Details</label><textarea id="txDetails" class="textarea"></textarea></div>
            <div class="full inline-actions"><button class="btn secondary" id="btnLoadTx">Load Customer</button><button class="btn" id="btnAddJournal">Add to Journal</button><button class="btn warn" id="btnOpenBalance">Opening Balance</button></div>
          </div>
        </div>
      </div>
      <div class="panel stack">
        <div class="list-row"><div><h3>Journal</h3><div class="helper">Entries will be submitted together for approval.</div></div><div class="inline-actions"><button class="btn" id="btnSubmitJournal">Submit Journal</button></div></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>S/N</th><th>Account Name</th><th>Account Number</th><th>Type</th><th>Amount</th><th>Details</th><th></th></tr></thead><tbody>${journalRows||'<tr><td colspan="7" class="muted">No journal entries yet</td></tr>'}</tbody></table></div>
      </div>
    </div>`);
  bindTellering();
}
function bindTellering(){ document.getElementById('btnLoadTx').onclick = ()=> pickTxCustomerByAccount(document.getElementById('txAccount').value); document.getElementById('txNameSearch').oninput = ()=> renderSearchResults('txNameSearch','txSearchResults', id => { pickTxCustomer(id); document.getElementById('txSearchResults').innerHTML=''; }); document.getElementById('btnAddJournal').onclick = addJournal; document.getElementById('btnSubmitJournal').onclick = submitJournal; document.getElementById('btnOpenBalance').onclick = openOpeningBalanceDialog; }
function pickTxCustomerByAccount(accNo){ const c=findCustomerByAccount(accNo); if(!c) return toast('Customer not found'); pickTxCustomer(c.id); }
function pickTxCustomer(id){ const c=findCustomer(id); if(!c) return; document.getElementById('txAccount').value=c.accountNumber; document.getElementById('txName').value=c.name; document.getElementById('txBalance').value=money(c.balance); }
function openingForDate(staffId,date){ const led=ensureStaffLedger(staffId); const found=led.openingBalances.find(o=>o.date===date && o.status==='approved'); return Number(found?.amount||0); }
function floatUsedToday(staffId,date){ return state.transactions.filter(t=>t.staffId===staffId && t.postedDate===date && t.affectsFloat).reduce((s,t)=>s+Number(t.amount||0),0); }
function openOpeningBalanceDialog(){ const staff=currentStaff(); const led=ensureStaffLedger(staff.id); if(led.openingBalances.find(o=>o.date===today())) return toast('Opening balance already declared for today'); if(state.requests.find(r=>r.type==='opening_balance' && r.status==='pending' && r.payload.staffId===staff.id && r.payload.date===today())) return toast('Opening balance request already pending for today'); openModal('Opening Balance', `<div class="form-grid"><div><label class="label">Date</label><input id="obDate" class="input readonly" readonly value="${today()}"></div><div><label class="label">Amount</label><input id="obAmount" type="number" class="input"></div></div>`, [{label:'Submit for Approval', className:'btn', onClick:()=>{ const amount=Number(v('obAmount')); if(!amount||amount<=0) return toast('Enter valid amount'); createRequest('opening_balance',{amount,date:today(), staffId:staff.id}); closeModal(); }}]); }
function addJournal(){ const staff=currentStaff(); const open=openingForDate(staff.id,today()); if(!open) return toast('Approved opening balance is required before posting'); const customer=findCustomerByAccount(v('txAccount')); if(!customer) return toast('Load customer first'); const amount=Number(v('txAmount')); if(!amount||amount<=0) return toast('Enter valid amount'); state.ui.journal ||= []; state.ui.journal.push({ customerId:customer.id, customerName:customer.name, accountNumber:customer.accountNumber, type:v('txType'), amount, details:v('txDetails'), receivedBy:v('txReceivedBy'), payoutSource:v('txPayoutSource') }); saveState(); renderTellering(); }
function submitJournal(){ const staff=currentStaff(); const open=openingForDate(staff.id,today()); if(!open) return toast('Approved opening balance is required before posting'); const journal=state.ui.journal||[]; if(!journal.length) return toast('Journal is empty'); const total = journal.reduce((s,j)=>s+Number(j.amount||0),0); confirmDialog('Confirm Journal Submission', `<div class="small muted">You are about to submit ${journal.length} journal entr${journal.length>1?'ies':'y'} for approval. Total amount: <b>${money(total)}</b>.</div>`, ()=> { createRequest('journal_submission', {entries:[...journal], staffId:staff.id, date:today()}); state.ui.journal=[]; saveState(); renderTellering(); }); }

function renderApprovals(){
  const rows = state.requests.filter(r=>r.status==='pending').map(r=> `<tr><td>${r.type.replaceAll('_',' ')}</td><td>${r.requestedByName}</td><td>${dt(r.createdAt)}</td><td>${requestSummary(r)}</td><td><span class="status pending">Pending</span></td><td><div class="inline-actions"><button class="btn success" onclick="App.askApprove('${r.id}')">Approve</button><button class="btn danger" onclick="App.askReject('${r.id}')">Reject</button></div></td></tr>`).join('');
  const hist = state.requests.filter(r=>r.status!=='pending').slice(0,20).map(r=> `<tr><td>${r.type.replaceAll('_',' ')}</td><td>${r.requestedByName}</td><td>${r.status}</td><td>${r.processedByName||''}</td><td>${requestSummary(r)}</td></tr>`).join('');
  const codRows = state.cod.filter(c=>c.status==='flagged').map(c=> `<tr><td>${c.date}</td><td>${c.staffName}</td><td>${money(c.openingBalance)}</td><td>${money(c.expectedClosing)}</td><td>${money(c.actualCashCount)}</td><td>${money(c.variance)}</td><td>${money(c.overdraw||0)}</td><td><button class="btn warn" onclick="App.openResolveCOD('${c.id}')">Resolve</button></td></tr>`).join('');
  cardWrap('Approvals','Everything except balance checks routes through approvals.', `<div class="stack"><div class="panel"><h3>Pending Approvals</h3><div class="table-wrap"><table class="table"><thead><tr><th>Type</th><th>Requested By</th><th>When</th><th>Summary</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="muted">No pending approvals</td></tr>'}</tbody></table></div></div><div class="panel"><h3>Flagged Close of Day</h3><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Staff</th><th>Opening</th><th>Expected</th><th>Actual</th><th>Variance</th><th>Overdraw</th><th>Action</th></tr></thead><tbody>${codRows||'<tr><td colspan="8" class="muted">No flagged COD</td></tr>'}</tbody></table></div></div><div class="panel"><h3>Recent Approval History</h3><div class="table-wrap"><table class="table"><thead><tr><th>Type</th><th>Requested By</th><th>Status</th><th>Processed By</th><th>Summary</th></tr></thead><tbody>${hist||'<tr><td colspan="5" class="muted">No history yet</td></tr>'}</tbody></table></div></div></div>`);
}
function askApprove(id){ if(!isApprover()) return toast('Not authorized'); confirmDialog('Confirm Approval','Are you sure you want to approve this request?', ()=> processRequest(id,'approved')); }
function askReject(id){ if(!isApprover()) return toast('Not authorized'); openModal('Reject Request', `<label class="label">Reason</label><textarea id="rejectReason" class="textarea"></textarea>`, [{label:'Cancel', className:'btn secondary', onClick:closeModal},{label:'Reject', className:'btn danger', onClick:()=>{ const reason=v('rejectReason')||'Rejected'; processRequest(id,'rejected', reason); closeModal(); }}]); }
function processRequest(id,status,reason=''){
  const req=state.requests.find(r=>r.id===id); if(!req) return; req.status=status; req.processedAt=isoNow(); req.processedBy=currentStaff().id; req.processedByName=currentStaff().name; req.reason=reason;
  if(status==='approved') applyRequest(req);
  log('request_'+status, `${req.type} by ${req.requestedByName}`);
  saveState(); renderApprovals(); updateTop(); toast(`Request ${status}`);
}
function applyRequest(req){
  if(req.type==='account_opening'){ const c=mkCustomer(req.payload.name, req.payload.phone, req.payload.address, req.payload.nin, req.payload.bvn); c.oldAccountNumber=req.payload.oldAccountNumber||''; c.accountNumber=req.payload.accountNumber || c.accountNumber; c.status='active'; state.customers.unshift(c); }
  if(req.type==='account_maintenance'){ const c=findCustomer(req.payload.customerId); if(c){ Object.assign(c, req.payload); } }
  if(req.type==='account_reactivation'){ const c=findCustomer(req.payload.customerId); if(c) c.status='active'; }
  if(req.type==='opening_balance'){ const led=ensureStaffLedger(req.payload.staffId); if(!led.openingBalances.find(o=>o.date===req.payload.date)){ led.openingBalances.push({date:req.payload.date, amount:Number(req.payload.amount), status:'approved', approvedAt:isoNow()}); } }
  if(req.type==='journal_submission'){ (req.payload.entries||[]).forEach(entry=> applyTransaction(entry, req)); }
  if(req.type==='wallet_funding'){ const led=ensureStaffLedger(req.payload.staffId); led.walletBalance += Number(req.payload.amount||0); led.ledger.unshift({id:uid('sl'), type:'wallet_funding', amount:Number(req.payload.amount||0), at:isoNow(), note:req.payload.note||''}); }
  if(req.type==='debt_repayment'){ const led=ensureStaffLedger(req.payload.staffId); const amt=Math.min(Number(req.payload.amount||0), led.walletBalance, led.debtBalance); led.walletBalance -= amt; led.debtBalance -= amt; led.ledger.unshift({id:uid('sl'), type:'debt_repayment', amount:amt, at:isoNow(), note:req.payload.note||''}); state.transactions.unshift({id:uid('t'), customerId:'', accountNumber:'', customerName:'STAFF DEBT REPAYMENT', type:'credit', amount:amt, details:'Staff debt repayment', receivedBy:req.requestedByName, payoutSource:'', staffId:req.payload.staffId, staffName:req.requestedByName, postedAt:isoNow(), postedDate:today(), approvedBy:currentStaff().name, affectsFloat:false, metaType:'staff_debt_repayment'}); }
  if(req.type==='operational_post'){ state.operationalEntries.unshift({id:uid('oe'), accountId:req.payload.accountId, kind:req.payload.kind, amount:Number(req.payload.amount||0), note:req.payload.note||'', staffId:req.requestedBy, staffName:req.requestedByName, at:isoNow()}); }
  if(req.type==='cod_resolution'){ const cod=state.cod.find(c=>c.id===req.payload.codId); if(cod){ cod.status='resolved'; cod.resolutionNote=req.payload.note; cod.resolvedBy=currentStaff().name; cod.resolvedAt=isoNow(); if(Number(req.payload.staffDebt||0)>0){ const led=ensureStaffLedger(cod.staffId); led.debtBalance += Number(req.payload.staffDebt); led.ledger.unshift({id:uid('sl'), type:'cod_shortage', amount:Number(req.payload.staffDebt), at:isoNow(), note:req.payload.note}); } } }
}
function applyTransaction(entry, req){
  const c=findCustomer(entry.customerId); if(!c) return; const amount=Number(entry.amount||0); let affectsFloat=false; if(entry.type==='credit'){ c.balance += amount; affectsFloat=true; }
  if(entry.type==='debit'){ c.balance = Math.max(0, c.balance - amount); affectsFloat = entry.payoutSource==='teller_balance'; }
  const tx={id:uid('t'), customerId:c.id, accountNumber:c.accountNumber, customerName:c.name, type:entry.type, amount, details:entry.details||'', receivedBy:entry.receivedBy||'', payoutSource:entry.type==='debit' ? entry.payoutSource : '', staffId:req.payload.staffId, staffName:req.requestedByName, postedAt:isoNow(), postedDate:req.payload.date, approvedBy:currentStaff().name, affectsFloat};
  state.transactions.unshift(tx); c.transactions ||= []; c.transactions.unshift(tx);
  const led=ensureStaffLedger(req.payload.staffId); led.ledger.unshift({id:uid('sl'), type:entry.type, amount, affectsFloat, at:isoNow(), note:`${entry.type} ${c.name}`});
}
function renderAdministration(){
  const staffRows=state.staff.map(s=> `<tr><td>${s.name}</td><td>${s.role.replaceAll('_',' ')}</td><td>${s.active===false?'Inactive':'Active'}</td><td><button class="btn secondary" onclick="App.toggleStaff('${s.id}')">${s.active===false?'Activate':'Deactivate'}</button></td></tr>`).join('');
  const permRows=state.staff.map(s=> `<tr><td>${s.name}</td>${ALL_PERMS.map(p=>`<td><input type="checkbox" ${((s.permissions||{})[p]||false)?'checked':''} onchange="App.setPerm('${s.id}','${p}',this.checked)"></td>`).join('')}</tr>`).join('');
  cardWrap('Administration','Manage staff directory, permissions, temporary access and operational accounts.', `
    <div class="stack">
      <div class="grid-2 equal">
        <div class="panel">
          <div class="list-row"><h3>Staff Directory</h3><button class="btn" id="btnAddStaff">Add Staff</button></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>${staffRows}</tbody></table></div>
        </div>
        <div class="panel">
          <div class="list-row"><h3>Temporary Access Grants</h3></div>
          <div class="form-grid three">
            <div><label class="label">Staff</label><select id="grantStaff" class="input">${state.staff.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
            <div><label class="label">Permission</label><select id="grantPerm" class="input">${ALL_PERMS.map(p=>`<option value="${p}">${p.replaceAll('_',' ')}</option>`).join('')}</select></div>
            <div class="inline-actions" style="align-items:end"><button class="btn" id="btnGrant">Grant / Toggle</button></div>
          </div>
          <div class="helper">Use this to grant temporary access and switch it off later.</div>
        </div>
      </div>
      <div class="panel">
        <h3>Permission Matrix</h3>
        <div class="table-wrap"><table class="table"><thead><tr><th>Staff</th>${ALL_PERMS.map(p=>`<th>${p.replaceAll('_',' ')}</th>`).join('')}</tr></thead><tbody>${permRows}</tbody></table></div>
      </div>
      <div class="grid-2 equal">
        <div class="panel"><div class="list-row"><h3>Income Accounts</h3><button class="btn" onclick="App.addOpAccount('income')">Add Income Account</button></div>${renderOpAccountList('income')}</div>
        <div class="panel"><div class="list-row"><h3>Expense Accounts</h3><button class="btn" onclick="App.addOpAccount('expense')">Add Expense Account</button></div>${renderOpAccountList('expense')}</div>
      </div>
    </div>`);
  document.getElementById('btnAddStaff').onclick = addStaffDialog; document.getElementById('btnGrant').onclick = toggleGrant;
}
function renderOpAccountList(kind){ const list=state.operationalAccounts[kind]; return `<div class="table-wrap"><table class="table"><thead><tr><th>Account No</th><th>Name</th></tr></thead><tbody>${list.map(a=>`<tr><td>${a.accountNumber}</td><td>${a.name}</td></tr>`).join('')||'<tr><td colspan="2" class="muted">No accounts</td></tr>'}</tbody></table></div>`; }
function addStaffDialog(){ if(!hasPerm('staff_admin')) return toast('Not authorized'); openModal('Add Staff', `<div class="form-grid three"><div><label class="label">Name</label><input id="nsName" class="input"></div><div><label class="label">Role</label><select id="nsRole" class="input"><option value="teller">Teller</option><option value="manager">Manager</option><option value="approving_officer">Approving Officer</option><option value="administrative_officer">Administrative Officer</option></select></div><div class="helper full">Teller accounts are created automatically for posting staff.</div></div>`, [{label:'Cancel', className:'btn secondary', onClick:closeModal},{label:'Add Staff', className:'btn', onClick:()=>{ const name=v('nsName'); const role=v('nsRole'); if(!name) return toast('Name is required'); const s=mkStaff(uid('s'),name,role); state.staff.push(s); ensureStaffLedger(s.id); saveState(); closeModal(); renderAdministration(); }}]); }
function toggleGrant(){ const staffId=v('grantStaff'), perm=v('grantPerm'); state.tempGrants[staffId] ||= {}; state.tempGrants[staffId][perm] = !state.tempGrants[staffId][perm]; saveState(); toast(`Temporary ${perm.replaceAll('_',' ')} ${state.tempGrants[staffId][perm] ? 'enabled':'disabled'}`); }
function toggleStaff(id){ const s=findStaff(id); if(!s) return; s.active = s.active===false; saveState(); renderAdministration(); }
function setPerm(staffId,perm,val){ const s=findStaff(staffId); if(!s) return; s.permissions ||= {}; s.permissions[perm]=val; saveState(); }
function addOpAccount(kind){ if(!hasPerm('staff_admin')) return toast('Not authorized'); openModal(`Add ${kind==='income'?'Income':'Expense'} Account`, `<div class="form-grid"><div><label class="label">Account Name</label><input id="opName" class="input"></div></div>`, [{label:'Cancel', className:'btn secondary', onClick:closeModal},{label:'Add Account', className:'btn', onClick:()=>{ const name=v('opName'); if(!name) return toast('Name required'); const list=state.operationalAccounts[kind]; const num=kind==='income' ? 2000+list.length : 3000+list.length; list.push({id:uid(kind==='income'?'inc':'exp'), name, accountNumber:`${kind==='income'?'INC':'EXP'}-${num}`}); saveState(); closeModal(); renderAdministration(); }}]); }

function renderBalances(sub){
  const filter=currentFilter();
  const txs=state.transactions.filter(t=> inRange((t.postedAt||t.postedDate||today()), filter));
  const ops=state.operationalEntries.filter(e=> inRange((e.at||today()), filter));
  const bizCredit=txs.filter(t=>t.type==='credit').reduce((s,t)=>s+Number(t.amount||0),0);
  const bizDebit=txs.filter(t=>t.type==='debit').reduce((s,t)=>s+Number(t.amount||0),0);
  const opInc=ops.filter(e=>e.kind==='income').reduce((s,e)=>s+Number(e.amount||0),0);
  const opExp=ops.filter(e=>e.kind==='expense').reduce((s,e)=>s+Number(e.amount||0),0);
  const opAccounts = sub==='expensePost' ? state.operationalAccounts.expense : sub==='incomePost' ? state.operationalAccounts.income : null;
  const filterBar = `<div class="filter-bar"><div><label class="label">Quick Filter</label><div class="chip-group"><button class="chip ${filter.preset==='daily'?'active':''}" data-preset="daily">Daily</button><button class="chip ${filter.preset==='weekly'?'active':''}" data-preset="weekly">Weekly</button><button class="chip ${filter.preset==='monthly'?'active':''}" data-preset="monthly">Monthly</button><button class="chip ${filter.preset==='all'?'active':''}" data-preset="all">All</button><button class="chip ${filter.preset==='custom'?'active':''}" data-preset="custom">Custom Range</button></div></div><div class="range-row"><div><label class="label">From</label><input id="balFrom" type="date" class="input" value="${filter.from||''}"></div><div><label class="label">To</label><input id="balTo" type="date" class="input" value="${filter.to||''}"></div><div class="inline-actions"><button class="btn secondary" id="btnApplyRange">Apply</button><button class="btn secondary" id="btnExportBiz">Export CSV</button><button class="btn secondary" id="btnPrintBiz">Print Summary</button></div></div></div>`;
  cardWrap('Balances','Business balance and operational balance with posting access to income and expense accounts.', `
    <div class="stack">
      ${filterBar}
      <div class="summary-grid">
        <div class="summary-card"><div class="sum-label">Business Credit</div><div class="sum-value">${money(bizCredit)}</div></div>
        <div class="summary-card"><div class="sum-label">Business Debit</div><div class="sum-value">${money(bizDebit)}</div></div>
        <div class="summary-card"><div class="sum-label">Operational Income</div><div class="sum-value">${money(opInc)}</div></div>
        <div class="summary-card"><div class="sum-label">Operational Expense</div><div class="sum-value">${money(opExp)}</div></div>
      </div>
      <div class="grid-2 equal">
        <div class="panel"><div class="list-row"><h3>Business Balance</h3><span class="badge-inline">${txs.length} entries</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Customer</th><th>Type</th><th>Amount</th><th>Posted By</th><th>Approved By</th></tr></thead><tbody>${txs.map(t=>`<tr><td>${t.postedDate||ymd(t.postedAt)}</td><td>${t.customerName||''}</td><td>${t.type}</td><td>${money(t.amount)}</td><td>${t.staffName||''}</td><td>${t.approvedBy||''}</td></tr>`).join('')||'<tr><td colspan="6" class="muted">No transactions</td></tr>'}</tbody></table></div></div>
        <div class="panel"><div class="list-row"><h3>Operational Balance</h3><span class="badge-inline">${ops.length} entries</span></div><div class="inline-actions" style="margin-bottom:10px"><button class="btn secondary" id="btnExportOps">Export CSV</button><button class="btn secondary" id="btnPrintOps">Print Summary</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Account</th><th>Kind</th><th>Amount</th><th>Posted By</th></tr></thead><tbody>${ops.map(e=>`<tr><td>${dt(e.at)}</td><td>${opAccountName(e.accountId)}</td><td>${e.kind}</td><td>${money(e.amount)}</td><td>${e.staffName}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">No operational entries</td></tr>'}</tbody></table></div></div>
      </div>
      ${opAccounts ? `<div class="panel"><div class="list-row"><h3>${sub==='incomePost'?'Post Income':'Post Expense'}</h3><div class="helper">Choose account and submit for approval.</div></div><div class="table-wrap"><table class="table"><thead><tr><th>Account No</th><th>Name</th><th>Action</th></tr></thead><tbody>${opAccounts.map(a=>`<tr><td>${a.accountNumber}</td><td>${a.name}</td><td><button class="btn" onclick="App.postOperational('${a.id}','${sub==='incomePost'?'income':'expense'}')">Post</button></td></tr>`).join('')}</tbody></table></div></div>`:''}
    </div>`);
  document.querySelectorAll('.chip').forEach(btn=> btn.onclick=()=> setBalanceFilter(btn.dataset.preset));
  const apply=document.getElementById('btnApplyRange'); if(apply) apply.onclick=()=> setBalanceFilter('custom', document.getElementById('balFrom').value, document.getElementById('balTo').value);
  const bizRows=[['Date','Customer','Type','Amount','Posted By','Approved By'], ...txs.map(t=>[t.postedDate||ymd(t.postedAt),t.customerName||'',t.type,t.amount,t.staffName||'',t.approvedBy||''])];
  const opsRows=[['Date','Account','Kind','Amount','Posted By'], ...ops.map(e=>[dt(e.at),opAccountName(e.accountId),e.kind,e.amount,e.staffName])];
  const exportBiz=document.getElementById('btnExportBiz'); if(exportBiz) exportBiz.onclick=()=> downloadCSV('business-balance.csv', bizRows);
  const exportOps=document.getElementById('btnExportOps'); if(exportOps) exportOps.onclick=()=> downloadCSV('operational-balance.csv', opsRows);
  const printBiz=document.getElementById('btnPrintBiz'); if(printBiz) printBiz.onclick=()=> printHTML('Business Balance Summary', `<div class="muted">Filter: ${filter.preset}${filter.preset==='custom' ? ` (${filter.from||'-'} to ${filter.to||'-'})` : ''}</div><div style="margin:12px 0">Total Credit: <b>${money(bizCredit)}</b> • Total Debit: <b>${money(bizDebit)}</b></div><table><thead><tr><th>Date</th><th>Customer</th><th>Type</th><th>Amount</th><th>Posted By</th><th>Approved By</th></tr></thead><tbody>${txs.map(t=>`<tr><td>${t.postedDate||ymd(t.postedAt)}</td><td>${t.customerName||''}</td><td>${t.type}</td><td>${money(t.amount)}</td><td>${t.staffName||''}</td><td>${t.approvedBy||''}</td></tr>`).join('')}</tbody></table>`);
  const printOps=document.getElementById('btnPrintOps'); if(printOps) printOps.onclick=()=> printHTML('Operational Balance Summary', `<div class="muted">Filter: ${filter.preset}${filter.preset==='custom' ? ` (${filter.from||'-'} to ${filter.to||'-'})` : ''}</div><div style="margin:12px 0">Total Income: <b>${money(opInc)}</b> • Total Expense: <b>${money(opExp)}</b></div><table><thead><tr><th>Date</th><th>Account</th><th>Kind</th><th>Amount</th><th>Posted By</th></tr></thead><tbody>${ops.map(e=>`<tr><td>${dt(e.at)}</td><td>${opAccountName(e.accountId)}</td><td>${e.kind}</td><td>${money(e.amount)}</td><td>${e.staffName}</td></tr>`).join('')}</tbody></table>`);
}
function postOperational(accountId,kind){ if(!hasPerm(kind==='income'?'post_income':'post_expense')) return toast('Not authorized'); openModal(`Post ${kind}`, `<div class="form-grid"><div><label class="label">Amount</label><input id="opAmt" class="input" type="number"></div><div class="full"><label class="label">Note</label><textarea id="opNote" class="textarea"></textarea></div></div>`, [{label:'Cancel', className:'btn secondary', onClick:closeModal},{label:'Submit for Approval', className:'btn', onClick:()=>{ const amount=Number(v('opAmt')); if(!amount||amount<=0) return toast('Enter valid amount'); createRequest('operational_post',{accountId, kind, amount, note:v('opNote')}); closeModal(); }}]); }
function opAccountName(id){ return [...state.operationalAccounts.income,...state.operationalAccounts.expense].find(a=>a.id===id)?.name || ''; }

function renderMyBalance(){ const staff=currentStaff(); const led=ensureStaffLedger(staff.id); const opening=openingForDate(staff.id,today()); const used=floatUsedToday(staff.id,today()); cardWrap('My Balance',"Fund wallet, repay debt, and review today's opening balance and remaining float.", `<div class="grid-2 equal"><div class="panel"><div class="summary-grid" style="grid-template-columns:repeat(2,1fr)"><div class="summary-card"><div class="sum-label">Wallet Balance</div><div class="sum-value">${money(led.walletBalance)}</div></div><div class="summary-card"><div class="sum-label">Debt Balance</div><div class="sum-value">${money(led.debtBalance)}</div></div><div class="summary-card"><div class="sum-label">Today's Opening Balance</div><div class="sum-value">${money(opening)}</div></div><div class="summary-card"><div class="sum-label">Remaining Float Today</div><div class="sum-value">${money(Math.max(0,opening-used))}</div></div></div><div class="inline-actions" style="margin-top:14px"><button class="btn" id="btnFundWallet">Fund My Balance</button><button class="btn warn" id="btnRepayDebt">Pay Debt</button><button class="btn secondary" id="btnOpeningBalance">Opening Balance</button></div></div><div class="panel"><h3>Staff Ledger</h3><div class="table-wrap"><table class="table"><thead><tr><th>When</th><th>Type</th><th>Amount</th><th>Note</th></tr></thead><tbody>${led.ledger.map(l=>`<tr><td>${dt(l.at||isoNow())}</td><td>${l.type.replaceAll('_',' ')}</td><td>${money(l.amount)}</td><td>${l.note||''}</td></tr>`).join('')||'<tr><td colspan="4" class="muted">No ledger entries</td></tr>'}</tbody></table></div></div></div>`); document.getElementById('btnFundWallet').onclick = ()=> walletDialog('wallet_funding'); document.getElementById('btnRepayDebt').onclick = ()=> walletDialog('debt_repayment'); document.getElementById('btnOpeningBalance').onclick = openOpeningBalanceDialog; }
function walletDialog(kind){ const title = kind==='wallet_funding' ? 'Fund My Balance' : 'Pay Debt'; openModal(title, `<div class="form-grid"><div><label class="label">Amount</label><input id="walletAmt" class="input" type="number"></div><div class="full"><label class="label">Note</label><textarea id="walletNote" class="textarea"></textarea></div></div>`, [{label:'Cancel', className:'btn secondary', onClick:closeModal},{label:'Submit for Approval', className:'btn', onClick:()=>{ const amount=Number(v('walletAmt')); if(!amount||amount<=0) return toast('Enter valid amount'); createRequest(kind,{staffId:currentStaff().id, amount, note:v('walletNote')}); closeModal(); }}]); }

function renderMyCOD(){ const staff=currentStaff(); const mine=state.cod.filter(c=>c.staffId===staff.id).sort((a,b)=>b.date.localeCompare(a.date)); cardWrap('My Close of Day','Review your close of day submissions, flagged records and resolutions.', `<div class="panel"><div class="inline-actions"><button class="btn" id="btnSubmitCOD">Submit Close of Day</button></div><div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Date</th><th>Opening</th><th>Expected</th><th>Actual</th><th>Variance</th><th>Status</th><th>Field Paper</th></tr></thead><tbody>${mine.map(c=>`<tr><td>${c.date}</td><td>${money(c.openingBalance)}</td><td>${money(c.expectedClosing)}</td><td>${money(c.actualCashCount)}</td><td>${money(c.variance)}</td><td><span class="status ${c.status==='resolved'?'approved':c.status==='flagged'?'flagged':'approved'}">${c.status}</span></td><td>${(c.fieldPapers||[]).map(f=>f.name).join(', ')}</td></tr>`).join('')||'<tr><td colspan="7" class="muted">No close of day records</td></tr>'}</tbody></table></div></div>`); document.getElementById('btnSubmitCOD').onclick = openCODDialog; }
function openCODDialog(){ const staff=currentStaff(); const opening=openingForDate(staff.id,today()); if(!opening) return toast('Approved opening balance is required first'); if(state.cod.find(c=>c.staffId===staff.id && c.date===today())) return toast('Close of day already submitted for today'); const expected=computeExpectedClosing(staff.id,today()); openModal('Submit Close of Day', `<div class="stack"><div class="summary-grid" style="grid-template-columns:repeat(3,1fr)"><div class="summary-card"><div class="sum-label">Opening Balance</div><div class="sum-value">${money(opening)}</div></div><div class="summary-card"><div class="sum-label">Expected Closing</div><div class="sum-value">${money(expected.expected)}</div></div><div class="summary-card"><div class="sum-label">Overdraw</div><div class="sum-value">${money(expected.overdraw)}</div></div></div><div class="form-grid"><div><label class="label">Actual Cash Count</label><input id="codActual" class="input" type="number" value="${expected.expected}"></div><div><label class="label">Field Paper Upload</label><input id="codFiles" class="input readonly" type="file" multiple></div><div class="full"><div id="codFileList" class="file-list"></div></div><div class="full"><label class="label">Note</label><textarea id="codNote" class="textarea" placeholder="Add explanation for shortages, overages or observations"></textarea></div></div></div>`, [{label:'Cancel', className:'btn secondary', onClick:closeModal},{label:'Submit COD', className:'btn', onClick:()=> submitCOD(expected)}]); document.getElementById('codFiles').onchange = e => { const list=[...(e.target.files||[])].map(f=>({name:f.name,size:f.size})); document.getElementById('codFileList').innerHTML=list.map(f=>`<span class="file-chip">${f.name}</span>`).join(''); }; }
function computeExpectedClosing(staffId,date){ const opening=openingForDate(staffId,date); const affects=state.transactions.filter(t=>t.staffId===staffId && t.postedDate===date && t.affectsFloat).reduce((s,t)=>s+Number(t.amount||0),0); const expected = Math.max(0, opening - affects); const overdraw = Math.max(0, affects - opening); return {opening, affects, expected, overdraw}; }
function submitCOD(expected){ const actual=Number(v('codActual')); if(Number.isNaN(actual) || actual<0) return toast('Enter actual cash count'); const files=[...(document.getElementById('codFiles').files||[])].map(f=>({name:f.name,size:f.size})); const note=v('codNote'); const variance = actual - expected.expected; if((variance!==0 || expected.overdraw>0) && !note) return toast('Please add note for shortage, excess or overdraw'); const status = (variance===0 && expected.overdraw===0) ? 'balanced' : 'flagged'; state.cod.unshift({id:uid('cod'), staffId:currentStaff().id, staffName:currentStaff().name, date:today(), openingBalance:expected.opening, expectedClosing:expected.expected, actualCashCount:actual, variance, overdraw:expected.overdraw, note, status, fieldPapers:files, resolvedAt:null, resolutionNote:''}); log('cod_submit', `${currentStaff().name} COD ${status}`); saveState(); closeModal(); renderMyCOD(); if(status==='flagged') toast('COD flagged for resolution'); else toast('Close of day submitted'); }

function openResolveCOD(id){
  if(!isApprover()) return toast('Not authorized');
  const cod=state.cod.find(c=>c.id===id); if(!cod) return;
  const shortage = Math.max(0, -Number(cod.variance||0));
  const overdraw = Math.max(0, Number(cod.overdraw||0));
  openModal('Resolve Close of Day', `<div class="stack"><div class="summary-grid" style="grid-template-columns:repeat(4,1fr)"><div class="summary-card"><div class="sum-label">Opening</div><div class="sum-value">${money(cod.openingBalance)}</div></div><div class="summary-card"><div class="sum-label">Expected</div><div class="sum-value">${money(cod.expectedClosing)}</div></div><div class="summary-card"><div class="sum-label">Actual</div><div class="sum-value">${money(cod.actualCashCount)}</div></div><div class="summary-card"><div class="sum-label">Variance</div><div class="sum-value">${money(cod.variance)}</div></div></div><div class="helper">Shortage below expected cash and overdraw above approved opening balance can both be resolved here.</div><div class="form-grid"><div><label class="label">Shortage to Staff Debt</label><input id="codDebt" class="input" type="number" value="${shortage + overdraw}"></div><div class="full"><label class="label">Resolution Note</label><textarea id="codResolveNote" class="textarea"></textarea></div></div></div>`, [{label:'Cancel', className:'btn secondary', onClick:closeModal},{label:'Submit Resolution', className:'btn', onClick:()=>{ const debt=Number(v('codDebt')); const note=v('codResolveNote'); if(!note) return toast('Resolution note is required'); createRequest('cod_resolution',{codId:id, staffDebt: Math.max(0,debt||0), note}); closeModal(); }}]);
}

function createRequest(type,payload){ const r={id:uid('r'), type, payload, status:'pending', createdAt:isoNow(), requestedBy:currentStaff().id, requestedByName:currentStaff().name}; state.requests.unshift(r); log('request_create', `${type} by ${r.requestedByName}`); saveState(); toast('Request submitted for approval'); }
function requestSummary(r){ if(r.type==='account_opening') return `${r.payload.name} • ${r.payload.phone}`; if(r.type==='account_maintenance') return `Customer ${r.payload.customerId}`; if(r.type==='account_reactivation') return `Customer ${r.payload.customerId}`; if(r.type==='opening_balance') return `${money(r.payload.amount)} for ${r.payload.date}`; if(r.type==='journal_submission') return `${r.payload.entries.length} journal entries`; if(r.type==='operational_post') return `${r.payload.kind} ${money(r.payload.amount)}`; if(r.type==='wallet_funding' || r.type==='debt_repayment') return `${money(r.payload.amount)}`; if(r.type==='cod_resolution') return `COD ${r.payload.codId}`; return r.type; }
function openModal(title, body, actions=[]){ document.getElementById('modalTitle').textContent=title; document.getElementById('modalBody').innerHTML=body; const wrap=document.getElementById('modalActions'); wrap.innerHTML=''; actions.forEach(a=>{ const b=document.createElement('button'); b.className=a.className||'btn'; b.textContent=a.label; b.onclick=a.onClick; wrap.appendChild(b); }); document.getElementById('modalBack').classList.remove('hidden'); }
function closeModal(){ document.getElementById('modalBack').classList.add('hidden'); }
function confirmDialog(title, html, onConfirm){ openModal(title, html, [{label:'Cancel', className:'btn secondary', onClick:closeModal},{label:'Confirm', className:'btn', onClick:()=>{ onConfirm(); closeModal(); renderView(currentView); }}]); }
function toast(msg){ toastEl.textContent=msg; toastEl.classList.remove('hidden'); clearTimeout(toastEl._t); toastEl._t=setTimeout(()=>toastEl.classList.add('hidden'), 2800); }
function v(id){ return (document.getElementById(id)?.value||'').trim(); }
function findCustomer(id){ return state.customers.find(c=>c.id===id); }
function findCustomerByAccount(acc){ return state.customers.find(c=>String(c.accountNumber)===String(acc).trim()); }
function findStaff(id){ return state.staff.find(s=>s.id===id); }
function printStatement(id){ const c=findCustomer(id); if(!c) return; const rows=(c.transactions||[]).map(t=>`<tr><td>${t.postedDate||''}</td><td>${t.details||''}</td><td>${t.type==='debit'?money(t.amount):''}</td><td>${t.type==='credit'?money(t.amount):''}</td><td>${money(runningBalance(c.transactions, t.id))}</td><td>${t.receivedBy||''}</td><td>${t.staffName||''}</td><td>${t.approvedBy||''}</td></tr>`).join(''); const w=window.open('','_blank'); w.document.write(`<!doctype html><html><head><title>Statement</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}h2{margin:0 0 12px}</style></head><body><h2>${c.name} Statement</h2><div>Account Number: ${c.accountNumber}</div><div>Phone: ${c.phone}</div><table><thead><tr><th>Date</th><th>Details</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Received/Paid By</th><th>Posted By</th><th>Approved By</th></tr></thead><tbody>${rows}</tbody></table><script>window.print()<\/script></body></html>`); w.document.close(); }
function runningBalance(txs,id){ let bal=0; for(const t of [...txs].slice().reverse()){ if(t.type==='credit') bal += Number(t.amount||0); if(t.type==='debit') bal -= Number(t.amount||0); if(t.id===id) return bal; } return bal; }
function openStatement(id){ printStatement(id); }
function pickCustomer(id, mode){ const c=findCustomer(id); if(!c) return; currentView='customerService'; renderCustomerService(); fillCheckBalance(c); }
function removeJournal(i){ state.ui.journal.splice(i,1); saveState(); renderTellering(); }

window.App = { pickCustomer, openStatement, removeJournal, askApprove, askReject, toggleStaff, setPerm, addOpAccount, postOperational, openResolveCOD };
setTheme(); render();
})();
