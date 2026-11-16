// Chính sách chặn lệnh Bash nguy hiểm (thuần hàm, dễ test). Hook guard-bash.mjs chỉ là lớp vỏ.
// Nguyên tắc: không chắc thì CHẶN. Đây là lớp kiểm tra thứ hai, không thay cho permissions deny
// trong settings.json: so khớp chuỗi luôn có kẽ hở (alias git, script tự viết, curl | bash...).
import { basename, relative, resolve, isAbsolute } from 'node:path';

const MAX_DEPTH = 5;
const ALLOW = { allow: true };
const deny = (reason) => ({ allow: false, reason });

// Phần của khung / bằng chứng mà Agent không được xóa (đường dẫn gốc đầu tiên so với cwd)
export const PROTECTED = ['.git', '.claude', 'orchestrator', 'state', 'logs', 'project.config.json'];

const WRAPPERS = new Set(['env', 'command', 'nice', 'nohup', 'time', 'exec', 'xargs', 'timeout', 'stdbuf', 'builtin', 'setsid']);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh']);
const WIN_SHELLS = new Set(['cmd', 'cmd.exe', 'powershell', 'powershell.exe', 'pwsh', 'pwsh.exe']);
const DELETE_CMDS = new Set(['rm', 'unlink', 'del', 'del.exe', 'erase', 'erase.exe', 'rmdir', 'rmdir.exe', 'rd', 'rd.exe', 'remove-item', 'ri']);
const PRIVILEGE = new Set(['sudo', 'su', 'doas']);
// Tách lệnh theo ; && || | xuống dòng và & (không tách 2>&1, &>)
const SEGMENT_SPLIT = /&&|\|\||;|\||\n|(?<![>&])&(?![>&])/;

export function tokenize(s) {
  const tokens = [];
  let cur = '';
  let quote = null;
  let started = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === '\\' && quote === '"' && i + 1 < s.length) cur += s[++i];
      else cur += c;
      continue;
    }
    if (c === "'" || c === '"') { quote = c; started = true; continue; }
    if (c === '\\' && i + 1 < s.length) {
      const next = s[i + 1];
      if (cur !== '' && /[A-Za-z0-9_.\-]/.test(next)) {
        // Dấu phân cách thư mục trên Windows (ví dụ state\E1.json)
        cur += '/' + s[++i];
        started = true;
        continue;
      }
      cur += s[++i];
      started = true;
      continue;
    }
    if (/\s/.test(c)) {
      if (cur !== '' || started) { tokens.push(cur); cur = ''; started = false; }
      continue;
    }
    cur += c;
  }
  if (cur !== '' || started) tokens.push(cur);
  return tokens;
}

function gitSubcommand(args) {
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path'].includes(a)) { i += 2; continue; }
    if (a.startsWith('-')) { i++; continue; }
    return { sub: a, rest: args.slice(i + 1) };
  }
  return null;
}

function checkGit(args) {
  const parsed = gitSubcommand(args);
  if (!parsed) return ALLOW;
  const { sub, rest } = parsed;
  const HUMAN = 'Hành động này cần người duyệt: hãy dừng và báo Orchestrator/người dùng, không tự thực hiện.';
  if (sub === 'push') return deny(`git push bị cấm. ${HUMAN}`);
  if (sub === 'reset' && rest.includes('--hard')) return deny(`git reset --hard bị cấm (mất công việc chưa lưu). ${HUMAN}`);
  if (sub === 'clean' && rest.some((a) => a === '--force' || /^-[a-zA-Z]*f/.test(a))) return deny(`git clean -f bị cấm. ${HUMAN}`);
  if (sub === 'branch' && rest.some((a) => a === '--delete' || /^-[a-zA-Z]*[dD][a-zA-Z]*$/.test(a))) return deny(`Xóa nhánh bị cấm. ${HUMAN}`);
  return ALLOW;
}

function checkDelete(prog, args, cwd) {
  const targets = [];
  let optionsDone = false;
  for (const a of args) {
    if (!optionsDone && a === '--') { optionsDone = true; continue; }
    // Bỏ qua option dạng -flag hoặc /flag của Windows cmd (/f, /s, /q)
    if (!optionsDone && (a.startsWith('-') || (/^[\\/][a-zA-Z]/i.test(a) && a.length <= 4))) continue;
    targets.push(a);
  }
  for (const t of targets) {
    if (/[$`]/.test(t) || t.startsWith('~') || /%[A-Za-z0-9_]+%/.test(t)) {
      return deny(`${prog} với đường dẫn "${t}" không kiểm chứng được (biến/~). Dùng đường dẫn tường minh trong thư mục làm việc.`);
    }
    if (/(^|[\\/])\.\*/.test(t)) return deny(`${prog} với mẫu "${t}" có thể khớp ".." — bị cấm.`);
    const abs = resolve(cwd, t);
    const rel = relative(cwd, abs);
    if (rel === '') return deny(`${prog} chính thư mục làm việc bị cấm.`);
    if (rel.startsWith('..') || isAbsolute(rel)) return deny(`${prog} "${t}" nằm ngoài thư mục làm việc (${cwd}).`);
    const top = rel.split(/[\\/]/)[0];
    if (PROTECTED.includes(top)) return deny(`${prog} "${t}" động tới "${top}" (thuộc khung/bằng chứng) — bị cấm.`);
  }
  return ALLOW;
}

function evaluateTokens(tokens, ctx, depth) {
  let t = tokens.slice();
  for (let guard = 0; guard < 20; guard++) {
    while (t.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(t[0])) t.shift(); // VAR=val git ...
    if (!t.length) return ALLOW;
    const prog = basename(t[0]);
    if (!WRAPPERS.has(prog)) break;
    t = t.slice(1);
    while (t.length && (t[0].startsWith('-') || /^\d+[smhd]?$/.test(t[0]) || /^[A-Za-z_][A-Za-z0-9_]*=/.test(t[0]))) t.shift();
  }
  if (!t.length) return ALLOW;
  const prog = basename(t[0]);
  const progLower = prog.toLowerCase();
  const args = t.slice(1);

  if (PRIVILEGE.has(progLower)) return deny(`${prog} bị cấm (quyền tối thiểu).`);
  if (SHELLS.has(progLower)) {
    const i = args.findIndex((a) => /^-[a-zA-Z]*c[a-zA-Z]*$/.test(a));
    if (i !== -1 && args[i + 1] !== undefined) return evaluateString(args.slice(i + 1).join(' '), ctx, depth + 1);
    return ALLOW;
  }
  if (WIN_SHELLS.has(progLower)) {
    if (progLower.startsWith('cmd')) {
      const i = args.findIndex((a) => /^[\\/][cCkK]$/.test(a));
      if (i !== -1 && args[i + 1] !== undefined) {
        return evaluateString(args.slice(i + 1).join(' '), ctx, depth + 1);
      }
      return ALLOW;
    }
    // powershell / pwsh
    const i = args.findIndex((a) => /^[-/](?:command|c)$/i.test(a));
    if (i !== -1 && args[i + 1] !== undefined) {
      return evaluateString(args.slice(i + 1).join(' '), ctx, depth + 1);
    }
    return ALLOW;
  }
  if (progLower === 'eval') return evaluateString(args.join(' '), ctx, depth + 1);
  if (progLower === 'git' || progLower === 'git.exe') return checkGit(args);
  if (DELETE_CMDS.has(progLower)) return checkDelete(prog, args, ctx.cwd);
  return ALLOW;
}

function evaluateString(str, ctx, depth) {
  if (depth > MAX_DEPTH) return deny('lệnh lồng quá sâu, không kiểm chứng được.');
  for (const m of str.matchAll(/\$\(([^()]*)\)|`([^`]*)`/g)) {
    const r = evaluateString(m[1] ?? m[2], ctx, depth + 1);
    if (!r.allow) return r;
  }
  for (const segment of str.split(SEGMENT_SPLIT)) {
    const tokens = tokenize(segment);
    if (!tokens.length) continue;
    const r = evaluateTokens(tokens, ctx, depth);
    if (!r.allow) return r;
  }
  return ALLOW;
}

/** command: chuỗi lệnh Bash; cwd: thư mục làm việc của lệnh. Trả về { allow, reason? }. */
export function evaluateBash(command, { cwd = process.cwd() } = {}) {
  return evaluateString(command, { cwd }, 0);
}
