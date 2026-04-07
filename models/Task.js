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
  lastCompletedAt: {
    type: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
