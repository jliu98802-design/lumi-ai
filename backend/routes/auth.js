const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/init');

const router = express.Router();

// Register
router.post('/register', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: '用户名至少3个字符' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6个字符' });
    }

    const db = getDb();

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, password_hash);
    const userId = result.lastInsertRowid;

    // Create default profile
    db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(userId);
    // Create default memory storage
    db.prepare('INSERT INTO memory_seeds (user_id) VALUES (?)').run(userId);
    db.prepare('INSERT INTO memory_cards (user_id) VALUES (?)').run(userId);
    // Create default settings
    db.prepare('INSERT INTO settings (user_id) VALUES (?)').run(userId);

    const token = jwt.sign(
      { userId, username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, userId, username });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, userId: user.id, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// Token verify (for frontend to check if token is still valid)
const { authenticateToken } = require('../middleware/auth');
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, userId: req.userId, username: req.username });
});

module.exports = router;
