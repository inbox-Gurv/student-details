const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DB_PATH = path.join(__dirname, 'db.json');
const DEFAULT_AUTH = { username: 'admin', password: 'admin123', recoveryCode: 'studentreset' };

function readDb() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { students: [], auth: DEFAULT_AUTH };
  }
}

function getAuth(db) {
  return db.auth || DEFAULT_AUTH;
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const db = readDb();
  const auth = getAuth(db);
  if (username === auth.username && password === auth.password) {
    return res.json({ token: 'student-app-token', username });
  }
  return res.status(401).json({ error: 'Invalid username or password' });
});

app.post('/api/forgot-password', (req, res) => {
  const { username, recoveryCode, newPassword } = req.body || {};
  if (!username || !recoveryCode || !newPassword) {
    return res.status(400).json({ error: 'Username, recovery code, and new password are required' });
  }
  const db = readDb();
  const auth = getAuth(db);
  if (username !== auth.username || recoveryCode !== auth.recoveryCode) {
    return res.status(401).json({ error: 'Invalid username or recovery code' });
  }
  db.auth = { username: auth.username, password: newPassword, recoveryCode: auth.recoveryCode };
  writeDb(db);
  return res.json({ message: 'Password reset successfully' });
});

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

// Serve login page at root and static files for the rest
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
