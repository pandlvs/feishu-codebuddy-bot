# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Feishu (飞书) × Claude CLI bot with intent routing, multi-turn conversations, and knowledge base Q&A. Designed for internal network deployment without webhooks.

Data flow: `飞书 ↔ Feishu MCP service ↔ this service ↔ Router ↔ Handlers (API or Claude CLI)`

## Commands

```bash
npm run dev      # Development with hot reload (tsx watch)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled output
```

## Architecture

### Core Components

- `src/index.ts` — Main entry point, polling loop, message routing; replies to original message via `replyMessage`
- `src/config.ts` — Config loader (reads config.json)
- `src/feishu-mcp-client.ts` — Feishu MCP client; `sendMessage` and `replyMessage`
- `src/api-client.ts` — Anthropic SDK wrapper; `callApi` (streaming) and `callApiWithTools` (tool use loop)
- `src/intellij-mcp-client.ts` — IntelliJ Index MCP client (SSE); `getIntellijTools` and `callIntellijTool`
- `src/router.ts` — Intent classification (API if configured, else CLI)
- `src/cli-runner.ts` — CLI subprocess runner (spawn claude, stdin/stdout)
- `src/session-store.ts` — Local session file storage (sessions/{chatId}/{userId}.json)

### Handlers

- `src/handlers/product-qa.ts` — Product Q&A with RAG; uses API+IntelliJ tools if both configured, else API, else CLI
- `src/handlers/bug-fixer.ts` — Bug fixing with Claude CLI; returns `{ reply, engine, newState, sessionId }`
- `src/handlers/general-qa.ts` — General Q&A; uses API+IntelliJ tools if both configured, else API, else CLI

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
| `apiAuthToken` | Auth token (alternative to apiKey, passed as Bearer token) |
| `apiModel` | Model to use via API (default: claude-sonnet-4-6) |
| `apiMaxTokens` | Max tokens for API calls (default: 4096) |
| `intellijMcpUrl` | IntelliJ Index MCP SSE URL (e.g. http://127.0.0.1:29170/index-mcp/sse) |
| `intellijProjectPath` | Project root path passed to IntelliJ MCP tools (optional if single project open) |
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
- `ngs-product-qa` — Product questions (uses knowledge base + API or CLI)
- `ngs-bug-fixer` — Bug reports (uses Claude CLI with file access)
- `general-qa` — General questions (uses API or CLI)

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

- `@modelcontextprotocol/sdk` — MCP protocol support (Feishu MCP client + IntelliJ MCP client)
- `@anthropic-ai/sdk` — Anthropic API client with streaming and tool use support

## IntelliJ MCP Tools

When `intellijMcpUrl` is configured, `product-qa` and `general-qa` gain access to these read-only tools:

| Tool | Description |
|---|---|
| `ide_find_class` | Search classes/interfaces by name (supports camelCase, wildcard) |
| `ide_find_file` | Search files by name |
| `ide_search_text` | Full-text search using IDE word index |
| `ide_find_definition` | Go to definition (file, line, column) |
| `ide_find_implementations` | Find all implementations of interface/abstract class |
| `ide_find_super_methods` | Find parent methods in inheritance chain |
| `ide_find_references` | Find all usages of a symbol |
| `ide_call_hierarchy` | Build caller/callee tree for a method |
| `ide_type_hierarchy` | Get full inheritance hierarchy of a class |
| `ide_diagnostics` | Get errors/warnings in a file |
| `ide_index_status` | Check if IDE index is ready |

Refactoring tools (`ide_refactor_rename`, `ide_refactor_safe_delete`) are intentionally excluded.

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
