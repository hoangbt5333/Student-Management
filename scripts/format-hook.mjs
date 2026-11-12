import fs from 'node:fs';
import path from 'node:path';
import prettier from 'prettier';

const SUPPORTED_EXTENSIONS = new Set([
  '.ts',
  '.js',
  '.mjs',
  '.cjs',
  '.html',
  '.scss',
  '.css',
  '.json',
]);

async function getTargetFilePath() {
  // 1. Check CLI arguments (for manual testing: node scripts/format-hook.mjs <file>)
  if (process.argv[2]) {
    return process.argv[2];
  }

  // 2. Check environment variable if Claude Code sets it
  if (process.env.CLAUDE_FILE_PATH) {
    return process.env.CLAUDE_FILE_PATH;
  }

  // 3. Read JSON payload from stdin
  if (!process.stdin.isTTY) {
    try {
      const chunks = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString('utf-8').trim();
      if (raw) {
        const payload = JSON.parse(raw);
        return (
          payload.tool_input?.file_path ||
          payload.tool_input?.filePath ||
          payload.tool_input?.path ||
          null
        );
      }
    } catch {
      // Inconsequential parse failure, safely ignore
    }
  }

  return null;
}

async function formatFile(filePath) {
  try {
    const resolvedPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(resolvedPath)) {
      return;
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      return;
    }

    // Skip git, node_modules, dist, and artifacts
    const normalized = resolvedPath.replace(/\\/g, '/');
    if (
      normalized.includes('/.git/') ||
      normalized.includes('/node_modules/') ||
      normalized.includes('/dist/') ||
      normalized.includes('/artifacts/')
    ) {
      return;
    }

    const content = fs.readFileSync(resolvedPath, 'utf-8');
    const options = (await prettier.resolveConfig(resolvedPath)) || {};

    const formatted = await prettier.format(content, {
      ...options,
      filepath: resolvedPath,
    });

    if (formatted !== content) {
      fs.writeFileSync(resolvedPath, formatted, 'utf-8');
      console.log(`[prettier-hook] Auto-formatted: ${path.relative(process.cwd(), resolvedPath)}`);
    }
  } catch (err) {
    // Never fail the tool execution due to formatting errors
    console.warn(`[prettier-hook] Skipped formatting: ${err.message}`);
  }
}

async function main() {
  const targetPath = await getTargetFilePath();
  if (targetPath) {
    await formatFile(targetPath);
  }
  process.exit(0);
}

main();
