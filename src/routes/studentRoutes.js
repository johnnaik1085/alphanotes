const express = require("express");
const {
  getMyCourses,
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

router.get("/my-courses", asyncHandler(getMyCourses));
router.get("/subjects", asyncHandler(getSubjects));
router.get("/chapters/:subjectId", asyncHandler(getChapters));
router.get("/notes/:chapterId", asyncHandler(getNotes));
router.get("/note/:noteId", asyncHandler(getNote));

module.exports = router;
