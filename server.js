require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { getDb } = require('./db/init');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Rate limiting: 30 requests per minute per IP (API only)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Initialize database on startup
getDb();
console.log('✅ Database initialized');

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/diary', require('./routes/diary'));
app.use('/api/memory', require('./routes/memory'));
app.use('/api/ai', require('./routes/proxy'));

// Cache-busting: always revalidate HTML to pick up new versions
app.use((req, res, next) => {
    if (req.path === '/' || req.path.endsWith('.html')) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    next();
});

// Version-based cache busting: redirect to versioned URL BEFORE static files
const CURRENT_VERSION = '31.1';
app.get('/', (req, res) => {
  if (!req.query.v || req.query.v !== CURRENT_VERSION) {
    return res.redirect(302, `/?v=${CURRENT_VERSION}`);
  }
  // Already versioned - serve directly with no-cache
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0, etag: true }));

// SPA fallback
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: '接口不存在' });
  } else {
    if (!req.query.v || req.query.v !== CURRENT_VERSION) {
      return res.redirect(302, `/?v=${CURRENT_VERSION}`);
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🌟 Lumi running on http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🎨 Frontend: http://localhost:${PORT}/`);
});

module.exports = app;
