# Lumi AI - 温暖治愈的AI情绪陪伴APP

Lumi 是一个 AI 情绪陪伴应用，提供温暖治愈的对话体验。

## 项目结构

```
├── frontend/          # PWA 前端（V10）
│   ├── index.html     # 主应用
│   └── vercel.json    # Vercel 部署配置
└── backend/           # Node.js + Express + SQLite 后端
    ├── server.js      # 主入口
    ├── db/            # 数据库初始化
    ├── routes/        # API 路由
    ├── middleware/     # 中间件
    └── package.json   # 依赖
```

## 快速开始

### 前端（Vercel 部署）

1. Fork 或 Import 到 [Vercel](https://vercel.com)
2. Root Directory 选择 `frontend`
3. 部署后获取 URL

### 后端（Railway 部署）

1. 在 [Railway](https://railway.app) 创建项目
2. 连接此仓库
3. Root Directory 选择 `backend`
4. 添加环境变量：
   - `DEEPSEEK_API_KEY` - DeepSeek API Key
   - `JWT_SECRET` - JWT 密钥（任意随机字符串）
5. 部署后获取 URL

### 配置 API 地址

前端部署后，打开应用 → 设置 → 修改 API 地址为 Railway 后端 URL。

## 技术栈

- **前端**: 纯 HTML/CSS/JS + PWA
- **后端**: Node.js + Express + SQLite
- **AI**: DeepSeek API
- **部署**: Vercel（前端）+ Railway（后端）

## 开发

```bash
# 后端
cd backend
npm install
npm start

# 前端
# 直接在浏览器打开 frontend/index.html
```

## 文档

- [部署指南](backend/README-deploy.md)
- [运营方案](运营方案见项目文件)
- [短视频分镜](短视频分镜见项目文件)
