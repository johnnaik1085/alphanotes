const fs = require("fs");
const Course = require("../models/Course");
const Subject = require("../models/Subject");
const Chapter = require("../models/Chapter");
const Note = require("../models/Note");
const User = require("../models/User");
const LoginAttempt = require("../models/LoginAttempt");

const deletePdfFiles = (notes) => {
  notes.forEach((note) => {
    if (note.pdfPath && fs.existsSync(note.pdfPath)) {
      fs.unlinkSync(note.pdfPath);
    }
  });
};

const createUser = (role) => async (req, res) => {
  const { name, email, password, course, subjects = [], isBlocked = false } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }

  if (role === "student" && !course) {
    return res.status(400).json({ message: "Student course is required" });
  }

  if (role === "teacher" && (!course || subjects.length === 0)) {
    return res.status(400).json({ message: "Teacher course and subjects are required" });
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    course: role === "admin" ? undefined : course,
    subjects: role === "teacher" ? subjects : [],
    isBlocked,
  });

  res.status(201).json({ user });
};

const listUsers = (role) => async (req, res) => {
  const users = await User.find({ role }).select("-password").populate("course subjects").sort("-createdAt");
  res.json({ users });
};

const updateUser = (role) => async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role });
  if (!user) return res.status(404).json({ message: `${role} not found` });

  const { name, email, password, course, subjects, isBlocked, resetDevice } = req.body;

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (password) user.password = password;
  if (isBlocked !== undefined) user.isBlocked = isBlocked;

  if (role === "student") {
    if (course !== undefined) user.course = course;
    if (resetDevice) user.deviceId = "";
  }

  if (role === "teacher") {
    if (course !== undefined) user.course = course;
    if (subjects !== undefined) user.subjects = subjects;
  }

  await user.save();
  await user.populate("course subjects");

  res.json({ user });
};

const deleteUser = (role) => async (req, res) => {
  const user = await User.findOneAndDelete({ _id: req.params.id, role });
  if (!user) return res.status(404).json({ message: `${role} not found` });
  res.json({ message: `${role} deleted successfully` });
};

const createCourse = async (req, res) => {
  const course = await Course.create(req.body);
  res.status(201).json({ course });
};

const listCourses = async (req, res) => {
  const courses = await Course.find().sort("title");
  res.json({ courses });
};

const updateCourse = async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!course) return res.status(404).json({ message: "Course not found" });
  res.json({ course });
};

const deleteCourse = async (req, res) => {
  const subjects = await Subject.find({ course: req.params.id }).select("_id");
  const subjectIds = subjects.map((subject) => subject._id);
  const chapters = await Chapter.find({ subject: { $in: subjectIds } }).select("_id");
  const chapterIds = chapters.map((chapter) => chapter._id);
  const notes = await Note.find({ chapter: { $in: chapterIds } }).select("pdfPath");

  deletePdfFiles(notes);
  await Note.deleteMany({ chapter: { $in: chapterIds } });
  await Chapter.deleteMany({ subject: { $in: subjectIds } });
  await Subject.deleteMany({ course: req.params.id });
  await User.updateMany({ course: req.params.id }, { $unset: { course: "" }, $set: { subjects: [] } });

  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) return res.status(404).json({ message: "Course not found" });
  res.json({ message: "Course deleted successfully" });
};

const createSubject = async (req, res) => {
  const { title, course } = req.body;
  if (!title || !course) {
    return res.status(400).json({ message: "Title and course are required" });
  }

  const subject = await Subject.create({ title, course });
  await subject.populate("course");
  res.status(201).json({ subject });
};

const listSubjects = async (req, res) => {
  const filter = req.query.course ? { course: req.query.course } : {};
  const subjects = await Subject.find(filter).populate("course").sort("title");
  res.json({ subjects });
};

const updateSubject = async (req, res) => {
  const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate("course");
  if (!subject) return res.status(404).json({ message: "Subject not found" });
  res.json({ subject });
};

const deleteSubject = async (req, res) => {
  const chapters = await Chapter.find({ subject: req.params.id }).select("_id");
  const chapterIds = chapters.map((chapter) => chapter._id);
  const notes = await Note.find({ chapter: { $in: chapterIds } }).select("pdfPath");

  deletePdfFiles(notes);
  await Note.deleteMany({ chapter: { $in: chapterIds } });
  await Chapter.deleteMany({ subject: req.params.id });
  await User.updateMany({ subjects: req.params.id }, { $pull: { subjects: req.params.id } });

  const subject = await Subject.findByIdAndDelete(req.params.id);
  if (!subject) return res.status(404).json({ message: "Subject not found" });
  res.json({ message: "Subject deleted successfully" });
};

const listLoginAttempts = async (req, res) => {
  const attempts = await LoginAttempt.find()
    .populate("student", "name email course")
    .sort("-attemptedAt");

  res.json({ attempts });
};

module.exports = {
  createStudent: createUser("student"),
  listStudents: listUsers("student"),
  updateStudent: updateUser("student"),
  deleteStudent: deleteUser("student"),
  createTeacher: createUser("teacher"),
  listTeachers: listUsers("teacher"),
  updateTeacher: updateUser("teacher"),
  deleteTeacher: deleteUser("teacher"),
  createCourse,
  listCourses,
  updateCourse,
  deleteCourse,
  createSubject,
  listSubjects,
  updateSubject,
  deleteSubject,
  listLoginAttempts,
};
