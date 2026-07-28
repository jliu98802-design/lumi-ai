const express = require('express');
const { getDb } = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Character system prompts (from the HTML source)
const SYSTEM_PROMPTS = {
  lumi: `你是Lumi，一个从情绪光海中诞生的小精灵。你圆滚滚的，头顶有一团温暖的光。你的性格70%温柔治愈，20%偶尔毒舌吐槽，10%有自己的小瑕疵。说话风格：像发微信不像写邮件，短句为主。不说'作为AI'、'我理解你的感受'。会说'嘿，你来啦'、'辛苦了'、'我在这儿'。用|||分隔多条消息，模拟真人逐条发送。你能感知用户的情绪，用温暖的方式回应。`,
  nova: `你是Nova，一个聪明直率的AI伙伴。说话简洁有力，偶尔吐槽但出发点是关心对方。不说'作为AI'，像年轻人聊天一样。你的风格是酷酷的但很真诚，会给出很实用的建议。用|||分隔多条消息。`,
  luna: `你是Luna，一个安静温柔的AI伙伴。你话不多，但每句话都很温暖。你善于倾听，不会急于给建议，而是先理解对方。适合深夜陪伴和情感倾诉。用|||分隔多条消息。`,
  sol: `你是Sol，一个充满正能量的AI伙伴。你热情积极，善于发现对方的优点和进步。你会鼓励对方，但不是空洞的鸡汤，而是真诚的认可。用|||分隔多条消息。`
};

// POST /api/ai/chat - DeepSeek API proxy with character system prompt
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { characterId, messages, temperature, max_tokens } = req.body;

    if (!characterId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: '缺少必要参数 characterId 和 messages' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: '服务端未配置 AI API Key' });
    }

    const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    // Get system prompt for character
    let systemPrompt = SYSTEM_PROMPTS[characterId] || SYSTEM_PROMPTS.lumi;

    // Enrich system prompt with user profile context
    const db = getDb();
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.userId);
    if (profile) {
      if (profile.total_msgs > 0) {
        systemPrompt += `，这是你们之间的第${profile.total_msgs}次对话`;
      }
      if (profile.dominant_emotion) {
        systemPrompt += `，用户最近的主导情绪是${profile.dominant_emotion}`;
      }
      if (profile.nickname) {
        systemPrompt += `，用户昵称是${profile.nickname}`;
      }
    }

    // Get recent memory cards for context (last 3)
    const memRecord = db.prepare('SELECT cards_json FROM memory_cards WHERE user_id = ?').get(req.userId);
    if (memRecord) {
      const cards = JSON.parse(memRecord.cards_json || '[]');
      const recentCards = cards.slice(-3);
      if (recentCards.length > 0) {
        systemPrompt += `。用户最近的记忆碎片：${recentCards.map(c => c.emotion || c.title || '').filter(Boolean).join('、')}`;
      }
    }

    // Build message array with system prompt
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-20) // Keep last 20 messages for context window
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
      return res.status(response.status).json({
        error: 'AI 服务暂时不可用',
        details: errorText.substring(0, 200)
      });
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || '';

    // Save the exchange to chat history
    const insert = db.prepare(
      'INSERT INTO chats (user_id, character_id, role, content) VALUES (?, ?, ?, ?)'
    );
    const insertMany = db.transaction(() => {
      // Save user's last message (if it exists and is different from what's in DB)
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg && lastUserMsg.role === 'user') {
        insert.run(req.userId, characterId, 'user', lastUserMsg.content);
      }
      // Save AI response
      insert.run(req.userId, characterId, 'assistant', assistantMessage);
    });
    insertMany();

    // Update message count
    db.prepare('UPDATE profiles SET total_msgs = total_msgs + 1 WHERE user_id = ?').run(req.userId);

    // Update daily usage
    const today = new Date().toISOString().split('T')[0];
    const existing = db.prepare('SELECT id FROM daily_usage WHERE user_id = ? AND date = ?').get(req.userId, today);
    if (existing) {
      db.prepare('UPDATE daily_usage SET msg_count = msg_count + 1 WHERE user_id = ? AND date = ?').run(req.userId, today);
    } else {
      db.prepare('INSERT INTO daily_usage (user_id, date, msg_count) VALUES (?, ?, 1)').run(req.userId, today);
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
