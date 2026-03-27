/**
 * 意图分类器 - 使用 Claude CLI
 */

import { HistoryMessage, Intent } from './session-store';
import { runCli } from './cli-runner';
import { callApi } from './api-client';
import { config, getHandlerConfig, loadPrompt } from './config';

export interface RouteResult {
  intent: Intent;
  confidence: number;
  reason: string;
}

const DEFAULT_SYSTEM_PROMPT = `你是一个意图分类器，根据用户消息和对话历史判断用户意图。

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
  const handlerCfg = getHandlerConfig('router');

  let prompt = '';
  if (history.length > 0) {
    prompt += '对话历史（最近5条）：\n';
    for (const h of history.slice(-5)) {
      prompt += `${h.role === 'user' ? '用户' : '助手'}: ${h.content}\n`;
    }
    prompt += '\n';
  }
  prompt += `当前消息：${userMessage}\n\n请分析意图并返回 JSON。`;

  const systemPrompt = loadPrompt('router', DEFAULT_SYSTEM_PROMPT);
  let text: string;
  if (config.apiBaseUrl || config.apiKey) {
    console.log('[Router] 使用 API 引擎');
    text = await callApi({ systemPrompt, messages: [{ role: 'user', content: prompt }] });
  } else {
    console.log('[Router] 使用 Claude CLI 引擎');
    const result = await runCli({ prompt, systemPrompt, maxTurns: 1, cwd: handlerCfg.workingDir });
    text = result.text;
  }

  const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? text);

  return {
    intent: json.intent as Intent,
    confidence: json.confidence ?? 1,
    reason: json.reason ?? '',
  };
}
