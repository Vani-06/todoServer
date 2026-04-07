const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['Academic 📚', 'Hygiene & Self Care 🛁', 'Hobbies 🎨'],
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
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
