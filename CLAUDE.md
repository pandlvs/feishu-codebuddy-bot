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

- `src/handlers/product-qa.ts` — Product Q&A with RAG (keyword search + Claude/CodeBuddy)
- `src/handlers/bug-fixer.ts` — Bug fixing with CodeBuddy SDK
- `src/handlers/general-qa.ts` — General Q&A with Claude/CodeBuddy

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
| `ROUTER_ENGINE` | Router engine: claude or codebuddy (default: claude) |
| `QA_ENGINE` | Global default QA engine: claude or codebuddy (default: claude) |
| `PRODUCT_QA_ENGINE` | Product Q&A engine override (optional, falls back to QA_ENGINE) |
| `GENERAL_QA_ENGINE` | General Q&A engine override (optional, falls back to QA_ENGINE) |
| `WATCH_CHAT_IDS` | Comma-separated chat IDs to monitor (required) |
| `BOT_OPEN_ID` | Bot's open_id for @mention detection (required for individual mode) |
| `KNOWLEDGE_DIR` | Directory containing markdown knowledge base (default: ./knowledge) |
| `SESSIONS_DIR` | Directory for session storage (default: ./sessions) |
| `WORKING_DIR` | CodeBuddy working directory (default: process.cwd()) |
| `DEFAULT_CHAT_MODE` | individual or shared (default: individual) |
| `CODEBUDDY_ENVIRONMENT` | CodeBuddy environment: external, internal, ioa, cloudhosted (optional) |
| `CODEBUDDY_ENDPOINT` | Custom CodeBuddy endpoint URL (optional, mutually exclusive with environment) |

## Chat Modes

- **individual**: @mention triggers bot, each user has separate session
- **shared**: All messages processed, shared session for entire chat

Configure per-chat: `CHAT_MODE_oc_xxx=shared`

## Intent Routing

Router classifies user messages into:
- `ngs-product-qa` — Product questions (uses knowledge base + Claude/CodeBuddy)
- `ngs-bug-fixer` — Bug reports (uses CodeBuddy SDK)
- `general-qa` — General questions (uses Claude/CodeBuddy)

Configure per-chat capabilities: `CHAT_CAPABILITIES_oc_xxx=ngs-product-qa,ngs-bug-fixer`

## Engine Configuration

Both product-qa and general-qa handlers support two engines:

- **Claude API**: Fast, reliable, requires `CLAUDE_API_KEY`
- **CodeBuddy SDK**: Advanced capabilities, requires CodeBuddy login

Configuration priority (highest to lowest):
1. Handler-specific env var (`PRODUCT_QA_ENGINE`, `GENERAL_QA_ENGINE`)
2. Global default (`QA_ENGINE`)
3. Fallback to `claude`

Example configurations:
```bash
# Use Claude for both
QA_ENGINE=claude

# Use CodeBuddy for product Q&A, Claude for general Q&A
PRODUCT_QA_ENGINE=codebuddy
GENERAL_QA_ENGINE=claude

# Use CodeBuddy for both
QA_ENGINE=codebuddy
```

### CodeBuddy Server Configuration

When using CodeBuddy engine, you can configure the server address:

**Option 1: Predefined environment** (recommended for standard deployments)
```bash
CODEBUDDY_ENVIRONMENT=external  # or internal, ioa, cloudhosted
```

**Option 2: Custom endpoint** (for self-hosted or custom servers)
```bash
CODEBUDDY_ENDPOINT=https://your-codebuddy-server.com
```

Note: `CODEBUDDY_ENVIRONMENT` and `CODEBUDDY_ENDPOINT` are mutually exclusive. If both are set, `CODEBUDDY_ENVIRONMENT` takes precedence.

Default behavior: If neither is set, CodeBuddy SDK uses its default endpoint (https://www.codebuddy.ai).

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
