/**
 * 关键词检索
 * 对用户问题做简单分词，在文档标题和内容中匹配，按命中数排序返回 top-k
 */

import { KnowledgeDoc, loadDocs } from './loader';

export interface SearchResult {
  doc: KnowledgeDoc;
  score: number;
  snippet: string;
}

export function search(query: string, topK = 3): SearchResult[] {
  const docs = loadDocs();
  if (docs.length === 0) return [];

  const keywords = tokenize(query);
  if (keywords.length === 0) return [];

  const results: SearchResult[] = [];

  for (const doc of docs) {
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase();

    let score = 0;
    for (const kw of keywords) {
      // 标题命中权重更高
      if (titleLower.includes(kw)) score += 3;
      // 统计内容中出现次数
      const count = countOccurrences(contentLower, kw);
      score += count;
    }

    if (score > 0) {
      results.push({ doc, score, snippet: extractSnippet(doc.content, keywords) });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function tokenize(text: string): string[] {
  // 中英文混合分词：按空格、标点切分，过滤短词
  return text
    .toLowerCase()
    .split(/[\s，。？！、；：""''【】《》\(\)\[\],.?!;:()\-_/\\]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 2);
}

function countOccurrences(text: string, keyword: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(keyword, pos)) !== -1) {
    count++;
    pos += keyword.length;
  }
  return count;
}

function extractSnippet(content: string, keywords: string[], maxLen = 300): string {
  const lower = content.toLowerCase();
  let bestPos = -1;
  let bestScore = 0;

  // 找关键词密度最高的位置
  for (const kw of keywords) {
    const pos = lower.indexOf(kw);
    if (pos === -1) continue;
    const windowStart = Math.max(0, pos - 50);
    const window = lower.slice(windowStart, windowStart + maxLen);
    const score = keywords.reduce((s, k) => s + countOccurrences(window, k), 0);
    if (score > bestScore) {
      bestScore = score;
      bestPos = windowStart;
    }
  }

  if (bestPos === -1) return content.slice(0, maxLen);
  return content.slice(bestPos, bestPos + maxLen).trim() + '...';
}
