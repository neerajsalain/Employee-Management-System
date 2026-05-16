# WorkForce Pro - Employee Management System

WorkForce Pro is an employee management web application built with Node.js, Express, EJS, and SQLite. It includes secure user authentication, admin-only employee CRUD operations, session management, and form validation.

## Features

- User registration and login with hashed passwords using `bcrypt`
- Session handling with `express-session` and `connect-sqlite3`
- Protected pages for authenticated users
- Admin-only employee management (create, read, update, delete)
- Form validation for registration and employee data
- Default admin user seeded automatically

## Project structure

- `server.js` – main Express server
- `db.js` – SQLite database setup and helper functions
- `views/` – EJS templates for pages
- `public/` – static assets such as CSS
- `package.json` – project metadata and dependencies

## Installation

1. Open a terminal in the project folder:
   ```powershell
   cd D:\project\employee-management-system
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Start the app:
   ```powershell
   npm start
   ```
4. Open your browser and visit:
   ```text
   http://localhost:3000
   ```

## Default administrator credentials

- Email: `admin@gmail.com`
- Password: `Admin@123`

## Notes

- Make sure `node_modules/`, `database.sqlite`, and `sessions.sqlite` are not uploaded to GitHub. Your `.gitignore` already excludes them.
- If you want to publish this to GitHub, create a repository and push your project root.

## Recommended Git commands

```powershell
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<your-username>/employee-management-system.git
git branch -M main
git push -u origin main
```

> For production, replace the session secret and consider using a stronger persistent session store.
