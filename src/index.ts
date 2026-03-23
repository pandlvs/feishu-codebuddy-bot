/**
 * 飞书 CodeBuddy 机器人 - 轮询模式
 * 支持意图路由：ngs-product-qa / ngs-bug-fixer / general-qa
 * 支持两种群聊模式：individual（@触发，每人独立会话）/ shared（所有消息）
 */

import 'dotenv/config';
import { getMessagesFromChat, sendMessage, FeishuMessage } from './feishu-mcp-client';
import { route } from './router';
import { loadSession, saveSession, resetSession, appendHistory, Intent } from './session-store';
import { handleProductQA } from './handlers/product-qa';
import { handleBugFixer } from './handlers/bug-fixer';
import { handleGeneralQA } from './handlers/general-qa';

// ─── 配置 ────────────────────────────────────────────────────────────────────

const POLL_INTERVAL = Number(process.env.POLL_INTERVAL || 5000);
const WATCH_CHAT_IDS: string[] = (process.env.WATCH_CHAT_IDS || '')
  .split(',').map(s => s.trim()).filter(Boolean);
const ALLOWED_SENDER_IDS: string[] = (process.env.ALLOWED_SENDER_IDS || '')
  .split(',').map(s => s.trim()).filter(Boolean);
const BOT_OPEN_ID = process.env.BOT_OPEN_ID || '';
const DEFAULT_CHAT_MODE = (process.env.DEFAULT_CHAT_MODE || 'individual') as 'individual' | 'shared';
const OUT_OF_SCOPE_REPLY = process.env.OUT_OF_SCOPE_REPLY ||
  '抱歉，暂时还不支持，可以尝试把问题创建成飞书任务。';

if (WATCH_CHAT_IDS.length === 0) {
  console.error('❌ 未配置 WATCH_CHAT_IDS');
  process.exit(1);
}

function getChatMode(chatId: string): 'individual' | 'shared' {
  const val = process.env[`CHAT_MODE_${chatId}`];
  if (val === 'shared' || val === 'individual') return val;
  return DEFAULT_CHAT_MODE;
}

// 群能力配置：CHAT_CAPABILITIES_oc_xxx=ngs-product-qa,ngs-bug-fixer
// 不配置则支持所有意图
function getChatCapabilities(chatId: string): Intent[] | null {
  const val = process.env[`CHAT_CAPABILITIES_${chatId}`];
  if (!val) return null;
  return val.split(',').map(s => s.trim()) as Intent[];
}

// ─── 运行时状态 ───────────────────────────────────────────────────────────────

const chatLastTime: Map<string, number> = new Map(
  WATCH_CHAT_IDS.map(id => [id, Math.floor(Date.now() / 1000)])
);
const processedMessages = new Set<string>();
const botSentMessageIds = new Set<string>();
const chatQueues: Map<string, Promise<void>> = new Map();

async function trackSend(chatId: string, content: string): Promise<string | undefined> {
  const mid = await sendMessage(chatId, content).catch(e => {
    console.error(`[${chatId}] 发送消息失败:`, e);
    return undefined;
  });
  if (mid) botSentMessageIds.add(mid);
  return mid;
}

function formatReply(result: string, duration: string): string {
  let text = `[来自AI] ✅ (${duration}s)\n\n${result}`;
  if (text.length > 4000) text = text.slice(0, 3900) + '\n...(内容过长已截断)';
  return text;
}

// ─── 核心处理逻辑 ─────────────────────────────────────────────────────────────

async function dispatch(
  chatId: string,
  userId: string,
  content: string,
  isShared: boolean
): Promise<void> {
  const session = loadSession(chatId, userId);

  // /reset 指令
  if (content === '/reset' || content === '重置对话') {
    resetSession(chatId, userId);
    await trackSend(chatId, '[来自AI] ✅ 对话已重置');
    return;
  }

  // pending_confirmation 状态：跳过 Router，直接转发给当前 handler
  if (session.state === 'pending_confirmation' && session.currentIntent === 'ngs-bug-fixer') {
    console.log(`[${chatId}] 待确认状态，直接转发给 bug-fixer`);
    await trackSend(chatId, '⚙️ 正在处理...');
    const startTime = Date.now();
    try {
      const { reply, newState, sessionId } = await handleBugFixer(content, session);
      session.state = newState;
      if (sessionId) session.sessionId = sessionId;
      saveSession(chatId, userId, session);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      await trackSend(chatId, formatReply(reply, duration));
    } catch (error) {
      console.error(`[${chatId}] bug-fixer 处理失败:`, error);
      session.state = 'idle';
      session.sessionId = undefined;
      saveSession(chatId, userId, session);
      await trackSend(chatId,
        `[来自AI] ❌ 处理失败: ${error instanceof Error ? error.message : String(error)}\n\n会话已重置。`
      );
    }
    return;
  }

  // Router 分类（内网环境可能失败，使用默认意图）
  console.log(`[${chatId}] 路由分类中... (user=${userId})`);
  let intent: Intent;

  // 检查是否配置了默认意图（内网环境）
  const defaultIntent = process.env[`CHAT_DEFAULT_INTENT_${chatId}`] as Intent | undefined;

  if (defaultIntent) {
    intent = defaultIntent;
    console.log(`[${chatId}] 使用配置的默认意图: ${intent}`);
  } else {
    try {
      const routeResult = await route(content, session.history);
      intent = routeResult.intent;
      console.log(`[${chatId}] 路由结果: ${intent} (confidence=${routeResult.confidence}, reason=${routeResult.reason})`);
    } catch (error) {
      console.error(`[${chatId}] Router 调用失败:`, error);
      // Router 失败时使用 general-qa 作为 fallback
      intent = 'general-qa';
      console.log(`[${chatId}] Router 失败，使用 fallback 意图: ${intent}`);
    }
  }

  // 检查群能力范围
  const capabilities = getChatCapabilities(chatId);
  if (capabilities && !capabilities.includes(intent)) {
    console.log(`[${chatId}] 意图 ${intent} 超出群能力范围 ${capabilities.join(',')}`);
    await trackSend(chatId, `[来自AI] ${OUT_OF_SCOPE_REPLY}`);
    return;
  }

  await trackSend(chatId, '⚙️ 正在处理，请稍候...');
  const startTime = Date.now();

  try {
    let reply = '';

    if (intent === 'ngs-product-qa') {
      reply = await handleProductQA(content, session);
      session.currentIntent = intent;
      session.state = 'idle';
      saveSession(chatId, userId, session);

    } else if (intent === 'ngs-bug-fixer') {
      const result = await handleBugFixer(content, session);
      reply = result.reply;
      session.currentIntent = intent;
      session.state = result.newState;
      if (result.sessionId) session.sessionId = result.sessionId;
      saveSession(chatId, userId, session);

    } else {
      // general-qa
      reply = await handleGeneralQA(content, session);
      session.currentIntent = intent;
      session.state = 'idle';
      saveSession(chatId, userId, session);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    await trackSend(chatId, formatReply(reply, duration));
    console.log(`[${chatId}] 处理完成 intent=${intent} (${duration}s)`);

  } catch (error) {
    console.error(`[${chatId}] handler 处理失败 intent=${intent}:`, error);
    session.state = 'idle';
    session.sessionId = undefined;
    saveSession(chatId, userId, session);
    await trackSend(chatId,
      `[来自AI] ❌ 处理失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ─── 模式一：individual ───────────────────────────────────────────────────────

async function processIndividual(message: FeishuMessage): Promise<void> {
  const mentioned = message.mentions?.some(m => m.id === BOT_OPEN_ID);
  if (!mentioned) {
    console.log(`[${message.chat_id}] individual: 未 @机器人，跳过 (${message.message_id})`);
    return;
  }
  const content = message.content.replace(/@\S+/g, '').trim();
  if (!content) return;
  await dispatch(message.chat_id, message.sender_id, content, false);
}

// ─── 模式二：shared ───────────────────────────────────────────────────────────

async function processShared(message: FeishuMessage): Promise<void> {
  const rawContent = message.content.replace(/@\S+/g, '').trim();
  if (!rawContent) return;
  // 带发送者标识
  const content = `[${message.sender_id}]: ${rawContent}`;
  // shared 模式用 chatId 作为 userId（共享同一个 session 文件）
  await dispatch(message.chat_id, `__shared__`, content, true);
}

// ─── 消息入口 ────────────────────────────────────────────────────────────────

async function processMessage(message: FeishuMessage): Promise<void> {
  if (processedMessages.has(message.message_id)) return;
  processedMessages.add(message.message_id);

  if (botSentMessageIds.has(message.message_id)) {
    console.log(`[${message.chat_id}] 忽略 bot 自身消息 (${message.message_id})`);
    return;
  }

  if (ALLOWED_SENDER_IDS.length > 0 && !ALLOWED_SENDER_IDS.includes(message.sender_id)) {
    console.log(`[${message.chat_id}] 忽略消息 (sender ${message.sender_id} 不在白名单)`);
    return;
  }

  const mode = getChatMode(message.chat_id);
  if (mode === 'shared') {
    await processShared(message);
  } else {
    await processIndividual(message);
  }
}

// ─── 轮询 ────────────────────────────────────────────────────────────────────

async function pollLoop() {
  while (true) {
    for (const chatId of WATCH_CHAT_IDS) {
      try {
        const since = chatLastTime.get(chatId)!;
        console.log(`[poll] 拉取群 ${chatId} since=${since} (${new Date(since * 1000).toISOString()})`);
        const messages = await getMessagesFromChat(chatId, since);

        for (const message of messages) {
          console.log(`[poll] message_id=${message.message_id} create_time=${message.create_time} sender=${message.sender_id} already_processed=${processedMessages.has(message.message_id)}`);
          if (message.create_time > since) {
            chatLastTime.set(chatId, message.create_time);
          }
          const prev = chatQueues.get(chatId) ?? Promise.resolve();
          const next = prev.then(() => processMessage(message)).catch(err => {
            console.error(`[${chatId}] 消息处理异常:`, err);
          });
          chatQueues.set(chatId, next);
        }
      } catch (error) {
        console.error(`[${chatId}] 轮询异常:`, error);
      }
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
}

async function startWithRestart() {
  while (true) {
    try {
      await pollLoop();
    } catch (err) {
      console.error('轮询循环崩溃，5秒后重启:', err);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

console.log('🚀 飞书CodeBuddy机器人启动');
console.log(`   轮询间隔: ${POLL_INTERVAL}ms`);
console.log(`   默认模式: ${DEFAULT_CHAT_MODE}`);
console.log(`   监听群组: ${WATCH_CHAT_IDS.map(id => `${id}(${getChatMode(id)})`).join(', ')}`);
console.log(`   允许用户: ${ALLOWED_SENDER_IDS.length > 0 ? ALLOWED_SENDER_IDS.join(', ') : '所有人'}`);
console.log(`   机器人ID: ${BOT_OPEN_ID || '未配置'}`);
console.log('');

startWithRestart();

process.on('uncaughtException', (err) => { console.error('未捕获异常:', err); });
process.on('unhandledRejection', (reason) => { console.error('未处理的 Promise 拒绝:', reason); });
