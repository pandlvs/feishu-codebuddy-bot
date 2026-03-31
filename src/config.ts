/**
 * 配置加载器
 * 从 config.json 读取配置（路径可通过 CONFIG_PATH 环境变量覆盖）
 */

import fs from 'fs';
import path from 'path';

export interface ChatConfig {
  mode?: 'individual' | 'shared';
  capabilities?: string[];
  defaultIntent?: string;
  allowedTools?: string;
  disallowedTools?: string;
  allowedSenderIds?: string[];
}

export interface HandlerConfig {
  workingDir?: string;
  allowedTools?: string;
  disallowedTools?: string;
  maxTurns?: number;
  permissionMode?: string;
}

export interface AppConfig {
  // 飞书
  feishuMcpUrl: string;
  watchChatIds: string[];
  botOpenId?: string;
  allowedSenderIds?: string[];
  pollInterval?: number;
  defaultChatMode?: 'individual' | 'shared';
  outOfScopeReply?: string;

  // Anthropic API（用于 router/general-qa/product-qa，替代 CLI 提速）
  apiBaseUrl?: string;
  apiKey?: string;
  apiAuthToken?: string;
  apiModel?: string;
  apiMaxTokens?: number;
  apiToolsEnabled?: boolean; // 是否启用 tool use（默认 true，代理不支持时设为 false）

  // IntelliJ MCP（代码搜索/导航，用于 product-qa/general-qa）
  intellijMcpUrl?: string;
  intellijProjectPath?: string;

  // Claude CLI
  claudeCliPath?: string;
  claudeCliModel?: string;
  cliTimeoutMs?: number;

  // 工作目录 & 工具
  workingDir?: string;
  allowedTools?: string;
  disallowedTools?: string;

  // Bug fixer 默认值
  defaultPermissionMode?: string;
  defaultMaxTurns?: number;

  // 存储
  knowledgeDir?: string | string[];
  sessionsDir?: string;

  // 群聊配置
  chats?: Record<string, ChatConfig>;

  // Handler 级别配置
  handlers?: {
    router?: HandlerConfig;
    productQa?: HandlerConfig;
    generalQa?: HandlerConfig;
    bugFixer?: HandlerConfig;
  };
}

function loadConfig(): AppConfig {
  const configPath = process.env.CONFIG_PATH || path.resolve(process.cwd(), 'config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`配置文件不存在: ${configPath}，请复制 config.example.json 为 config.json 并填写配置`);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as AppConfig;
}

export const config = loadConfig();

const PROMPTS_DIR = path.resolve(process.cwd(), 'prompts');

export function loadPrompt(name: string, fallback: string): string {
  const promptPath = path.join(PROMPTS_DIR, `${name}.md`);
  if (fs.existsSync(promptPath)) {
    return fs.readFileSync(promptPath, 'utf-8').trim();
  }
  return fallback;
}

export function getHandlerConfig(handler: keyof NonNullable<AppConfig['handlers']>): Required<Pick<HandlerConfig, 'workingDir' | 'allowedTools' | 'disallowedTools'>> & HandlerConfig {
  const h = config.handlers?.[handler] ?? {};
  return {
    workingDir: h.workingDir || config.workingDir || process.cwd(),
    allowedTools: h.allowedTools ?? config.allowedTools ?? '',
    disallowedTools: h.disallowedTools ?? config.disallowedTools ?? '',
    maxTurns: h.maxTurns,
    permissionMode: h.permissionMode,
  };
}
