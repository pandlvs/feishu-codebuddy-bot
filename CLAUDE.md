# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Feishu (飞书) × CodeBuddy integration bot with intent routing, multi-turn conversations, and knowledge base Q&A. Designed for internal network deployment without webhooks.

Data flow: `飞书 ↔ Feishu MCP service ↔ this service ↔ Router ↔ Handlers (Claude API / CodeBuddy SDK)`

## Commands

```bash
npm run dev      # Development with hot reload (tsx watch)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled output
```

## Architecture

### Core Components

- `src/index.ts` — Main entry point, polling loop, message routing
- `src/feishu-mcp-client.ts` — Feishu MCP client using StreamableHTTPClientTransport
- `src/router.ts` — Intent classification using Claude Haiku API
- `src/session-store.ts` — Local session file storage (sessions/{chatId}/{userId}.json)

### Handlers

- `src/handlers/product-qa.ts` — Product Q&A with RAG (keyword search + Claude)
- `src/handlers/bug-fixer.ts` — Bug fixing with CodeBuddy SDK
- `src/handlers/general-qa.ts` — General Q&A with Claude API

### Knowledge Base

- `src/knowledge/loader.ts` — Load markdown files from KNOWLEDGE_DIR
- `src/knowledge/retriever.ts` — Keyword-based document retrieval

## Environment Configuration

Copy `.env.example` to `.env` before running. Key variables:

| Variable | Description |
|---|---|
| `FEISHU_MCP_URL` | Feishu MCP server StreamableHTTP URL (required) |
| `CLAUDE_API_KEY` | Anthropic API key for router and Q&A (required) |
| `CLAUDE_BASE_URL` | Claude API endpoint (default: https://api.anthropic.com) |
| `WATCH_CHAT_IDS` | Comma-separated chat IDs to monitor (required) |
| `BOT_OPEN_ID` | Bot's open_id for @mention detection (required for individual mode) |
| `KNOWLEDGE_DIR` | Directory containing markdown knowledge base (default: ./knowledge) |
| `SESSIONS_DIR` | Directory for session storage (default: ./sessions) |
| `WORKING_DIR` | CodeBuddy working directory (default: process.cwd()) |
| `DEFAULT_CHAT_MODE` | individual or shared (default: individual) |

## Chat Modes

- **individual**: @mention triggers bot, each user has separate session
- **shared**: All messages processed, shared session for entire chat

Configure per-chat: `CHAT_MODE_oc_xxx=shared`

## Intent Routing

Router classifies user messages into:
- `ngs-product-qa` — Product questions (uses knowledge base + Claude)
- `ngs-bug-fixer` — Bug reports (uses CodeBuddy SDK)
- `general-qa` — General questions (uses Claude API)

Configure per-chat capabilities: `CHAT_CAPABILITIES_oc_xxx=ngs-product-qa,ngs-bug-fixer`

## Key Dependencies

- `@tencent-ai/agent-sdk` — CodeBuddy SDK integration
- `@anthropic-ai/sdk` — Claude API client
- `@modelcontextprotocol/sdk` — MCP protocol support

## Session Storage

Sessions stored in `sessions/{chatId}/{userId}.json`:
- `sessionId` — CodeBuddy session ID (for bug-fixer)
- `currentIntent` — Last classified intent
- `state` — idle or pending_confirmation
- `history` — Last 50 messages (user + assistant)

## Knowledge Base

Place markdown files in `KNOWLEDGE_DIR` (default: ./knowledge):
```
knowledge/
  product-intro.md
  user-manual.md
  faq.md
```

Files are loaded at startup and cached. Keyword-based retrieval ranks documents by match count.
