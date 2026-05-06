const express = require("express");
const { login, getMe, updateProfile, changePassword } = require("../controllers/authController");
const asyncHandler = require("../middleware/asyncHandler");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", asyncHandler(login));
router.get("/me", protect, asyncHandler(getMe));
router.put("/update-profile", protect, asyncHandler(updateProfile));
router.put("/change-password", protect, asyncHandler(changePassword));

module.exports = router;
