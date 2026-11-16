// File ownership: phát hiện sớm các Task song song cùng đụng một file (giáo trình mục 5.4).
// So khớp mang tính BẢO THỦ: có thể báo trùng thừa (vd "src/*.ts" vs "src/a/b.ts"),
// nhưng không bỏ sót. Nên viết owned_files dạng "thư mục/**" hoặc đường dẫn file cụ thể.

const GLOB_CHARS = /[*?[{]/;

export const normalize = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/{2,}/g, '/');
export const hasGlob = (p) => GLOB_CHARS.test(p);
export function staticPrefix(p) {
  const i = p.search(GLOB_CHARS);
  return i === -1 ? p : p.slice(0, i);
}

/** Hai mẫu đường dẫn có thể cùng khớp một file không? */
export function patternsOverlap(a, b) {
  a = normalize(a); b = normalize(b);
  const ga = hasGlob(a), gb = hasGlob(b);
  if (!ga && !gb) return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`); // đường dẫn thuần có thể là thư mục
  if (ga && gb) {
    const pa = staticPrefix(a), pb = staticPrefix(b);
    return pa.startsWith(pb) || pb.startsWith(pa);
  }
  const [lit, glob] = ga ? [b, a] : [a, b];
  const prefix = staticPrefix(glob);
  return lit.startsWith(prefix) || prefix.startsWith(`${lit}/`);
}

/** Các cặp [a, b] trùng nhau giữa hai danh sách mẫu. */
export function ownedOverlap(filesA = [], filesB = []) {
  const pairs = [];
  for (const a of filesA) for (const b of filesB) if (patternsOverlap(a, b)) pairs.push([a, b]);
  return pairs;
}

/** Task `id` có phụ thuộc (trực tiếp hay gián tiếp) vào `target` không? */
export function dependsOn(tasks, id, target, seen = new Set()) {
  if (seen.has(id)) return false;
  seen.add(id);
  const t = tasks.find((x) => x.id === id);
  if (!t) return false;
  return (t.depends_on ?? []).some((d) => d === target || dependsOn(tasks, d, target, seen));
}

/**
 * Kiểm tra kế hoạch trước khi lập lịch.
 * errors: cặp Task có thể chạy song song nhưng trùng file (phải thêm depends_on hoặc tách file).
 * warnings: Task chưa khai báo owned_files (không kiểm chứng được phạm vi sửa).
 */
export function planCheck(tasks, { sharedFiles = [] } = {}) {
  const errors = [];
  const warnings = [];
  for (const t of tasks) {
    if (!(t.owned_files ?? []).length) warnings.push(`${t.id}: chưa khai báo owned_files`);
  }
  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      const a = tasks[i], b = tasks[j];
      if (dependsOn(tasks, a.id, b.id) || dependsOn(tasks, b.id, a.id)) continue; // đã tuần tự hóa qua DAG
      const pairs = ownedOverlap(a.owned_files, b.owned_files);
      if (!pairs.length) continue;
      const [pa, pb] = pairs[0];
      const shared = sharedFiles.find((s) => patternsOverlap(s, pa) && patternsOverlap(s, pb));
      errors.push(
        `${a.id} và ${b.id} có thể chạy song song nhưng cùng đụng "${pa}" ~ "${pb}"` +
        (shared ? ` (file dùng chung: ${shared})` : '') +
        ' → thêm depends_on hoặc tách file',
      );
    }
  }
  return { errors, warnings };
}

// ---- So khớp một đường dẫn cụ thể với mẫu glob (dùng cho hook chặn sửa file) ----
const escapeRe = (s) => s.replace(/[.+^$()|\\]/g, '\\$&');

/** Glob -> RegExp. Hỗ trợ: ** (nhiều cấp), * (trong một cấp), ?, {a,b}, [abc]. */
export function globToRegExp(pattern) {
  const p = normalize(pattern);
  let re = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '*') {
      if (p[i + 1] === '*') {
        i++;
        if (p[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*';
      } else re += '[^/]*';
    } else if (c === '?') {
      re += '[^/]';
    } else if (c === '{') {
      const j = p.indexOf('}', i);
      if (j === -1) re += '\\{';
      else { re += `(?:${p.slice(i + 1, j).split(',').map(escapeRe).join('|')})`; i = j; }
    } else if (c === '[') {
      const j = p.indexOf(']', i + 1);
      if (j === -1) re += '\\[';
      else { re += `[${p.slice(i + 1, j).replace(/^!/, '^')}]`; i = j; }
    } else {
      re += escapeRe(c);
    }
  }
  return new RegExp(`^${re}$`);
}

/** rel (đường dẫn tương đối, dùng /) có khớp mẫu không? Đường dẫn thuần được coi là file hoặc thư mục. */
export function matchesPattern(rel, pattern) {
  const r = normalize(rel);
  const pat = normalize(pattern);
  if (!hasGlob(pat)) return r === pat || r.startsWith(`${pat.replace(/\/$/, '')}/`);
  return globToRegExp(pat).test(r);
}

export const matchesAny = (rel, patterns = []) => patterns.some((p) => matchesPattern(rel, p));
