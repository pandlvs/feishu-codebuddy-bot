/**
 * 飞书MCP客户端
 * 通过 @modelcontextprotocol/sdk 直连飞书远程 MCP 服务器（StreamableHTTP）
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const FEISHU_MCP_URL = process.env.FEISHU_MCP_URL;

if (!FEISHU_MCP_URL) {
  throw new Error('FEISHU_MCP_URL 未配置，请在 .env 中设置');
}

let client: Client | null = null;

async function getClient(): Promise<Client> {
  if (client) return client;

  const transport = new StreamableHTTPClientTransport(new URL(FEISHU_MCP_URL));
  client = new Client({ name: 'feishu-codebuddy-bot', version: '1.0.0' });
  await client.connect(transport);
  console.log('[FeishuMCP] 已连接到飞书远程MCP服务器');
  return client;
}

async function callFeishuMcp<T = any>(tool: string, args: Record<string, any>): Promise<T> {
  const c = await getClient();
  const result = await c.callTool({ name: tool, arguments: args });
  if (result.content && Array.isArray(result.content)) {
    const text = result.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }
  return result as unknown as T;
}

export interface FeishuMessage {
  message_id: string;
  chat_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  create_time: number;
  mentions: Array<{ id: string; name: string }>;
}

/**
 * 拉取指定群的最近消息，start_time 之后的消息
 */
export async function getMessagesFromChat(chatId: string, startTime: number): Promise<FeishuMessage[]> {
  try {
    const result = await callFeishuMcp<any>('im_v1_message_list', {
      query: {
        container_id_type: 'chat',
        container_id: chatId,
        start_time: String(startTime),
        sort_type: 'ByCreateTimeAsc',
        page_size: 50,
      },
    });

    const items: any[] = result?.items ?? result?.data?.items ?? [];
    console.log(`[FeishuMCP] 群 ${chatId} 拉取到 ${items.length} 条消息 (since=${startTime})`);
    return items.map((msg: any) => {
      // create_time 飞书返回的是毫秒级时间戳，统一转为秒级
      const rawTime = Number(msg.create_time ?? 0);
      const create_time = rawTime > 1e12 ? Math.floor(rawTime / 1000) : rawTime;
      return {
        message_id: msg.message_id,
        chat_id: chatId,
        sender_id: msg.sender?.id ?? '',
        sender_type: msg.sender?.sender_type ?? '',
        content: extractText(msg.body?.content),
        create_time,
        mentions: (msg.mentions ?? []).map((m: any) => ({
          id: m.id?.open_id ?? m.id ?? '',
          name: m.name ?? '',
        })),
      };
    });
  } catch (error) {
    console.error(`[FeishuMCP] 拉取群 ${chatId} 消息失败:`, error);
    return [];
  }
}

export async function sendMessage(chatId: string, content: string): Promise<string | undefined> {
  const result = await callFeishuMcp<any>('im_v1_message_create', {
    query: { receive_id_type: 'chat_id' },
    body: {
      receive_id: chatId,
      msg_type: 'text',
      content: JSON.stringify({ text: content }),
    },
  });
  const messageId = result?.data?.message_id ?? result?.message_id;
  console.log(`[FeishuMCP] 消息已发送到 chat ${chatId}, message_id=${messageId}`);
  return messageId;
}

function extractText(content: any): string {
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      return parsed.text ?? content;
    } catch {
      return content;
    }
  }
  return content?.text ?? JSON.stringify(content);
}

/** 列出飞书MCP服务器提供的所有工具（调试用） */
export async function listTools(): Promise<void> {
  const c = await getClient();
  const { tools } = await c.listTools();
  console.log('[FeishuMCP] 可用工具:');
  tools.forEach(t => console.log(`  - ${t.name}: ${t.description ?? ''}`));
}
