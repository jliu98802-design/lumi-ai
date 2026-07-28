---
AIGC:
    Label: "1"
    ContentProducer: 001191110102MACQD9K64018705
    ProduceID: 3524374859093475_0/project_7667413628982903080-files/lumi-ai/backend/README-deploy.md
    ReservedCode1: ""
    ContentPropagator: 001191110102MACQD9K64028705
    PropagateID: 3524374859093475#1785250684848
    ReservedCode2: ""
---
# Lumi AI Backend 部署指南（Railway）

## 架构概览

```
┌─────────────────────────────────────┐
│  Railway                            │
│  ┌───────────────────────────────┐  │
│  │  Node.js 18+ / Express       │  │
│  │  ├─ server.js (入口)          │  │
│  │  ├─ routes/ (API 路由)        │  │
│  │  ├─ middleware/ (认证中间件)    │  │
│  │  ├─ db/ (SQLite 初始化)       │  │
│  │  └─ data/lumi.db (数据库)     │  │
│  └───────────────────────────────┘  │
│  自动分配域名: *.up.railway.app      │
└─────────────────────────────────────┘
```

## 前置准备

- [ ] 注册 [Railway](https://railway.app) 账号（支持 GitHub 登录）
- [ ] GitHub 仓库已推送后端代码

## 部署步骤

### 第 1 步：推送代码到 GitHub

```bash
cd lumi-backend/

# 确保 .gitignore 正确
cat > .gitignore << 'EOF'
node_modules/
data/*.db
data/*.db-journal
.env
*.log
EOF

git init
git add .
git commit -m "🚀 init: Lumi AI backend service"
git remote add origin https://github.com/你的用户名/lumi-backend.git
git branch -M main
git push -u origin main
```

### 第 2 步：在 Railway 创建项目

1. 登录 [railway.app](https://railway.app)
2. 点击 **"+ New Project"**
3. 选择 **"Deploy from GitHub Repo"**
4. 选择你的 `lumi-backend` 仓库

### 第 3 步：配置环境变量

在项目页面 → **Variables** 标签页，添加以下变量：

| 变量名 | 值 | 说明 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | `sk-3ea29a4234154a74ab4a4ea70530c1cb` | DeepSeek API 密钥 |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | DeepSeek API 地址 |
| `DEEPSEEK_MODEL` | `deepseek-chat` | 模型名称 |
| `JWT_SECRET` | `30e3c4c3a68bdbf9a41143fd5880025409bda89abf93b24a437b16c31bbb7d66` | JWT 签名密钥 |
| `PORT` | `3000` | 服务端口（Railway 会自动覆盖） |

### 第 4 步：确认构建设置

Railway 会自动检测 Node.js 项目，确认以下设置：

| 配置项 | 值 |
|--------|------|
| Start Command | `node server.js` |
| Install Command | `npm install --production` |

> `Procfile` 已配置为 `web: node server.js`，Railway 会自动读取。

### 第 5 步：配置持久化存储（重要！）

SQLite 数据库文件需要持久化存储，否则重启后数据会丢失：

1. 进入项目 → **Settings** 标签页
2. 找到 **"Networking"** 部分，记录分配的域名
3. 添加 **Volume**：
   - 点击 **"Volumes"** → **"+ New Volume"**
   - Mount Path: `/app/data`（即代码中 SQLite 数据存储路径）
   - Size: 1 GB（足够存储个人数据）

> ⚠️ 如果没有配置 Volume，每次部署或重启时 SQLite 数据库会被清空！

### 第 6 步：等待部署完成

Railway 会自动构建和部署，通常 2-5 分钟。

部署成功后会显示：
- ✅ 构建日志无错误
- ✅ 服务状态为 "Deployed"
- ✅ 分配的域名可访问

### 第 7 步：验证部署

```bash
# 替换为你的 Railway 域名
curl https://你的项目.up.railway.app/api/health

# 预期响应:
# {"status":"ok","version":"1.0.0","timestamp":"..."}
```

---

## 域名配置（可选）

### 使用 Railway 默认域名

Railway 自动分配 `*.up.railway.app` 域名，免费且自带 HTTPS。

### 绑定自定义域名

1. 进入项目 → **Settings → Networking**
2. 点击 **"Generate Domain"** 或 **"Custom Domain"**
3. 输入你的域名，如 `api-lumi.yourdomain.com`
4. 在域名 DNS 管理面板添加 CNAME 记录：
   - 主机记录: `api-lumi`
   - 记录值: `proxy.railway.app`
5. Railway 自动配置 HTTPS

---

## 本地开发

```bash
# 1. 克隆代码
git clone https://github.com/你的用户名/lumi-backend.git
cd lumi-backend/

# 2. 安装依赖
npm install

# 3. 配置环境变量
# .env 文件已包含配置，确认 API Key 正确

# 4. 运行部署检查脚本
chmod +x deploy.sh
./deploy.sh

# 5. 启动服务
npm start
# 或
node server.js

# 6. 运行本地全栈测试
chmod +x test-local.sh
./test-local.sh
```

---

## 免费额度

| 项目 | 免费额度 |
|------|----------|
| 月使用额度 | $5 / 月 |
| CPU | 共享 0.5 GB |
| 内存 | 512 MB |
| 存储 (Volume) | 1 GB |
| 带宽 | 100 GB / 月 |

> 💡 对于个人使用项目，$5 免费额度完全够用。
> 如果超出，可按需充值（约 $1-2 / 月即可）。

---

## 常见问题

### Q: 部署后数据库为空？
**A**: 检查是否配置了 Volume。没有 Volume 的话，每次重启数据库会重置。

### Q: 服务启动失败？
**A**: 检查 Railway 的 Deploy Logs，常见问题：
- 环境变量未配置
- Node.js 版本不兼容（需要 18+）
- 依赖安装失败

### Q: DeepSeek API 调用失败？
**A**: 
1. 检查 `DEEPSEEK_API_KEY` 是否正确
2. 确认 API Key 有余额
3. 检查 `DEEPSEEK_BASE_URL` 是否为 `https://api.deepseek.com`

### Q: 如何查看日志？
**A**: Railway 控制台 → 项目 → **Deployments** → 选择最新部署 → **View Logs**

### Q: 如何回滚到上一个版本？
**A**: Railway → **Deployments** → 找到之前的部署 → 点击 **"Redeploy"**

### Q: SQLite 并发问题？
**A**: SQLite 支持单写多读。对于个人项目完全够用。如果未来用户量增大，建议迁移到 PostgreSQL。

---

## 文件结构

```
lumi-backend/
├── server.js           # 服务入口
├── package.json        # 依赖声明
├── Procfile            # Railway 启动配置
├── .env                # 环境变量（不入 Git）
├── .env.example        # 环境变量模板
├── .gitignore          # Git 忽略规则
├── db/
│   └── init.js         # SQLite 初始化
├── middleware/
│   └── auth.js         # JWT 认证中间件
├── routes/
│   ├── auth.js         # 认证路由
│   ├── chat.js         # 对话路由
│   ├── diary.js        # 日记路由
│   ├── memory.js       # 记忆路由
│   ├── profile.js      # 个人档案路由
│   └── proxy.js        # AI 代理路由
└── data/
    └── lumi.db         # SQLite 数据库文件（运行时生成）
```

---

> 本内容由 Coze AI 生成，请遵循相关法律法规及《人工智能生成合成内容标识办法》使用与传播。
