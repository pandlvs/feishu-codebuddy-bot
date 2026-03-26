/**
 * CLI Runner
 * 通过子进程调用 claude CLI，prompt 通过 stdin 传入
 */

import { spawn } from 'child_process';
import { config } from './config';

export interface CliRunOptions {
  prompt: string;
  sessionId?: string;
  systemPrompt?: string;
  cwd?: string;
  maxTurns?: number;
  permissionMode?: string;
  allowedTools?: string;
  disallowedTools?: string;
}

export interface CliRunResult {
  text: string;
  sessionId?: string;
}

export async function runCli(options: CliRunOptions): Promise<CliRunResult> {
  const { prompt, sessionId, systemPrompt, cwd, maxTurns, permissionMode, allowedTools, disallowedTools } = options;

  const cliPath = config.claudeCliPath || 'claude';
  const timeoutMs = config.cliTimeoutMs ?? 120000;
  const model = config.claudeCliModel;

  const args: string[] = ['-p', '--output-format', 'json'];

  if (sessionId) args.push('--resume', sessionId);
  if (systemPrompt) args.push('--system-prompt', systemPrompt);
  if (maxTurns !== undefined) args.push('--max-turns', String(maxTurns));
  if (permissionMode) args.push('--permission-mode', permissionMode);
  if (model) args.push('--model', model);
  if (allowedTools) args.push('--allowedTools', allowedTools);
  if (disallowedTools) args.push('--disallowedTools', disallowedTools);

  console.log(`[CLI] 启动 ${cliPath} ${args.join(' ')}`);

  const isWindows = process.platform === 'win32';
  const proc = spawn(cliPath, args, {
    cwd: cwd || process.cwd(),
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: isWindows,
  });

  proc.stdin.write(prompt, 'utf8');
  proc.stdin.end();

  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
  proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });

  await new Promise<void>((resolve, reject) => {
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
      reject(new Error(`[CLI] ${cliPath} 超时（${timeoutMs}ms）`));
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return;
      if (code !== 0) {
        console.error(`[CLI] ${cliPath} 退出码 ${code}，stderr: ${stderr.slice(0, 500)}`);
        reject(new Error(`[CLI] ${cliPath} 退出码 ${code}: ${stderr.slice(0, 200)}`));
      } else {
        resolve();
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`[CLI] 启动 ${cliPath} 失败: ${err.message}`));
    });
  });

  if (stderr) console.warn(`[CLI] ${cliPath} stderr: ${stderr.slice(0, 300)}`);

  let text = '';
  let newSessionId: string | undefined;

  console.log(`[CLI] ${cliPath} 原始输出: ${stdout.slice(0, 500)}`);

  try {
    const parsed = JSON.parse(stdout.trim());
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const json = arr.slice().reverse().find((item: any) => item.type === 'result') ?? arr[arr.length - 1];
    text = json.result ?? json.content ?? '';
    newSessionId = json.session_id;
  } catch {
    console.warn('[CLI] JSON 解析失败，使用原始输出');
    text = stdout.trim();
  }

  return { text, sessionId: newSessionId };
}
