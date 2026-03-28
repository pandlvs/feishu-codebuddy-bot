/**
 * IntelliJ Index MCP 客户端
 * 通过 SSE transport 连接，提供代码搜索/导航工具
 * 排除重构工具（ide_refactor_rename、ide_refactor_safe_delete）
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { config } from './config';

// 只读/导航工具白名单，排除重构类工具
const ALLOWED_TOOLS = new Set([
  'ide_find_definition',
  'ide_find_implementations',
  'ide_find_super_methods',
  'ide_find_references',
  'ide_call_hierarchy',
  'ide_type_hierarchy',
  'ide_find_class',
  'ide_find_file',
  'ide_search_text',
  'ide_diagnostics',
  'ide_index_status',
]);

export interface IntellijTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

let _client: Client | null = null;
let _tools: IntellijTool[] | null = null;

async function getClient(): Promise<Client> {
  if (_client) return _client;

  if (!config.intellijMcpUrl) {
    throw new Error('intellijMcpUrl 未配置');
  }

  const transport = new SSEClientTransport(new URL(config.intellijMcpUrl));
  _client = new Client({ name: 'feishu-codebuddy-bot', version: '1.0.0' });
  await _client.connect(transport);
  console.log('[IntellijMCP] 已连接到 IntelliJ Index MCP');
  return _client;
}

export async function getIntellijTools(): Promise<IntellijTool[]> {
  if (_tools) return _tools;

  const client = await getClient();
  const { tools } = await client.listTools();

  _tools = tools
    .filter(t => ALLOWED_TOOLS.has(t.name))
    .map(t => ({
      name: t.name,
      description: t.description ?? '',
      inputSchema: t.inputSchema as Record<string, any>,
    }));

  console.log(`[IntellijMCP] 可用工具: ${_tools.map(t => t.name).join(', ')}`);
  return _tools;
}

export async function callIntellijTool(name: string, input: Record<string, any>): Promise<string> {
  if (!ALLOWED_TOOLS.has(name)) {
    throw new Error(`工具 ${name} 不在允许列表中`);
  }

  // 如果配置了 project_path 且调用方没有传，自动注入
  if (config.intellijProjectPath && !input.project_path) {
    input = { ...input, project_path: config.intellijProjectPath };
  }

  const client = await getClient();
  console.log(`[IntellijMCP] 调用工具 ${name}`, JSON.stringify(input));

  const result = await client.callTool({ name, arguments: input });

  const text = Array.isArray(result.content)
    ? result.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
    : JSON.stringify(result);

  return text;
}
