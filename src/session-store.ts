/**
 * 本地会话存储
 * 按 chatId + userId 隔离，存储在 sessions/{chatId}/{userId}.json
 */

import fs from 'fs';
import path from 'path';

const SESSIONS_DIR = process.env.SESSIONS_DIR || './sessions';
const MAX_HISTORY = 50;

export type Intent = 'ngs-product-qa' | 'ngs-bug-fixer' | 'general-qa';
export type SessionState = 'idle' | 'pending_confirmation';

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  time: number;
}

export interface Session {
  sessionId?: string;           // CodeBuddy session id（bug-fixer 用）
  currentIntent?: Intent;
  state: SessionState;
  history: HistoryMessage[];
}

function sessionPath(chatId: string, userId: string): string {
  return path.join(SESSIONS_DIR, chatId, `${userId}.json`);
}

export function loadSession(chatId: string, userId: string): Session {
  const p = sessionPath(chatId, userId);
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch {
      // 文件损坏，返回空会话
    }
  }
  return { state: 'idle', history: [] };
}

export function saveSession(chatId: string, userId: string, session: Session): void {
  const p = sessionPath(chatId, userId);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  // 只保留最近 MAX_HISTORY 条
  if (session.history.length > MAX_HISTORY) {
    session.history = session.history.slice(-MAX_HISTORY);
  }
  fs.writeFileSync(p, JSON.stringify(session, null, 2), 'utf-8');
}

export function appendHistory(session: Session, role: 'user' | 'assistant', content: string): void {
  session.history.push({ role, content, time: Math.floor(Date.now() / 1000) });
}

export function recentHistory(session: Session, n = 5): HistoryMessage[] {
  return session.history.slice(-n);
}

export function resetSession(chatId: string, userId: string): void {
  const p = sessionPath(chatId, userId);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
