const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");

const dbPath = path.join(__dirname, "database.sqlite");
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function initDb() {
  await run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await run(
    `CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      department TEXT NOT NULL,
      position TEXT NOT NULL,
      salary REAL NOT NULL,
      hired_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  const defaultAdmin = {
    name: "Administrator",
    email: "admin@gmail.com",
    password: "Admin@123",
    role: "admin",
  };

  const admin = await get(
    "SELECT id, email, password FROM users WHERE role = ?",
    ["admin"],
  );

  if (!admin) {
    const passwordHash = await bcrypt.hash(defaultAdmin.password, 10);
    await run(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [defaultAdmin.name, defaultAdmin.email, passwordHash, defaultAdmin.role],
    );
  } else {
    const isDefaultAdmin =
      admin.email === defaultAdmin.email &&
      (await bcrypt.compare(defaultAdmin.password, admin.password));

    if (!isDefaultAdmin) {
      const passwordHash = await bcrypt.hash(defaultAdmin.password, 10);
      await run("UPDATE users SET email = ?, password = ? WHERE id = ?", [
        defaultAdmin.email,
        passwordHash,
        admin.id,
      ]);
    }
  }
}

async function createUser(name, email, password, role = "user") {
  const passwordHash = await bcrypt.hash(password, 10);
  return run(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
    [name, email, passwordHash, role],
  );
}

function findUserByEmail(email) {
  return get("SELECT * FROM users WHERE email = ?", [email]);
}

function getUserById(id) {
  return get(
    "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
    [id],
  );
}

async function verifyUser(email, password) {
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }
  const valid = await bcrypt.compare(password, user.password);
  return valid ? user : null;
}

function getAllEmployees() {
  return all("SELECT * FROM employees ORDER BY name ASC");
}

function getEmployeeById(id) {
  return get("SELECT * FROM employees WHERE id = ?", [id]);
}

function getEmployeeCount() {
  return get("SELECT COUNT(*) AS count FROM employees").then(
    (row) => row.count || 0,
  );
}

function getRecentEmployees(limit = 3) {
  return all(
    "SELECT name, department, position, hired_at FROM employees ORDER BY hired_at DESC LIMIT ?",
    [limit],
  );
}

function createEmployee({ name, email, department, position, salary }) {
  return run(
    "INSERT INTO employees (name, email, department, position, salary) VALUES (?, ?, ?, ?, ?)",
    [
      name.trim(),
      email.trim(),
      department.trim(),
      position.trim(),
      Number(salary),
    ],
  );
}

function updateEmployee({ id, name, email, department, position, salary }) {
  return run(
    "UPDATE employees SET name = ?, email = ?, department = ?, position = ?, salary = ? WHERE id = ?",
    [
      name.trim(),
      email.trim(),
      department.trim(),
      position.trim(),
      Number(salary),
      id,
    ],
  );
}

function deleteEmployee(id) {
  return run("DELETE FROM employees WHERE id = ?", [id]);
}

module.exports = {
  initDb,
  createUser,
  findUserByEmail,
  getUserById,
  verifyUser,
  getAllEmployees,
  getEmployeeById,
  getEmployeeCount,
  getRecentEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
