/**
 * Anthropic API 客户端封装
 * 支持自定义 baseURL（兼容 CodeBuddy 等代理）
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from './config';

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: config.apiKey || 'placeholder',
      ...(config.apiAuthToken ? { authToken: config.apiAuthToken } : {}),
      ...(config.apiBaseUrl ? { baseURL: config.apiBaseUrl } : {}),
    });
  }
  return _client;
}

export interface ApiCallOptions {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function callApi(options: ApiCallOptions): Promise<string> {
  const client = getClient();
  const model = config.apiModel || 'claude-sonnet-4-6';

  let text = '';
  const stream = client.messages.stream({
    model,
    max_tokens: config.apiMaxTokens ?? 4096,
    system: options.systemPrompt,
    messages: options.messages,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      text += event.delta.text;
    }
  }

  return text;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, any>;
}

export interface ApiCallWithToolsOptions {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  tools: ToolDefinition[];
  executeTool: (name: string, input: Record<string, any>) => Promise<string>;
  maxIterations?: number;
}

/**
 * 带 tool use 循环的 API 调用
 * - tool use 阶段用普通 create（避免 streaming 下拼接 input_json_delta 的复杂性）
 * - 最终生成回答时用 stream
 */
export async function callApiWithTools(options: ApiCallWithToolsOptions): Promise<string> {
  const { systemPrompt, tools, executeTool, maxIterations = 10 } = options;
  const client = getClient();
  const model = config.apiModel || 'claude-sonnet-4-6';
  const maxTokens = config.apiMaxTokens ?? 4096;

  // 转成 SDK 需要的 messages 格式（支持 content 为数组）
  type SdkMessage = Anthropic.MessageParam;
  const messages: SdkMessage[] = options.messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  for (let i = 0; i < maxIterations; i++) {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      tools: tools as Anthropic.Tool[],
      messages,
    });

    if (response.stop_reason === 'end_turn') {
      // 提取文本内容直接返回
      const textBlock = response.content.find(b => b.type === 'text');
      return textBlock ? (textBlock as Anthropic.TextBlock).text : '';
    }

    if (response.stop_reason === 'tool_use') {
      // 把模型的回复加入 messages
      messages.push({ role: 'assistant', content: response.content });

      // 执行所有 tool_use block
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`[API] 调用工具 ${block.name}`, JSON.stringify(block.input));
          let result: string;
          try {
            result = await executeTool(block.name, block.input as Record<string, any>);
          } catch (err) {
            result = `工具调用失败: ${err instanceof Error ? err.message : String(err)}`;
          }
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // 其他 stop_reason（max_tokens 等），直接取文本返回
    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock ? (textBlock as Anthropic.TextBlock).text : '';
  }

  throw new Error(`[API] tool use 超过最大迭代次数 ${maxIterations}`);
}
