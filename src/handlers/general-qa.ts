/**
 * general-qa handler
 * 回答普通问题
 * 配置了 intellijMcpUrl 时，额外提供代码搜索/导航工具
 */

import { Session, appendHistory } from '../session-store';
import { runCli } from '../cli-runner';
import { callApi, callApiWithTools, ToolDefinition } from '../api-client';
import { config, getHandlerConfig, loadPrompt } from '../config';
import { getIntellijTools, callIntellijTool } from '../intellij-mcp-client';

const DEFAULT_SYSTEM_PROMPT = `你是一个友好的 AI 助手，回答用户的各类问题。回答简洁、准确。
如果问题涉及代码，可以使用代码搜索工具查找相关实现后再回答。

使用代码工具的策略：
1. 先用 ide_find_class 或 ide_search_text 定位相关类/接口
2. 再用 ide_find_definition 查看具体实现
3. 必要时用 ide_find_references 了解调用方式`;

export async function handleGeneralQA(
  userMessage: string,
  session: Session
): Promise<{ reply: string; engine: string }> {
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
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...session.history.slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: userMessage },
    ];

    if (config.intellijMcpUrl) {
      console.log('[GeneralQA] 使用 API + IntelliJ 工具引擎');
      const intellijTools = await getIntellijTools();
      const tools: ToolDefinition[] = intellijTools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      }));
      text = await callApiWithTools({
        systemPrompt,
        messages,
        tools,
        executeTool: (name, input) => callIntellijTool(name, input),
      });
    } else {
      console.log('[GeneralQA] 使用 API 引擎');
      text = await callApi({ systemPrompt, messages });
    }
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

  const engine = !(config.apiBaseUrl || config.apiKey) ? 'CLI'
    : config.intellijMcpUrl ? 'API+IntelliJ'
    : 'API';
  return { reply: text, engine };
}
