const express = require("express");
const path = require("path");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const {
  initDb,
  findUserByEmail,
  createUser,
  verifyUser,
  getUserById,
  getAllEmployees,
  getEmployeeById,
  getEmployeeCount,
  getRecentEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require("./db");

initDb();

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    store: new SQLiteStore({ db: "sessions.sqlite", dir: __dirname }),
    secret: "employee-management-secret-2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 2,
      httpOnly: true,
    },
  }),
);

app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

function requireAuth(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect("/login");
}

function requireAdmin(req, res, next) {
  if (req.session.userRole === "admin") {
    return next();
  }
  res
    .status(403)
    .render("error", { message: "Forbidden: administrator access only." });
}

function validateRegisterInput(name, email, password, confirmPassword) {
  const errors = [];

  if (!name || !email || !password || !confirmPassword) {
    errors.push("All fields are required.");
  }
  if (password !== confirmPassword) {
    errors.push("Passwords do not match.");
  }
  if (password && password.length < 8) {
    errors.push("Password must be at least 8 characters long.");
  }
  if (password && !/[A-Z]/.test(password)) {
    errors.push("Password must include at least one uppercase letter.");
  }
  if (password && !/[0-9]/.test(password)) {
    errors.push("Password must include at least one number.");
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    errors.push("Please enter a valid email address.");
  }

  return errors;
}

function validateEmployeeInput({ name, email, department, position, salary }) {
  const errors = [];

  if (!name || !email || !department || !position) {
    errors.push("Name, email, department, and position are required.");
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    errors.push("Please enter a valid contact email for the employee.");
  }
  if (!salary || Number.isNaN(Number(salary)) || Number(salary) < 0) {
    errors.push("Salary must be a valid non-negative number.");
  }

  return errors;
}

app.get("/", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }
  res.redirect("/login");
});

app.get("/register", (req, res) => {
  res.render("register", { errors: [], form: {} });
});

app.post("/register", async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  const errors = validateRegisterInput(name, email, password, confirmPassword);

  if (errors.length) {
    return res.render("register", { errors, form: { name, email } });
  }

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.render("register", {
        errors: ["A user with that email already exists."],
        form: { name, email },
      });
    }

    await createUser(name, email, password, "user");
    res.redirect("/login");
  } catch (error) {
    console.error(error);
    res.render("register", {
      errors: [
        "Unable to create account at this time. Please try again later.",
      ],
      form: { name, email },
    });
  }
});

app.get("/login", (req, res) => {
  res.render("login", { error: null, form: {} });
});

app.post("/login", async (req, res) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) {
    return res.render("login", {
      error: "Email and password are required.",
      form: { email, rememberMe: rememberMe === "on" },
    });
  }

  try {
    const user = await verifyUser(email, password);
    if (!user) {
      return res.render("login", {
        error: "Invalid email or password.",
        form: { email, rememberMe: rememberMe === "on" },
      });
    }

    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    if (rememberMe === "on") {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
    } else {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 2; // 2 hours
    }

    res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    res.render("login", {
      error: "Unable to sign in at this time. Please try again later.",
      form: { email, rememberMe: rememberMe === "on" },
    });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

app.get("/dashboard", requireAuth, async (req, res) => {
  const userDetails = await getUserById(req.session.userId);
  if (req.session.userRole === "admin") {
    const employeeCount = await getEmployeeCount();
    const recentEmployees = await getRecentEmployees(3);
    return res.render("dashboard", {
      userDetails,
      employeeCount,
      recentEmployees,
    });
  }

  res.render("dashboard", { userDetails });
});

app.get("/profile", requireAuth, async (req, res) => {
  const user = await getUserById(req.session.userId);
  res.render("profile", { user });
});

app.get("/employees", requireAuth, requireAdmin, async (req, res) => {
  const employees = await getAllEmployees();
  res.render("employees", { employees });
});

app.get("/employees/new", requireAuth, requireAdmin, (req, res) => {
  res.render("employee-form", {
    errors: [],
    employee: {},
    action: "/employees",
    buttonText: "Create Employee",
  });
});

app.post("/employees", requireAuth, requireAdmin, async (req, res) => {
  const employee = req.body;
  const errors = validateEmployeeInput(employee);
  if (errors.length) {
    return res.render("employee-form", {
      errors,
      employee,
      action: "/employees",
      buttonText: "Create Employee",
    });
  }

  try {
    await createEmployee(employee);
    res.redirect("/employees");
  } catch (error) {
    console.error(error);
    res.render("employee-form", {
      errors: [
        "Unable to create employee record. Please verify email uniqueness and try again.",
      ],
      employee,
      action: "/employees",
      buttonText: "Create Employee",
    });
  }
});

app.get("/employees/:id/edit", requireAuth, requireAdmin, async (req, res) => {
  const employee = await getEmployeeById(req.params.id);
  if (!employee) {
    return res
      .status(404)
      .render("error", { message: "Employee record not found." });
  }
  res.render("employee-form", {
    errors: [],
    employee,
    action: `/employees/${employee.id}/edit`,
    buttonText: "Update Employee",
  });
});

app.post("/employees/:id/edit", requireAuth, requireAdmin, async (req, res) => {
  const employee = { ...req.body, id: req.params.id };
  const errors = validateEmployeeInput(employee);

  if (errors.length) {
    return res.render("employee-form", {
      errors,
      employee,
      action: `/employees/${employee.id}/edit`,
      buttonText: "Update Employee",
    });
  }

  try {
    await updateEmployee(employee);
    res.redirect("/employees");
  } catch (error) {
    console.error(error);
    res.render("employee-form", {
      errors: [
        "Unable to update employee record. Please verify email uniqueness and try again.",
      ],
      employee,
      action: `/employees/${employee.id}/edit`,
      buttonText: "Update Employee",
    });
  }
});

app.post(
  "/employees/:id/delete",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      await deleteEmployee(req.params.id);
      res.redirect("/employees");
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .render("error", { message: "Unable to delete employee record." });
    }
  },
);

app.use((req, res) => {
  res.status(404).render("error", { message: "Page not found." });
});

const server = app.listen(PORT, () => {
  console.log(
    `Employee Management System listening at http://localhost:${PORT}`,
  );
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process or set a different PORT, for example: PORT=3001 npm start`,
    );
    process.exit(1);
  }
  throw error;
});
