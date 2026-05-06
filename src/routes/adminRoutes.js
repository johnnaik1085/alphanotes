const express = require("express");
const {
  createStudent,
  listStudents,
  updateStudent,
  deleteStudent,
  createTeacher,
  listTeachers,
  updateTeacher,
  deleteTeacher,
  createCourse,
  listCourses,
  updateCourse,
  deleteCourse,
  createSubject,
  listSubjects,
  updateSubject,
  deleteSubject,
  listLoginAttempts,
} = require("../controllers/adminController");
const asyncHandler = require("../middleware/asyncHandler");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.route("/students").post(asyncHandler(createStudent)).get(asyncHandler(listStudents));
router.route("/students/:id").put(asyncHandler(updateStudent)).delete(asyncHandler(deleteStudent));

router.route("/teachers").post(asyncHandler(createTeacher)).get(asyncHandler(listTeachers));
router.route("/teachers/:id").put(asyncHandler(updateTeacher)).delete(asyncHandler(deleteTeacher));

router.route("/courses").post(asyncHandler(createCourse)).get(asyncHandler(listCourses));
router.route("/courses/:id").put(asyncHandler(updateCourse)).delete(asyncHandler(deleteCourse));

router.route("/subjects").post(asyncHandler(createSubject)).get(asyncHandler(listSubjects));
router.route("/subjects/:id").put(asyncHandler(updateSubject)).delete(asyncHandler(deleteSubject));

router.get("/login-attempts", asyncHandler(listLoginAttempts));

module.exports = router;
