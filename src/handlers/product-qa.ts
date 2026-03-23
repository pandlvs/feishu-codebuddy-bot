/**
 * ngs-product-qa handler
 * 关键词检索本地 markdown，拼上下文后用 Claude 回答
 */

import Anthropic from '@anthropic-ai/sdk';
import { search } from '../knowledge/retriever';
import { Session, appendHistory } from '../session-store';

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
  baseURL: process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com',
});

const QA_MODEL = process.env.CLAUDE_QA_MODEL || 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `你是电销系统（NGS）的产品专家助手。
根据提供的知识库文档回答用户问题，回答要准确、简洁。
如果知识库中没有相关信息，如实告知用户，不要编造内容。`;

export async function handleProductQA(
  userMessage: string,
  session: Session
): Promise<string> {
  // 检索相关文档
  const results = search(userMessage, 3);

  let knowledgeContext = '';
  if (results.length > 0) {
    knowledgeContext = '\n\n相关知识库文档：\n' +
      results.map(r => `【${r.doc.title}】\n${r.snippet}`).join('\n\n---\n\n');
  }

  const messages: Anthropic.MessageParam[] = [];

  // 带入历史
  for (const h of session.history.slice(-5)) {
    messages.push({ role: h.role, content: h.content });
  }

  messages.push({
    role: 'user',
    content: userMessage + knowledgeContext,
  });

  const response = await client.messages.create({
    model: QA_MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages,
  });

  const answer = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as any).text)
    .join('');

  appendHistory(session, 'user', userMessage);
  appendHistory(session, 'assistant', answer);

  return answer;
}
