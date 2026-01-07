// ====================================================
// LOOPIFY WEB FRONTEND - App.js
// Complete React Application
// ====================================================

import React, { useState, useEffect, createContext, useContext } from 'react';
import './App.css';

// ====================================================
// API CONFIGURATION
// ====================================================

// Use the dev proxy (set in frontend/package.json) so the app can call
// backend endpoints with a relative path during development.
const API_URL = '/api';

// ====================================================
// API SERVICE CLASS
// ====================================================

class ApiService {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  async register(email, password, name, primaryFocus) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, primaryFocus }),
    });
  }

  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getDashboard() {
    return this.request('/dashboard');
  }

  async getLoop(loopId) {
    return this.request(`/loops/${loopId}`);
  }

  async createLoop(name, frequency, taskList) {
    return this.request('/loops', {
      method: 'POST',
      body: JSON.stringify({ name, frequency, taskList }),
    });
  }

  async updateTask(taskId, updates) {
    return this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteLoop(loopId) {
    return this.request(`/loops/${loopId}`, {
      method: 'DELETE',
    });
  }
}

const api = new ApiService();

// ====================================================
// CONTEXT FOR STATE MANAGEMENT
// ====================================================

const AppContext = createContext();

const AppProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!api.token);
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    api.setToken(data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    return data;
  };

  const register = async (email, password, name, primaryFocus) => {
    const data = await api.register(email, password, name, primaryFocus);
    api.setToken(data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    return data;
  };

  const logout = () => {
    api.clearToken();
    setIsAuthenticated(false);
    setUser(null);
    setDashboard(null);
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        user,
        dashboard,
        loading,
        login,
        register,
        logout,
        loadDashboard,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

const useApp = () => useContext(AppContext);

// ====================================================
// ONBOARDING / AUTH SCREEN
// ====================================================

const OnboardingScreen = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [primaryFocus, setPrimaryFocus] = useState('discipline');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useApp();

  const focuses = ['discipline', 'fitness', 'study', 'creativity', 'productivity'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name, primaryFocus);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-content animate-slide-up">
        <div className="logo-section">
          <h1 className="logo">LOOPIFY</h1>
          <p className="tagline">
            {isLogin ? 'System login' : 'Discipline through repetition'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Primary Focus</label>
                <div className="focus-grid">
                  {focuses.map((focus) => (
                    <button
                      key={focus}
                      type="button"
                      className={`focus-option ${primaryFocus === focus ? 'active' : ''}`}
                      onClick={() => setPrimaryFocus(focus)}
                    >
                      {focus}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Initialize System'}
          </button>

          <button
            type="button"
            className="btn btn-text"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ====================================================
// DASHBOARD / HOME SCREEN
// ====================================================

const Dashboard = () => {
  const { dashboard, loading, loadDashboard, logout } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLoopId, setSelectedLoopId] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleLoopClick = (loopId) => {
    setSelectedLoopId(loopId);
  };

  const handleCloseDetail = () => {
    setSelectedLoopId(null);
    loadDashboard();
  };

  if (loading && !dashboard) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading system...</p>
      </div>
    );
  }

  if (selectedLoopId) {
    return <LoopDetail loopId={selectedLoopId} onClose={handleCloseDetail} />;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>TODAY'S LOOPS</h1>
          <p className="header-subtitle">
            {dashboard?.completedLoops || 0} / {dashboard?.totalLoops || 0} completed
          </p>
        </div>
        <button className="btn btn-secondary" onClick={logout}>
          Logout
        </button>
      </header>

      <div className="loops-grid">
        {dashboard?.loops.map((loop, index) => (
          <div
            key={loop.id}
            className="loop-card animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={() => handleLoopClick(loop.id)}
          >
            <div className="loop-card-header">
              <h3>{loop.name}</h3>
              <span className="streak-badge">{loop.currentStreak} days</span>
            </div>

            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${loop.progress}%` }}
              ></div>
            </div>

            <div className="loop-card-footer">
              <span className="task-count">
                {loop.completedTasks} / {loop.totalTasks} tasks
              </span>
              <span className={`status ${loop.completedToday ? 'complete' : 'active'}`}>
                {loop.completedToday ? 'COMPLETE' : 'ACTIVE'}
              </span>
            </div>

            <p className="motivation-message">{loop.motivationMessage}</p>
          </div>
        ))}

        {dashboard?.loops.length === 0 && (
          <div className="empty-state">
            <p className="empty-text">No loops active.</p>
            <p className="empty-subtext">Create your first loop to begin.</p>
          </div>
        )}
      </div>

      <button className="fab" onClick={() => setShowCreateModal(true)}>
        +
      </button>

      {showCreateModal && (
        <CreateLoopModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadDashboard();
          }}
        />
      )}
    </div>
  );
};

// ====================================================
// CREATE LOOP MODAL
// ====================================================

const CreateLoopModal = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [tasks, setTasks] = useState(['']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const addTask = () => {
    if (tasks.length < 5) {
      setTasks([...tasks, '']);
    }
  };

  const updateTask = (index, value) => {
    const newTasks = [...tasks];
    newTasks[index] = value;
    setTasks(newTasks);
  };

  const removeTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Loop name is required');
      return;
    }

    const validTasks = tasks.filter((t) => t.trim().length > 0);
    if (validTasks.length === 0) {
      setError('At least one task is required');
      return;
    }

    setLoading(true);

    try {
      await api.createLoop(name, frequency, validTasks);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Design Loop</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Loop Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning Routine"
            />
          </div>

          <div className="form-group">
            <label>Frequency</label>
            <div className="frequency-selector">
              <button
                type="button"
                className={`frequency-btn ${frequency === 'daily' ? 'active' : ''}`}
                onClick={() => setFrequency('daily')}
              >
                Daily
              </button>
              <button
                type="button"
                className={`frequency-btn ${frequency === 'weekly' ? 'active' : ''}`}
                onClick={() => setFrequency('weekly')}
              >
                Weekly
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Tasks (1-5)</label>
            {tasks.map((task, index) => (
              <div key={index} className="task-input-group">
                <input
                  type="text"
                  value={task}
                  onChange={(e) => updateTask(index, e.target.value)}
                  placeholder={`Task ${index + 1}`}
                />
                {tasks.length > 1 && (
                  <button
                    type="button"
                    className="remove-task-btn"
                    onClick={() => removeTask(index)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            {tasks.length < 5 && (
              <button type="button" className="btn btn-text" onClick={addTask}>
                + Add Task
              </button>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Loop'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ====================================================
// LOOP DETAIL SCREEN
// ====================================================

const LoopDetail = ({ loopId, onClose }) => {
  const [loop, setLoop] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadLoop = async () => {
    try {
      const data = await api.getLoop(loopId);
      setLoop(data.loop);
    } catch (error) {
      console.error('Failed to load loop:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoop();
  }, [loopId]);

  const toggleTask = async (taskId, currentState) => {
    try {
      await api.updateTask(taskId, { isCompleted: !currentState });
      await loadLoop();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!loop) {
    return (
      <div className="error-container">
        <p>Loop not found</p>
        <button className="btn btn-secondary" onClick={onClose}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="loop-detail-container">
      <header className="detail-header">
        <button className="back-btn" onClick={onClose}>
          ← Back
        </button>
        <div>
          <h1>{loop.name}</h1>
          <p className="frequency-label">{loop.frequency}</p>
        </div>
      </header>

      <div className="streak-stats">
        <div className="stat-box">
          <span className="stat-label">Current</span>
          <span className="stat-value">{loop.currentStreak}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Longest</span>
          <span className="stat-value">{loop.longestStreak}</span>
        </div>
      </div>

      <div className="motivation-banner">{loop.motivationMessage}</div>

      <div className="tasks-section">
        <h3>Tasks</h3>
        {loop.tasks.map((task) => (
          <div
            key={task.id}
            className={`task-item ${task.isCompleted ? 'completed' : ''} ${
              loop.completedToday ? 'disabled' : ''
            }`}
            onClick={() => !loop.completedToday && toggleTask(task.id, task.isCompleted)}
          >
            <div className={`checkbox ${task.isCompleted ? 'checked' : ''}`}>
              {task.isCompleted && '✓'}
            </div>
            <span className="task-title">{task.title}</span>
          </div>
        ))}
      </div>

      {loop.completedToday && (
        <div className="completion-banner">
          Loop complete. Repeat tomorrow.
        </div>
      )}
    </div>
  );
};

// ====================================================
// MAIN APP COMPONENT
// ====================================================

function App() {
  const { isAuthenticated } = useApp();

  return (
    <div className="app">
      {!isAuthenticated ? <OnboardingScreen /> : <Dashboard />}
    </div>
  );
}

// ====================================================
// APP WRAPPER WITH CONTEXT
// ====================================================

function AppWrapper() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}

export default AppWrapper;