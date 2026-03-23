# 常见问题 FAQ

## 基础问题

### Q: 机器人支持哪些功能？

A: 机器人支持三种主要功能：
1. 产品问答 - 基于知识库回答产品相关问题
2. Bug 修复 - 使用 CodeBuddy 分析和修复代码问题
3. 普通问答 - 回答各类通用问题

### Q: 如何触发机器人？

A: 取决于群聊模式：
- Individual 模式：需要 @机器人
- Shared 模式：直接发送消息，机器人自动判断是否回复

### Q: 如何重置对话？

A: 发送 `/reset` 或 `重置对话` 即可。

## 配置问题

### Q: 如何获取群 ID？

A: 在飞书群设置中查看，格式为 `oc_xxxxxxxx`。

### Q: 如何获取 BOT_OPEN_ID？

A: 启动服务后，在日志中查看 `sender_id` 字段，找到机器人回复消息对应的 ID。

### Q: 如何限制某个群只支持特定功能？

A: 在 `.env` 中配置：
```env
CHAT_CAPABILITIES_oc_xxx=ngs-product-qa,ngs-bug-fixer
```

### Q: 如何设置用户白名单？

A: 在 `.env` 中配置：
```env
ALLOWED_SENDER_IDS=ou_xxx,ou_yyy
```

## 使用问题

### Q: 机器人没有回复怎么办？

A: 检查以下几点：
1. Individual 模式下是否 @了机器人
2. 用户是否在白名单中（如果配置了白名单）
3. 查看日志是否有错误信息
4. 检查网络连接和 API 配置

### Q: 如何查看对话历史？

A: 对话历史存储在 `sessions/{chatId}/{userId}.json` 文件中。

### Q: 机器人回复太慢怎么办？

A: 可能原因：
1. Claude API 响应慢 - 检查网络或更换 API 端点
2. CodeBuddy 处理复杂任务 - 正常现象，耐心等待
3. 知识库文档过多 - 优化文档数量和大小

### Q: 如何添加新的知识库文档？

A: 直接在 `knowledge/` 目录下添加 markdown 文件，重启服务即可。

## 技术问题

### Q: 支持哪些 Claude 模型？

A: 默认使用：
- Router: claude-haiku-4-5-20251001
- Q&A: claude-sonnet-4-6

可以在 `.env` 中自定义：
```env
CLAUDE_ROUTER_MODEL=claude-haiku-4-5-20251001
CLAUDE_QA_MODEL=claude-sonnet-4-6
```

### Q: 知识库检索是如何工作的？

A: 使用关键词匹配：
1. 对用户问题分词
2. 在文档标题和内容中匹配关键词
3. 按命中数排序，返回 top-3 文档
4. 将文档内容作为上下文传给 Claude

### Q: 会话文件会占用多少空间？

A: 每个会话最多保留 50 条历史消息，单个文件通常不超过 100KB。

### Q: 如何备份会话数据？

A: 直接复制 `sessions/` 目录即可。

## 错误处理

### Q: 出现 403 错误怎么办？

A: 检查 `CLAUDE_API_KEY` 是否正确，以及是否有权限访问指定的模型。

### Q: 出现 "Authentication required" 错误？

A: 运行 `npx tsx scripts/login.ts` 重新登录 CodeBuddy。

### Q: 出现 "tools not supported" 错误？

A: 检查飞书 MCP URL 是否正确，以及 Token 是否有效。

### Q: Router 调用失败怎么办？

A: 可能原因：
1. API Key 无效
2. 网络无法访问 Claude API
3. 地区限制

解决方案：
1. 检查 API Key 配置
2. 配置代理或更换 `CLAUDE_BASE_URL`
3. 联系 Anthropic 确认账号状态

## 高级用法

### Q: 如何自定义意图分类？

A: 修改 `src/router.ts` 中的 `SYSTEM_PROMPT`，添加新的意图类型。

### Q: 如何添加新的 Handler？

A:
1. 在 `src/handlers/` 下创建新文件
2. 在 `src/index.ts` 中导入并注册
3. 更新 `src/session-store.ts` 的 `Intent` 类型

### Q: 如何使用向量检索替代关键词匹配？

A: 修改 `src/knowledge/retriever.ts`，集成向量数据库（如 ChromaDB）和 embedding 模型。

### Q: 如何支持多语言？

A: 在 Handler 的 system prompt 中指定语言，或根据用户消息语言动态调整。
