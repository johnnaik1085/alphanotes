const express = require("express");
const {
  getMyCourse,
  getSubjects,
  getChapters,
  getNotes,
  getNote,
} = require("../controllers/studentController");
const asyncHandler = require("../middleware/asyncHandler");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect, authorize("student"));

router.get("/my-course", asyncHandler(getMyCourse));
router.get("/subjects", asyncHandler(getSubjects));
router.get("/chapters/:subjectId", asyncHandler(getChapters));
router.get("/notes/:chapterId", asyncHandler(getNotes));
router.get("/note/:noteId", asyncHandler(getNote));

module.exports = router;
