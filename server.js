const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const path = require("path");

const connectDB = require("./src/config/db");
const User = require("./src/models/User");

const authRoutes = require("./src/routes/authRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const teacherRoutes = require("./src/routes/teacherRoutes");
const studentRoutes = require("./src/routes/studentRoutes");

dotenv.config();

const app = express();

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({ message: "Academy Notes API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || "Server error" });
});

const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  if (!email) return;

  const existing = await User.findOne({ email });
  if (existing) return;

  await User.create({
    name: process.env.ADMIN_NAME || "Admin",
    email,
    password: process.env.ADMIN_PASSWORD || "admin12345",
    role: "admin",
  });

  console.log(`Seeded admin account: ${email}`);
};

const startServer = async () => {
  await connectDB();
  await seedAdmin();

  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
};

startServer();
