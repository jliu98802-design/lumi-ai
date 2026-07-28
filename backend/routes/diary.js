const express = require('express');
const { getDb } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all diary entries
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const diaries = db.prepare(
      'SELECT id, mood, text, ai_response, created_at FROM diaries WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.userId);

    res.json(diaries);
  } catch (err) {
    console.error('Get diary error:', err);
    res.status(500).json({ error: '获取日记失败' });
  }
});

// Create diary entry
router.post('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { mood, text, ai_response } = req.body;

    if (!text) {
      return res.status(400).json({ error: '日记内容不能为空' });
    }

    const result = db.prepare(
      'INSERT INTO diaries (user_id, mood, text, ai_response) VALUES (?, ?, ?, ?)'
    ).run(req.userId, mood || '', text, ai_response || '');

    const entry = db.prepare('SELECT * FROM diaries WHERE id = ?').get(result.lastInsertRowid);
    res.json(entry);
  } catch (err) {
    console.error('Create diary error:', err);
    res.status(500).json({ error: '创建日记失败' });
  }
});

// Update diary entry (for AI response callback)
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { ai_response } = req.body;

    db.prepare('UPDATE diaries SET ai_response = ? WHERE id = ? AND user_id = ?')
      .run(ai_response, id, req.userId);

    res.json({ success: true });
  } catch (err) {
    console.error('Update diary error:', err);
    res.status(500).json({ error: '更新日记失败' });
  }
});

// Delete diary entry
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const result = db.prepare('DELETE FROM diaries WHERE id = ? AND user_id = ?').run(id, req.userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: '日记不存在' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete diary error:', err);
    res.status(500).json({ error: '删除日记失败' });
  }
});

module.exports = router;
