/**
 * ngs-product-qa handler
 * 关键词检索本地 markdown，拼上下文后回答
 */

import { search } from '../knowledge/retriever';
import { Session, appendHistory } from '../session-store';
import { runCli } from '../cli-runner';
import { getHandlerConfig, loadPrompt } from '../config';

const DEFAULT_SYSTEM_PROMPT = `你是电销系统（NGS）的产品专家助手。
根据提供的知识库文档回答用户问题，回答要准确、简洁。
如果知识库中没有相关信息，如实告知用户，不要编造内容。`;

export async function handleProductQA(
  userMessage: string,
  session: Session
): Promise<string> {
  const handlerCfg = getHandlerConfig('productQa');

  const results = search(userMessage, 3);
  let knowledgeContext = '';
  if (results.length > 0) {
    knowledgeContext = '\n\n相关知识库文档：\n' +
      results.map(r => `【${r.doc.title}】\n${r.snippet}`).join('\n\n---\n\n');
  }

  let prompt = '';
  if (knowledgeContext) prompt += knowledgeContext + '\n\n';
  if (session.history.length > 0) {
    prompt += '对话历史：\n';
    for (const h of session.history.slice(-5)) {
      prompt += `${h.role === 'user' ? '用户' : '助手'}: ${h.content}\n`;
    }
    prompt += '\n';
  }
  prompt += `用户问题：${userMessage}`;

  console.log('[ProductQA] 使用 Claude CLI 引擎');
  const { text, sessionId } = await runCli({
    prompt,
    sessionId: session.sessionId,
    systemPrompt: loadPrompt('product-qa', DEFAULT_SYSTEM_PROMPT),
    cwd: handlerCfg.workingDir,
    allowedTools: handlerCfg.allowedTools || undefined,
    disallowedTools: handlerCfg.disallowedTools || undefined,
  });

  if (sessionId) session.sessionId = sessionId;

  appendHistory(session, 'user', userMessage);
  appendHistory(session, 'assistant', text);

  return text;
}
