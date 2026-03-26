/**
 * general-qa handler
 * 回答普通问题
 */

import { Session, appendHistory } from '../session-store';
import { runCli } from '../cli-runner';
import { getHandlerConfig, loadPrompt } from '../config';

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

  console.log('[GeneralQA] 使用 Claude CLI 引擎');
  const { text, sessionId } = await runCli({
    prompt,
    sessionId: session.sessionId,
    systemPrompt: loadPrompt('general-qa', DEFAULT_SYSTEM_PROMPT),
    cwd: handlerCfg.workingDir,
    allowedTools: handlerCfg.allowedTools || undefined,
    disallowedTools: handlerCfg.disallowedTools || undefined,
  });

  if (sessionId) session.sessionId = sessionId;

  appendHistory(session, 'user', userMessage);
  appendHistory(session, 'assistant', text);

  return text;
}
