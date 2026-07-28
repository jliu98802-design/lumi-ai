---
AIGC:
    Label: "1"
    ContentProducer: 001191110102MACQD9K64018705
    ProduceID: 3524374859093475_0/project_7667413628982903080-files/lumi-ai/backend/README.md
    ReservedCode1: ""
    ContentPropagator: 001191110102MACQD9K64028705
    PropagateID: 3524374859093475#1785250681525
    ReservedCode2: ""
---
# Lumi AI Backend

Lumi AI 情绪陪伴APP的轻量级后端服务，支撑10人种子内测。

## 技术栈

- **运行时**: Node.js
- **框架**: Express
- **数据库**: SQLite (better-sqlite3)
- **认证**: JWT (7天过期)
- **AI**: DeepSeek API 代理（密钥后端托管，不暴露给前端）
- **限流**: 30次/分钟

## 项目结构

```
lumi-backend/
├── server.js          # 主入口
├── package.json       # 依赖
├── .env.example       # 环境变量模板
├── db/
│   └── init.js        # 数据库初始化
├── routes/
│   ├── auth.js        # 注册/登录/Token验证
│   ├── chat.js        # 聊天记录 CRUD
│   ├── diary.js       # 日记 CRUD
│   ├── profile.js     # 用户档案
│   ├── memory.js      # 情绪种子+记忆碎片
│   └── proxy.js       # DeepSeek API代理
├── middleware/
│   └── auth.js        # JWT验证中间件
└── data/              # 运行时生成，SQLite数据库文件
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
DEEPSEEK_API_KEY=your_actual_api_key_here
JWT_SECRET=any_random_string_at_least_32_chars
PORT=3000
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

### 3. 启动服务

```bash
npm start
```

服务运行在 `http://localhost:3000`

## API 文档

### 认证

#### 注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "password": "123456"
}

Response: { "token": "jwt...", "userId": 1, "username": "testuser" }
```

#### 登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "123456"
}

Response: { "token": "jwt...", "userId": 1, "username": "testuser" }
```

#### Token验证
```http
GET /api/auth/verify
Authorization: Bearer <token>
```

### 用户档案

#### 获取档案
```http
GET /api/profile
Authorization: Bearer <token>

Response: {
  "username": "testuser",
  "nickname": "小明",
  "style": "gentle",
  "onboarded": true,
  "age_verified": true,
  "total_msgs": 42,
  "dominant_emotion": "平静",
  "emotion_history": [...],
  "relationship": { "lumi": {...}, "nova": {...}, ... },
  "current_char": "lumi",
  "daily_msgs": 5,
  "daily_date": "2025-01-15"
}
```

#### 更新档案
```http
PUT /api/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "nickname": "小明",
  "style": "gentle",
  "onboarded": true,
  "age_verified": true,
  "current_char": "lumi",
  "dominant_emotion": "平静",
  "relationship": { ... }
}
```

### 聊天记录

#### 获取某角色的聊天记录
```http
GET /api/chat/:characterId
Authorization: Bearer <token>

Response: [
  { "id": 1, "role": "user", "content": "你好", "created_at": "..." },
  { "id": 2, "role": "assistant", "content": "嘿，你来啦", "created_at": "..." }
]
```

#### 保存聊天消息
```http
POST /api/chat/:characterId
Authorization: Bearer <token>
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "今天好累" },
    { "role": "assistant", "content": "辛苦了呀" }
  ]
}
```

#### 清空某角色聊天
```http
DELETE /api/chat/:characterId
Authorization: Bearer <token>
```

### 日记

#### 获取日记列表
```http
GET /api/diary
Authorization: Bearer <token>

Response: [
  { "id": 1, "mood": "😢", "text": "今天有点难过...", "ai_response": "...", "created_at": "..." }
]
```

#### 创建日记
```http
POST /api/diary
Authorization: Bearer <token>
Content-Type: application/json

{
  "mood": "😢",
  "text": "今天有点难过..."
}
```

#### 删除日记
```http
DELETE /api/diary/:id
Authorization: Bearer <token>
```

### 记忆系统

#### 获取情绪种子
```http
GET /api/memory/seeds
Authorization: Bearer <token>

Response: [ { "emotion": "开心", "time": "...", "trigger": "..." } ]
```

#### 保存情绪种子（全量替换）
```http
POST /api/memory/seeds
Authorization: Bearer <token>
Content-Type: application/json

{ "seeds": [...] }
```

#### 追加情绪种子
```http
POST /api/memory/seeds/append
Authorization: Bearer <token>
Content-Type: application/json

{ "seed": { "emotion": "开心", "time": "...", "trigger": "..." } }
```

#### 获取记忆碎片
```http
GET /api/memory/cards
Authorization: Bearer <token>
```

#### 保存记忆碎片（全量替换）
```http
POST /api/memory/cards
Authorization: Bearer <token>
Content-Type: application/json

{ "cards": [...] }
```

#### 追加记忆碎片
```http
POST /api/memory/cards/append
Authorization: Bearer <token>
Content-Type: application/json

{ "card": { "emotion": "温暖", "title": "...", "content": "..." } }
```

### AI 对话代理

#### 发送消息给AI角色
```http
POST /api/ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "characterId": "lumi",
  "messages": [
    { "role": "user", "content": "今天好累" }
  ],
  "temperature": 0.9,
  "max_tokens": 500
}

Response: {
  "content": "嘿，你来啦～辛苦了呀",
  "model": "deepseek-chat",
  "usage": { "prompt_tokens": 120, "completion_tokens": 35, "total_tokens": 155 }
}
```

**支持的角色：**
| characterId | 角色名 | 性格 |
|-------------|--------|------|
| `lumi` | Lumi | 温柔治愈，光团小精灵 |
| `nova` | Nova | 酷帅直接，聪明直率 |
| `luna` | Luna | 安静倾听，深夜陪伴 |
| `sol` | Sol | 元气活力，正能量鼓励 |

## 数据库说明

使用 SQLite，数据文件位于 `data/lumi.db`（运行时自动创建）。

**核心表：**
| 表名 | 用途 |
|------|------|
| `users` | 用户账号（bcrypt哈希密码） |
| `profiles` | 用户档案、偏好、引导状态 |
| `chats` | 聊天记录（按角色分） |
| `diaries` | 日记条目 |
| `memory_seeds` | 情绪种子（JSON存储） |
| `memory_cards` | 记忆碎片（JSON存储） |
| `daily_usage` | 每日消息计数 |
| `settings` | 用户设置 |

**备份：** 直接复制 `data/lumi.db` 文件即可。

## 部署

### Railway

1. 推送到 GitHub
2. 在 Railway 新建项目 → Deploy from GitHub repo
3. 设置环境变量：`DEEPSEEK_API_KEY`, `JWT_SECRET`
4. Railway 自动检测 Node.js 项目并部署
5. 获取公网 URL 后，前端配置 `apiBase` 为该 URL

### Vercel

> 注意：Vercel 对 SQLite 有限制，建议使用 Vercel Postgres 或 Turso 替代。
> 如坚持使用 SQLite，可参考 Vercel 的 cron + ephemeral storage 方案。

### 通用 Node.js 服务器

```bash
# 1. 克隆项目到服务器
git clone <repo> lumi-backend
cd lumi-backend

# 2. 安装依赖
npm install --production

# 3. 配置环境变量
cp .env.example .env
nano .env

# 4. 使用 pm2 守护进程
npm install -g pm2
pm2 start server.js --name lumi-backend
pm2 save
pm2 startup

# 5. Nginx 反向代理（可选）
# server {
#     listen 80;
#     server_name api.yourdomain.com;
#     location / {
#         proxy_pass http://localhost:3000;
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#     }
# }
```

## 前端对接

前端需要将 localStorage 数据迁移到 API 调用：

```javascript
// 旧：localStorage
localStorage.setItem('lumi_profile', JSON.stringify(userProfile));

// 新：API 调用
const res = await fetch(`${API_BASE}/api/profile`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(userProfile)
});
```

**迁移策略（渐进式）：**
1. 登录/注册时获取 token 存入 localStorage
2. 每个 localStorage 操作增加 API 调用（双写期）
3. App启动时优先从 API 拉取数据
4. 稳定后移除 localStorage 写入

## 健康检查

```http
GET /api/health
Response: { "status": "ok", "version": "1.0.0", "timestamp": "..." }
```

## License

Private - Lumi AI 内部项目

---

> 本内容由 Coze AI 生成，请遵循相关法律法规及《人工智能生成合成内容标识办法》使用与传播。
