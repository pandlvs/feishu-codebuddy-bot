/**
 * general-qa handler
 * 直接用 Claude 回答普通问题
 */

import Anthropic from '@anthropic-ai/sdk';
import { Session, appendHistory } from '../session-store';

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
  baseURL: process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com',
});

const QA_MODEL = process.env.CLAUDE_QA_MODEL || 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `你是一个友好的 AI 助手，回答用户的各类问题。回答简洁、准确。`;

export async function handleGeneralQA(
  userMessage: string,
  session: Session
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [];

  for (const h of session.history.slice(-5)) {
    messages.push({ role: h.role, content: h.content });
  }
  messages.push({ role: 'user', content: userMessage });

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
