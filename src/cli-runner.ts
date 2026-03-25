/**
 * CLI Runner
 * 通过子进程调用 claude 或 codebuddy CLI，prompt 通过 stdin 传入
 */

import { spawn } from 'child_process';

const CLAUDE_CLI_PATH = process.env.CLAUDE_CLI_PATH || 'claude';
const CODEBUDDY_CLI_PATH = process.env.CODEBUDDY_CLI_PATH || 'codebuddy';
const CLI_TIMEOUT_MS = Number(process.env.CLI_TIMEOUT_MS || 120000);

export interface CliRunOptions {
  tool: 'claude' | 'codebuddy';
  prompt: string;
  sessionId?: string;
  systemPrompt?: string;
  cwd?: string;
  maxTurns?: number;
  permissionMode?: string;
  model?: string;
}

export interface CliRunResult {
  text: string;
  sessionId?: string;
}

export async function runCli(options: CliRunOptions): Promise<CliRunResult> {
  const { tool, prompt, sessionId, systemPrompt, cwd, maxTurns, permissionMode, model } = options;

  const cliPath = tool === 'claude' ? CLAUDE_CLI_PATH : CODEBUDDY_CLI_PATH;

  const args: string[] = ['-p', '--output-format', 'json'];

  if (sessionId) {
    args.push('--resume', sessionId);
  }
  if (systemPrompt) {
    args.push('--system-prompt', systemPrompt);
  }
  if (maxTurns !== undefined) {
    args.push('--max-turns', String(maxTurns));
  }
  if (permissionMode) {
    args.push('--permission-mode', permissionMode);
  }
  if (model) {
    args.push('--model', model);
  }

  console.log(`[CLI] 启动 ${cliPath} ${args.join(' ')}`);

  const proc = spawn(cliPath, args, {
    cwd: cwd || process.cwd(),
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  proc.stdin.write(prompt, 'utf8');
  proc.stdin.end();

  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', (chunk: Buffer) => {
    stdout += chunk.toString('utf8');
  });

  proc.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf8');
  });

  await new Promise<void>((resolve, reject) => {
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
      reject(new Error(`[CLI] ${cliPath} 超时（${CLI_TIMEOUT_MS}ms）`));
    }, CLI_TIMEOUT_MS);

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

  if (stderr) {
    console.warn(`[CLI] ${cliPath} stderr: ${stderr.slice(0, 300)}`);
  }

  // 解析 JSON 输出
  let text = '';
  let newSessionId: string | undefined;

  try {
    const json = JSON.parse(stdout.trim());
    // claude/codebuddy --output-format json 返回 { result, session_id, ... }
    text = json.result ?? json.content ?? '';
    newSessionId = json.session_id;
  } catch {
    // 解析失败时直接用原始输出
    console.warn('[CLI] JSON 解析失败，使用原始输出');
    text = stdout.trim();
  }

  return { text, sessionId: newSessionId };
}
