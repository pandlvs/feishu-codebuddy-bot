/**
 * general-qa handler
 * 回答普通问题
 */

import { Session, appendHistory } from '../session-store';
import { runCli } from '../cli-runner';
import { callApi } from '../api-client';
import { config, getHandlerConfig, loadPrompt } from '../config';

const DEFAULT_SYSTEM_PROMPT = `你是一个友好的 AI 助手，回答用户的各类问题。回答简洁、准确。`;

export async function handleGeneralQA(
  userMessage: string,
  session: Session
): Promise<string> {
  const handlerCfg = getHandlerConfig('generalQa');

  let prompt = '';
  if (session.history.length > 0) {
    prompt += '对话历史：\n';
    for (const h of session.history.slice(-5)) {
      prompt += `${h.role === 'user' ? '用户' : '助手'}: ${h.content}\n`;
    }
    prompt += '\n';
  }
  prompt += `用户问题：${userMessage}`;

  const systemPrompt = loadPrompt('general-qa', DEFAULT_SYSTEM_PROMPT);
  let text: string;

  if (config.apiBaseUrl || config.apiKey) {
    console.log('[GeneralQA] 使用 API 引擎');
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...session.history.slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: userMessage },
    ];
    text = await callApi({ systemPrompt, messages });
  } else {
    console.log('[GeneralQA] 使用 Claude CLI 引擎');
    const result = await runCli({
      prompt,
      sessionId: session.sessionId,
      systemPrompt,
      cwd: handlerCfg.workingDir,
      allowedTools: handlerCfg.allowedTools || undefined,
      disallowedTools: handlerCfg.disallowedTools || undefined,
    });
    if (result.sessionId) session.sessionId = result.sessionId;
    text = result.text;
  }

  appendHistory(session, 'user', userMessage);
  appendHistory(session, 'assistant', text);

  return text;
}
