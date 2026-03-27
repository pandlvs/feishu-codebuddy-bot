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
    max_tokens: 4096,
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
