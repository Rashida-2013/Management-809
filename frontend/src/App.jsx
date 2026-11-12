import { useEffect, useState } from 'react';
import { api } from './api';
import { COLLEGE_NAME, TAGLINE, LOGO } from './config';

const today = () => new Date().toISOString().slice(0, 10);

function Msg({ m }) {
  return m ? <div className={'flash ' + (m.ok ? 'ok' : 'error')}>{m.text}</div> : null;
}

function Logo() {
  return <img src={LOGO} alt="" onError={(e) => (e.target.style.display = 'none')} />;
}

/* ------------------------------ Login ------------------------------ */
function Login({ onLogin }) {
  const [f, setF] = useState({ username: '', password: '' });
  const [msg, setMsg] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    try {
      const d = await api('/login', { method: 'POST', body: f });
      localStorage.setItem('token', d.token);
      localStorage.setItem('user', JSON.stringify(d.user));
      onLogin(d.user);
    } catch (x) {
      setMsg({ text: x.message });
    }
  };
  return (
    <div className="card login">
      <div style={{ height: 60 }}><img src={LOGO} alt="" style={{ height: 60 }} onError={(e) => (e.target.style.display = 'none')} /></div>
      <h2>{COLLEGE_NAME}</h2>
      <p className="muted">{TAGLINE}</p>
      <Msg m={msg} />
      <form onSubmit={submit}>
        <label>Username</label>
        <input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required autoFocus />
        <label>Password</label>
        <input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
        <button className="btn" style={{ width: '100%' }}>Login</button>
      </form>
      <p className="muted">Demo: admin/admin123 · faculty1/faculty123 · student1/student123</p>
    </div>
  );
}

/* ------------------------------ Dashboard ------------------------------ */
function Dashboard({ user }) {
  const [notices, setNotices] = useState([]);
  const [att, setAtt] = useState(null);
  useEffect(() => {
    api('/announcements').then((d) => setNotices(d.slice(0, 3)));
    if (user.role === 'student') api('/my-attendance').then(setAtt);
  }, []);
  const total = att?.length || 0;
  const present = att?.filter((a) => a.status === 'Present').length || 0;
  return (
    <>
      <h2>Welcome, {user.name}</h2>
      <div className="grid">
        <div className="stat"><b>{user.role.toUpperCase()}</b>Logged in as</div>
        {user.role === 'student' && (
          <>
            <div className="stat"><b>{total ? Math.round((present * 100) / total) : 0}%</b>Attendance</div>
            <div className="stat"><b>{present}/{total}</b>Classes attended</div>
          </>
        )}
      </div>
      <div className="card">
        <h2>Latest announcements</h2>
        {notices.map((n) => (
          <p key={n._id}><b>{n.title}</b> <span className="muted">{new Date(n.createdAt).toLocaleString()}</span><br />{n.body}</p>
        ))}
        {!notices.length && <p className="muted">No announcements.</p>}
      </div>
    </>
  );
}

/* ------------------------------ Users (admin) ------------------------------ */
function Users({ user }) {
  const empty = { name: '', username: '', password: '', role: 'student', course: '' };
  const [rows, setRows] = useState([]);
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState(null);
  const load = () => api('/users').then(setRows);
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const create = async (e) => {
    e.preventDefault();
    try {
      await api('/users', { method: 'POST', body: f });
      setMsg({ ok: true, text: `${f.role} '${f.name}' created` });
      setF(empty);
      load();
    } catch (x) { setMsg({ text: x.message }); }
  };
  const del = async (id) => {
    if (!confirm('Delete this user?')) return;
    try { await api('/users/' + id, { method: 'DELETE' }); load(); } catch (x) { setMsg({ text: x.message }); }
  };
  return (
    <>
      <div className="card">
        <h2>Create user</h2>
        <Msg m={msg} />
        <form onSubmit={create}>
          <div className="row">
            <div><label>Full name</label><input value={f.name} onChange={set('name')} required /></div>
            <div><label>Username</label><input value={f.username} onChange={set('username')} required /></div>
            <div><label>Password</label><input value={f.password} onChange={set('password')} required /></div>
            <div><label>Role</label>
              <select value={f.role} onChange={set('role')}><option>student</option><option>faculty</option><option>admin</option></select></div>
            {f.role === 'student' && <div><label>Course/Class</label><input value={f.course} onChange={set('course')} placeholder="e.g. BCA-1" /></div>}
          </div>
          <button className="btn">Create user</button>
        </form>
      </div>
      <div className="card">
        <h2>All users</h2>
        <div className="wrap"><table>
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Course</th><th></th></tr></thead>
          <tbody>{rows.map((u) => (
            <tr key={u._id}><td>{u.name}</td><td>{u.username}</td><td><span className="badge">{u.role}</span></td><td>{u.course}</td>
              <td>{u._id !== user.id && <button className="danger" onClick={() => del(u._id)}>Delete</button>}</td></tr>
          ))}</tbody>
        </table></div>
      </div>
    </>
  );
}

/* ------------------------------ Attendance (faculty/admin) ------------------------------ */
function Attendance() {
  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState('');
  const [date, setDate] = useState(today());
  const [students, setStudents] = useState([]);
  const [status, setStatus] = useState({});
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api('/courses').then((c) => { setCourses(c); if (c[0]) setCourse(c[0]); });
  }, []);

  useEffect(() => {
    if (!course) return;
    api(`/attendance?course=${encodeURIComponent(course)}&date=${date}`).then((d) => {
      setStudents(d.students);
      const s = {};
      d.students.forEach((x) => (s[x._id] = d.records[x._id] || 'Present'));
      setStatus(s);
    });
  }, [course, date]);

  const save = async () => {
    try {
      await api('/attendance', { method: 'POST', body: { course, date, records: students.map((s) => ({ studentId: s._id, status: status[s._id] })) } });
      setMsg({ ok: true, text: `Attendance saved for ${course} on ${date}` });
    } catch (x) { setMsg({ text: x.message }); }
  };

  return (
    <>
      <div className="card">
        <h2>Mark attendance</h2>
        <div className="row">
          <div><label>Course/Class</label>
            <select value={course} onChange={(e) => setCourse(e.target.value)}>{courses.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
      </div>
      <div className="card">
        <Msg m={msg} />
        {students.length ? (
          <>
            <table>
              <thead><tr><th>Student</th><th>Present</th><th>Absent</th></tr></thead>
              <tbody>{students.map((s) => (
                <tr key={s._id}><td>{s.name}</td>
                  {['Present', 'Absent'].map((v) => (
                    <td key={v}><input type="radio" name={s._id} checked={status[s._id] === v} onChange={() => setStatus({ ...status, [s._id]: v })} /></td>
                  ))}</tr>
              ))}</tbody>
            </table><br />
            <button className="btn accent" onClick={save}>Save attendance</button>
          </>
        ) : <p className="muted">No students found. Ask the admin to create students first.</p>}
      </div>
    </>
  );
}

/* ------------------------------ My attendance (student) ------------------------------ */
function MyAttendance() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api('/my-attendance').then(setRows); }, []);
  const present = rows.filter((r) => r.status === 'Present').length;
  return (
    <>
      <div className="grid">
        <div className="stat"><b>{rows.length ? Math.round((present * 100) / rows.length) : 0}%</b>Attendance</div>
        <div className="stat"><b>{present}</b>Present</div>
        <div className="stat"><b>{rows.length}</b>Total classes</div>
      </div>
      <div className="card">
        <h2>My attendance records</h2>
        <table>
          <thead><tr><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => <tr key={r._id}><td>{r.date}</td><td className={r.status === 'Present' ? 'P' : 'A'}>{r.status}</td></tr>)}
            {!rows.length && <tr><td colSpan="2" className="muted">No records yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ------------------------------ Reusable list page ------------------------------ */
function ListPage({ title, path, fields, canAdd, canDelete, render }) {
  const [items, setItems] = useState([]);
  const [f, setF] = useState({});
  const [msg, setMsg] = useState(null);
  const load = () => api(path).then(setItems);
  useEffect(() => { load(); }, [path]);
  const add = async (e) => {
    e.preventDefault();
    try { await api(path, { method: 'POST', body: f }); setF({}); setMsg({ ok: true, text: 'Added successfully' }); load(); }
    catch (x) { setMsg({ text: x.message }); }
  };
  const del = async (id) => { if (confirm('Delete?')) { await api(`${path}/${id}`, { method: 'DELETE' }); load(); } };
  return (
    <>
      {canAdd && (
        <div className="card">
          <h2>Add {title}</h2>
          <Msg m={msg} />
          <form onSubmit={add}>
            {fields.map((x) => (
              <div key={x.name}>
                <label>{x.label}</label>
                {x.type === 'textarea'
                  ? <textarea rows="3" value={f[x.name] || ''} onChange={(e) => setF({ ...f, [x.name]: e.target.value })} />
                  : <input type={x.type || 'text'} value={f[x.name] || ''} required={x.required} onChange={(e) => setF({ ...f, [x.name]: e.target.value })} />}
              </div>
            ))}
            <button className="btn">Add</button>
          </form>
        </div>
      )}
      <div className="card">
        <h2>{title}s</h2>
        {items.map((i) => (
          <div className="item" key={i._id}>
            {render(i)}
            {canDelete && <div><button className="danger" onClick={() => del(i._id)}>Delete</button></div>}
          </div>
        ))}
        {!items.length && <p className="muted">Nothing here yet.</p>}
      </div>
    </>
  );
}

/* ------------------------------ App shell ------------------------------ */
export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [page, setPage] = useState('dashboard');
  if (!user) return <Login onLogin={setUser} />;

  const r = user.role;
  const staff = r !== 'student';
  const tabs = [
    ['dashboard', 'Dashboard'],
    ...(r === 'admin' ? [['users', 'Users']] : []),
    ...(staff ? [['attendance', 'Attendance']] : [['my', 'My Attendance']]),
    ['assignments', 'Assignments'],
    ['announcements', 'Announcements'],
    ['events', 'Events'],
  ];
  const logout = () => { localStorage.clear(); setUser(null); setPage('dashboard'); };

  return (
    <>
      <header>
        <Logo />
        <div><h1>{COLLEGE_NAME}</h1><small>{TAGLINE}</small></div>
        <nav>
          {tabs.map(([k, label]) => <button key={k} className={page === k ? 'on' : ''} onClick={() => setPage(k)}>{label}</button>)}
          <button onClick={logout}>Logout ({user.name} · {r})</button>
        </nav>
      </header>
      <main>
        {page === 'dashboard' && <Dashboard user={user} />}
        {page === 'users' && <Users user={user} />}
        {page === 'attendance' && <Attendance />}
        {page === 'my' && <MyAttendance />}
        {page === 'assignments' && (
          <ListPage title="Assignment" path="/assignments" canAdd={staff} canDelete={staff}
            fields={[{ name: 'title', label: 'Title', required: true }, { name: 'course', label: 'Course/Class (e.g. BCA-1)', required: true }, { name: 'dueDate', label: 'Due date', type: 'date' }, { name: 'description', label: 'Description', type: 'textarea' }]}
            render={(i) => <><b>{i.title}</b> <span className="badge">{i.course}</span> <span className="muted">Due: {i.dueDate || '-'}</span><p>{i.description}</p></>} />
        )}
        {page === 'announcements' && (
          <ListPage title="Announcement" path="/announcements" canAdd={staff} canDelete={r === 'admin'}
            fields={[{ name: 'title', label: 'Title', required: true }, { name: 'body', label: 'Message', type: 'textarea' }]}
            render={(i) => <><b>{i.title}</b> <span className="muted">{new Date(i.createdAt).toLocaleString()}</span><p>{i.body}</p></>} />
        )}
        {page === 'events' && (
          <ListPage title="Event" path="/events" canAdd={r === 'admin'} canDelete={r === 'admin'}
            fields={[{ name: 'title', label: 'Title', required: true }, { name: 'eventDate', label: 'Date', type: 'date', required: true }, { name: 'venue', label: 'Venue' }, { name: 'description', label: 'Description', type: 'textarea' }]}
            render={(i) => <><b>{i.title}</b> <span className="badge">{i.eventDate}</span> <span className="muted">{i.venue}</span><p>{i.description}</p></>} />
        )}
      </main>
    </>
  );
}
