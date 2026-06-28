const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DB_PATH = path.join(__dirname, 'db.json');

const DEFAULT_DB = {
  students: [],
  auth: {
    username: 'admin',
    password: 'newpass123',
    recoveryCode: 'studentreset'
  }
};

function normalizeDb(data) {
  const safeData = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  return {
    ...DEFAULT_DB,
    ...safeData,
    students: Array.isArray(safeData.students) ? safeData.students : [],
    auth: {
      ...DEFAULT_DB.auth,
      ...(safeData.auth || {})
    }
  };
}

function parseDb(raw) {
  const trimmed = raw.replace(/^\uFEFF/, '').trim();
  if (!trimmed) return DEFAULT_DB;

  const sanitized = trimmed
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/,\s*([}\]])/g, '$1');

  return JSON.parse(sanitized);
}

function readDb() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return normalizeDb(parseDb(raw));
  } catch (err) {
    console.warn('Unable to read DB, using default state:', err.message);
    return normalizeDb({});
  }
}

function writeDb(data) {
  const safeDb = normalizeDb(data);
  fs.writeFileSync(DB_PATH, JSON.stringify(safeDb, null, 2));
}

app.get('/api/students', (req, res) => {
  const db = readDb();
  res.json(db.students || []);
});

app.post('/api/students', (req, res) => {
  const db = readDb();
  db.students = db.students || [];
  const student = req.body;
  if (!student || !student.roll) return res.status(400).json({ error: 'Missing student or roll' });
  if (db.students.some(s => s.roll === student.roll)) {
    return res.status(409).json({ error: 'Student with this roll already exists' });
  }
  db.students.push(student);
  writeDb(db);
  res.status(201).json(student);
});

app.put('/api/students/:roll', (req, res) => {
  const { roll } = req.params;
  const updated = req.body;
  const db = readDb();
  db.students = db.students || [];
  const idx = db.students.findIndex(s => s.roll === roll);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  // If roll changed and conflicts with another student, reject
  if (updated.roll && updated.roll !== roll && db.students.some((s, i) => s.roll === updated.roll && i !== idx)) {
    return res.status(409).json({ error: 'New roll conflicts with existing student' });
  }
  db.students[idx] = updated;
  writeDb(db);
  res.json(updated);
});

app.delete('/api/students/:roll', (req, res) => {
  const { roll } = req.params;
  const db = readDb();
  db.students = db.students || [];
  const idx = db.students.findIndex(s => s.roll === roll);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const removed = db.students.splice(idx, 1)[0];
  writeDb(db);
  res.json(removed);
});

// Serve index page at root and static files for the rest
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
