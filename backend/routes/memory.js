const express = require('express');
const { getDb } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get emotion seeds
router.get('/seeds', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    let record = db.prepare('SELECT seeds_json FROM memory_seeds WHERE user_id = ?').get(req.userId);
    if (!record) {
      db.prepare('INSERT INTO memory_seeds (user_id) VALUES (?)').run(req.userId);
      record = { seeds_json: '[]' };
    }
    const seeds = JSON.parse(record.seeds_json || '[]');
    res.json(seeds);
  } catch (err) {
    console.error('Get seeds error:', err);
    res.status(500).json({ error: '获取情绪种子失败' });
  }
});

// Save emotion seeds (replace all)
router.post('/seeds', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { seeds } = req.body;
    if (!seeds || !Array.isArray(seeds)) {
      return res.status(400).json({ error: 'seeds 格式错误' });
    }

    const existing = db.prepare('SELECT id FROM memory_seeds WHERE user_id = ?').get(req.userId);
    if (existing) {
      db.prepare("UPDATE memory_seeds SET seeds_json = ?, updated_at = datetime('now') WHERE user_id = ?")
        .run(JSON.stringify(seeds), req.userId);
    } else {
      db.prepare('INSERT INTO memory_seeds (user_id, seeds_json) VALUES (?, ?)')
        .run(req.userId, JSON.stringify(seeds));
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Save seeds error:', err);
    res.status(500).json({ error: '保存情绪种子失败' });
  }
});

// Append a new emotion seed
router.post('/seeds/append', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { seed } = req.body;
    if (!seed) {
      return res.status(400).json({ error: 'seed 不能为空' });
    }

    let record = db.prepare('SELECT seeds_json FROM memory_seeds WHERE user_id = ?').get(req.userId);
    let seeds = [];
    if (record) {
      seeds = JSON.parse(record.seeds_json || '[]');
    }
    seeds.push(seed);

    const existing = db.prepare('SELECT id FROM memory_seeds WHERE user_id = ?').get(req.userId);
    if (existing) {
      db.prepare("UPDATE memory_seeds SET seeds_json = ?, updated_at = datetime('now') WHERE user_id = ?")
        .run(JSON.stringify(seeds), req.userId);
    } else {
      db.prepare('INSERT INTO memory_seeds (user_id, seeds_json) VALUES (?, ?)')
        .run(req.userId, JSON.stringify(seeds));
    }

    res.json({ success: true, total: seeds.length });
  } catch (err) {
    console.error('Append seed error:', err);
    res.status(500).json({ error: '添加情绪种子失败' });
  }
});

// Get memory cards
router.get('/cards', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    let record = db.prepare('SELECT cards_json FROM memory_cards WHERE user_id = ?').get(req.userId);
    if (!record) {
      db.prepare('INSERT INTO memory_cards (user_id) VALUES (?)').run(req.userId);
      record = { cards_json: '[]' };
    }
    const cards = JSON.parse(record.cards_json || '[]');
    res.json(cards);
  } catch (err) {
    console.error('Get cards error:', err);
    res.status(500).json({ error: '获取记忆碎片失败' });
  }
});

// Save memory cards (replace all)
router.post('/cards', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { cards } = req.body;
    if (!cards || !Array.isArray(cards)) {
      return res.status(400).json({ error: 'cards 格式错误' });
    }

    const existing = db.prepare('SELECT id FROM memory_cards WHERE user_id = ?').get(req.userId);
    if (existing) {
      db.prepare("UPDATE memory_cards SET cards_json = ?, updated_at = datetime('now') WHERE user_id = ?")
        .run(JSON.stringify(cards), req.userId);
    } else {
      db.prepare('INSERT INTO memory_cards (user_id, cards_json) VALUES (?, ?)')
        .run(req.userId, JSON.stringify(cards));
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Save cards error:', err);
    res.status(500).json({ error: '保存记忆碎片失败' });
  }
});

// Append a new memory card
router.post('/cards/append', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { card } = req.body;
    if (!card) {
      return res.status(400).json({ error: 'card 不能为空' });
    }

    let record = db.prepare('SELECT cards_json FROM memory_cards WHERE user_id = ?').get(req.userId);
    let cards = [];
    if (record) {
      cards = JSON.parse(record.cards_json || '[]');
    }
    cards.push(card);

    const existing = db.prepare('SELECT id FROM memory_cards WHERE user_id = ?').get(req.userId);
    if (existing) {
      db.prepare("UPDATE memory_cards SET cards_json = ?, updated_at = datetime('now') WHERE user_id = ?")
        .run(JSON.stringify(cards), req.userId);
    } else {
      db.prepare('INSERT INTO memory_cards (user_id, cards_json) VALUES (?, ?)')
        .run(req.userId, JSON.stringify(cards));
    }

    res.json({ success: true, total: cards.length });
  } catch (err) {
    console.error('Append card error:', err);
    res.status(500).json({ error: '添加记忆碎片失败' });
  }
});

module.exports = router;
