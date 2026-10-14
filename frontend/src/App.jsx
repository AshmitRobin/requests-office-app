import React, { useEffect, useState } from 'react';
import { api, downloadUrl } from './api';

const demoUsers = [
  ['Coordinator','coordinator@demo.org'], ['Specialist','specialist@demo.org'],
  ['Requester — Main','requester.main@demo.org'], ['Requester — North','requester.north@demo.org']
];
const statusLabels = {
  submitted:'Submitted', needs_correction:'Needs correction', under_review:'Under review',
  with_specialist:'With specialist', specialist_returned:'Specialist returned',
  decision_made:'Decision made', completed:'Completed'
};
const money = v => v === null || v === undefined || v === '' ? '—' : `₹${Number(v).toLocaleString('en-IN')}`;

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('ro_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('ro_user') || 'null'));
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState({ email:'requester.main@demo.org', password:'Demo@12345' });
  const [form, setForm] = useState({ campus:'main', department:'', title:'', category:'', people_involved:'', amount:'', description:'' });
  const [files, setFiles] = useState([]);
  const [actionNote, setActionNote] = useState('');
  const [decision, setDecision] = useState('');

  async function refresh(preferredId) {
    if (!token) return;
    const rows = await api('/requests', { token });
    setRequests(rows);
    const id = preferredId ?? selected?.id;
    if (id) {
      const match = rows.find(r => r.id === id);
      if (match) await openRequest(id);
      else setSelected(null);
    }
  }
  async function openRequest(id) {
    const item = await api(`/requests/${id}`, { token });
    setSelected(item); setActionNote(''); setDecision('');
  }
  useEffect(() => { if (token) refresh().catch(e => setError(e.message)); }, [token]);

  async function signIn(e) {
    e.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      const data = await api('/auth/login', { method:'POST', body:JSON.stringify(login) });
      localStorage.setItem('ro_token', data.token); localStorage.setItem('ro_user', JSON.stringify(data.user));
      setToken(data.token); setUser(data.user);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  function signOut() {
    localStorage.removeItem('ro_token'); localStorage.removeItem('ro_user');
    setToken(''); setUser(null); setRequests([]); setSelected(null); setError(''); setMessage('');
  }
  async function createRequest(e) {
    e.preventDefault(); setError(''); setMessage('');
    if (!form.department.trim() || !form.title.trim() || !form.category.trim() || !form.description.trim()) {
      setError('Fill in department, title, category and description.'); return;
    }
    if (form.amount !== '' && (!Number.isFinite(Number(form.amount)) || Number(form.amount) < 0)) {
      setError('Amount must be zero or a positive number.'); return;
    }
    setBusy(true);
    try {
      const created = await api('/requests', { token, method:'POST', body:JSON.stringify(form) });
      if (files.length) {
        const fd = new FormData(); files.forEach(f => fd.append('documents', f));
        await api(`/requests/${created.id}/documents`, { token, method:'POST', body:fd });
      }
      setForm({ campus:user.campus || 'main', department:user.department || '', title:'', category:'', people_involved:'', amount:'', description:'' });
      setFiles([]); setMessage(`Request #${created.id} submitted.`); await refresh(created.id);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function doAction(path, body, successText) {
    setError(''); setMessage(''); setBusy(true);
    try { const data = await api(path, { token, method:'PATCH', body:JSON.stringify(body) }); setMessage(successText); await refresh(data.id); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function uploadMore(e) {
    e.preventDefault(); if (!files.length) { setError('Choose one or more files first.'); return; }
    const fd = new FormData(); files.forEach(f => fd.append('documents', f));
    setError(''); setMessage(''); setBusy(true);
    try { await api(`/requests/${selected.id}/documents`, { token, method:'POST', body:fd }); setFiles([]); setMessage('Documents uploaded.'); await openRequest(selected.id); await refresh(selected.id); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  if (!token || !user) return <main>
    <header className="hero"><div className="eyebrow">CENTRE FOR ARTIFICIAL INTELLIGENCE · INTERNSHIP ASSIGNMENT</div><h1>Requests Office</h1><p className="lead">One clear place to submit, review and track requests across campuses.</p></header>
    <section className="intro card">
      <h2>Information for Applicants</h2>
      <p>Anyone with an organisation email can raise a request from the <b>main, north or city campus</b>. You will need your name, campus, department, a short title, category, names of other people involved, and the amount if any.</p>
      <p>Attach a <b>signed covering letter, a short description, and any quotations or invoices</b>. Files must be readable and under 10 MB. The office checks your request within <b>2 working days</b> and may ask you to correct things more than once. Some requests go for expert review, which takes up to <b>7 working days</b>. You never deal with the expert directly.</p>
      <p>When a decision is made, you confirm you have seen it, and only then is the request closed.</p>
      <div className="contact"><div><b>Office hours</b><span>Monday–Friday, 9:30 AM–4:30 PM</span></div><div><b>Public holidays</b><span>Closed</span></div><div><b>Help</b><span>Visit or call 080 0000 0000</span></div></div>
    </section>
    <section className="login card"><h2>Sign in to continue</h2><p className="muted">Use a demo account to explore the role-specific workflow.</p>
      <form onSubmit={signIn} className="stack">
        <label>Email<input type="email" required value={login.email} onChange={e=>setLogin({...login,email:e.target.value})}/></label>
        <label>Password<input type="password" required value={login.password} onChange={e=>setLogin({...login,password:e.target.value})}/></label>
        {error && <p className="alert error">{error}</p>}
        <button disabled={busy}>{busy?'Signing in…':'Sign in'}</button>
      </form>
      <div className="demo"><b>Demo users · password: Demo@12345</b>{demoUsers.map(([label,email])=><button className="demo-button" key={email} onClick={()=>setLogin({email,password:'Demo@12345'})}>{label}: {email}</button>)}</div>
    </section>
    <footer>Requests Office · Demo application for learning and evaluation</footer>
  </main>;

  return <main>
    <header className="topbar"><div><div className="eyebrow">REQUESTS OFFICE</div><h1>Request dashboard</h1></div><div className="profile"><span>{user.name}<small>{user.role}{user.campus ? ` · ${user.campus} campus` : ''}</small></span><button className="secondary" onClick={signOut}>Sign out</button></div></header>
    {error && <div className="alert error">{error}<button className="dismiss" onClick={()=>setError('')}>×</button></div>}
    {message && <div className="alert success">{message}<button className="dismiss" onClick={()=>setMessage('')}>×</button></div>}
    <div className="layout">
      <section className="main-column">
        {user.role === 'requester' && <section className="card">
          <h2>Raise a request</h2><p className="muted">Fields marked * are required. Upload supporting documents after the request is created.</p>
          <form onSubmit={createRequest} className="form-grid">
            <label>Campus *<select value={form.campus} onChange={e=>setForm({...form,campus:e.target.value})}><option value="main">Main</option><option value="north">North</option><option value="city">City</option></select></label>
            <label>Department *<input maxLength="120" required value={form.department} onChange={e=>setForm({...form,department:e.target.value})}/></label>
            <label className="wide">Short title *<input maxLength="180" required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
            <label>Category *<select required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="">Choose category</option>{['Equipment','Software','Travel','Finance','Facilities','Other'].map(x=><option key={x}>{x}</option>)}</select></label>
            <label>Amount (₹)<input type="number" min="0" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="Optional"/></label>
            <label className="wide">Other people involved<input maxLength="1000" value={form.people_involved} onChange={e=>setForm({...form,people_involved:e.target.value})} placeholder="Names, if any"/></label>
            <label className="wide">Short description *<textarea required maxLength="5000" rows="3" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
            <label className="wide">Documents (PDF, JPG, PNG, DOC/DOCX, XLS/XLSX; max 10 MB each)<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={e=>setFiles(Array.from(e.target.files || []))}/></label>
            {files.length>0 && <p className="wide muted">{files.length} file(s) selected: {files.map(f=>f.name).join(', ')}</p>}
            <div className="wide"><button disabled={busy}>{busy?'Submitting…':'Submit request'}</button></div>
          </form>
        </section>}
        <section className="card">
          <div className="section-head"><div><h2>{user.role==='requester'?'My requests':user.role==='coordinator'?'All campus requests':'Requests for expert review'}</h2><p className="muted">{requests.length} request(s) visible to your role</p></div><button className="secondary" onClick={()=>refresh().catch(e=>setError(e.message))}>Refresh</button></div>
          {requests.length===0 ? <p className="empty">No requests to display.</p> : <div className="request-list">{requests.map(r=><button key={r.id} className={`request-row ${selected?.id===r.id?'active':''}`} onClick={()=>openRequest(r.id).catch(e=>setError(e.message))}>
            <span className="request-number">#{r.id}</span><span className="request-summary"><b>{r.title}</b><small>{r.requester_name} · {r.campus} campus · {r.category}</small></span><span className={`status status-${r.status}`}>{statusLabels[r.status] || r.status}</span>
          </button>)}</div>}
        </section>
      </section>
      <aside className="card detail">
        {!selected ? <div className="empty-state"><div className="empty-icon">↗</div><h2>Request details</h2><p>Select a request from the list to see its information, files, activity and actions.</p></div> : <>
          <div className="detail-title"><div><div className="eyebrow">REQUEST #{selected.id}</div><h2>{selected.title}</h2></div><span className={`status status-${selected.status}`}>{statusLabels[selected.status]}</span></div>
          <div className="facts"><div><small>Requester</small><b>{selected.requester_name}</b><span>{selected.requester_email}</span></div><div><small>Campus / department</small><b>{selected.campus} campus</b><span>{selected.department}</span></div><div><small>Category / amount</small><b>{selected.category}</b><span>{money(selected.amount)}</span></div><div><small>Other people</small><b>{selected.people_involved || '—'}</b></div></div>
          <h3>Description</h3><p className="preserve">{selected.description}</p>
          {selected.coordinator_note && <div className="note"><b>Coordinator note</b><p className="preserve">{selected.coordinator_note}</p></div>}
          {selected.specialist_note && <div className="note"><b>Specialist review</b><p className="preserve">{selected.specialist_note}</p></div>}
          {selected.decision && <div className="decision"><b>Decision</b><p className="preserve">{selected.decision}</p></div>}
          <h3>Documents</h3>
          {selected.documents?.length ? <ul className="file-list">{selected.documents.map(d=><li key={d.id}><span>▤ {d.original_name}<small>{(d.size_bytes/1024/1024).toFixed(2)} MB</small></span><button className="link-button" onClick={()=>downloadFile(d.id,d.original_name,setError,token)}>Download</button></li>)}</ul> : <p className="muted">No documents uploaded yet.</p>}
          {user.role==='requester' && selected.requester_id===user.id && !['completed','decision_made'].includes(selected.status) && <form onSubmit={uploadMore} className="upload-more"><label>Add or replace supporting files<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={e=>setFiles(Array.from(e.target.files||[]))}/></label><button className="secondary" disabled={busy}>Upload files</button></form>}
          {user.role==='requester' && selected.status==='needs_correction' && <div className="action-box"><h3>Respond to correction request</h3><textarea rows="3" value={actionNote} onChange={e=>setActionNote(e.target.value)} placeholder="Describe the corrections made…"/><button disabled={busy} onClick={()=>doAction(`/requests/${selected.id}/requester`,{action:'correction_response',note:actionNote},'Correction response sent to the office.')}>Submit correction response</button></div>}
          {user.role==='specialist' && selected.status==='with_specialist' && <div className="action-box"><h3>Expert review</h3><p className="muted">Record your recommendation for the coordinator. The requester does not contact you directly.</p><textarea rows="4" value={actionNote} onChange={e=>setActionNote(e.target.value)} placeholder="Review notes and recommendation…"/><button disabled={busy} onClick={()=>doAction(`/requests/${selected.id}/specialist`,{note:actionNote},'Expert review returned to the coordinator.')}>Return review to coordinator</button></div>}
          {user.role==='coordinator' && <div className="action-box"><h3>Coordinator actions</h3>
            <label>Note / correction instructions<textarea rows="3" value={actionNote} onChange={e=>setActionNote(e.target.value)} placeholder="Explain missing documents or add a note…"/></label>
            <div className="button-stack"><button className="secondary" disabled={busy} onClick={()=>doAction(`/requests/${selected.id}/coordinator`,{action:'correction',note:actionNote},'Correction request sent to requester.')}>Ask for corrections</button><button disabled={busy} onClick={()=>doAction(`/requests/${selected.id}/coordinator`,{action:'send_specialist',note:actionNote},'Request sent for expert review.')}>Send to specialist</button></div>
            {selected.status==='specialist_returned' && <p className="muted">Expert review is back. Use the decision field below to record the office outcome.</p>}
            <label>Final decision<textarea rows="3" value={decision} onChange={e=>setDecision(e.target.value)} placeholder="Write the decision for the requester…"/></label>
            <button disabled={busy} onClick={()=>doAction(`/requests/${selected.id}/coordinator`,{action:'decision',decision},'Decision recorded. Waiting for requester confirmation.')}>Record decision</button>
          </div>}
          {user.role==='requester' && selected.status==='decision_made' && <div className="action-box"><h3>Confirm the outcome</h3><p>Confirm only after you have seen the decision. This closes the request.</p><button disabled={busy} onClick={()=>doAction(`/requests/${selected.id}/requester`,{action:'confirm'},'Confirmation recorded. Request closed.')}>I have seen the decision</button></div>}
          <h3>Activity history</h3>
          {selected.activity?.length ? <ol className="timeline">{selected.activity.map(a=><li key={a.id}><b>{a.action}</b><span>{a.actor_name} · {new Date(a.created_at).toLocaleString()}</span>{a.note && <p className="preserve">{a.note}</p>}</li>)}</ol> : <p className="muted">No activity yet.</p>}
        </>}
      </aside>
    </div>
    <footer>Requests Office · Role-based access · All times shown in your browser's local timezone</footer>
  </main>;
}

async function downloadFile(id, name, setError, token) {
  try {
    const response = await fetch(downloadUrl(id), { headers:{ Authorization:`Bearer ${token}` } });
    if (!response.ok) { const data = await response.json(); throw new Error(data.message || 'Download failed'); }
    const blob = await response.blob(); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url);
  } catch (e) { setError(e.message); }
}
