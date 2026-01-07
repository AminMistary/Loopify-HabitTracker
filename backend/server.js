// ====================================================
// LOOPIFY BACKEND - MVP
// Node.js + Express + JWT Authentication
// ====================================================

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ====================================================
// CONFIGURATION
// ====================================================

const JWT_SECRET = process.env.JWT_SECRET || 'loopify-secret-key-change-in-production';
const PORT = process.env.PORT || 5000;

// ====================================================
// IN-MEMORY DATA STORES (Replace with DB in production)
// ====================================================

const users = []; // { id, email, password, name, primaryFocus, createdAt }
const loops = []; // { id, userId, name, frequency, isActive, currentStreak, longestStreak, lastCompletedDate, createdAt }
const tasks = []; // { id, loopId, title, isCompleted, completedAt, order }
const completions = []; // { id, loopId, completedDate, tasksCompleted }

// ====================================================
// UTILITY FUNCTIONS
// ====================================================

// Generate unique ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Get today's date string (YYYY-MM-DD)
const getTodayString = () => new Date().toISOString().split('T')[0];

// Calculate days between two date strings
const daysBetween = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Check if loop was completed today
const isCompletedToday = (loopId) => {
  const today = getTodayString();
  return completions.some(c => c.loopId === loopId && c.completedDate === today);
};

// Get motivation message based on streak and loop state
const getMotivationMessage = (loop, justCompleted = false) => {
  if (justCompleted) {
    if (loop.currentStreak === 1) return "Loop initialized. Repeat tomorrow.";
    if (loop.currentStreak === 3) return "Momentum detected.";
    if (loop.currentStreak === 7) return "This loop is forming.";
    if (loop.currentStreak === 14) return "System integration in progress.";
    if (loop.currentStreak === 30) return "Loop established.";
    return "Loop complete. Repeat tomorrow.";
  }

  if (loop.currentStreak === 0 && loop.longestStreak > 0) {
    return "The loop broke. Restart today.";
  }

  if (loop.currentStreak > 0) {
    return `Loop active. ${loop.currentStreak} cycles completed.`;
  }

  return "Loop ready. Begin execution.";
};

// ====================================================
// AUTHENTICATION MIDDLEWARE
// ====================================================

const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ====================================================
// AUTH ROUTES
// ====================================================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, primaryFocus } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user exists
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      id: generateId(),
      email,
      password: hashedPassword,
      name,
      primaryFocus: primaryFocus || 'discipline',
      createdAt: new Date().toISOString()
    };

    users.push(user);

    // Generate token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        primaryFocus: user.primaryFocus
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        primaryFocus: user.primaryFocus
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ====================================================
// LOOP ROUTES
// ====================================================

// Create loop
app.post('/api/loops', authenticate, (req, res) => {
  try {
    const { name, frequency, taskList } = req.body;

    // Validation
    if (!name || !frequency) {
      return res.status(400).json({ error: 'Name and frequency are required' });
    }

    if (!['daily', 'weekly'].includes(frequency)) {
      return res.status(400).json({ error: 'Frequency must be daily or weekly' });
    }

    // Create loop
    const loop = {
      id: generateId(),
      userId: req.userId,
      name,
      frequency,
      isActive: true,
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
      createdAt: new Date().toISOString()
    };

    loops.push(loop);

    // Create tasks if provided (1-5 tasks)
    if (taskList && Array.isArray(taskList)) {
      const tasksToCreate = taskList.slice(0, 5); // Max 5 tasks
      tasksToCreate.forEach((taskTitle, index) => {
        tasks.push({
          id: generateId(),
          loopId: loop.id,
          title: taskTitle,
          isCompleted: false,
          completedAt: null,
          order: index
        });
      });
    }

    res.status(201).json({
      loop,
      message: 'Loop created. System ready.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create loop' });
  }
});

// Get all user loops
app.get('/api/loops', authenticate, (req, res) => {
  try {
    const userLoops = loops.filter(l => l.userId === req.userId);
    
    // Attach tasks and motivation messages to each loop
    const loopsWithDetails = userLoops.map(loop => {
      const loopTasks = tasks.filter(t => t.loopId === loop.id);
      const completedToday = isCompletedToday(loop.id);
      
      return {
        ...loop,
        tasks: loopTasks,
        completedToday,
        motivationMessage: getMotivationMessage(loop)
      };
    });

    res.json({ loops: loopsWithDetails });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch loops' });
  }
});

// Get single loop
app.get('/api/loops/:loopId', authenticate, (req, res) => {
  try {
    const loop = loops.find(l => l.id === req.params.loopId && l.userId === req.userId);
    
    if (!loop) {
      return res.status(404).json({ error: 'Loop not found' });
    }

    const loopTasks = tasks.filter(t => t.loopId === loop.id);
    const completedToday = isCompletedToday(loop.id);

    res.json({
      loop: {
        ...loop,
        tasks: loopTasks,
        completedToday,
        motivationMessage: getMotivationMessage(loop)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch loop' });
  }
});

// Update loop
app.put('/api/loops/:loopId', authenticate, (req, res) => {
  try {
    const { name, frequency, isActive } = req.body;
    const loopIndex = loops.findIndex(l => l.id === req.params.loopId && l.userId === req.userId);

    if (loopIndex === -1) {
      return res.status(404).json({ error: 'Loop not found' });
    }

    // Update fields
    if (name) loops[loopIndex].name = name;
    if (frequency) loops[loopIndex].frequency = frequency;
    if (typeof isActive === 'boolean') loops[loopIndex].isActive = isActive;

    res.json({
      loop: loops[loopIndex],
      message: 'Loop updated.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update loop' });
  }
});

// Delete loop
app.delete('/api/loops/:loopId', authenticate, (req, res) => {
  try {
    const loopIndex = loops.findIndex(l => l.id === req.params.loopId && l.userId === req.userId);

    if (loopIndex === -1) {
      return res.status(404).json({ error: 'Loop not found' });
    }

    const loopId = loops[loopIndex].id;

    // Delete loop
    loops.splice(loopIndex, 1);

    // Delete associated tasks
    const taskIndices = tasks.map((t, i) => t.loopId === loopId ? i : -1).filter(i => i !== -1);
    taskIndices.reverse().forEach(i => tasks.splice(i, 1));

    // Delete completions
    const completionIndices = completions.map((c, i) => c.loopId === loopId ? i : -1).filter(i => i !== -1);
    completionIndices.reverse().forEach(i => completions.splice(i, 1));

    res.json({ message: 'Loop deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete loop' });
  }
});

// ====================================================
// TASK ROUTES
// ====================================================

// Add task to loop
app.post('/api/loops/:loopId/tasks', authenticate, (req, res) => {
  try {
    const { title } = req.body;
    const loop = loops.find(l => l.id === req.params.loopId && l.userId === req.userId);

    if (!loop) {
      return res.status(404).json({ error: 'Loop not found' });
    }

    // Check task limit (max 5 tasks per loop)
    const loopTasks = tasks.filter(t => t.loopId === loop.id);
    if (loopTasks.length >= 5) {
      return res.status(400).json({ error: 'Maximum 5 tasks per loop' });
    }

    const task = {
      id: generateId(),
      loopId: loop.id,
      title,
      isCompleted: false,
      completedAt: null,
      order: loopTasks.length
    };

    tasks.push(task);

    res.status(201).json({ task });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add task' });
  }
});

// Update task
app.put('/api/tasks/:taskId', authenticate, (req, res) => {
  try {
    const { title, isCompleted } = req.body;
    const taskIndex = tasks.findIndex(t => t.id === req.params.taskId);

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = tasks[taskIndex];
    const loop = loops.find(l => l.id === task.loopId && l.userId === req.userId);

    if (!loop) {
      return res.status(404).json({ error: 'Loop not found' });
    }

    // Update fields
    if (title) task.title = title;
    if (typeof isCompleted === 'boolean') {
      task.isCompleted = isCompleted;
      task.completedAt = isCompleted ? new Date().toISOString() : null;
    }

    // Check if all tasks in loop are completed
    const loopTasks = tasks.filter(t => t.loopId === loop.id);
    const allCompleted = loopTasks.every(t => t.isCompleted);

    let loopCompletionData = null;

    if (allCompleted && !isCompletedToday(loop.id)) {
      // Complete the loop for today
      loopCompletionData = completeLoop(loop);
    }

    res.json({
      task,
      loopCompletionData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
app.delete('/api/tasks/:taskId', authenticate, (req, res) => {
  try {
    const taskIndex = tasks.findIndex(t => t.id === req.params.taskId);

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = tasks[taskIndex];
    const loop = loops.find(l => l.id === task.loopId && l.userId === req.userId);

    if (!loop) {
      return res.status(404).json({ error: 'Loop not found' });
    }

    tasks.splice(taskIndex, 1);

    res.json({ message: 'Task deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ====================================================
// LOOP COMPLETION LOGIC
// ====================================================

// Complete a loop (called when all tasks are done)
function completeLoop(loop) {
  const today = getTodayString();

  // Prevent multiple completions on same day
  if (isCompletedToday(loop.id)) {
    return {
      message: 'Loop already completed today.',
      loop
    };
  }

  // Calculate streak logic
  let newStreak = loop.currentStreak;

  if (loop.lastCompletedDate) {
    const daysSinceLastCompletion = daysBetween(loop.lastCompletedDate, today);

    if (daysSinceLastCompletion === 1) {
      // Consecutive day - increment streak
      newStreak = loop.currentStreak + 1;
    } else if (daysSinceLastCompletion > 1) {
      // Streak broken - reset to 1
      newStreak = 1;
    }
  } else {
    // First completion ever
    newStreak = 1;
  }

  // Update loop
  loop.currentStreak = newStreak;
  loop.longestStreak = Math.max(loop.longestStreak, newStreak);
  loop.lastCompletedDate = today;

  // Record completion
  const loopTasks = tasks.filter(t => t.loopId === loop.id);
  completions.push({
    id: generateId(),
    loopId: loop.id,
    completedDate: today,
    tasksCompleted: loopTasks.length
  });

  // Reset tasks for next cycle
  loopTasks.forEach(task => {
    task.isCompleted = false;
    task.completedAt = null;
  });

  return {
    message: getMotivationMessage(loop, true),
    loop,
    streakIncreased: true
  };
}

// Manual loop completion endpoint
app.post('/api/loops/:loopId/complete', authenticate, (req, res) => {
  try {
    const loop = loops.find(l => l.id === req.params.loopId && l.userId === req.userId);

    if (!loop) {
      return res.status(404).json({ error: 'Loop not found' });
    }

    // Check if all tasks are completed
    const loopTasks = tasks.filter(t => t.loopId === loop.id);
    const allCompleted = loopTasks.every(t => t.isCompleted);

    if (!allCompleted) {
      return res.status(400).json({
        error: 'All tasks must be completed first',
        incompleteTasks: loopTasks.filter(t => !t.isCompleted).map(t => t.title)
      });
    }

    const result = completeLoop(loop);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete loop' });
  }
});

// ====================================================
// DASHBOARD / TODAY'S LOOPS
// ====================================================

app.get('/api/dashboard', authenticate, (req, res) => {
  try {
    const userLoops = loops.filter(l => l.userId === req.userId && l.isActive);
    
    const today = getTodayString();
    const dashboard = userLoops.map(loop => {
      const loopTasks = tasks.filter(t => t.loopId === loop.id);
      const completedTasks = loopTasks.filter(t => t.isCompleted).length;
      const totalTasks = loopTasks.length;
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      const completedToday = isCompletedToday(loop.id);

      return {
        id: loop.id,
        name: loop.name,
        frequency: loop.frequency,
        progress: Math.round(progress),
        completedTasks,
        totalTasks,
        completedToday,
        currentStreak: loop.currentStreak,
        motivationMessage: getMotivationMessage(loop, false)
      };
    });

    res.json({
      date: today,
      loops: dashboard,
      totalLoops: dashboard.length,
      completedLoops: dashboard.filter(l => l.completedToday).length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ====================================================
// START SERVER
// ====================================================

app.listen(PORT, () => {
  console.log(`Loopify API running on port ${PORT}`);
  console.log('System initialized.');
});

// ====================================================
// EXAMPLE API USAGE
// ====================================================

/*
1. REGISTER
POST /api/auth/register
Body: {
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "primaryFocus": "discipline"
}
Response: { token, user }

2. LOGIN
POST /api/auth/login
Body: {
  "email": "user@example.com",
  "password": "securepassword"
}
Response: { token, user }

3. CREATE LOOP
POST /api/loops
Headers: { Authorization: "Bearer <token>" }
Body: {
  "name": "Morning Routine",
  "frequency": "daily",
  "taskList": ["Wake up at 6am", "Drink water", "Exercise 15 min"]
}
Response: { loop, message }

4. GET DASHBOARD
GET /api/dashboard
Headers: { Authorization: "Bearer <token>" }
Response: { date, loops, totalLoops, completedLoops }

5. UPDATE TASK (Mark as completed)
PUT /api/tasks/:taskId
Headers: { Authorization: "Bearer <token>" }
Body: { "isCompleted": true }
Response: { task, loopCompletionData }

6. COMPLETE LOOP
POST /api/loops/:loopId/complete
Headers: { Authorization: "Bearer <token>" }
Response: { message, loop, streakIncreased }
*/