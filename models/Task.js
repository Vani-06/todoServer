const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['routine', 'next', 'weekly'],
    required: true,
  },
  isWeekly: {
    type: Boolean,
    default: false,
  },
  dayOfWeek: {
    type: String, // 'Monday', 'Tuesday', etc.
  },
  date: {
    type: String,
    default: 'Everyday',
  },
  completed: {
    type: Boolean,
    default: false,
  },
  streak: {
    type: Number,
    default: 0,
  },
  lastCompletedDate: {
    type: String, // 'YYYY-MM-DD'
    default: null,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subtasks: [{
    title: { type: String, required: true },
    completed: { type: Boolean, default: false }
  }],
  links: [{
    url: { type: String, required: true },
    name: { type: String }
  }],
  document: {
    url: { type: String },
    name: { type: String }
  }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
