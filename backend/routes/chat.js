const express = require('express');
const { getDb } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get chat messages for a character
router.get('/:characterId', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { characterId } = req.params;
    const messages = db.prepare(
      'SELECT id, role, content, created_at FROM chats WHERE user_id = ? AND character_id = ? ORDER BY created_at ASC'
    ).all(req.userId, characterId);

    res.json(messages);
  } catch (err) {
    console.error('Get chat error:', err);
    res.status(500).json({ error: '获取聊天记录失败' });
  }
});

// Save chat messages (batch)
router.post('/:characterId', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { characterId } = req.params;
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '消息列表不能为空' });
    }

    const insert = db.prepare(
      'INSERT INTO chats (user_id, character_id, role, content) VALUES (?, ?, ?, ?)'
    );

    const insertMany = db.transaction((msgs) => {
      for (const msg of msgs) {
        insert.run(req.userId, characterId, msg.role, msg.content);
      }
    });

    insertMany(messages);

    // Update daily usage
    const today = new Date().toISOString().split('T')[0];
    const aiCount = messages.filter(m => m.role === 'assistant').length;
    if (aiCount > 0) {
      const existing = db.prepare('SELECT id FROM daily_usage WHERE user_id = ? AND date = ?').get(req.userId, today);
      if (existing) {
        db.prepare('UPDATE daily_usage SET msg_count = msg_count + ? WHERE user_id = ? AND date = ?').run(aiCount, req.userId, today);
      } else {
        db.prepare('INSERT INTO daily_usage (user_id, date, msg_count) VALUES (?, ?, ?)').run(req.userId, today, aiCount);
      }
    }

    // Update total message count
    const profile = db.prepare('SELECT total_msgs FROM profiles WHERE user_id = ?').get(req.userId);
    if (profile) {
      db.prepare('UPDATE profiles SET total_msgs = total_msgs + ? WHERE user_id = ?').run(aiCount, req.userId);
    }

    res.json({ success: true, count: messages.length });
  } catch (err) {
    console.error('Save chat error:', err);
    res.status(500).json({ error: '保存聊天记录失败' });
  }
});

// Clear chat for a character
router.delete('/:characterId', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { characterId } = req.params;

    db.prepare('DELETE FROM chats WHERE user_id = ? AND character_id = ?').run(req.userId, characterId);

    res.json({ success: true });
  } catch (err) {
    console.error('Clear chat error:', err);
    res.status(500).json({ error: '清空聊天记录失败' });
  }
});

module.exports = router;
