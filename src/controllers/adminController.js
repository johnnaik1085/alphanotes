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
  const { name, email, password, courses = [], subjects = [], isBlocked = false } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }

  if (role === "student" && courses.length === 0) {
    return res.status(400).json({ message: "At least one course is required for a student" });
  }

  if (role === "teacher" && (courses.length === 0 || subjects.length === 0)) {
    return res.status(400).json({ message: "Teacher courses and subjects are required" });
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    courses: role === "admin" ? [] : courses,
    subjects: role === "teacher" ? subjects : [],
    isBlocked,
  });

  await user.populate("courses subjects");
  res.status(201).json({ user });
};

const listUsers = (role) => async (req, res) => {
  const users = await User.find({ role }).select("-password").populate("courses subjects").sort("-createdAt");
  res.json({ users });
};

const updateUser = (role) => async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role });
  if (!user) return res.status(404).json({ message: `${role} not found` });

  const { name, email, password, courses, subjects, isBlocked, resetDevice } = req.body;

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (password) user.password = password;
  if (isBlocked !== undefined) user.isBlocked = isBlocked;

  if (role === "student") {
    if (courses !== undefined) user.courses = courses;
    if (resetDevice) user.deviceId = "";
  }

  if (role === "teacher") {
    if (courses !== undefined) user.courses = courses;
    if (subjects !== undefined) user.subjects = subjects;
  }

  await user.save();
  await user.populate("courses subjects");

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
  const courseId = req.params.id;

  // Find subjects that have this course in their courses array
  const allSubjectsWithCourse = await Subject.find({ courses: courseId }).select("_id courses");

  // Subjects that only belong to this course → delete them with cascade
  const subjectsToDelete = allSubjectsWithCourse.filter((s) => s.courses.length <= 1);
  const subjectsToUpdate = allSubjectsWithCourse.filter((s) => s.courses.length > 1);
  const subjectIdsToDelete = subjectsToDelete.map((s) => s._id);

  if (subjectIdsToDelete.length > 0) {
    const chapters = await Chapter.find({ subject: { $in: subjectIdsToDelete } }).select("_id");
    const chapterIds = chapters.map((c) => c._id);
    const notes = await Note.find({ chapter: { $in: chapterIds } }).select("pdfPath");
    deletePdfFiles(notes);
    await Note.deleteMany({ chapter: { $in: chapterIds } });
    await Chapter.deleteMany({ subject: { $in: subjectIdsToDelete } });
    await Subject.deleteMany({ _id: { $in: subjectIdsToDelete } });
  }

  // Remove this course from subjects shared with other courses
  if (subjectsToUpdate.length > 0) {
    await Subject.updateMany(
      { _id: { $in: subjectsToUpdate.map((s) => s._id) } },
      { $pull: { courses: courseId } }
    );
  }

  // Remove course from all users
  await User.updateMany({ courses: courseId }, { $pull: { courses: courseId } });

  const course = await Course.findByIdAndDelete(courseId);
  if (!course) return res.status(404).json({ message: "Course not found" });
  res.json({ message: "Course deleted successfully" });
};

const createSubject = async (req, res) => {
  const { title, courses = [] } = req.body;
  if (!title || courses.length === 0) {
    return res.status(400).json({ message: "Title and at least one course are required" });
  }

  const subject = await Subject.create({ title, courses });
  await subject.populate("courses");
  res.status(201).json({ subject });
};

const listSubjects = async (req, res) => {
  const filter = req.query.course ? { courses: req.query.course } : {};
  const subjects = await Subject.find(filter).populate("courses").sort("title");
  res.json({ subjects });
};

const updateSubject = async (req, res) => {
  const { title, courses } = req.body;
  const update = {};
  if (title !== undefined) update.title = title;
  if (courses !== undefined) update.courses = courses;

  const subject = await Subject.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).populate("courses");
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
    .populate("student", "name email courses")
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
