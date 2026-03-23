/**
 * ngs-bug-fixer handler
 * 用 CodeBuddy Session 分析报错、给出修复方案，等用户确认后执行
 */

import { unstable_v2_createSession, unstable_v2_resumeSession } from '@tencent-ai/agent-sdk';
import { Session, appendHistory } from '../session-store';

const WORKING_DIR = process.env.WORKING_DIR || process.cwd();
const DEFAULT_PERMISSION_MODE = process.env.DEFAULT_PERMISSION_MODE || 'acceptEdits';
const DEFAULT_MAX_TURNS = Number(process.env.DEFAULT_MAX_TURNS || 10);

const SYSTEM_PROMPT = `你是电销系统（NGS）的测试问题修复助手。
用户会提供报错日志或问题描述，你需要：
1. 从 workspace 中找到相关代码进行分析
2. 给出详细的修复方案，包括需要修改哪些文件、如何修改
3. 在给出方案后，明确询问用户："以上是修复方案，是否确认执行？回复【确认】开始修复，回复【取消】放弃。"
4. 收到【确认】后才执行实际的代码修改
5. 收到【取消】则放弃修复`;

export async function handleBugFixer(
  userMessage: string,
  session: Session
): Promise<{ reply: string; newState: 'idle' | 'pending_confirmation'; sessionId?: string }> {
  const codeBuddySession = session.sessionId
    ? unstable_v2_resumeSession(session.sessionId, {
        cwd: WORKING_DIR,
        permissionMode: DEFAULT_PERMISSION_MODE as any,
        maxTurns: DEFAULT_MAX_TURNS,
        systemPrompt: SYSTEM_PROMPT,
      })
    : unstable_v2_createSession({
        cwd: WORKING_DIR,
        permissionMode: DEFAULT_PERMISSION_MODE as any,
        maxTurns: DEFAULT_MAX_TURNS,
        systemPrompt: SYSTEM_PROMPT,
      });

  await codeBuddySession.send(userMessage);

  let fullResult = '';
  for await (const msg of codeBuddySession.stream()) {
    if (msg.type === 'assistant' && msg.message?.content) {
      for (const block of msg.message.content) {
        if ((block as any).type === 'text') fullResult += (block as any).text + '\n';
      }
    }
  }

  const sessionId = codeBuddySession.sessionId;
  codeBuddySession.close();

  const reply = fullResult.trim();

  appendHistory(session, 'user', userMessage);
  appendHistory(session, 'assistant', reply);

  // 判断是否进入等待确认状态：回复中包含确认提示
  const waitingConfirm = reply.includes('确认执行') || reply.includes('是否确认') || reply.includes('回复【确认】');
  const newState = waitingConfirm ? 'pending_confirmation' : 'idle';

  return { reply, newState, sessionId };
}
