/**
 * ngs-product-qa handler
 * 关键词检索本地 markdown，拼上下文后回答
 * 配置了 intellijMcpUrl 时，额外提供代码搜索/导航工具
 */

import { search } from '../knowledge/retriever';
import { Session, appendHistory } from '../session-store';
import { runCli } from '../cli-runner';
import { callApi, callApiWithTools, ToolDefinition } from '../api-client';
import { config, getHandlerConfig, loadPrompt } from '../config';
import { getIntellijTools, callIntellijTool } from '../intellij-mcp-client';

const DEFAULT_SYSTEM_PROMPT = `你是电销系统（NGS）的产品专家助手。
根据提供的知识库文档回答用户问题，回答要准确、简洁。
如果知识库中没有相关信息，可以使用代码搜索工具查找相关实现。
如果工具和知识库都没有相关信息，如实告知用户，不要编造内容。

使用代码工具的策略：
1. 先用 ide_find_class 或 ide_search_text 定位相关类/接口
2. 再用 ide_find_definition 查看具体实现
3. 必要时用 ide_find_references 了解调用方式`;

export async function handleProductQA(
  userMessage: string,
  session: Session
): Promise<{ reply: string; engine: string }> {
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

  const systemPrompt = loadPrompt('product-qa', DEFAULT_SYSTEM_PROMPT);
  let text: string;

  if (config.apiBaseUrl || config.apiKey) {
    const userContent = knowledgeContext
      ? `${knowledgeContext}\n\n用户问题：${userMessage}`
      : `用户问题：${userMessage}`;
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...session.history.slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: userContent },
    ];

    if (config.intellijMcpUrl) {
      console.log('[ProductQA] 使用 API + IntelliJ 工具引擎');
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
      console.log('[ProductQA] 使用 API 引擎');
      text = await callApi({ systemPrompt, messages });
    }
  } else {
    console.log('[ProductQA] 使用 Claude CLI 引擎');
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
