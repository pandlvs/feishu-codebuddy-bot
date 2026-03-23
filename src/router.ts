/**
 * 意图分类器
 * 用 Claude Haiku 对用户消息做轻量分类，带最近5条历史
 */

import Anthropic from '@anthropic-ai/sdk';
import { HistoryMessage, Intent } from './session-store';

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
  baseURL: process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com',
});

const ROUTER_MODEL = process.env.CLAUDE_ROUTER_MODEL || 'claude-haiku-4-5-20251001';

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

export async function route(
  userMessage: string,
  history: HistoryMessage[]
): Promise<RouteResult> {
  const messages: Anthropic.MessageParam[] = [];

  // 带入最近5条历史
  for (const h of history.slice(-5)) {
    messages.push({ role: h.role, content: h.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const response = await client.messages.create({
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
