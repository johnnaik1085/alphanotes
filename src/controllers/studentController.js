const Chapter = require("../models/Chapter");
require("../models/Course");
const Note = require("../models/Note");
const Subject = require("../models/Subject");
const User = require("../models/User");

const getMyCourses = async (req, res) => {
  const student = await User.findById(req.user._id).select("-password").populate("courses");
  res.json({ courses: student.courses });
};

const getSubjects = async (req, res) => {
  const subjects = await Subject.find({ courses: { $in: req.user.courses } })
    .populate("courses")
    .sort("title");
  res.json({ subjects });
};

const getChapters = async (req, res) => {
  const subject = await Subject.findOne({
    _id: req.params.subjectId,
    courses: { $in: req.user.courses },
  });
  if (!subject) return res.status(403).json({ message: "Subject is not in your courses" });

  const chapters = await Chapter.find({ subject: subject._id }).sort("title");
  res.json({ chapters });
};

const getNotes = async (req, res) => {
  const chapter = await Chapter.findById(req.params.chapterId).populate("subject");
  if (!chapter) return res.status(404).json({ message: "Chapter not found" });

  const subjectCourses = chapter.subject.courses.map((c) => c.toString());
  const studentCourses = req.user.courses.map((c) => c.toString());
  const hasAccess = subjectCourses.some((c) => studentCourses.includes(c));

  if (!hasAccess) {
    return res.status(403).json({ message: "Chapter is not in your courses" });
  }

  const notes = await Note.find({ chapter: chapter._id }).sort("-createdAt");
  res.json({ notes });
};

const getNote = async (req, res) => {
  const note = await Note.findById(req.params.noteId).populate({
    path: "chapter",
    populate: { path: "subject" },
  });

  if (!note) return res.status(404).json({ message: "Note not found" });

  const subjectCourses = note.chapter.subject.courses.map((c) => c.toString());
  const studentCourses = req.user.courses.map((c) => c.toString());
  const hasAccess = subjectCourses.some((c) => studentCourses.includes(c));

  if (!hasAccess) {
    return res.status(403).json({ message: "Note is not in your courses" });
  }

  res.json({ note });
};

module.exports = {
  getMyCourses,
  getSubjects,
  getChapters,
  getNotes,
  getNote,
};
