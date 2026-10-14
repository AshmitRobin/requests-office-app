require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pool = require('./db');
const { auth, allowRoles } = require('./middleware');

const app = express();
const PORT = process.env.PORT || 5000;
const uploadDir = path.resolve(__dirname, process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 250, standardHeaders: true, legacyHeaders: false }));

const allowedMime = new Set([
  'application/pdf', 'image/jpeg', 'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase())
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMime.has(file.mimetype)) return cb(new Error('File type not allowed. Upload PDF, JPG, PNG, DOC, DOCX, XLS or XLSX.'));
    cb(null, true);
  }
});

async function logAction(conn, requestId, actorId, action, note = '') {
  await conn.execute(
    'INSERT INTO activity_logs (request_id, actor_id, action, note) VALUES (?, ?, ?, ?)',
    [requestId, actorId, action, note || null]
  );
}
async function getRequest(id) {
  const [rows] = await pool.execute(
    `SELECT r.*, u.name AS requester_name, u.email AS requester_email
     FROM requests r JOIN users u ON u.id=r.requester_id WHERE r.id=?`, [id]);
  return rows[0];
}
async function canSeeRequest(user, requestId) {
  const r = await getRequest(requestId);
  if (!r) return { error: 'Request not found.', status: 404 };
  if (user.role === 'coordinator') return { request: r };
  if (user.role === 'requester' && r.requester_id === user.id) return { request: r };
  if (user.role === 'specialist' && ['with_specialist','specialist_returned'].includes(r.status)) return { request: r };
  return { error: 'You cannot access this request.', status: 403 };
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Requests Office API' }));

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
      return res.status(400).json({ message: 'Enter a valid email and password.' });
    }
    const [rows] = await pool.execute('SELECT id,name,email,password_hash,role,campus,department FROM users WHERE email=?', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, campus: user.campus },
      process.env.JWT_SECRET, { expiresIn: '8h' }
    );
    delete user.password_hash;
    res.json({ token, user });
  } catch (e) { next(e); }
});

app.get('/api/requests', auth, async (req, res, next) => {
  try {
    let sql = `SELECT r.*, u.name AS requester_name, u.email AS requester_email
               FROM requests r JOIN users u ON u.id=r.requester_id`;
    const args = [];
    if (req.user.role === 'requester') { sql += ' WHERE r.requester_id=?'; args.push(req.user.id); }
    else if (req.user.role === 'specialist') { sql += " WHERE r.status IN ('with_specialist','specialist_returned')"; }
    sql += ' ORDER BY r.updated_at DESC';
    const [rows] = await pool.execute(sql, args);
    res.json(rows);
  } catch (e) { next(e); }
});

app.post('/api/requests', auth, allowRoles('requester'), async (req, res, next) => {
  try {
    const { campus, department, title, category, people_involved, amount, description } = req.body;
    const allowedCampuses = ['main','north','city'];
    if (!allowedCampuses.includes(campus)) return res.status(400).json({ message: 'Choose main, north or city campus.' });
    if (!String(department || '').trim() || !String(title || '').trim() || !String(category || '').trim() || !String(description || '').trim()) {
      return res.status(400).json({ message: 'Department, title, category and description are required.' });
    }
    if (String(title).trim().length > 180) return res.status(400).json({ message: 'Title must be 180 characters or fewer.' });
    if (amount !== '' && amount !== null && amount !== undefined && (!Number.isFinite(Number(amount)) || Number(amount) < 0)) {
      return res.status(400).json({ message: 'Amount must be a non-negative number.' });
    }
    const [result] = await pool.execute(
      `INSERT INTO requests (requester_id,campus,department,title,category,people_involved,amount,description,status)
       VALUES (?,?,?,?,?,?,?,?, 'submitted')`,
      [req.user.id,campus,String(department).trim(),String(title).trim(),String(category).trim(),
       String(people_involved || '').trim() || null,
       amount === '' || amount === null || amount === undefined ? null : Number(amount),
       String(description).trim()]);
    await logAction(pool, result.insertId, req.user.id, 'Request submitted', 'Submitted by requester');
    res.status(201).json(await getRequest(result.insertId));
  } catch (e) { next(e); }
});

app.get('/api/requests/:id', auth, async (req, res, next) => {
  try {
    const access = await canSeeRequest(req.user, Number(req.params.id));
    if (access.error) return res.status(access.status).json({ message: access.error });
    const [documents] = await pool.execute('SELECT id,original_name,mime_type,size_bytes,uploaded_at FROM documents WHERE request_id=? ORDER BY id', [req.params.id]);
    const [logs] = await pool.execute(
      `SELECT a.id,a.action,a.note,a.created_at,u.name AS actor_name,u.role AS actor_role
       FROM activity_logs a JOIN users u ON u.id=a.actor_id WHERE a.request_id=? ORDER BY a.id DESC`, [req.params.id]);
    res.json({ ...access.request, documents, activity: logs });
  } catch (e) { next(e); }
});

app.post('/api/requests/:id/documents', auth, allowRoles('requester'), (req, res, next) => {
  upload.array('documents', 8)(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Each file must be under 10 MB.' : err.message });
    try {
      const id = Number(req.params.id);
      const access = await canSeeRequest(req.user, id);
      if (access.error) {
        (req.files || []).forEach(f => fs.unlink(f.path, () => {}));
        return res.status(access.status).json({ message: access.error });
      }
      if (access.request.requester_id !== req.user.id) {
        (req.files || []).forEach(f => fs.unlink(f.path, () => {}));
        return res.status(403).json({ message: 'Only the request owner can upload documents.' });
      }
      if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Choose at least one file.' });
      for (const f of req.files) {
        await pool.execute('INSERT INTO documents (request_id,original_name,stored_name,mime_type,size_bytes) VALUES (?,?,?,?,?)',
          [id, f.originalname, f.filename, f.mimetype, f.size]);
      }
      await logAction(pool, id, req.user.id, 'Documents uploaded', `${req.files.length} file(s)`);
      res.status(201).json({ message: 'Documents uploaded.', count: req.files.length });
    } catch (e) { next(e); }
  });
});

app.get('/api/documents/:id/download', auth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM documents WHERE id=?', [req.params.id]);
    const d = rows[0];
    if (!d) return res.status(404).json({ message: 'Document not found.' });
    const access = await canSeeRequest(req.user, d.request_id);
    if (access.error) return res.status(access.status).json({ message: access.error });
    const filePath = path.join(uploadDir, d.stored_name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File is no longer stored on this server.' });
    res.download(filePath, d.original_name);
  } catch (e) { next(e); }
});

// Coordinator actions: ask for corrections, send to specialist, or make decision.
app.patch('/api/requests/:id/coordinator', auth, allowRoles('coordinator'), async (req, res, next) => {
  const { action, note, decision } = req.body;
  const id = Number(req.params.id);
  try {
    const r = await getRequest(id);
    if (!r) return res.status(404).json({ message: 'Request not found.' });
    if (action === 'correction') {
      if (!String(note || '').trim()) return res.status(400).json({ message: 'Explain what needs correcting.' });
      await pool.execute("UPDATE requests SET status='needs_correction',coordinator_note=? WHERE id=?", [String(note).trim(), id]);
      await logAction(pool, id, req.user.id, 'Correction requested', String(note).trim());
    } else if (action === 'send_specialist') {
      await pool.execute("UPDATE requests SET status='with_specialist',coordinator_note=? WHERE id=?", [String(note || '').trim() || null, id]);
      await logAction(pool, id, req.user.id, 'Sent to specialist', String(note || '').trim());
    } else if (action === 'decision') {
      if (!String(decision || '').trim()) return res.status(400).json({ message: 'Enter the decision before saving.' });
      await pool.execute("UPDATE requests SET status='decision_made',decision=? WHERE id=?", [String(decision).trim(), id]);
      await logAction(pool, id, req.user.id, 'Decision recorded', String(decision).trim());
    } else return res.status(400).json({ message: 'Unknown coordinator action.' });
    res.json(await getRequest(id));
  } catch (e) { next(e); }
});

// Requester submits correction response and confirms the final decision.
app.patch('/api/requests/:id/requester', auth, allowRoles('requester'), async (req, res, next) => {
  const id = Number(req.params.id);
  try {
    const r = await getRequest(id);
    if (!r) return res.status(404).json({ message: 'Request not found.' });
    if (r.requester_id !== req.user.id) return res.status(403).json({ message: 'This is not your request.' });
    if (req.body.action === 'correction_response') {
      if (r.status !== 'needs_correction') return res.status(400).json({ message: 'This request is not waiting for corrections.' });
      const response = String(req.body.note || '').trim();
      if (!response) return res.status(400).json({ message: 'Describe the correction you made.' });
      await pool.execute("UPDATE requests SET status='submitted',description=CONCAT(description, '\\n\\nRequester correction: ', ?) WHERE id=?", [response, id]);
      await logAction(pool, id, req.user.id, 'Correction response submitted', response);
    } else if (req.body.action === 'confirm') {
      if (r.status !== 'decision_made') return res.status(400).json({ message: 'There is no decision to confirm yet.' });
      await pool.execute("UPDATE requests SET status='completed',requester_confirmation_at=NOW() WHERE id=?", [id]);
      await logAction(pool, id, req.user.id, 'Decision acknowledged; request closed', 'Requester confirmed they have seen the decision');
    } else return res.status(400).json({ message: 'Unknown requester action.' });
    res.json(await getRequest(id));
  } catch (e) { next(e); }
});

// Specialist records expert notes and returns the request to the coordinator.
app.patch('/api/requests/:id/specialist', auth, allowRoles('specialist'), async (req, res, next) => {
  const id = Number(req.params.id);
  const note = String(req.body.note || '').trim();
  try {
    const r = await getRequest(id);
    if (!r) return res.status(404).json({ message: 'Request not found.' });
    if (r.status !== 'with_specialist') return res.status(400).json({ message: 'This request is not awaiting specialist review.' });
    if (!note) return res.status(400).json({ message: 'Enter expert notes or a recommendation.' });
    await pool.execute("UPDATE requests SET status='specialist_returned',specialist_note=? WHERE id=?", [note, id]);
    await logAction(pool, id, req.user.id, 'Specialist review returned', note);
    res.json(await getRequest(id));
  } catch (e) { next(e); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Unexpected server error. Check backend terminal logs.' });
});
app.listen(PORT, () => console.log(`Requests Office API running on port ${PORT}`));
