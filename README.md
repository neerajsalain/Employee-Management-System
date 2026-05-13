# WorkForce Pro - Employee Management System

This is a full-stack employee management web application with secure authentication, role-based access control, and administrator CRUD operations for employee records.

## Features

- User registration and login with password hashing via bcrypt
- Session management using `express-session` and SQLite session storage
- Protected routes for authenticated users
- Administrator-only employee CRUD operations
- Validation for user registration and employee data
- Default admin user seeded automatically

## Setup

1. Open a terminal in `c:\Users\Dell\employee-management-system`
2. Run `npm install`
3. Start the app with `npm start`
4. Visit `http://localhost:3000`

## Default administrator credentials

- Email: `admin@prodigy.com`
- Password: `Admin@123`

> For production, replace the session secret and configure a persistent session store.
