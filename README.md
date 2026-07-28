# Lumi AI - 温暖治愈的AI情绪陪伴APP

Lumi 是一个 AI 情绪陪伴应用，提供温暖治愈的对话体验。

## 项目结构

```
├── server.js          # 后端主入口（Node.js + Express）
├── package.json       # 后端依赖
├── Procfile           # Railway 部署配置
├── db/                # 数据库初始化
├── routes/            # API 路由
├── middleware/        # 中间件
├── frontend/          # PWA 前端
│   ├── index.html     # 主应用
│   └── vercel.json    # Vercel 部署配置
└── docs/              # 文档
```

## 快速开始

### 后端（Railway 部署）

1. 在 [Railway](https://railway.app) 创建项目
2. 连接此仓库（自动识别根目录的 package.json）
3. 添加环境变量（Variables）：
   - `DEEPSEEK_API_KEY` - DeepSeek API Key
   - `JWT_SECRET` - JWT 密钥
   - `NODE_ENV` = `production`
   - `DEEPSEEK_BASE_URL` = `https://api.deepseek.com`
4. 部署后获取后端 URL

### 前端（Vercel 部署）

1. 在 [Vercel](https://vercel.com) Import 此仓库
2. Framework Preset: **Other**
3. Root Directory: `frontend`
4. 部署后获取前端 URL

### 配置 API 地址

前端部署后，打开应用 → 设置 → 修改 API 地址为 Railway 后端 URL。

## 技术栈

- **前端**: 纯 HTML/CSS/JS + PWA
- **后端**: Node.js + Express + SQLite
- **AI**: DeepSeek API
- **部署**: Vercel（前端）+ Railway（后端）

## 本地开发

```bash
# 安装依赖
npm install

# 启动后端
npm start

# 前端
# 直接在浏览器打开 frontend/index.html
```

## 文档

- [部署指南](docs/README-deploy.md)
