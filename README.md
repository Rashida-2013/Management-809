I inspected your uploaded **College Management MERN ZIP file**. Now I can give you the actual commands based on your project's `package.json`, `server.js`, and `vite.config.js`.

Your project has:

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB
- Frontend port: 5173 (or another available port)
- Backend port: 5000

Follow these steps in order.

# **Step 1: Open Git Bash**

Copy this command:

```
cd "/e/college-management-mern (3)/college-management-mern"
```

Check the folders:

```
ls
```

You should see:

```
README.md
frontend
backend
```

# **Step 2: Start MongoDB**

Your backend requires MongoDB. It uses this default connection:

```
mongodb://127.0.0.1:27017/college
```

If MongoDB is installed as a Windows service, open **PowerShell as Administrator** and run:

```
net start MongoDB
```

If it says the service is already running, that's fine.

# **Step 3: Install backend packages**

Open a **new Git Bash terminal**.

Run these commands one by one:

```
cd "/e/college-management-mern (3)/college-management-mern/backend"
```

```
npm install
```

Wait until installation completes.

# **Step 4: Run the backend server**

In the same terminal:

```
npm start
```

Backend started

Expected output:

```
Demo users created
API running on http://localhost:5000
```

The `Demo users created` message appears on the first successful database initialization only.

Keep this terminal open.

# **Step 5: Install frontend packages**

Open a **third Git Bash terminal**.

Run:

```
cd "/e/college-management-mern (3)/college-management-mern/frontend"
```

Install packages:

```
npm install
```

Wait until installation completes.

# **Step 6: Run the frontend**

In the same terminal:

```
npm run dev
```

Expected output:

```
VITE ready

Local: http://localhost:5173/
```

If port 5173 is already occupied, Vite may automatically select 5174 or another port. Use the exact URL displayed in your terminal.

Frontend started

Keep this terminal open too.

# **Step 7: Open your project in Chrome**

Open this address:

[College Management System – Open Website](http://localhost:5173/?utm_source=chatgpt.com)

If Vite selected another port, replace 5173 with the port shown in your terminal.

# **Step 8: Login to your project**

Your backend automatically creates three demo accounts when the MongoDB database is empty.

**Demo login credentials**

**Admin**

Administrator

Username: `admin`

Password: `admin123`

**Faculty**

Faculty

Username: `faculty1`

Password: `faculty123`

**Student**

Student

Username: `student1`

Password: `student123`

# **Step 9: Final running commands**

You need two running servers and MongoDB.

**MongoDB**

Required

```
net start MongoDB
```

**Terminal 1 – Backend**

```
cd "/e/college-management-mern (3)/college-management-mern/backend"
npm install
npm start
```

**Terminal 2 – Frontend**

```
cd "/e/college-management-mern (3)/college-management-mern/frontend"
npm install
npm run dev
```

**Browser**

`http://localhost:5173/`

*You only need to run `npm install` the first time, or after dependencies change. On subsequent runs, start MongoDB and run `npm start` and `npm run dev` in separate terminals.*

**Important:** Your project already has Vite configured to forward `/api` requests to `localhost:5000`. You do not need to start another API server.

If you get an error, send me the screenshot of the terminal. I can identify the exact problem from it.
