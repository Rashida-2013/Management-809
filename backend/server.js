require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/college';
const SECRET = process.env.JWT_SECRET || 'change-this-secret';

const app = express();
app.use(cors());
app.use(express.json());

/* ----------------------------- Models ----------------------------- */
const S = mongoose.Schema;
const userRef = { type: S.Types.ObjectId, ref: 'User' };

const User = mongoose.model('User', new S({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'faculty', 'student'], required: true },
  course: { type: String, default: '' },
}));

const attSchema = new S({
  student: userRef,
  date: String,
  status: { type: String, enum: ['Present', 'Absent'] },
  markedBy: userRef,
});
attSchema.index({ student: 1, date: 1 }, { unique: true });
const Attendance = mongoose.model('Attendance', attSchema);

const Assignment = mongoose.model('Assignment', new S(
  { title: { type: String, required: true }, description: String, course: { type: String, required: true }, dueDate: String, createdBy: userRef },
  { timestamps: true }));
const Announcement = mongoose.model('Announcement', new S(
  { title: { type: String, required: true }, body: String, createdBy: userRef },
  { timestamps: true }));
const Event = mongoose.model('Event', new S(
  { title: { type: String, required: true }, eventDate: String, venue: String, description: String },
  { timestamps: true }));

/* ----------------------------- Helpers ----------------------------- */
// JWT auth + role permission check
const auth = (...roles) => (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    req.user = jwt.verify(token, SECRET);
  } catch {
    return res.status(401).json({ message: 'Please login again' });
  }
  if (roles.length && !roles.includes(req.user.role))
    return res.status(403).json({ message: 'Access denied for your role' });
  next();
};

// catch async errors
const h = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((e) =>
    res.status(400).json({ message: e.code === 11000 ? 'Already exists' : e.message }));

/* ----------------------------- Auth ----------------------------- */
app.post('/api/login', h(async (req, res) => {
  const { username, password } = req.body;
  const u = await User.findOne({ username: (username || '').trim() });
  if (!u || !(await bcrypt.compare(password || '', u.password)))
    return res.status(401).json({ message: 'Invalid username or password' });
  const user = { id: u._id, name: u.name, role: u.role, course: u.course };
  res.json({ token: jwt.sign(user, SECRET, { expiresIn: '1d' }), user });
}));

/* ----------------------------- Users (admin) ----------------------------- */
app.get('/api/users', auth('admin'), h(async (req, res) => {
  res.json(await User.find().select('-password').sort({ role: 1, name: 1 }));
}));

app.post('/api/users', auth('admin'), h(async (req, res) => {
  const { name, username, password, role, course } = req.body;
  if (!name || !username || !password || !role) throw new Error('All fields are required');
  const u = await User.create({
    name: name.trim(), username: username.trim(), role,
    password: await bcrypt.hash(password, 10),
    course: role === 'student' ? (course || '').trim() : '',
  });
  res.json({ _id: u._id });
}));

app.delete('/api/users/:id', auth('admin'), h(async (req, res) => {
  if (req.params.id === req.user.id) throw new Error("You can't delete yourself");
  await Attendance.deleteMany({ student: req.params.id });
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

/* ----------------------------- Attendance ----------------------------- */
app.get('/api/courses', auth('admin', 'faculty'), h(async (req, res) => {
  res.json((await User.distinct('course', { role: 'student', course: { $ne: '' } })).sort());
}));

// students of a course + already-saved attendance for that date
app.get('/api/attendance', auth('admin', 'faculty'), h(async (req, res) => {
  const { course, date } = req.query;
  const students = await User.find({ role: 'student', course }).select('name username').sort({ name: 1 });
  const recs = await Attendance.find({ date, student: { $in: students.map((s) => s._id) } });
  const records = {};
  recs.forEach((r) => (records[r.student] = r.status));
  res.json({ students, records });
}));

app.post('/api/attendance', auth('admin', 'faculty'), h(async (req, res) => {
  const { date, records } = req.body;
  if (!date || !Array.isArray(records)) throw new Error('Invalid data');
  await Attendance.bulkWrite(records.map((r) => ({
    updateOne: {
      filter: { student: r.studentId, date },
      update: { $set: { status: r.status, markedBy: req.user.id } },
      upsert: true,
    },
  })));
  res.json({ ok: true });
}));

app.get('/api/my-attendance', auth('student'), h(async (req, res) => {
  res.json(await Attendance.find({ student: req.user.id }).sort({ date: -1 }));
}));

/* ----------------------------- Assignments / Announcements / Events ----------------------------- */
function crud(path, Model, { post, del, filter, sort = { createdAt: -1 } }) {
  app.get(path, auth(), h(async (req, res) =>
    res.json(await Model.find(filter ? filter(req.user) : {}).sort(sort))));
  app.post(path, auth(...post), h(async (req, res) =>
    res.json(await Model.create({ ...req.body, createdBy: req.user.id }))));
  app.delete(`${path}/:id`, auth(...del), h(async (req, res) => {
    await Model.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  }));
}

crud('/api/assignments', Assignment, {
  post: ['admin', 'faculty'], del: ['admin', 'faculty'],
  filter: (u) => (u.role === 'student' ? { course: u.course } : {}),
});
crud('/api/announcements', Announcement, { post: ['admin', 'faculty'], del: ['admin'] });
crud('/api/events', Event, { post: ['admin'], del: ['admin'], sort: { eventDate: 1 } });

/* ----------------------------- Start ----------------------------- */
mongoose.connect(MONGO_URI).then(async () => {
  // create demo accounts on first run
  if (!(await User.countDocuments())) {
    const mk = async (name, username, pw, role, course = '') =>
      User.create({ name, username, role, course, password: await bcrypt.hash(pw, 10) });
    await mk('Administrator', 'admin', 'admin123', 'admin');
    await mk('Prof. Sharma', 'faculty1', 'faculty123', 'faculty');
    await mk('Demo Student', 'student1', 'student123', 'student', 'BCA-1');
    await Announcement.create({ title: 'Welcome', body: 'Welcome to the new semester!' });
    console.log('Demo users created');
  }
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}).catch((e) => console.error('MongoDB connection failed:', e.message));
