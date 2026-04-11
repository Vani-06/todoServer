const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  currentStreak: {
    type: Number,
    default: 0,
  },
  longestStreak: {
    type: Number,
    default: 0,
  },
  lastCheckIn: {
    type: String, // 'YYYY-MM-DD'
    default: null,
  },
  history: [{
    type: String, // Array of 'YYYY-MM-DD'
  }]
}, { timestamps: true });

module.exports = mongoose.model('Goal', GoalSchema);
