const fs = require("fs");
const Chapter = require("../models/Chapter");
const Note = require("../models/Note");
const Subject = require("../models/Subject");

const isAssignedSubject = (user, subjectId) => {
  return user.subjects.some((id) => id.toString() === subjectId.toString());
};

const getPublicBaseUrl = (req) => {
  return process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
};

const getMySubjects = async (req, res) => {
  const subjects = await Subject.find({ _id: { $in: req.user.subjects } }).populate("course").sort("title");
  res.json({ subjects });
};

const addChapter = async (req, res) => {
  const { title, subject } = req.body;

  if (!title || !subject) {
    return res.status(400).json({ message: "Title and subject are required" });
  }

  if (!isAssignedSubject(req.user, subject)) {
    return res.status(403).json({ message: "You are not assigned to this subject" });
  }

  const chapter = await Chapter.create({
    title,
    subject,
    createdBy: req.user._id,
  });

  res.status(201).json({ chapter });
};

const getChapters = async (req, res) => {
  const { subjectId } = req.params;

  if (!isAssignedSubject(req.user, subjectId)) {
    return res.status(403).json({ message: "You are not assigned to this subject" });
  }

  const chapters = await Chapter.find({ subject: subjectId }).sort("title");
  res.json({ chapters });
};

const updateChapter = async (req, res) => {
  const chapter = await Chapter.findById(req.params.id);
  if (!chapter) return res.status(404).json({ message: "Chapter not found" });

  if (!isAssignedSubject(req.user, chapter.subject)) {
    return res.status(403).json({ message: "You are not assigned to this chapter subject" });
  }

  chapter.title = req.body.title || chapter.title;
  await chapter.save();

  res.json({ chapter });
};

const deleteChapter = async (req, res) => {
  const chapter = await Chapter.findById(req.params.id);
  if (!chapter) return res.status(404).json({ message: "Chapter not found" });

  if (!isAssignedSubject(req.user, chapter.subject)) {
    return res.status(403).json({ message: "You are not assigned to this chapter subject" });
  }

  const notes = await Note.find({ chapter: chapter._id }).select("pdfPath");
  notes.forEach((note) => {
    if (note.pdfPath && fs.existsSync(note.pdfPath)) {
      fs.unlinkSync(note.pdfPath);
    }
  });

  await Note.deleteMany({ chapter: chapter._id });
  await chapter.deleteOne();

  res.json({ message: "Chapter deleted successfully" });
};

const uploadNote = async (req, res) => {
  const { title, chapter } = req.body;

  if (!title || !chapter || !req.file) {
    return res.status(400).json({ message: "Title, chapter and PDF file are required" });
  }

  const foundChapter = await Chapter.findById(chapter);
  if (!foundChapter) return res.status(404).json({ message: "Chapter not found" });

  if (!isAssignedSubject(req.user, foundChapter.subject)) {
    return res.status(403).json({ message: "You are not assigned to this chapter subject" });
  }

  const pdfUrl = `${getPublicBaseUrl(req)}/uploads/${req.file.filename}`;
  const note = await Note.create({
    title,
    chapter,
    pdfUrl,
    pdfPath: req.file.path,
    uploadedBy: req.user._id,
  });

  res.status(201).json({ note });
};

const getNotes = async (req, res) => {
  const chapter = await Chapter.findById(req.params.chapterId);
  if (!chapter) return res.status(404).json({ message: "Chapter not found" });

  if (!isAssignedSubject(req.user, chapter.subject)) {
    return res.status(403).json({ message: "You are not assigned to this chapter subject" });
  }

  const notes = await Note.find({ chapter: req.params.chapterId, uploadedBy: req.user._id }).sort("-createdAt");
  res.json({ notes });
};

const updateNote = async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, uploadedBy: req.user._id });
  if (!note) return res.status(404).json({ message: "Note not found" });

  if (req.body.title) note.title = req.body.title;

  if (req.file) {
    if (note.pdfPath && fs.existsSync(note.pdfPath)) {
      fs.unlinkSync(note.pdfPath);
    }

    note.pdfUrl = `${getPublicBaseUrl(req)}/uploads/${req.file.filename}`;
    note.pdfPath = req.file.path;
  }

  await note.save();
  res.json({ note });
};

const deleteNote = async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, uploadedBy: req.user._id });
  if (!note) return res.status(404).json({ message: "Note not found" });

  if (note.pdfPath && fs.existsSync(note.pdfPath)) {
    fs.unlinkSync(note.pdfPath);
  }

  await note.deleteOne();
  res.json({ message: "Note deleted successfully" });
};

module.exports = {
  getMySubjects,
  addChapter,
  getChapters,
  updateChapter,
  deleteChapter,
  uploadNote,
  getNotes,
  updateNote,
  deleteNote,
};
