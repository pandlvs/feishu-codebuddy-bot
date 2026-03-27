# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Feishu (飞书) × Claude CLI bot with intent routing, multi-turn conversations, and knowledge base Q&A. Designed for internal network deployment without webhooks.

Data flow: `飞书 ↔ Feishu MCP service ↔ this service ↔ Router ↔ Handlers (Claude CLI)`

## Commands

```bash
npm run dev      # Development with hot reload (tsx watch)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled output
```

## Architecture

### Core Components

- `src/index.ts` — Main entry point, polling loop, message routing
- `src/config.ts` — Config loader (reads config.json)
- `src/feishu-mcp-client.ts` — Feishu MCP client using StreamableHTTPClientTransport
- `src/router.ts` — Intent classification via Claude CLI
- `src/cli-runner.ts` — CLI subprocess runner (spawn claude, stdin/stdout)
- `src/session-store.ts` — Local session file storage (sessions/{chatId}/{userId}.json)

### Handlers

- `src/handlers/product-qa.ts` — Product Q&A with RAG (keyword search + Claude CLI)
- `src/handlers/bug-fixer.ts` — Bug fixing with Claude CLI
- `src/handlers/general-qa.ts` — General Q&A with Claude CLI

### Knowledge Base

- `src/knowledge/loader.ts` — Load markdown files from knowledgeDir
- `src/knowledge/retriever.ts` — Keyword-based document retrieval

## Configuration

Copy `config.example.json` to `config.json` before running. Key fields:

| Field | Description |
|---|---|
| `feishuMcpUrl` | Feishu MCP server StreamableHTTP URL (required) |
| `watchChatIds` | Array of chat IDs to monitor (required) |
| `botOpenId` | Bot's open_id for @mention detection (required for individual mode) |
| `apiBaseUrl` | Anthropic-compatible API base URL (e.g. CodeBuddy proxy) |
| `apiKey` | API key for the above endpoint |
| `apiModel` | Model to use via API (default: claude-sonnet-4-6) |
| `allowedSenderIds` | Global user ID whitelist (empty = all); overridden per-chat |
| `pollInterval` | Polling interval in ms (default: 5000) |
| `defaultChatMode` | `individual` or `shared` (default: individual) |
| `claudeCliPath` | Path to claude CLI executable (default: claude) |
| `claudeCliModel` | Model override for claude CLI (optional) |
| `cliTimeoutMs` | CLI subprocess timeout in ms (default: 120000) |
| `workingDir` | Default working directory for all handlers |
| `allowedTools` | Global allowed tools for CLI, comma-separated |
| `disallowedTools` | Global disallowed tools for CLI, comma-separated |
| `defaultPermissionMode` | Default permission mode for bug-fixer (default: acceptEdits) |
| `defaultMaxTurns` | Default max turns for bug-fixer (default: 10) |
| `knowledgeDir` | Directory containing markdown knowledge base (default: ./knowledge) |
| `sessionsDir` | Directory for session storage (default: ./sessions) |
| `chats` | Per-chat config: mode, capabilities, defaultIntent, allowedSenderIds |
| `handlers` | Per-handler overrides: workingDir, allowedTools, disallowedTools, maxTurns, permissionMode |

## Chat Modes

- **individual**: @mention triggers bot, each user has separate session
- **shared**: All messages processed, shared session for entire chat

Configure per-chat in `config.json`:
```json
"chats": {
  "oc_xxx": { "mode": "shared" }
}
```

## Intent Routing

Router classifies user messages into:
- `ngs-product-qa` — Product questions (uses knowledge base + Claude CLI)
- `ngs-bug-fixer` — Bug reports (uses Claude CLI with file access)
- `general-qa` — General questions (uses Claude CLI)

Configure per-chat capabilities and default intent:
```json
"chats": {
  "oc_xxx": {
    "capabilities": ["ngs-product-qa", "ngs-bug-fixer"],
    "defaultIntent": "general-qa"
  }
}
```

## Key Dependencies

- `@modelcontextprotocol/sdk` — MCP protocol support (Feishu MCP client)

## Session Storage

Sessions stored in `sessions/{chatId}/{userId}.json`:
- `sessionId` — Claude CLI session ID for conversation continuity (`--resume`)
- `currentIntent` — Last classified intent
- `state` — idle or pending_confirmation
- `history` — Last 50 messages (user + assistant)

## Knowledge Base

Place markdown files in `knowledgeDir` (default: ./knowledge):
```
knowledge/
  product-intro.md
  user-manual.md
  faq.md
```

Files are loaded at startup and cached. Keyword-based retrieval ranks documents by match count.
