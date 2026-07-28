const express = require('express');
const { getDb } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    let profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.userId);

    if (!profile) {
      // Create default profile if not exists
      db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(req.userId);
      profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.userId);
    }

    // Parse JSON fields
    const result = {
      nickname: '',
      style: profile.style_pref || 'gentle',
      join_date: profile.join_date || '',
      total_msgs: profile.total_msgs || 0,
      total_days: profile.total_days || 1,
      dominant_emotion: profile.dominant_emotion || '',
      emotion_history: JSON.parse(profile.emotion_history || '[]'),
      interests: JSON.parse(profile.interests || '[]'),
      events: JSON.parse(profile.events || '[]'),
      relationship: JSON.parse(profile.relationship || '{}'),
      onboarded: !!profile.onboarded,
      age_verified: !!profile.age_verified,
      current_char: profile.current_char || 'lumi'
    };

    // Get user info
    const user = db.prepare('SELECT username, nickname FROM users WHERE id = ?').get(req.userId);
    result.username = user?.username || '';
    if (user?.nickname) result.nickname = user.nickname;

    // Get daily usage
    const today = new Date().toISOString().split('T')[0];
    const dailyUsage = db.prepare('SELECT msg_count FROM daily_usage WHERE user_id = ? AND date = ?').get(req.userId, today);
    result.daily_msgs = dailyUsage?.msg_count || 0;
    result.daily_date = today;

    res.json(result);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: '获取档案失败' });
  }
});

// Update user profile
router.put('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const {
      nickname, style, onboarded, age_verified, current_char,
      total_msgs, total_days, dominant_emotion, emotion_history,
      interests, events, relationship, join_date
    } = req.body;

    // Update user nickname if provided
    if (nickname !== undefined) {
      db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname, req.userId);
    }

    // Build profile update
    const updates = [];
    const params = [];

    if (style !== undefined) { updates.push('style_pref = ?'); params.push(style); }
    if (onboarded !== undefined) { updates.push('onboarded = ?'); params.push(onboarded ? 1 : 0); }
    if (age_verified !== undefined) { updates.push('age_verified = ?'); params.push(age_verified ? 1 : 0); }
    if (current_char !== undefined) { updates.push('current_char = ?'); params.push(current_char); }
    if (total_msgs !== undefined) { updates.push('total_msgs = ?'); params.push(total_msgs); }
    if (total_days !== undefined) { updates.push('total_days = ?'); params.push(total_days); }
    if (dominant_emotion !== undefined) { updates.push('dominant_emotion = ?'); params.push(dominant_emotion); }
    if (join_date !== undefined) { updates.push('join_date = ?'); params.push(join_date); }
    if (emotion_history !== undefined) { updates.push('emotion_history = ?'); params.push(JSON.stringify(emotion_history)); }
    if (interests !== undefined) { updates.push('interests = ?'); params.push(JSON.stringify(interests)); }
    if (events !== undefined) { updates.push('events = ?'); params.push(JSON.stringify(events)); }
    if (relationship !== undefined) { updates.push('relationship = ?'); params.push(JSON.stringify(relationship)); }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      params.push(req.userId);
      db.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE user_id = ?`).run(...params);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: '更新档案失败' });
  }
});

module.exports = router;
