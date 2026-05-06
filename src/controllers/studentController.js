const Chapter = require("../models/Chapter");
require("../models/Course");
const Note = require("../models/Note");
const Subject = require("../models/Subject");
const User = require("../models/User");

const getMyCourse = async (req, res) => {
  const student = await User.findById(req.user._id).select("-password").populate("course");
  res.json({ course: student.course });
};

const getSubjects = async (req, res) => {
  const subjects = await Subject.find({ course: req.user.course }).sort("title");
  res.json({ subjects });
};

const getChapters = async (req, res) => {
  const subject = await Subject.findOne({ _id: req.params.subjectId, course: req.user.course });
  if (!subject) return res.status(403).json({ message: "Subject is not in your course" });

  const chapters = await Chapter.find({ subject: subject._id }).sort("title");
  res.json({ chapters });
};

const getNotes = async (req, res) => {
  const chapter = await Chapter.findById(req.params.chapterId).populate("subject");
  if (!chapter || chapter.subject.course.toString() !== req.user.course.toString()) {
    return res.status(403).json({ message: "Chapter is not in your course" });
  }

  const notes = await Note.find({ chapter: chapter._id }).sort("-createdAt");
  res.json({ notes });
};

const getNote = async (req, res) => {
  const note = await Note.findById(req.params.noteId).populate({
    path: "chapter",
    populate: { path: "subject" },
  });

  if (!note || note.chapter.subject.course.toString() !== req.user.course.toString()) {
    return res.status(403).json({ message: "Note is not in your course" });
  }

  res.json({ note });
};

module.exports = {
  getMyCourse,
  getSubjects,
  getChapters,
  getNotes,
  getNote,
};
