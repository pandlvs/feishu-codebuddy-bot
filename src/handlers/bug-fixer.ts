/**
 * ngs-bug-fixer handler
 * 分析报错、给出修复方案，等用户确认后执行
 */

import { Session, appendHistory } from '../session-store';
import { runCli } from '../cli-runner';
import { getHandlerConfig, config, loadPrompt } from '../config';

const DEFAULT_SYSTEM_PROMPT = `你是电销系统（NGS）的测试问题修复助手。
用户会提供报错日志或问题描述，你需要：
1. 从 workspace 中找到相关代码进行分析
2. 给出详细的修复方案，包括需要修改哪些文件、如何修改
3. 在给出方案后，明确询问用户："以上是修复方案，是否确认执行？回复【确认】开始修复，回复【取消】放弃。"
4. 收到【确认】后才执行实际的代码修改
5. 收到【取消】则放弃修复`;

export async function handleBugFixer(
  userMessage: string,
  session: Session
): Promise<{ reply: string; newState: 'idle' | 'pending_confirmation'; sessionId?: string; engine: string }> {
  const handlerCfg = getHandlerConfig('bugFixer');
  const maxTurns = handlerCfg.maxTurns ?? config.defaultMaxTurns ?? 10;
  const permissionMode = handlerCfg.permissionMode ?? config.defaultPermissionMode ?? 'acceptEdits';

  console.log('[BugFixer] 使用 Claude CLI 引擎');
  const { text, sessionId } = await runCli({
    prompt: userMessage,
    sessionId: session.sessionId,
    systemPrompt: loadPrompt('bug-fixer', DEFAULT_SYSTEM_PROMPT),
    cwd: handlerCfg.workingDir,
    maxTurns,
    permissionMode,
    allowedTools: handlerCfg.allowedTools || undefined,
    disallowedTools: handlerCfg.disallowedTools || undefined,
  });

  appendHistory(session, 'user', userMessage);
  appendHistory(session, 'assistant', text);

  const waitingConfirm = text.includes('确认执行') || text.includes('是否确认') || text.includes('回复【确认】');
  const newState = waitingConfirm ? 'pending_confirmation' : 'idle';

  return { reply: text, newState, sessionId, engine: 'CLI' };
}
