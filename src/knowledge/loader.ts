/**
 * 本地 markdown 知识库加载器
 */

import fs from 'fs';
import path from 'path';
import { config } from '../config';

export interface KnowledgeDoc {
  filePath: string;
  title: string;
  content: string;
}

function getKnowledgeDirs(): string[] {
  const raw = config.knowledgeDir;
  if (!raw) return ['./knowledge'];
  return (Array.isArray(raw) ? raw : [raw]).filter(Boolean);
}

let cachedDocs: KnowledgeDoc[] | null = null;

export function loadDocs(): KnowledgeDoc[] {
  if (cachedDocs) return cachedDocs;

  const dirs = getKnowledgeDirs();
  const docs: KnowledgeDoc[] = [];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      console.warn(`[knowledge] 知识库目录不存在: ${dir}`);
      continue;
    }
    collectMarkdown(dir, docs);
  }

  console.log(`[knowledge] 加载了 ${docs.length} 个文档 (目录: ${dirs.join(', ')})`);
  cachedDocs = docs;
  return docs;
}

function collectMarkdown(dir: string, docs: KnowledgeDoc[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectMarkdown(fullPath, docs);
    } else if (entry.name.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const title = extractTitle(entry.name, content);
      docs.push({ filePath: fullPath, title, content });
    }
  }
}

function extractTitle(filename: string, content: string): string {
  const match = content.match(/^#\s+(.+)/m);
  if (match) return match[1].trim();
  return filename.replace('.md', '');
}

/** 重新加载（手动触发） */
export function reloadDocs(): void {
  cachedDocs = null;
  loadDocs();
}
