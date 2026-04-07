const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Task = require('./models/Task');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err));

// Routes

// @route   GET /api/tasks
// @desc    Fetch all tasks (with daily reset for routine tasks)
app.get('/api/tasks', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    // Find and reset routine tasks completed before today
    await Task.updateMany(
      {
        type: 'routine',
        completed: true,
        lastCompletedAt: { $lt: today }
      },
      {
        $set: { completed: false }
      }
    );

    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/tasks
// @desc    Create a new task
app.post('/api/tasks', async (req, res) => {
  const { title, category, type, date } = req.body;
  const task = new Task({
    title,
    category,
    type,
    date,
  });

  try {
    const newTask = await task.save();
    res.status(201).json(newTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task's completed status
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const newCompletedStatus = req.body.completed !== undefined 
      ? req.body.completed 
      : !task.completed;

    task.completed = newCompletedStatus;

    if (newCompletedStatus) {
      task.lastCompletedAt = new Date(); // Track when it was completed
    } else {
      task.lastCompletedAt = null; // Clear if uncompleted
    }

    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await task.deleteOne();
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
