const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

let leads = [];
let sequences = [];

app.get('/api/leads', (req, res) => res.json(leads));

app.post('/api/leads', (req, res) => {
  const { name, email, phone, propertyInterest, stage, notes } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
  const lead = { id: uuidv4(), name, email, phone, propertyInterest, stage, notes, createdAt: new Date().toISOString(), status: 'active' };
  leads.push(lead);
  res.status(201).json(lead);
});

app.delete('/api/leads/:id', (req, res) => {
  leads = leads.filter(l => l.id !== req.params.id);
  sequences = sequences.filter(s => s.leadId !== req.params.id);
  res.json({ success: true });
});

app.get('/api/sequences/:leadId', (req, res) => {
  res.json(sequences.filter(s => s.leadId === req.params.leadId));
});

app.post('/api/sequences/generate', async (req, res) => {
  const { leadId, leadName, propertyInterest, stage, notes } = req.body;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: `Generate a 5-message real estate follow-up sequence for ${leadName}, interested in ${propertyInterest || 'property'}, stage: ${stage}. Notes: ${notes || 'none'}. Return ONLY a JSON array with objects containing: day, channel (email/sms), subject, message, purpose.` }]
      })
    });
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON found');
    const messages = JSON.parse(match[0]);
    const sequence = { id: uuidv4(), leadId, messages: messages.map(m => ({ ...m, id: uuidv4(), sent: false })), createdAt: new Date().toISOString() };
    sequences.push(sequence);
    res.json(sequence);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sequences/:seqId/messages/:msgId/sent', (req, res) => {
  const seq = sequences.find(s => s.id === req.params.seqId);
  if (!seq) return res.status(404).json({ error: 'Not found' });
  const msg = seq.messages.find(m => m.id === req.params.msgId);
  if (msg) { msg.sent = true; msg.sentAt = new Date().toISOString(); }
  res.json(msg);
});

app.get('/api/stats', (req, res) => {
  res.json({
    totalLeads: leads.length,
    activeLeads: leads.filter(l => l.status === 'active').length,
    totalSequences: sequences.length,
    totalMessages: sequences.reduce((a, s) => a + s.messages.length, 0),
    sentMessages: sequences.reduce((a, s) => a + s.messages.filter(m => m.sent).length, 0)
  });
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>FollowUp AI</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@300;400;500&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0d0f14;--surface:#13161d;--surface2:#1a1e28;--border:#252a38;--accent:#4f8eff;--accent2:#7c5cff;--green:#22c55e;--amber:#f59e0b;--red:#ef4444;--text:#e8eaf0;--muted:#6b7280}
body{background:var(--bg);color:var(--text);font-family:'Outfit',sans-serif}
.app{display:flex;flex-direction:column;min-height:100vh}
header{background:var(--surface);border-bottom:1px solid var(--border);padding:1rem 1.25rem;display:flex;justify-content:space-between;align-items:center}
.logo{font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;color:var(--accent)}
.logo span{color:var(--text)}
.nav{display:flex;gap:.5rem}
.nav-btn{background:none;border:none;color:var(--muted);font-family:'Outfit',sans-serif;font-size:.85rem;padding:.5rem .9rem;border-radius:8px;cursor:pointer;transition:all .15s}
.nav-btn:hover{color:var(--text);background:var(--surface2)}
.nav-btn.active{color:var(--accent);background:rgba(79,142,255,.1)}
.main{flex:1;padding:1.25rem;max-width:900px;width:100%;margin:0 auto}
.page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem}
h1{font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:700}
.sub{color:var(--muted);font-size:.82rem;margin-top:.15rem}
.btn{display:inline-flex;align-items:center;gap:.4rem;padding:.6rem 1.1rem;border-radius:8px;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:.85rem;font-weight:500;transition:all .15s}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:#6a9fff}
.btn-ghost{background:var(--surface2);color:var(--text);border:1px solid var(--border)}
.btn-ghost:hover{border-color:var(--accent);color:var(--accent)}
.btn-danger{background:rgba(239,68,68,.1);color:var(--red);border:1px solid rgba(239,68,68,.2)}
.btn-green{background:rgba(34,197,94,.1);color:var(--green);border:1px solid rgba(34,197,94,.2)}
.btn-sm{padding:.35rem .75rem;font-size:.8rem}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1.25rem}
@media(max-width:500px){.stats{grid-template-columns:repeat(2,1fr)}}
.stat{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:1rem}
.stat-label{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.4rem}
.stat-val{font-family:'Syne',sans-serif;font-size:1.8rem;font-weight:700}
.blue{color:var(--accent)}.green{color:var(--green)}.amber{color:var(--amber)}.purple{color:var(--accent2)}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:1rem}
.card-head{padding:1rem 1.25rem;border-bottom:1px solid var(--border);font-family:'Syne',sans-serif;font-size:.95rem;font-weight:700;display:flex;justify-content:space-between;align-items:center}
.lead-item{padding:1rem 1.25rem;border-bottom:1px solid rgba(37,42,56,.5);display:flex;justify-content:space-between;align-items:center;cursor:pointer;transition:background .15s}
.lead-item:last-child{border-bottom:none}
.lead-item:hover{background:var(--surface2)}
.lead-name{font-weight:500;font-size:.9rem}
.lead-email{color:var(--muted);font-size:.78rem;margin-top:.1rem}
.lead-right{display:flex;align-items:center;gap:.75rem}
.badge{display:inline-flex;align-items:center;padding:.2rem .55rem;border-radius:20px;font-size:.7rem;font-weight:500;white-space:nowrap}
.badge-blue{background:rgba(79,142,255,.12);color:var(--accent)}
.badge-green{background:rgba(34,197,94,.12);color:var(--green)}
.badge-amber{background:rgba(245,158,11,.12);color:var(--amber)}
.badge-purple{background:rgba(124,92,255,.12);color:var(--accent2)}
.badge-gray{background:var(--surface2);color:var(--muted)}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:flex-end;justify-content:center;z-index:1000;padding:0;backdrop-filter:blur(4px)}
@media(min-width:600px){.overlay{align-items:center;padding:1rem}}
.modal{background:var(--surface);border:1px solid var(--border);border-radius:16px 16px 0 0;width:100%;max-height:90vh;overflow-y:auto}
@media(min-width:600px){.modal{border-radius:16px;max-width:500px}}
.modal-head{padding:1.25rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;position:sticky;top:0;background:var(--surface)}
.modal-body{padding:1.25rem;display:flex;flex-direction:column;gap:.9rem}
.modal-foot{padding:1rem 1.25rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:.75rem;position:sticky;bottom:0;background:var(--surface)}
.form-group{display:flex;flex-direction:column;gap:.35rem}
label{font-size:.78rem;color:var(--muted);font-weight:500}
input,select,textarea{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:.6rem .85rem;color:var(--text);font-family:'Outfit',sans-serif;font-size:.875rem;outline:none;transition:border-color .15s;width:100%;-webkit-appearance:none}
input:focus,select:focus,textarea:focus{border-color:var(--accent)}
textarea{resize:vertical;min-height:70px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
.seq-panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-top:1rem}
.seq-head{padding:1rem 1.25rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.seq-title{font-family:'Syne',sans-serif;font-size:.9rem;font-weight:700}
.msg-list{padding:.75rem;display:flex;flex-direction:column;gap:.6rem}
.msg{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:.9rem}
.msg.sent{border-color:rgba(34,197,94,.3);opacity:.7}
.msg-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;flex-wrap:wrap;gap:.4rem}
.msg-meta{display:flex;align-items:center;gap:.4rem;font-size:.75rem;color:var(--muted)}
.msg-subject{font-size:.85rem;font-weight:500;margin-bottom:.35rem}
.msg-body{font-size:.82rem;color:var(--muted);line-height:1.6}
.msg-purpose{font-size:.7rem;color:var(--accent2);margin-top:.4rem}
.empty{text-align:center;padding:3rem 1.5rem;color:var(--muted)}
.empty-icon{font-size:2rem;margin-bottom:.75rem;opacity:.4}
.empty h3{font-family:'Syne',sans-serif;color:var(--text);margin-bottom:.35rem;font-size:1rem}
.empty p{font-size:.82rem}
.spinner{width:16px;height:16px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite;display:inline-block;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
.loading{display:flex;align-items:center;gap:.75rem;padding:1.5rem;color:var(--muted);font-size:.875rem}
.toast{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:var(--green);color:#fff;padding:.65rem 1.25rem;border-radius:8px;font-size:.85rem;font-weight:500;z-index:9999;white-space:nowrap}
.hidden{display:none!important}
.back-btn{display:flex;align-items:center;gap:.3rem;background:none;border:none;color:var(--muted);font-family:'Outfit',sans-serif;font-size:.85rem;cursor:pointer;padding:.4rem 0;margin-bottom:.75rem}
.back-btn:hover{color:var(--text)}
.detail-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1rem}
</style>
</head>
<body>
<div class="app">
  <header>
    <div class="logo">Follow<span>Up</span> AI</div>
    <div class="nav">
      <button class="nav-btn active" onclick="showView('leads')">Leads</button>
      <button class="nav-btn" onclick="showView('analytics')">Analytics</button>
    </div>
  </header>
  <div class="main">
    <!-- LEADS -->
    <div id="view-leads">
      <div class="page-header">
        <div><h1>Leads</h1><p class="sub" id="lead-count">Loading...</p></div>
        <button class="btn btn-primary" onclick="openModal()">+ Add Lead</button>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-label">Total</div><div class="stat-val blue" id="s-total">0</div></div>
        <div class="stat"><div class="stat-label">Active</div><div class="stat-val green" id="s-active">0</div></div>
        <div class="stat"><div class="stat-label">Sequences</div><div class="stat-val purple" id="s-seq">0</div></div>
        <div class="stat"><div class="stat-label">Sent</div><div class="stat-val amber" id="s-sent">0</div></div>
      </div>
      <div class="card">
        <div class="card-head">All Leads</div>
        <div id="leads-body"><div class="loading"><span class="spinner"></span> Loading...</div></div>
      </div>
    </div>
    <!-- ANALYTICS -->
    <div id="view-analytics" class="hidden">
      <div class="page-header"><div><h1>Analytics</h1><p class="sub">Performance overview</p></div></div>
      <div class="card"><div class="card-head">Sequence Stats</div>
      <div style="padding:1.25rem;color:var(--muted);line-height:2.2;font-size:.875rem">
        <p>📊 <strong style="color:var(--text)">Total messages:</strong> <span id="a-total">0</span></p>
        <p>✉️ <strong style="color:var(--text)">Sent:</strong> <span id="a-sent">0</span></p>
        <p>📬 <strong style="color:var(--text)">Send rate:</strong> <span id="a-rate">0</span>%</p>
      </div></div>
    </div>
    <!-- DETAIL -->
    <div id="view-detail" class="hidden">
      <button class="back-btn" onclick="showView('leads')">← Back to Leads</button>
      <div class="page-header">
        <div><h1 id="d-name"></h1><p class="sub" id="d-email"></p></div>
        <button class="btn btn-danger btn-sm" id="d-delete">🗑 Delete</button>
      </div>
      <div class="detail-stats">
        <div class="stat"><div class="stat-label">Stage</div><div style="font-size:.875rem;font-weight:500;margin-top:.25rem" id="d-stage"></div></div>
        <div class="stat"><div class="stat-label">Property</div><div style="font-size:.875rem;font-weight:500;margin-top:.25rem" id="d-property"></div></div>
        <div class="stat"><div class="stat-label">Added</div><div style="font-size:.875rem;font-weight:500;margin-top:.25rem" id="d-added"></div></div>
      </div>
      <div class="seq-panel">
        <div class="seq-head">
          <div><div class="seq-title">AI Follow-Up Sequence</div><div style="font-size:.78rem;color:var(--muted);margin-top:.15rem" id="seq-meta">No sequence yet</div></div>
          <button class="btn btn-primary btn-sm" id="gen-btn" onclick="generateSequence()">⚡ Generate</button>
        </div>
        <div id="seq-body"><div class="empty"><div class="empty-icon">✉️</div><h3>No sequence yet</h3><p>Tap Generate to create an AI follow-up sequence.</p></div></div>
      </div>
    </div>
  </div>
</div>

<!-- MODAL -->
<div class="overlay hidden" id="modal" onclick="closeModal()">
  <div class="modal" onclick="event.stopPropagation()">
    <div class="modal-head">Add New Lead <button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label>Full Name *</label><input id="f-name" placeholder="Jane Smith" type="text"/></div>
        <div class="form-group"><label>Email *</label><input id="f-email" placeholder="jane@email.com" type="email"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Phone</label><input id="f-phone" placeholder="+1 555 000 0000" type="tel"/></div>
        <div class="form-group"><label>Stage</label>
          <select id="f-stage"><option>Initial Inquiry</option><option>Viewing Scheduled</option><option>Offer Stage</option><option>Negotiating</option><option>Post-Viewing</option><option>Cold Lead</option></select>
        </div>
      </div>
      <div class="form-group"><label>Property Interest</label>
        <select id="f-property"><option value="">Select type...</option><option>Single Family Home</option><option>Condo/Apartment</option><option>Townhouse</option><option>Multi-Family</option><option>Land/Lot</option><option>Commercial</option><option>Luxury Property</option></select>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="f-notes" placeholder="Budget, location, timeline..."></textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveLead()" id="save-btn">+ Add Lead</button>
    </div>
  </div>
</div>

<script>
const API='';
let leads=[],currentLead=null;

async function fetchData(){
  try{
    const[lr,sr]=await Promise.all([fetch(API+'/api/leads'),fetch(API+'/api/stats')]);
    leads=await lr.json();
    const s=await sr.json();
    document.getElementById('s-total').textContent=s.totalLeads||0;
    document.getElementById('s-active').textContent=s.activeLeads||0;
    document.getElementById('s-seq').textContent=s.totalSequences||0;
    document.getElementById('s-sent').textContent=s.sentMessages||0;
    document.getElementById('lead-count').textContent=leads.length+' total leads';
    document.getElementById('a-total').textContent=s.totalMessages||0;
    document.getElementById('a-sent').textContent=s.sentMessages||0;
    document.getElementById('a-rate').textContent=s.totalMessages?Math.round((s.sentMessages/s.totalMessages)*100):0;
    renderLeads();
  }catch(e){document.getElementById('leads-body').innerHTML='<div class="loading">⚠️ Could not connect to server.</div>';}
}

function stageBadge(s){
  const m={'Initial Inquiry':'badge-blue','Viewing Scheduled':'badge-purple','Offer Stage':'badge-amber','Negotiating':'badge-amber','Post-Viewing':'badge-green','Cold Lead':'badge-gray'};
  return m[s]||'badge-gray';
}

function renderLeads(){
  const el=document.getElementById('leads-body');
  if(!leads.length){el.innerHTML='<div class="empty"><div class="empty-icon">👥</div><h3>No leads yet</h3><p>Add your first lead to get started.</p><br><button class="btn btn-primary" onclick="openModal()">+ Add First Lead</button></div>';return;}
  el.innerHTML=leads.map(l=>'<div class="lead-item" onclick="openLead(\''+l.id+'\')"><div><div class="lead-name">'+l.name+'</div><div class="lead-email">'+l.email+'</div></div><div class="lead-right"><span class="badge '+stageBadge(l.stage)+'">'+l.stage+'</span></div></div>').join('');
}

function showView(v){
  ['leads','analytics','detail'].forEach(x=>document.getElementById('view-'+x).classList.add('hidden'));
  document.getElementById('view-'+v).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach((b,i)=>b.classList.toggle('active',(v==='leads'&&i===0)||(v==='analytics'&&i===1)));
}

function openModal(){document.getElementById('modal').classList.remove('hidden');setTimeout(()=>document.getElementById('f-name').focus(),100);}
function closeModal(){document.getElementById('modal').classList.add('hidden');}

async function saveLead(){
  const name=document.getElementById('f-name').value.trim();
  const email=document.getElementById('f-email').value.trim();
  if(!name||!email){alert('Name and email are required');return;}
  const btn=document.getElementById('save-btn');
  btn.innerHTML='<span class="spinner"></span> Saving...';
  btn.disabled=true;
  try{
    const res=await fetch(API+'/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,phone:document.getElementById('f-phone').value,propertyInterest:document.getElementById('f-property').value,stage:document.getElementById('f-stage').value,notes:document.getElementById('f-notes').value})});
    const lead=await res.json();
    leads.unshift(lead);
    renderLeads();
    closeModal();
    ['f-name','f-email','f-phone','f-notes'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('f-property').value='';
    showToast('✓ Lead added!');
    fetchData();
  }catch(e){alert('Error saving. Try again.');}
  btn.innerHTML='+ Add Lead';
  btn.disabled=false;
}

function openLead(id){
  currentLead=leads.find(l=>l.id===id);
  if(!currentLead)return;
  document.getElementById('d-name').textContent=currentLead.name;
  document.getElementById('d-email').textContent=currentLead.email;
  document.getElementById('d-stage').textContent=currentLead.stage;
  document.getElementById('d-property').textContent=currentLead.propertyInterest||'—';
  document.getElementById('d-added').textContent=new Date(currentLead.createdAt).toLocaleDateString();
  document.getElementById('d-delete').onclick=()=>deleteLead(currentLead.id);
  document.getElementById('seq-body').innerHTML='<div class="empty"><div class="empty-icon">✉️</div><h3>No sequence yet</h3><p>Tap Generate to create an AI follow-up sequence.</p></div>';
  document.getElementById('seq-meta').textContent='No sequence yet';
  document.getElementById('gen-btn').textContent='⚡ Generate';
  showView('detail');
  loadSequence(id);
}

async function loadSequence(leadId){
  try{
    const seqs=await fetch(API+'/api/sequences/'+leadId).then(r=>r.json());
    if(seqs.length>0)renderSequence(seqs[seqs.length-1]);
  }catch(e){}
}

async function generateSequence(){
  if(!currentLead)return;
  document.getElementById('gen-btn').innerHTML='<span class="spinner"></span>';
  document.getElementById('seq-body').innerHTML='<div class="loading"><span class="spinner"></span> Generating for '+currentLead.name+'...</div>';
  try{
    const res=await fetch(API+'/api/sequences/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({leadId:currentLead.id,leadName:currentLead.name,propertyInterest:currentLead.propertyInterest,stage:currentLead.stage,notes:currentLead.notes})});
    const seq=await res.json();
    if(seq.error)throw new Error(seq.error);
    renderSequence(seq);
    showToast('✓ Sequence generated!');
    fetchData();
  }catch(e){document.getElementById('seq-body').innerHTML='<div class="loading">⚠️ Error: '+e.message+'</div>';}
  document.getElementById('gen-btn').textContent='⚡ Regenerate';
}

function renderSequence(seq){
  const sent=seq.messages.filter(m=>m.sent).length;
  document.getElementById('seq-meta').textContent=seq.messages.length+' messages · '+sent+' sent';
  document.getElementById('seq-body').innerHTML='<div class="msg-list">'+seq.messages.map(m=>'<div class="msg'+(m.sent?' sent':'')+'"><div class="msg-top"><div class="msg-meta">'+(m.channel==='email'?'📧':'💬')+' '+m.channel+' · Day '+m.day+(m.sent?' <span class="badge badge-green">✓ Sent</span>':'')+'</div>'+(m.sent?'':'<button class="btn btn-green btn-sm" onclick="markSent(\''+seq.id+'\',\''+m.id+'\',this)">✓ Sent</button>')+'</div>'+(m.subject?'<div class="msg-subject">'+m.subject+'</div>':'')+'<div class="msg-body">'+m.message+'</div><div class="msg-purpose">Goal: '+m.purpose+'</div></div>').join('')+'</div>';
}

async function markSent(seqId,msgId,btn){
  btn.disabled=true;btn.textContent='...';
  try{
    await fetch(API+'/api/sequences/'+seqId+'/messages/'+msgId+'/sent',{method:'POST'});
    btn.closest('.msg').classList.add('sent');btn.remove();
    showToast('✓ Marked as sent');fetchData();
  }catch(e){btn.disabled=false;btn.textContent='✓ Sent';}
}

async function deleteLead(id){
  if(!confirm('Delete this lead and their sequences?'))return;
  await fetch(API+'/api/leads/'+id,{method:'DELETE'});
  leads=leads.filter(l=>l.id!==id);
  renderLeads();showView('leads');fetchData();showToast('Lead deleted');
}

function showToast(msg){
  const t=document.createElement('div');t.className='toast';t.textContent=msg;
  document.body.appendChild(t);setTimeout(()=>t.remove(),3000);
}

fetchData();
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
