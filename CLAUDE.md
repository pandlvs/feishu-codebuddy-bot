# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Feishu (飞书) × CodeBuddy integration bot with intent routing, multi-turn conversations, and knowledge base Q&A. Designed for internal network deployment without webhooks.

Data flow: `飞书 ↔ Feishu MCP service ↔ this service ↔ Router ↔ Handlers (Claude CLI / CodeBuddy CLI / Claude SDK / CodeBuddy SDK)`

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
- `src/router.ts` — Intent classification (CLI or SDK engine)
- `src/cli-runner.ts` — CLI subprocess runner (spawn claude/codebuddy, stdin/stdout)
- `src/session-store.ts` — Local session file storage (sessions/{chatId}/{userId}.json)

### Handlers

- `src/handlers/product-qa.ts` — Product Q&A with RAG (keyword search + CLI/SDK)
- `src/handlers/bug-fixer.ts` — Bug fixing with CLI or CodeBuddy SDK
- `src/handlers/general-qa.ts` — General Q&A with CLI/SDK

### Knowledge Base

- `src/knowledge/loader.ts` — Load markdown files from KNOWLEDGE_DIR
- `src/knowledge/retriever.ts` — Keyword-based document retrieval

## Environment Configuration

Copy `.env.example` to `.env` before running. Key variables:

| Variable | Description |
|---|---|
| `FEISHU_MCP_URL` | Feishu MCP server StreamableHTTP URL (required) |
| `CLAUDE_API_KEY` | Anthropic API key (only required for SDK engines: claude) |
| `CLAUDE_BASE_URL` | Claude API endpoint (default: https://api.anthropic.com) |
| `ROUTER_ENGINE` | Router engine: cli-claude, cli-codebuddy, claude, codebuddy (default: cli-claude) |
| `QA_ENGINE` | Global default QA engine: cli-claude, cli-codebuddy, claude, codebuddy (default: cli-claude) |
| `PRODUCT_QA_ENGINE` | Product Q&A engine override (optional, falls back to QA_ENGINE) |
| `GENERAL_QA_ENGINE` | General Q&A engine override (optional, falls back to QA_ENGINE) |
| `BUG_FIXER_ENGINE` | Bug fixer engine: cli-codebuddy, cli-claude, codebuddy (default: cli-codebuddy) |
| `CLAUDE_CLI_PATH` | Path to claude CLI executable (default: claude) |
| `CODEBUDDY_CLI_PATH` | Path to codebuddy CLI executable (default: codebuddy) |
| `CLAUDE_CLI_MODEL` | Model for cli-claude engine (optional, uses CLI default if unset) |
| `CLI_TIMEOUT_MS` | CLI subprocess timeout in ms (default: 120000) |
| `WATCH_CHAT_IDS` | Comma-separated chat IDs to monitor (required) |
| `BOT_OPEN_ID` | Bot's open_id for @mention detection (required for individual mode) |
| `KNOWLEDGE_DIR` | Directory containing markdown knowledge base (default: ./knowledge) |
| `SESSIONS_DIR` | Directory for session storage (default: ./sessions) |
| `WORKING_DIR` | Working directory for CLI/CodeBuddy (default: process.cwd()) |
| `DEFAULT_CHAT_MODE` | individual or shared (default: individual) |
| `CODEBUDDY_ENVIRONMENT` | CodeBuddy environment: external, internal, ioa, cloudhosted (optional, SDK only) |
| `CODEBUDDY_ENDPOINT` | Custom CodeBuddy endpoint URL (optional, SDK only, mutually exclusive with environment) |

## Chat Modes

- **individual**: @mention triggers bot, each user has separate session
- **shared**: All messages processed, shared session for entire chat

Configure per-chat: `CHAT_MODE_oc_xxx=shared`

## Intent Routing

Router classifies user messages into:
- `ngs-product-qa` — Product questions (uses knowledge base + CLI/SDK)
- `ngs-bug-fixer` — Bug reports (uses CLI or CodeBuddy SDK)
- `general-qa` — General questions (uses CLI/SDK)

Configure per-chat capabilities: `CHAT_CAPABILITIES_oc_xxx=ngs-product-qa,ngs-bug-fixer`

## Engine Configuration

All handlers support four engine modes:

- **cli-claude** (default): Spawns `claude` CLI subprocess, prompt via stdin. No API key needed, uses local CLI auth.
- **cli-codebuddy**: Spawns `codebuddy` CLI subprocess, prompt via stdin. Uses local CLI auth.
- **claude**: Claude SDK via HTTP API. Requires `CLAUDE_API_KEY`.
- **codebuddy**: CodeBuddy SDK. Requires CodeBuddy login (`npx tsx scripts/login.ts`).

Configuration priority for QA handlers (highest to lowest):
1. Handler-specific env var (`PRODUCT_QA_ENGINE`, `GENERAL_QA_ENGINE`)
2. Global default (`QA_ENGINE`)
3. Fallback to `cli-claude`

Example configurations:
```bash
# CLI mode (default, recommended for internal network)
QA_ENGINE=cli-claude
ROUTER_ENGINE=cli-claude
BUG_FIXER_ENGINE=cli-codebuddy

# Mixed: CLI CodeBuddy for product Q&A, CLI Claude for general
PRODUCT_QA_ENGINE=cli-codebuddy
GENERAL_QA_ENGINE=cli-claude

# SDK mode (requires API key / CodeBuddy login)
QA_ENGINE=claude
ROUTER_ENGINE=claude
BUG_FIXER_ENGINE=codebuddy
```

### CLI Engine Configuration

```bash
# Custom CLI paths (if not in PATH)
CLAUDE_CLI_PATH=/usr/local/bin/claude
CODEBUDDY_CLI_PATH=/usr/local/bin/codebuddy

# Model override for cli-claude (optional)
CLAUDE_CLI_MODEL=claude-sonnet-4-6

# Subprocess timeout in ms (default: 120000)
CLI_TIMEOUT_MS=120000
```

Session continuity: CLI engines persist `session_id` from JSON output and pass `--resume <id>` on subsequent turns.

## Key Dependencies

- `@tencent-ai/agent-sdk` — CodeBuddy SDK integration
- `@anthropic-ai/sdk` — Claude API client
- `@modelcontextprotocol/sdk` — MCP protocol support

## Session Storage

Sessions stored in `sessions/{chatId}/{userId}.json`:
- `sessionId` — CLI/CodeBuddy session ID for conversation continuity
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
