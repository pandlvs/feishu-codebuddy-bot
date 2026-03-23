# 示例产品文档

这是一个示例知识库文档，用于演示产品问答功能。

## 产品介绍

本系统是一个基于飞书的智能机器人，支持以下功能：

- 产品问答：基于知识库回答产品相关问题
- Bug 修复：使用 CodeBuddy 分析和修复代码问题
- 普通问答：回答各类通用问题

## 使用方法

### Individual 模式

在群里 @机器人，发送你的问题即可。每个用户有独立的对话会话。

示例：
```
@机器人 如何配置知识库？
```

### Shared 模式

直接在群里发送消息，机器人会自动判断是否需要回复。整个群共享一个会话。

## 常见问题

### 如何重置对话？

发送 `/reset` 或 `重置对话` 即可清空当前会话历史。

### 支持哪些意图？

- `ngs-product-qa`：产品问答
- `ngs-bug-fixer`：Bug 修复
- `general-qa`：普通问答

### 如何配置群能力？

在 `.env` 中配置：
```env
CHAT_CAPABILITIES_oc_xxx=ngs-product-qa,ngs-bug-fixer
```

## 技术架构

系统采用意图路由架构：

1. 用户发送消息
2. Router 使用 Claude Haiku 分类意图
3. 根据意图路由到对应 Handler
4. Handler 处理后返回结果

## 配置说明

### 必填配置

- `FEISHU_MCP_URL`：飞书 MCP 服务器地址
- `CLAUDE_API_KEY`：Claude API 密钥
- `WATCH_CHAT_IDS`：监听的群 ID
- `BOT_OPEN_ID`：机器人的 open_id

### 可选配置

- `KNOWLEDGE_DIR`：知识库目录（默认 ./knowledge）
- `DEFAULT_CHAT_MODE`：默认群聊模式（默认 individual）
- `ALLOWED_SENDER_IDS`：用户白名单（留空则所有人可用）

## 部署指南

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入配置。

### 3. 登录 CodeBuddy

```bash
npx tsx scripts/login.ts
```

### 4. 启动服务

```bash
npm run dev
```

## 维护说明

### 更新知识库

直接在 `knowledge/` 目录下添加或修改 markdown 文件，重启服务即可生效。

### 查看会话历史

会话文件存储在 `sessions/{chatId}/{userId}.json`，可以直接查看或编辑。

### 日志查看

服务运行时会在控制台输出详细日志，包括：
- 消息拉取情况
- 意图分类结果
- Handler 处理过程
- 错误信息

## 故障排查

### Router 调用失败

检查 `CLAUDE_API_KEY` 是否正确配置，以及网络是否能访问 Claude API。

### 无法拉取消息

检查 `FEISHU_MCP_URL` 是否正确，以及 Token 是否有效。

### CodeBuddy 认证失败

运行 `npx tsx scripts/login.ts` 重新登录。

## 联系方式

如有问题，请创建 GitHub Issue 或联系维护团队。
