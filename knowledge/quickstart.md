# 快速开始指南

## 前置要求

- Node.js 18+
- 有效的飞书 MCP 服务器访问权限
- Claude API Key（Anthropic 账号）
- CodeBuddy 账号

## 5 分钟快速部署

### 1. 克隆项目

```bash
git clone https://github.com/your-username/feishu-codebuddy-bot.git
cd feishu-codebuddy-bot
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入以下必填项：

```env
# 飞书 MCP 服务器 URL
FEISHU_MCP_URL=https://open.feishu.cn/mcp/stream/your_token_here

# Claude API Key
CLAUDE_API_KEY=sk-ant-xxx

# 监听的群 ID（逗号分隔）
WATCH_CHAT_IDS=oc_xxxxxxxx

# 机器人的 open_id
BOT_OPEN_ID=ou_xxxxxxxx
```

### 4. 登录 CodeBuddy

```bash
npx tsx scripts/login.ts
```

在浏览器中完成授权。

### 5. 启动服务

```bash
npm run dev
```

看到以下输出表示启动成功：

```
🚀 飞书CodeBuddy机器人启动
   轮询间隔: 5000ms
   默认模式: individual
   监听群组: oc_xxx(individual)
   允许用户: 所有人
   机器人ID: ou_xxx
```

### 6. 测试

在飞书群里 @机器人，发送测试消息：

```
@机器人 你好
```

机器人应该会回复。

## 下一步

### 添加知识库

在 `knowledge/` 目录下添加 markdown 文档：

```bash
echo "# 产品介绍" > knowledge/product.md
echo "我们的产品是..." >> knowledge/product.md
```

重启服务后，机器人就能基于这些文档回答问题了。

### 配置群模式

如果想让某个群使用 shared 模式（所有消息都参与）：

```env
CHAT_MODE_oc_xxx=shared
```

### 限制群能力

如果某个群只用于 Bug 修复：

```env
CHAT_CAPABILITIES_oc_xxx=ngs-bug-fixer
```

### 设置用户白名单

如果只允许特定用户使用：

```env
ALLOWED_SENDER_IDS=ou_xxx,ou_yyy
```

## 常用命令

```bash
# 开发模式（热重载）
npm run dev

# 编译
npm run build

# 生产模式
npm start

# 重新登录 CodeBuddy
npx tsx scripts/login.ts
```

## 生产部署

### 使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 编译
npm run build

# 启动
pm2 start dist/index.js --name feishu-bot

# 查看日志
pm2 logs feishu-bot

# 设置开机自启
pm2 startup
pm2 save
```

### 使用 Docker

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]
```

构建和运行：

```bash
docker build -t feishu-bot .
docker run -d --name feishu-bot --env-file .env feishu-bot
```

## 故障排查

### 机器人不回复

1. 检查日志是否有错误
2. 确认 @了机器人（individual 模式）
3. 检查用户是否在白名单中
4. 验证 API Key 是否有效

### Router 调用失败

1. 检查 `CLAUDE_API_KEY` 配置
2. 测试网络连接：`curl https://api.anthropic.com`
3. 查看日志中的详细错误信息

### CodeBuddy 认证失败

```bash
npx tsx scripts/login.ts
```

重新登录即可。

## 获取帮助

- 查看 [README.md](../README.md) 了解详细配置
- 查看 [FAQ](./faq.md) 了解常见问题
- 提交 GitHub Issue 报告问题
