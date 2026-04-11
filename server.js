const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Task = require('./models/Task');
const User = require('./models/User');
const Goal = require('./models/Goal');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve static files from uploads folder
app.use('/uploads', express.static(uploadDir));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Save with a unique filename: taskID-timestamp-originalName
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

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

// --- Auth Routes ---

// @route   POST /api/auth/login
// @desc    Auto-signup or Login with Name and 4-digit PIN
app.post('/api/auth/login', async (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin || pin.length !== 4) {
    return res.status(400).json({ message: 'Please provide a name and a 4-digit PIN' });
  }

  try {
    let user = await User.findOne({ name });

    if (!user) {
      // Auto-signup
      user = new User({ name, pin });
      await user.save();
      return res.status(201).json(user);
    }

    // Login for existing user
    if (user.pin !== pin) {
      return res.status(401).json({ message: 'Incorrect PIN' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/tasks
// @desc    Fetch all tasks (with streak maintenance for routine tasks)
app.get('/api/tasks', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'Unauthorized: Missing user ID' });

    const today = getTodayString();
    const yesterday = getYesterdayString();

    const tasks = await Task.find({ userId });
    
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
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ message: 'Unauthorized: Missing user ID' });

  const { title, category, type, date } = req.body;
  const task = new Task({
    title,
    category,
    type,
    date,
    userId,
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
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'Unauthorized: Missing user ID' });

    const task = await Task.findOne({ _id: req.params.id, userId });
    if (!task) return res.status(404).json({ message: 'Task not found or unauthorized' });

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
    } else if (!newCompletedStatus && task.completed) {
      // Reversal Logic: If unchecking a task that was completed TODAY
      if (task.lastCompletedDate === today) {
        task.streak = Math.max(0, task.streak - 1);
        task.lastCompletedDate = yesterday; // Reset so re-checking today increments it back
      }
    }

    task.completed = newCompletedStatus;
    
    // Save Subtasks, Links, Document, Title, Date, and Category if provided
    if (req.body.subtasks !== undefined) task.subtasks = req.body.subtasks;
    if (req.body.links !== undefined) task.links = req.body.links;
    if (req.body.document !== undefined) task.document = req.body.document;
    if (req.body.title !== undefined) task.title = req.body.title;
    if (req.body.date !== undefined) task.date = req.body.date;
    if (req.body.category !== undefined) task.category = req.body.category;

    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   POST /api/tasks/:id/upload
// @desc    Upload a document for a task
app.post('/api/tasks/:id/upload', upload.single('document'), async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const task = await Task.findOne({ _id: req.params.id, userId });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Update task with document info
    task.document = {
      url: `/uploads/${req.file.filename}`,
      name: req.file.originalname
    };

    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'Unauthorized: Missing user ID' });

    const task = await Task.findOne({ _id: req.params.id, userId });
    if (!task) return res.status(404).json({ message: 'Task not found or unauthorized' });

    await task.deleteOne();
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Goal Routes ---

// @route   GET /api/goals
// @desc    Fetch all goals for a user
app.get('/api/goals', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const goals = await Goal.find({ userId });
    res.json(goals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/goals
// @desc    Create a new goal
app.post('/api/goals', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { title } = req.body;
    const goal = new Goal({ userId, title });
    await goal.save();
    res.status(201).json(goal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   DELETE /api/goals/:id
// @desc    Delete a goal
app.delete('/api/goals/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await Goal.findOneAndDelete({ _id: req.params.id, userId });
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   PUT /api/goals/:id/checkin
// @desc    Check in to a goal and update streaks
app.put('/api/goals/:id/checkin', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const goal = await Goal.findOne({ _id: req.params.id, userId });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    const today = getTodayString();
    const yesterday = getYesterdayString();

    if (goal.lastCheckIn === today) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    // Streak Logic
    if (goal.lastCheckIn === yesterday) {
      goal.currentStreak += 1;
    } else {
      // Missed a day or first time
      goal.currentStreak = 1;
    }

    if (goal.currentStreak > goal.longestStreak) {
      goal.longestStreak = goal.currentStreak;
    }

    goal.lastCheckIn = today;
    goal.history.push(today);

    await goal.save();
    res.json(goal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
