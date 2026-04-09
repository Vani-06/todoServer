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

// Date Helpers
const getTodayString = () => new Date().toISOString().split('T')[0];
const getYesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

// @route   GET /api/tasks
// @desc    Fetch all tasks (with streak maintenance for routine tasks)
app.get('/api/tasks', async (req, res) => {
  try {
    const today = getTodayString();
    const yesterday = getYesterdayString();

    const tasks = await Task.find();
    
    // Streak Maintenance & Daily Reset
    for (let task of tasks) {
      if (task.type === 'routine') {
        let updated = false;

        // Reset completion if it's a new day
        if (task.completed && task.lastCompletedDate !== today) {
          task.completed = false;
          updated = true;
        }

        // Reset streak if a day was missed
        if (task.lastCompletedDate && task.lastCompletedDate < yesterday && task.streak > 0) {
          task.streak = 0;
          updated = true;
        }

        if (updated) await task.save();
      }
    }

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
// @desc    Update a task's completed status & streaks
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const today = getTodayString();
    const yesterday = getYesterdayString();
    const newCompletedStatus = req.body.completed !== undefined 
      ? req.body.completed 
      : !task.completed;

    // Streak Logic
    if (newCompletedStatus && !task.completed) {
      // Just became completed
      if (task.lastCompletedDate === yesterday) {
        task.streak += 1;
      } else if (task.lastCompletedDate !== today) {
        // First time completing today after a break or first time ever
        task.streak = 1;
      }
      // If task.lastCompletedDate === today, we don't increment streak again
      task.lastCompletedDate = today;
    }

    task.completed = newCompletedStatus;

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
