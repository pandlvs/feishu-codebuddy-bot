# 飞书 CodeBuddy 机器人

基于飞书 MCP 和 CodeBuddy SDK 的智能机器人，支持意图路由、多轮对话、知识库问答。

## 功能特性

- **意图路由**：自动识别用户意图，路由到对应处理器
  - `ngs-product-qa`：电销系统产品问答（RAG + Claude）
  - `ngs-bug-fixer`：测试问题修复（CodeBuddy）
  - `general-qa`：普通问答（Claude）

- **两种群聊模式**
  - `individual`：@机器人触发，每人独立会话
  - `shared`：所有消息参与，共享会话

- **本地会话存储**：对话历史持久化，支持多轮上下文

- **知识库检索**：本地 markdown 文档关键词匹配

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入配置：

```env
# 飞书 MCP 服务器 URL（必填）
FEISHU_MCP_URL=https://open.feishu.cn/mcp/stream/your_token_here

# Claude API（必填）
CLAUDE_API_KEY=sk-ant-xxx
CLAUDE_BASE_URL=https://api.anthropic.com

# 监听的群 ID（必填）
WATCH_CHAT_IDS=oc_xxxxxxxx,oc_yyyyyyyy

# 机器人自身的 open_id（individual 模式必填）
BOT_OPEN_ID=ou_xxxxxxxx

# 知识库目录
KNOWLEDGE_DIR=./knowledge

# 其他配置见 .env.example
```

### 3. 准备知识库

在 `knowledge/` 目录下放置 markdown 文档：

```
knowledge/
  产品介绍.md
  使用手册.md
  FAQ.md
```

### 4. CodeBuddy 登录

```bash
npx tsx scripts/login.ts
```

在浏览器中完成授权。

### 5. 启动

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## 配置说明

### 群聊模式

```env
# 默认模式
DEFAULT_CHAT_MODE=individual

# 单独指定某个群
CHAT_MODE_oc_xxx=shared
```

### 群能力配置

限制某个群只支持特定意图：

```env
CHAT_CAPABILITIES_oc_xxx=ngs-product-qa,ngs-bug-fixer
```

不配置则支持所有意图。

### 用户白名单

```env
ALLOWED_SENDER_IDS=ou_xxx,ou_yyy
```

留空则响应所有人。

## 项目结构

```
src/
  index.ts                   # 主入口
  feishu-mcp-client.ts       # 飞书 MCP 客户端
  router.ts                  # 意图分类（Claude Haiku）
  session-store.ts           # 本地会话存储
  handlers/
    product-qa.ts            # 产品问答
    bug-fixer.ts             # Bug 修复
    general-qa.ts            # 普通问答
  knowledge/
    loader.ts                # 知识库加载
    retriever.ts             # 关键词检索
```

## 注意事项

- **敏感信息**：`.env` 文件包含 API Key 和 Token，不要上传到公开仓库
- **会话数据**：`sessions/` 目录包含用户对话历史，已在 `.gitignore` 中排除
- **知识库**：`knowledge/` 目录的文档可能包含内部信息，注意保密
- **编译产物**：`dist/` 目录不要提交到 Git

## License

MIT
