const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

let leads = [];
let sequences = [];

// ── API ROUTES ──────────────────────────

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

// ── FRONTEND ────────────────────────────

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
body{background:var(--bg);color:var(--text);font-family:'Outfit',sans-serif;min-height:100vh}
.app{display:flex;min-height:100vh}
.sidebar{width:220px;background:var(--surface);border-right:1px solid var(--border);padding:1.5rem 0;position:fixed;top:0;left:0;bottom:0;display:flex;flex-direction:column}
.logo{font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;color:var(--accent);padding:0 1.5rem;margin-bottom:2rem}
.logo span{color:var(--text)}
.nav-btn{display:flex;align-items:center;gap:.6rem;padding:.65rem 1.5rem;background:none;border:none;color:var(--muted);font-family:'Outfit',sans-serif;font-size:.875rem;cursor:pointer;width:100%;text-align:left;transition:all .15s}
.nav-btn:hover{color:var(--text);background:var(--surface2)}
.nav-btn.active{color:var(--accent);background:rgba(79,142,255,.08);border-right:2px solid var(--accent)}
.main{margin-left:220px;flex:1;padding:2rem}
.page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2rem}
h1{font-family:'Syne',sans-serif;font-size:1.5rem;font-weight:700}
.sub{color:var(--muted);font-size:.85rem;margin-top:.2rem}
.btn{display:inline-flex;align-items:center;gap:.4rem;padding:.6rem 1.2rem;border-radius:8px;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:.85rem;font-weight:500;transition:all .15s}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:#6a9fff;transform:translateY(-1px)}
.btn-ghost{background:var(--surface2);color:var(--text);border:1px solid var(--border)}
.btn-ghost:hover{border-color:var(--accent);color:var(--accent)}
.btn-danger{background:rgba(239,68,68,.1);color:var(--red);border:1px solid rgba(239,68,68,.2)}
.btn-green{background:rgba(34,197,94,.1);color:var(--green);border:1px solid rgba(34,197,94,.2)}
.btn-sm{padding:.4rem .8rem;font-size:.8rem}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2rem}
.stat{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.25rem}
.stat-label{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem}
.stat-val{font-family:'Syne',sans-serif;font-size:2rem;font-weight:700}
.blue{color:var(--accent)}.green{color:var(--green)}.amber{color:var(--amber)}.purple{color:var(--accent2)}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.card-head{padding:1.25rem 1.5rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-family:'Syne',sans-serif;font-size:.95rem;font-weight:700}
table{width:100%;border-collapse:collapse}
th{padding:.75rem 1.5rem;text-align:left;font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid var(--border);font-weight:500}
td{padding:1rem 1.5rem;font-size:.875rem;border-bottom:1px solid rgba(37,42,56,.5)}
tr:last-child td{border-bottom:none}
tr:hover td{background:var(--surface2);cursor:pointer}
.badge{display:inline-flex;align-items:center;padding:.2rem .6rem;border-radius:20px;font-size:.72rem;font-weight:500}
.badge-blue{background:rgba(79,142,255,.12);color:var(--accent)}
.badge-green{background:rgba(34,197,94,.12);color:var(--green)}
.badge-amber{background:rgba(245,158,11,.12);color:var(--amber)}
.badge-purple{background:rgba(124,92,255,.12);color:var(--accent2)}
.badge-gray{background:var(--surface2);color:var(--muted)}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem;backdrop-filter:blur(4px)}
.modal{background:var(--surface);border:1px solid var(--border);border-radius:16px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto}
.modal-head{padding:1.5rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:700}
.modal-body{padding:1.5rem;display:flex;flex-direction:column;gap:1rem}
.modal-foot{padding:1rem 1.5rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:.75rem}
.form-group{display:flex;flex-direction:column;gap:.4rem}
label{font-size:.8rem;color:var(--muted);font-weight:500}
input,select,textarea{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:.65rem .9rem;color:var(--text);font-family:'Outfit',sans-serif;font-size:.875rem;outline:none;transition:border-color .15s;width:100%}
input:focus,select:focus,textarea:focus{border-color:var(--accent)}
textarea{resize:vertical;min-height:80px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.seq-panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-top:1.5rem}
.seq-head{padding:1.25rem 1.5rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.seq-title{font-family:'Syne',sans-serif;font-size:.95rem;font-weight:700}
.msg-list{padding:1rem;display:flex;flex-direction:column;gap:.75rem}
.msg{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:1rem}
.msg.sent{border-color:rgba(34,197,94,.3);opacity:.7}
.msg-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem}
.msg-meta{display:flex;align-items:center;gap:.5rem;font-size:.75rem;color:var(--muted)}
.msg-subject{font-size:.85rem;font-weight:500;margin-bottom:.4rem}
.msg-body{font-size:.82rem;color:var(--muted);line-height:1.6}
.msg-purpose{font-size:.72rem;color:var(--accent2);margin-top:.5rem}
.empty{text-align:center;padding:4rem 2rem;color:var(--muted)}
.empty-icon{font-size:2.5rem;margin-bottom:1rem;opacity:.4}
.spinner{width:18px;height:18px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite;display:inline-block;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
.loading{display:flex;align-items:center;gap:1rem;padding:2rem;color:var(--muted);font-size:.875rem}
.toast{position:fixed;bottom:2rem;right:2rem;background:var(--green);color:#fff;padding:.75rem 1.25rem;border-radius:8px;font-size:.875rem;font-weight:500;z-index:9999;animation:fadeIn .3s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.hidden{display:none}
.actions{display:flex;gap:.5rem}
</style>
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="logo">Follow<span>Up</span> AI</div>
    <button class="nav-btn active" onclick="showView('leads')">👤 Leads</button>
    <button class="nav-btn" onclick="showView('analytics')">📊 Analytics</button>
  </aside>
  <main class="main">
    <!-- LEADS VIEW -->
    <div id="view-leads">
      <div class="page-header">
        <div><h1>Leads</h1><p class="sub" id="lead-count">0 total leads</p></div>
        <button class="btn btn-primary" onclick="openModal()">+ Add Lead</button>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-label">Total Leads</div><div class="stat-val blue" id="s-total">0</div></div>
        <div class="stat"><div class="stat-label">Active</div><div class="stat-val green" id="s-active">0</div></div>
        <div class="stat"><div class="stat-label">Sequences</div><div class="stat-val purple" id="s-seq">0</div></div>
        <div class="stat"><div class="stat-label">Sent</div><div class="stat-val amber" id="s-sent">0</div></div>
      </div>
      <div class="card">
        <div class="card-head">All Leads</div>
        <div id="leads-body"><div class="loading"><span class="spinner"></span> Loading leads...</div></div>
      </div>
    </div>
    <!-- ANALYTICS VIEW -->
    <div id="view-analytics" class="hidden">
      <div class="page-header"><div><h1>Analytics</h1><p class="sub">Sequence performance</p></div></div>
      <div class="card"><div class="card-head">Performance</div>
      <div style="padding:2rem;color:var(--muted);line-height:2;font-size:.875rem">
        <p>📊 <strong style="color:var(--text)">Total messages:</strong> <span id="a-total">0</span></p>
        <p>✉️ <strong style="color:var(--text)">Sent:</strong> <span id="a-sent">0</span></p>
        <p>📬 <strong style="color:var(--text)">Send rate:</strong> <span id="a-rate">0</span>%</p>
      </div></div>
    </div>
    <!-- LEAD DETAIL VIEW -->
    <div id="view-detail" class="hidden">
      <div class="page-header">
        <div>
          <button class="btn btn-ghost btn-sm" onclick="showView('leads')" style="margin-bottom:.75rem">← Back</button>
          <h1 id="d-name"></h1><p class="sub" id="d-email"></p>
        </div>
        <button class="btn btn-danger btn-sm" id="d-delete">🗑 Delete</button>
      </div>
      <div class="stats" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat"><div class="stat-label">Stage</div><div style="font-size:.95rem;font-weight:500;margin-top:.25rem" id="d-stage"></div></div>
        <div class="stat"><div class="stat-label">Property</div><div style="font-size:.95rem;font-weight:500;margin-top:.25rem" id="d-property"></div></div>
        <div class="stat"><div class="stat-label">Added</div><div style="font-size:.95rem;font-weight:500;margin-top:.25rem" id="d-added"></div></div>
      </div>
      <div class="seq-panel">
        <div class="seq-head">
          <div><div class="seq-title">AI Follow-Up Sequence</div><div style="font-size:.8rem;color:var(--muted);margin-top:.2rem" id="seq-meta">No sequence yet</div></div>
          <button class="btn btn-primary btn-sm" id="gen-btn" onclick="generateSequence()">⚡ Generate</button>
        </div>
        <div id="seq-body"><div class="empty"><div class="empty-icon">✉️</div><h3>No sequence yet</h3><p>Generate an AI-powered follow-up sequence.</p></div></div>
      </div>
    </div>
  </main>
</div>

<!-- ADD LEAD MODAL -->
<div class="overlay hidden" id="modal">
  <div class="modal" onclick="event.stopPropagation()">
    <div class="modal-head">Add New Lead <button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label>Full Name *</label><input id="f-name" placeholder="Jane Smith"/></div>
        <div class="form-group"><label>Email *</label><input id="f-email" placeholder="jane@email.com"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Phone</label><input id="f-phone" placeholder="+1 555 000 0000"/></div>
        <div class="form-group"><label>Stage</label>
          <select id="f-stage">
            <option>Initial Inquiry</option><option>Viewing Scheduled</option><option>Offer Stage</option><option>Negotiating</option><option>Post-Viewing</option><option>Cold Lead</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Property Interest</label>
        <select id="f-property">
          <option value="">Select type...</option><option>Single Family Home</option><option>Condo/Apartment</option><option>Townhouse</option><option>Multi-Family</option><option>Land/Lot</option><option>Commercial</option><option>Luxury Property</option>
        </select>
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
const API = '';
let leads = [], currentLead = null;

async function fetchData() {
  try {
    const [lr, sr] = await Promise.all([fetch(API+'/api/leads'), fetch(API+'/api/stats')]);
    leads = await lr.json();
    const stats = await sr.json();
    document.getElementById('s-total').textContent = stats.totalLeads||0;
    document.getElementById('s-active').textContent = stats.activeLeads||0;
    document.getElementById('s-seq').textContent = stats.totalSequences||0;
    document.getElementById('s-sent').textContent = stats.sentMessages||0;
    document.getElementById('lead-count').textContent = leads.length+' total leads';
    document.getElementById('a-total').textContent = stats.totalMessages||0;
    document.getElementById('a-sent').textContent = stats.sentMessages||0;
    document.getElementById('a-rate').textContent = stats.totalMessages ? Math.round((stats.sentMessages/stats.totalMessages)*100) : 0;
    renderLeads();
  } catch(e) { console.error(e); }
}

function stageBadge(s) {
  const m = {'Initial Inquiry':'badge-blue','Viewing Scheduled':'badge-purple','Offer Stage':'badge-amber','Negotiating':'badge-amber','Post-Viewing':'badge-green','Cold Lead':'badge-gray'};
  return m[s]||'badge-gray';
}

function renderLeads() {
  const el = document.getElementById('leads-body');
  if (!leads.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">👥</div><h3>No leads yet</h3><p>Add your first lead to get started.</p><button class="btn btn-primary" style="margin-top:1.25rem" onclick="openModal()">+ Add First Lead</button></div>'; return; }
  el.innerHTML = '<table><thead><tr><th>Lead</th><th>Property</th><th>Stage</th><th>Added</th><th>Actions</th></tr></thead><tbody>'+
    leads.map(l => '<tr onclick="openLead(\''+l.id+'\')"><td><div style="font-weight:500">'+l.name+'</div><div style="color:var(--muted);font-size:.8rem">'+l.email+'</div></td><td>'+(l.propertyInterest||'—')+'</td><td><span class="badge '+stageBadge(l.stage)+'">'+l.stage+'</span></td><td style="color:var(--muted);font-size:.82rem">'+new Date(l.createdAt).toLocaleDateString()+'</td><td onclick="event.stopPropagation()"><div class="actions"><button class="btn btn-ghost btn-sm" onclick="openLead(\''+l.id+'\')">View →</button><button class="btn btn-danger btn-sm" onclick="deleteLead(\''+l.id+'\')">🗑</button></div></td></tr>'
    ).join('')+'</tbody></table>';
}

function showView(v) {
  ['leads','analytics','detail'].forEach(x => document.getElementById('view-'+x).classList.add('hidden'));
  document.getElementById('view-'+v).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach((b,i) => b.classList.toggle('active', (v==='leads'&&i===0)||(v==='analytics'&&i===1)));
}

function openModal() { document.getElementById('modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

async function saveLead() {
  const name = document.getElementById('f-name').value;
  const email = document.getElementById('f-email').value;
  if (!name||!email) return alert('Name and email required');
  document.getElementById('save-btn').innerHTML = '<span class="spinner"></span> Saving...';
  try {
    const res = await fetch(API+'/api/leads', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, email, phone: document.getElementById('f-phone').value, propertyInterest: document.getElementById('f-property').value, stage: document.getElementById('f-stage').value, notes: document.getElementById('f-notes').value }) });
    const lead = await res.json();
    leads.unshift(lead);
    renderLeads();
    closeModal();
    ['f-name','f-email','f-phone','f-notes'].forEach(id => document.getElementById(id).value='');
    showToast('✓ Lead added!');
    fetchData();
  } catch(e) { alert('Error saving lead'); }
  document.getElementById('save-btn').innerHTML = '+ Add Lead';
}

function openLead(id) {
  currentLead = leads.find(l => l.id===id);
  if (!currentLead) return;
  document.getElementById('d-name').textContent = currentLead.name;
  document.getElementById('d-email').textContent = currentLead.email;
  document.getElementById('d-stage').textContent = currentLead.stage;
  document.getElementById('d-property').textContent = currentLead.propertyInterest||'—';
  document.getElementById('d-added').textContent = new Date(currentLead.createdAt).toLocaleDateString();
  document.getElementById('d-delete').onclick = () => deleteLead(currentLead.id);
  document.getElementById('seq-body').innerHTML = '<div class="empty"><div class="empty-icon">✉️</div><h3>No sequence yet</h3><p>Generate an AI-powered follow-up sequence.</p></div>';
  document.getElementById('seq-meta').textContent = 'No sequence yet';
  document.getElementById('gen-btn').textContent = '⚡ Generate';
  showView('detail');
  loadSequence(id);
}

async function loadSequence(leadId) {
  try {
    const seqs = await fetch(API+'/api/sequences/'+leadId).then(r=>r.json());
    if (seqs.length>0) renderSequence(seqs[seqs.length-1]);
  } catch(e) {}
}

async function generateSequence() {
  if (!currentLead) return;
  document.getElementById('gen-btn').innerHTML = '<span class="spinner"></span> Generating...';
  document.getElementById('seq-body').innerHTML = '<div class="loading"><span class="spinner"></span> AI is crafting a sequence for '+currentLead.name+'...</div>';
  try {
    const res = await fetch(API+'/api/sequences/generate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ leadId:currentLead.id, leadName:currentLead.name, propertyInterest:currentLead.propertyInterest, stage:currentLead.stage, notes:currentLead.notes }) });
    const seq = await res.json();
    renderSequence(seq);
    showToast('✓ Sequence generated!');
    fetchData();
  } catch(e) { document.getElementById('seq-body').innerHTML = '<div class="loading">Error generating sequence. Try again.</div>'; }
  document.getElementById('gen-btn').textContent = '⚡ Regenerate';
}

function renderSequence(seq) {
  document.getElementById('seq-meta').textContent = seq.messages.length+' messages · '+seq.messages.filter(m=>m.sent).length+' sent';
  document.getElementById('seq-body').innerHTML = '<div class="msg-list">'+
    seq.messages.map(m => '<div class="msg'+(m.sent?' sent':'')+'"><div class="msg-top"><div class="msg-meta">'+(m.channel==='email'?'📧':'💬')+' '+m.channel+' · Day '+m.day+(m.sent?' <span class="badge badge-green">✓ Sent</span>':'')+'</div>'+(m.sent?'':'<button class="btn btn-green btn-sm" onclick="markSent(\''+seq.id+'\',\''+m.id+'\',this)">✓ Mark Sent</button>')+'</div>'+(m.subject?'<div class="msg-subject">'+m.subject+'</div>':'')+'<div class="msg-body">'+m.message+'</div><div class="msg-purpose">Goal: '+m.purpose+'</div></div>'
    ).join('')+'</div>';
}

async function markSent(seqId, msgId, btn) {
  btn.textContent = '...';
  try {
    await fetch(API+'/api/sequences/'+seqId+'/messages/'+msgId+'/sent', {method:'POST'});
    btn.closest('.msg').classList.add('sent');
    btn.remove();
    showToast('✓ Marked as sent');
    fetchData();
  } catch(e) {}
}

async function deleteLead(id) {
  if (!confirm('Delete this lead?')) return;
  await fetch(API+'/api/leads/'+id, {method:'DELETE'});
  leads = leads.filter(l=>l.id!==id);
  renderLeads();
  showView('leads');
  fetchData();
  showToast('Lead deleted');
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 3000);
}

fetchData();
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
