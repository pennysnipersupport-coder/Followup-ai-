import { useState, useEffect } from "react";

const API = "https://followup-ai-production-b51d.up.railway.app/api";

const STAGES = ["Initial Inquiry", "Viewing Scheduled", "Offer Stage", "Negotiating", "Post-Viewing", "Cold Lead"];
const PROPERTY_TYPES = ["Single Family Home", "Condo/Apartment", "Townhouse", "Multi-Family", "Land/Lot", "Commercial", "Luxury Property"];

const Icon = ({ name, size = 16 }) => {
  const icons = {
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
    mail: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>,
    sms: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
    spark: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    arrow: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    chart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  };
  return icons[name] || null;
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Outfit:wght@300;400;500&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --bg: #0d0f14; --surface: #13161d; --surface2: #1a1e28;
    --border: #252a38; --accent: #4f8eff; --accent2: #7c5cff;
    --green: #22c55e; --amber: #f59e0b; --red: #ef4444;
    --text: #e8eaf0; --muted: #6b7280;
    --font-head: 'Syne', sans-serif; --font-body: 'Outfit', sans-serif;
  }
  body { background: var(--bg); color: var(--text); font-family: var(--font-body); }
  .app { display: flex; min-height: 100vh; }
  .sidebar { width: 220px; min-height: 100vh; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 1.5rem 0; position: fixed; top: 0; left: 0; bottom: 0; }
  .sidebar-logo { font-family: var(--font-head); font-size: 1.1rem; font-weight: 800; color: var(--accent); padding: 0 1.5rem; margin-bottom: 2rem; }
  .sidebar-logo span { color: var(--text); }
  .nav-item { display: flex; align-items: center; gap: 0.65rem; padding: 0.65rem 1.5rem; cursor: pointer; font-size: 0.875rem; color: var(--muted); transition: all 0.15s; border: none; background: none; width: 100%; text-align: left; }
  .nav-item:hover { color: var(--text); background: var(--surface2); }
  .nav-item.active { color: var(--accent); background: rgba(79,142,255,0.08); border-right: 2px solid var(--accent); }
  .main { margin-left: 220px; flex: 1; padding: 2rem; }
  .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
  .page-title { font-family: var(--font-head); font-size: 1.5rem; font-weight: 700; }
  .page-sub { color: var(--muted); font-size: 0.85rem; margin-top: 0.2rem; }
  .btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1.2rem; border-radius: 8px; border: none; cursor: pointer; font-family: var(--font-body); font-size: 0.85rem; font-weight: 500; transition: all 0.15s; }
  .btn-primary { background: var(--accent); color: white; }
  .btn-primary:hover { background: #6a9fff; transform: translateY(-1px); }
  .btn-ghost { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
  .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
  .btn-danger { background: rgba(239,68,68,0.1); color: var(--red); border: 1px solid rgba(239,68,68,0.2); }
  .btn-green { background: rgba(34,197,94,0.1); color: var(--green); border: 1px solid rgba(34,197,94,0.2); }
  .btn-sm { padding: 0.4rem 0.8rem; font-size: 0.8rem; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; }
  .stat-label { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.5rem; }
  .stat-value { font-family: var(--font-head); font-size: 2rem; font-weight: 700; }
  .stat-value.blue { color: var(--accent); } .stat-value.green { color: var(--green); } .stat-value.amber { color: var(--amber); } .stat-value.purple { color: var(--accent2); }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .card-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .card-title { font-family: var(--font-head); font-size: 0.95rem; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; }
  th { padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--border); font-weight: 500; }
  td { padding: 1rem 1.5rem; font-size: 0.875rem; border-bottom: 1px solid rgba(37,42,56,0.5); }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--surface2); }
  .lead-name { font-weight: 500; } .lead-email { color: var(--muted); font-size: 0.8rem; }
  .badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.72rem; font-weight: 500; }
  .badge-blue { background: rgba(79,142,255,0.12); color: var(--accent); }
  .badge-green { background: rgba(34,197,94,0.12); color: var(--green); }
  .badge-amber { background: rgba(245,158,11,0.12); color: var(--amber); }
  .badge-purple { background: rgba(124,92,255,0.12); color: var(--accent2); }
  .badge-gray { background: var(--surface2); color: var(--muted); }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; backdrop-filter: blur(4px); }
  .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; animation: slideUp 0.2s ease; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .modal-header { padding: 1.5rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .modal-title { font-family: var(--font-head); font-size: 1.1rem; font-weight: 700; }
  .modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
  .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 0.75rem; }
  .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
  .form-label { font-size: 0.8rem; color: var(--muted); font-weight: 500; }
  .form-input { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 0.65rem 0.9rem; color: var(--text); font-family: var(--font-body); font-size: 0.875rem; outline: none; transition: border-color 0.15s; width: 100%; }
  .form-input:focus { border-color: var(--accent); }
  .form-input::placeholder { color: var(--muted); }
  select.form-input option { background: var(--surface2); }
  textarea.form-input { resize: vertical; min-height: 80px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .sequence-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; margin-top: 1.5rem; }
  .sequence-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); }
  .message-list { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .message-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 1rem; transition: border-color 0.15s; }
  .message-card.sent { border-color: rgba(34,197,94,0.3); opacity: 0.7; }
  .message-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; }
  .message-meta { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--muted); }
  .message-subject { font-size: 0.85rem; font-weight: 500; margin-bottom: 0.4rem; }
  .message-body { font-size: 0.82rem; color: var(--muted); line-height: 1.6; }
  .message-purpose { font-size: 0.72rem; color: var(--accent2); margin-top: 0.5rem; }
  .empty { text-align: center; padding: 4rem 2rem; color: var(--muted); }
  .empty-icon { font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.4; }
  .empty h3 { font-family: var(--font-head); color: var(--text); margin-bottom: 0.5rem; }
  .spinner { width: 18px; height: 18px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .generating { display: flex; align-items: center; gap: 1rem; padding: 2rem; color: var(--muted); font-size: 0.875rem; }
  .toast { position: fixed; bottom: 2rem; right: 2rem; background: var(--green); color: white; padding: 0.75rem 1.25rem; border-radius: 8px; font-size: 0.875rem; font-weight: 500; animation: toastIn 0.3s ease; z-index: 9999; }
  @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .actions { display: flex; gap: 0.5rem; }
`; const stageBadge = (stage) => {
  const map = { "Initial Inquiry": "badge-blue", "Viewing Scheduled": "badge-purple", "Offer Stage": "badge-amber", "Negotiating": "badge-amber", "Post-Viewing": "badge-green", "Cold Lead": "badge-gray" };
  return map[stage] || "badge-gray";
};

function AddLeadModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', propertyInterest: '', stage: 'Initial Inquiry', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = async () => {
    if (!form.name || !form.email) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const lead = await res.json();
      onSave(lead); onClose();
    } catch (e) { console.error(e); }
    setSaving(false);
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">Add New Lead</span><button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" /></button></div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" placeholder="Jane Smith" value={form.name} onChange={e => set('name', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Email *</label><input className="form-input" placeholder="jane@email.com" value={form.email} onChange={e => set('email', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" placeholder="+1 555 000 0000" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Stage</label><select className="form-input" value={form.stage} onChange={e => set('stage', e.target.value)}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="form-group"><label className="form-label">Property Interest</label><select className="form-input" value={form.propertyInterest} onChange={e => set('propertyInterest', e.target.value)}><option value="">Select type...</option>{PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" placeholder="Budget, location preference, timeline..." value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.email}>{saving ? <span className="spinner" /> : <Icon name="plus" />}{saving ? 'Saving...' : 'Add Lead'}</button>
        </div>
      </div>
    </div>
  );
}

function LeadDetail({ lead, onBack, onDelete }) {
  const [sequence, setSequence] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState('');
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  useEffect(() => {
    fetch(`${API}/sequences/${lead.id}`).then(r => r.json()).then(seqs => { if (seqs.length > 0) setSequence(seqs[seqs.length - 1]); }).catch(() => {});
  }, [lead.id]);
  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API}/sequences/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId: lead.id, leadName: lead.name, propertyInterest: lead.propertyInterest, stage: lead.stage, notes: lead.notes }) });
      const seq = await res.json();
      setSequence(seq); showToast('✓ Sequence generated!');
    } catch (e) { console.error(e); }
    setGenerating(false);
  };
  const markSent = async (seqId, msgId) => {
    try {
      await fetch(`${API}/sequences/${seqId}/messages/${msgId}/sent`, { method: 'POST' });
      setSequence(s => ({ ...s, messages: s.messages.map(m => m.id === msgId ? { ...m, sent: true } : m) }));
      showToast('✓ Marked as sent');
    } catch (e) {}
  };
  return (
    <div>
      <div className="page-header">
        <div><button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: '0.75rem' }}>← Back</button><h1 className="page-title">{lead.name}</h1><p className="page-sub">{lead.email}</p></div>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(lead.id)}><Icon name="trash" size={14} /> Delete</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[{ label: 'Stage', value: lead.stage }, { label: 'Property', value: lead.propertyInterest || '—' }, { label: 'Added', value: new Date(lead.createdAt).toLocaleDateString() }].map(({ label, value }) => (
          <div key={label} className="stat-card"><div className="stat-label">{label}</div><div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.25rem' }}>{value}</div></div>
        ))}
      </div>
      <div className="sequence-panel">
        <div className="sequence-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div className="card-title">AI Follow-Up Sequence</div><div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{sequence ? `${sequence.messages.length} messages` : 'No sequence yet'}</div></div>
          <button className="btn btn-primary btn-sm" onClick={generate} disabled={generating}>{generating ? <span className="spinner" /> : <Icon name="spark" size={14} />}{generating ? 'Generating...' : sequence ? 'Regenerate' : 'Generate'}</button>
        </div>
        {generating && <div className="generating"><span className="spinner" />Generating sequence for {lead.name}...</div>}
        {!generating && !sequence && <div className="empty"><div className="empty-icon">✉️</div><h3>No sequence yet</h3><p>Generate an AI-powered follow-up sequence.</p></div>}
        {sequence && (
          <div className="message-list">
            {sequence.messages.map(msg => (
              <div key={msg.id} className={`message-card ${msg.sent ? 'sent' : ''}`}>
                <div className="message-header">
                  <div className="message-meta">{msg.channel === 'email' ? <Icon name="mail" size={13} /> : <Icon name="sms" size={13} />}<span>{msg.channel}</span><span>·</span><span>Day {msg.day}</span>{msg.sent && <span className="badge badge-green"><Icon name="check" size={10} /> Sent</span>}</div>
                  {!msg.sent && <button className="btn btn-green btn-sm" onClick={() => markSent(sequence.id, msg.id)}><Icon name="check" size={12} /> Mark Sent</button>}
                </div>
                {msg.subject && <div className="message-subject">{msg.subject}</div>}
                <div className="message-body">{msg.message}</div>
                <div className="message-purpose">Goal: {msg.purpose}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('leads');
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [leadsRes, statsRes] = await Promise.all([fetch(`${API}/leads`), fetch(`${API}/stats`)]);
      setLeads(await leadsRes.json());
      setStats(await statsRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this lead?')) return;
    await fetch(`${API}/leads/${id}`, { method: 'DELETE' });
    setLeads(l => l.filter(x => x.id !== id));
    setSelectedLead(null);
  };

  if (selectedLead) return (
    <><style>{styles}</style>
    <div className="app">
      <aside className="sidebar"><div className="sidebar-logo">Follow<span>Up</span> AI</div><button className="nav-item active"><Icon name="user" size={15} /> Leads</button></aside>
      <main className="main"><LeadDetail lead={selectedLead} onBack={() => setSelectedLead(null)} onDelete={handleDelete} /></main>
    </div></>
  );

  return (
    <><style>{styles}</style>
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">Follow<span>Up</span> AI</div>
        <button className={`nav-item ${view === 'leads' ? 'active' : ''}`} onClick={() => setView('leads')}><Icon name="user" size={15} /> Leads</button>
        <button className={`nav-item ${view === 'analytics' ? 'active' : ''}`} onClick={() => setView('analytics')}><Icon name="chart" size={15} /> Analytics</button>
      </aside>
      <main className="main">
        <div className="page-header">
          <div><h1 className="page-title">{view === 'leads' ? 'Leads' : 'Analytics'}</h1><p className="page-sub">{leads.length} total leads</p></div>
          {view === 'leads' && <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={15} /> Add Lead</button>}
        </div>
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">Total Leads</div><div className="stat-value blue">{stats.totalLeads ?? 0}</div></div>
          <div className="stat-card"><div className="stat-label">Active</div><div className="stat-value green">{stats.activeLeads ?? 0}</div></div>
          <div className="stat-card"><div className="stat-label">Sequences</div><div className="stat-value purple">{stats.totalSequences ?? 0}</div></div>
          <div className="stat-card"><div className="stat-label">Sent</div><div className="stat-value amber">{stats.sentMessages ?? 0}</div></div>
        </div>
        {view === 'leads' && (
          <div className="card">
            <div className="card-header"><span className="card-title">All Leads</span></div>
            {loading ? <div className="generating"><span className="spinner" /> Loading...</div> : leads.length === 0 ? (
              <div className="empty"><div className="empty-icon">👥</div><h3>No leads yet</h3><p>Add your first lead to get started.</p><button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={() => setShowAdd(true)}><Icon name="plus" size={15} /> Add First Lead</button></div>
            ) : (
              <table>
                <thead><tr><th>Lead</th><th>Property</th><th>Stage</th><th>Added</th><th>Actions</th></tr></thead>
                <tbody>{leads.map(lead => (
                  <tr key={lead.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLead(lead)}>
                    <td><div className="lead-name">{lead.name}</div><div className="lead-email">{lead.email}</div></td>
                    <td>{lead.propertyInterest || '—'}</td>
                    <td><span className={`badge ${stageBadge(lead.stage)}`}>{lead.stage}</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{new Date(lead.createdAt).toLocaleDateString()}</td>
                    <td onClick={e => e.stopPropagation()}><div className="actions"><button className="btn btn-ghost btn-sm" onClick={() => setSelectedLead(lead)}>View <Icon name="arrow" size={12} /></button><button className="btn btn-danger btn-sm" onClick={() => handleDelete(lead.id)}><Icon name="trash" size={12} /></button></div></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        )}
        {view === 'analytics' && (
          <div className="card"><div className="card-header"><span className="card-title">Performance</span></div>
          <div style={{ padding: '2rem', color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 2 }}>
            <p>📊 <strong style={{ color: 'var(--text)' }}>Total messages:</strong> {stats.totalMessages ?? 0}</p>
            <p>✉️ <strong style={{ color: 'var(--text)' }}>Sent:</strong> {stats.sentMessages ?? 0}</p>
            <p>📬 <strong style={{ color: 'var(--text)' }}>Send rate:</strong> {stats.totalMessages ? Math.round((stats.sentMessages / stats.totalMessages) * 100) : 0}%</p>
          </div></div>
        )}
      </main>
    </div>
    {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} onSave={lead => { setLeads(l => [lead, ...l]); }} />}
    </>
  );
}

