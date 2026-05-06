const mongoose = require("mongoose");

const loginAttemptSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  oldDeviceId: { type: String, default: "" },
  newDeviceId: { type: String, required: true },
  attemptedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("LoginAttempt", loginAttemptSchema);
