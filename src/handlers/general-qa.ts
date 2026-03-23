/**
 * general-qa handler
 * 回答普通问题
 * 支持两种引擎：Claude API 或 CodeBuddy SDK
 */

import Anthropic from '@anthropic-ai/sdk';
import { unstable_v2_createSession, unstable_v2_resumeSession } from '@tencent-ai/agent-sdk';
import { Session, appendHistory } from '../session-store';

const GENERAL_QA_ENGINE = process.env.GENERAL_QA_ENGINE || process.env.QA_ENGINE || 'claude';
const WORKING_DIR = process.env.WORKING_DIR || process.cwd();

// CodeBuddy 服务地址配置
const CODEBUDDY_ENVIRONMENT = process.env.CODEBUDDY_ENVIRONMENT as 'external' | 'internal' | 'ioa' | 'cloudhosted' | undefined;
const CODEBUDDY_ENDPOINT = process.env.CODEBUDDY_ENDPOINT;

const SYSTEM_PROMPT = `你是一个友好的 AI 助手，回答用户的各类问题。回答简洁、准确。`;

// ─── Claude 引擎 ──────────────────────────────────────────────────────────────

const claudeClient = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
  baseURL: process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com',
});

const QA_MODEL = process.env.CLAUDE_QA_MODEL || 'claude-sonnet-4-6';

async function handleWithClaude(
  userMessage: string,
  session: Session
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [];

  for (const h of session.history.slice(-5)) {
    messages.push({ role: h.role, content: h.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const response = await claudeClient.messages.create({
    model: QA_MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages,
  });

  return response.content
    .filter(b => b.type === 'text')
    .map(b => (b as any).text)
    .join('');
}

// ─── CodeBuddy 引擎 ───────────────────────────────────────────────────────────

async function handleWithCodeBuddy(
  userMessage: string,
  session: Session
): Promise<string> {
  // 构建完整 prompt
  let fullPrompt = SYSTEM_PROMPT + '\n\n';

  if (session.history.length > 0) {
    fullPrompt += '对话历史：\n';
    for (const h of session.history.slice(-5)) {
      fullPrompt += `${h.role === 'user' ? '用户' : '助手'}: ${h.content}\n`;
    }
    fullPrompt += '\n';
  }

  fullPrompt += `用户问题：${userMessage}`;

  // 构建 session 配置
  const sessionConfig: any = {
    cwd: WORKING_DIR,
    systemPrompt: SYSTEM_PROMPT,
  };

  // 添加服务地址配置
  if (CODEBUDDY_ENVIRONMENT) {
    sessionConfig.environment = CODEBUDDY_ENVIRONMENT;
  } else if (CODEBUDDY_ENDPOINT) {
    sessionConfig.endpoint = CODEBUDDY_ENDPOINT;
  }

  const codeBuddySession = session.sessionId
    ? unstable_v2_resumeSession(session.sessionId, sessionConfig)
    : unstable_v2_createSession(sessionConfig);

  await codeBuddySession.send(fullPrompt);

  let result = '';
  for await (const msg of codeBuddySession.stream()) {
    if (msg.type === 'assistant' && msg.message?.content) {
      for (const block of msg.message.content) {
        if ((block as any).type === 'text') result += (block as any).text + '\n';
      }
    }
  }

  session.sessionId = codeBuddySession.sessionId;
  codeBuddySession.close();

  return result.trim();
}

// ─── 统一入口 ─────────────────────────────────────────────────────────────────

export async function handleGeneralQA(
  userMessage: string,
  session: Session
): Promise<string> {
  let answer: string;

  if (GENERAL_QA_ENGINE === 'codebuddy') {
    console.log('[GeneralQA] 使用 CodeBuddy 引擎');
    answer = await handleWithCodeBuddy(userMessage, session);
  } else {
    console.log('[GeneralQA] 使用 Claude 引擎');
    answer = await handleWithClaude(userMessage, session);
  }

  appendHistory(session, 'user', userMessage);
  appendHistory(session, 'assistant', answer);

  return answer;
}
