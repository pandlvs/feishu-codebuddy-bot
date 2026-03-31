/**
 * 文件关键字搜索
 * 当 intellijMcpUrl 未配置或不可用时，对 workingDir 下的代码文件做关键字搜索
 * 作为 IntelliJ MCP 的 fallback
 */

import fs from 'fs';
import path from 'path';

export interface FileSearchResult {
  filePath: string;
  matches: Array<{ line: number; text: string }>;
}

// 支持搜索的文件扩展名
const SEARCHABLE_EXTS = new Set([
  '.java', '.kt', '.scala',
  '.ts', '.tsx', '.js', '.jsx',
  '.py', '.go', '.rs',
  '.xml', '.yaml', '.yml', '.json', '.properties',
  '.md', '.txt',
]);

// 跳过的目录
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'target',
  '.idea', '.vscode', '__pycache__', '.gradle',
]);

/**
 * 在 rootDir 下递归搜索包含任意关键词的文件，返回匹配行
 * @param rootDir 搜索根目录
 * @param keywords 关键词列表
 * @param maxFiles 最多返回文件数（默认 5）
 * @param maxMatchesPerFile 每个文件最多返回匹配行数（默认 5）
 */
export function searchFiles(
  rootDir: string,
  keywords: string[],
  maxFiles = 5,
  maxMatchesPerFile = 5,
): FileSearchResult[] {
  if (!rootDir || !fs.existsSync(rootDir) || keywords.length === 0) return [];

  const kwLower = keywords.map(k => k.toLowerCase()).filter(k => k.length >= 2);
  if (kwLower.length === 0) return [];

  const results: Array<FileSearchResult & { score: number }> = [];
  collectFiles(rootDir, rootDir, kwLower, maxMatchesPerFile, results);

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles)
    .map(({ filePath, matches }) => ({ filePath, matches }));
}

function collectFiles(
  rootDir: string,
  dir: string,
  keywords: string[],
  maxMatchesPerFile: number,
  results: Array<FileSearchResult & { score: number }>,
): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectFiles(rootDir, fullPath, keywords, maxMatchesPerFile, results);
    } else if (entry.isFile() && SEARCHABLE_EXTS.has(path.extname(entry.name).toLowerCase())) {
      const result = searchInFile(fullPath, rootDir, keywords, maxMatchesPerFile);
      if (result) results.push(result);
    }
  }
}

function searchInFile(
  filePath: string,
  rootDir: string,
  keywords: string[],
  maxMatches: number,
): (FileSearchResult & { score: number }) | null {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }

  const lines = content.split('\n');
  const matches: Array<{ line: number; text: string }> = [];
  let score = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase();
    let lineScore = 0;
    for (const kw of keywords) {
      if (lineLower.includes(kw)) lineScore++;
    }
    if (lineScore > 0) {
      score += lineScore;
      if (matches.length < maxMatches) {
        matches.push({ line: i + 1, text: lines[i].trim() });
      }
    }
  }

  if (matches.length === 0) return null;

  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  return { filePath: relPath, matches, score };
}

/**
 * 将搜索结果格式化为可注入 prompt 的文本
 */
export function formatFileSearchResults(results: FileSearchResult[]): string {
  if (results.length === 0) return '';
  return '相关代码文件：\n' + results.map(r =>
    `【${r.filePath}】\n` +
    r.matches.map(m => `  L${m.line}: ${m.text}`).join('\n')
  ).join('\n\n');
}
