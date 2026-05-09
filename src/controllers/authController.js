const jwt = require("jsonwebtoken");
const User = require("../models/User");
const LoginAttempt = require("../models/LoginAttempt");

const signToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const login = async (req, res) => {
  const { email, password, deviceId } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email }).populate("courses subjects");
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  if (user.isBlocked) {
    return res.status(403).json({ message: "Account is blocked" });
  }

  if (user.role === "student") {
    if (!deviceId) {
      return res.status(400).json({ message: "Device ID is required for student login" });
    }

    if (!user.deviceId) {
      user.deviceId = deviceId;
      await user.save();
    } else if (user.deviceId !== deviceId) {
      await LoginAttempt.create({
        student: user._id,
        oldDeviceId: user.deviceId,
        newDeviceId: deviceId,
      });

      return res.status(403).json({
        message: "This student account is already registered on another device",
      });
    }
  }

  res.json({
    token: signToken(user),
    user: user.toJSON(),
  });
};

const getMe = async (req, res) => {
  const user = await User.findById(req.user._id).select("-password").populate("courses subjects");
  if (!user) {
    return res.status(401).json({ message: "Account no longer exists" });
  }

  res.json({ user: user.toJSON() });
};

const updateProfile = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Name is required" });
  }

  const user = await User.findById(req.user._id);
  user.name = name;
  await user.save();

  res.json({ user: user.toJSON() });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current and new password are required" });
  }

  const user = await User.findById(req.user._id);
  const valid = await user.matchPassword(currentPassword);

  if (!valid) {
    return res.status(400).json({ message: "Current password is incorrect" });
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: "Password changed successfully" });
};

module.exports = {
  login,
  getMe,
  updateProfile,
  changePassword,
};
