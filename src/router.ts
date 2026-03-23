/**
 * 意图分类器
 * 支持两种引擎：Claude API 或 CodeBuddy SDK
 */

import Anthropic from '@anthropic-ai/sdk';
import { unstable_v2_prompt } from '@tencent-ai/agent-sdk';
import { HistoryMessage, Intent } from './session-store';

const ROUTER_ENGINE = process.env.ROUTER_ENGINE || 'claude';

// CodeBuddy 服务地址配置
const CODEBUDDY_ENVIRONMENT = process.env.CODEBUDDY_ENVIRONMENT as 'external' | 'internal' | 'ioa' | 'cloudhosted' | undefined;
const CODEBUDDY_ENDPOINT = process.env.CODEBUDDY_ENDPOINT;

export interface RouteResult {
  intent: Intent;
  confidence: number;
  reason: string;
}

const SYSTEM_PROMPT = `你是一个意图分类器，根据用户消息和对话历史判断用户意图。

可选意图：
- ngs-product-qa: 询问电销系统的功能、使用方法、配置说明、业务流程等产品相关问题
- ngs-bug-fixer: 报告电销系统的 bug、异常报错、测试问题，需要查看代码或修复问题
- general-qa: 普通问答、闲聊、与电销系统无关的问题

只返回 JSON，格式：
{"intent":"ngs-product-qa","confidence":0.9,"reason":"用户在询问电销系统的外呼配置方法"}`;

// ─── Claude 引擎 ──────────────────────────────────────────────────────────────

const claudeClient = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
  baseURL: process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com',
});

const ROUTER_MODEL = process.env.CLAUDE_ROUTER_MODEL || 'claude-haiku-4-5-20251001';

async function routeWithClaude(
  userMessage: string,
  history: HistoryMessage[]
): Promise<RouteResult> {
  const messages: Anthropic.MessageParam[] = [];

  for (const h of history.slice(-5)) {
    messages.push({ role: h.role, content: h.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const response = await claudeClient.messages.create({
    model: ROUTER_MODEL,
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages,
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as any).text)
    .join('');

  const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? text);

  return {
    intent: json.intent as Intent,
    confidence: json.confidence ?? 1,
    reason: json.reason ?? '',
  };
}

// ─── CodeBuddy 引擎 ───────────────────────────────────────────────────────────

async function routeWithCodeBuddy(
  userMessage: string,
  history: HistoryMessage[]
): Promise<RouteResult> {
  // 构建完整的上下文
  let contextPrompt = SYSTEM_PROMPT + '\n\n';

  if (history.length > 0) {
    contextPrompt += '对话历史（最近5条）：\n';
    for (const h of history.slice(-5)) {
      contextPrompt += `${h.role === 'user' ? '用户' : '助手'}: ${h.content}\n`;
    }
    contextPrompt += '\n';
  }

  contextPrompt += `当前消息：${userMessage}\n\n请分析意图并返回 JSON。`;

  // 构建 prompt 配置
  const promptConfig: any = {
    cwd: process.cwd(),
    maxTurns: 1,
  };

  // 添加服务地址配置
  if (CODEBUDDY_ENVIRONMENT) {
    promptConfig.environment = CODEBUDDY_ENVIRONMENT;
  } else if (CODEBUDDY_ENDPOINT) {
    promptConfig.endpoint = CODEBUDDY_ENDPOINT;
  }

  const result = await unstable_v2_prompt(contextPrompt, promptConfig);

  // 从 CodeBuddy 返回的结果中提取文本
  let text = '';
  if (result.type === 'result' && !result.is_error) {
    text = (result as any).result || '';
  } else if (result.type === 'result' && result.is_error) {
    throw new Error(`CodeBuddy Router 失败: ${(result as any).errors?.join(', ')}`);
  }

  const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? text);

  return {
    intent: json.intent as Intent,
    confidence: json.confidence ?? 1,
    reason: json.reason ?? '',
  };
}

// ─── 统一入口 ─────────────────────────────────────────────────────────────────

export async function route(
  userMessage: string,
  history: HistoryMessage[]
): Promise<RouteResult> {
  if (ROUTER_ENGINE === 'codebuddy') {
    console.log('[Router] 使用 CodeBuddy 引擎');
    return routeWithCodeBuddy(userMessage, history);
  } else {
    console.log('[Router] 使用 Claude 引擎');
    return routeWithClaude(userMessage, history);
  }
}
