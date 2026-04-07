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
    enum: ['routine', 'next'],
    required: true,
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
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
