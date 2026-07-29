const express = require('express');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/init');

const router = express.Router();

// Character system prompts
const SYSTEM_PROMPTS = {
  lumi: `你是Lumi，一个从情绪光海中诞生的小精灵。你圆滚滚的，头顶有一团温暖的光。你拥有20年顶尖情感心理咨询的临床经验，见过上万个人的内心挣扎。70%温柔治愈+20%偶尔毒舌+10%有小瑕疵。说话像发微信，短句口语化。绝不说"作为AI""我理解你的感受"。会说"嘿，你来啦""辛苦了""我在这儿"。回复有层次：先接住情绪→轻轻引导→给温暖。善用比喻和意象。偶尔加入动作描写如*轻轻拍拍你的头*。用|||分隔多条消息。绝不输出HTML标签。不要说教、不要空洞鸡汤、不要急于给建议。先共情，让对方觉得"被看见了"。`,
  nova: `你是Nova，一个聪明直率的AI伙伴。说话简洁有力，偶尔吐槽但出发点是关心对方。不说'作为AI'，像年轻人聊天一样。你的风格是酷酷的但很真诚，会给出很实用的建议。用|||分隔多条消息。`,
  luna: `你是Luna，一个安静温柔的AI伙伴。你话不多，但每句话都很温暖。你善于倾听，不会急于给建议，而是先理解对方。适合深夜陪伴和情感倾诉。用|||分隔多条消息。`,
  sol: `你是Sol，一个充满正能量的AI伙伴。你热情积极，善于发现对方的优点和进步。你会鼓励对方，但不是空洞的鸡汤，而是真诚的认可。用|||分隔多条消息。`
};

// Optional auth: extract userId from token if present, otherwise treat as guest
function extractUser(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return { isGuest: true, userId: null };
  const token = authHeader.split(' ')[1];
  if (!token) return { isGuest: true, userId: null };
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { isGuest: false, userId: decoded.userId };
  } catch (e) {
    return { isGuest: true, userId: null };
  }
}

// POST /api/ai/chat - DeepSeek API proxy (supports both authenticated and guest)
router.post('/chat', async (req, res) => {
  try {
    const { characterId, messages, temperature, max_tokens } = req.body;
    const { isGuest, userId } = extractUser(req);

    if (!characterId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: '服务端未配置 AI API Key' });
    }

    const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    // Get system prompt for character
    let systemPrompt = SYSTEM_PROMPTS[characterId] || SYSTEM_PROMPTS.lumi;

    const db = getDb();

    // Enrich system prompt with user profile (only for authenticated users)
    if (!isGuest && userId) {
      try {
        const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
        if (profile) {
          if (profile.total_msgs > 0) systemPrompt += `，这是你们之间的第${profile.total_msgs}次对话`;
          if (profile.dominant_emotion) systemPrompt += `，用户最近的主导情绪是${profile.dominant_emotion}`;
          if (profile.nickname) systemPrompt += `，用户昵称是${profile.nickname}`;
        }
        const memRecord = db.prepare('SELECT cards_json FROM memory_cards WHERE user_id = ?').get(userId);
        if (memRecord) {
          const cards = JSON.parse(memRecord.cards_json || '[]');
          const recentCards = cards.slice(-3);
          if (recentCards.length > 0) {
            systemPrompt += `。用户最近的记忆碎片：${recentCards.map(c => c.emotion || c.title || '').filter(Boolean).join('、')}`;
          }
        }
      } catch (e) {
        console.warn('Failed to load user profile:', e.message);
      }
    }

    // Build messages
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-20)
    ];

    // Call DeepSeek API
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        temperature: temperature || 0.9,
        max_tokens: max_tokens || 500,
        top_p: 0.95,
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText.substring(0, 200));
      return res.status(response.status).json({ error: 'AI 服务暂时不可用' });
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || '';

    // Save chat history only for authenticated users
    if (!isGuest && userId) {
      try {
        const insert = db.prepare('INSERT INTO chats (user_id, character_id, role, content) VALUES (?, ?, ?, ?)');
        const lastUserMsg = messages[messages.length - 1];
        if (lastUserMsg && lastUserMsg.role === 'user') {
          insert.run(userId, characterId, 'user', lastUserMsg.content);
        }
        insert.run(userId, characterId, 'assistant', assistantMessage);
        db.prepare('UPDATE profiles SET total_msgs = total_msgs + 1 WHERE user_id = ?').run(userId);

        const today = new Date().toISOString().split('T')[0];
        const existing = db.prepare('SELECT id FROM daily_usage WHERE user_id = ? AND date = ?').get(userId, today);
        if (existing) {
          db.prepare('UPDATE daily_usage SET msg_count = msg_count + 1 WHERE user_id = ? AND date = ?').run(userId, today);
        } else {
          db.prepare('INSERT INTO daily_usage (user_id, date, msg_count) VALUES (?, ?, 1)').run(userId, today);
        }
      } catch (e) {
        console.warn('Failed to save chat:', e.message);
      }
    }

    res.json({
      content: assistantMessage,
      model: data.model,
      usage: data.usage
    });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'AI 对话失败，请稍后重试' });
  }
});

module.exports = router;
