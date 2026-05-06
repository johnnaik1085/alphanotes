const express = require("express");
const upload = require("../config/multer");
const {
  getMySubjects,
  addChapter,
  getChapters,
  updateChapter,
  deleteChapter,
  uploadNote,
  getNotes,
  updateNote,
  deleteNote,
} = require("../controllers/teacherController");
const asyncHandler = require("../middleware/asyncHandler");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect, authorize("teacher"));

router.get("/my-subjects", asyncHandler(getMySubjects));

router.post("/chapters", asyncHandler(addChapter));
router.get("/chapters/:subjectId", asyncHandler(getChapters));
router.put("/chapters/:id", asyncHandler(updateChapter));
router.delete("/chapters/:id", asyncHandler(deleteChapter));

router.post("/notes", upload.single("pdf"), asyncHandler(uploadNote));
router.get("/notes/:chapterId", asyncHandler(getNotes));
router.put("/notes/:id", upload.single("pdf"), asyncHandler(updateNote));
router.delete("/notes/:id", asyncHandler(deleteNote));

module.exports = router;
