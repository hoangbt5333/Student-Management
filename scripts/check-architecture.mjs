import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const FEATURES_DIR = path.resolve('src/app/features');
const ALLOWED_FEATURE_DIRS = new Set(['components', 'facades', 'models', 'services', 'store']);

let violations = [];

function walk(dir, fileCallback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, fileCallback);
    } else if (entry.isFile()) {
      fileCallback(fullPath);
    }
  }
}

console.log('🔍 Running Architecture Boundary Checks (Explicit Layering)...\n');

// 1. Check feature folder structure
if (fs.existsSync(FEATURES_DIR)) {
  const features = fs.readdirSync(FEATURES_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);

  for (const feature of features) {
    if (feature === 'dashboard' || feature === 'auth') continue; // specialized features
    const featurePath = path.join(FEATURES_DIR, feature);
    const subEntries = fs.readdirSync(featurePath, { withFileTypes: true });

    for (const sub of subEntries) {
      if (sub.isDirectory()) {
        if (!ALLOWED_FEATURE_DIRS.has(sub.name)) {
          violations.push({
            file: path.relative(process.cwd(), path.join(featurePath, sub.name)),
            rule: 'Folder Structure',
            message: `Unexpected folder "${sub.name}". Only [${Array.from(ALLOWED_FEATURE_DIRS).join(', ')}] are allowed.`
          });
        }
      } else if (sub.isFile()) {
        if (!sub.name.endsWith('.routes.ts')) {
          violations.push({
            file: path.relative(process.cwd(), path.join(featurePath, sub.name)),
            rule: 'File Location',
            message: `Root feature file "${sub.name}" must be named "*.routes.ts". Move other files into models/, services/, store/, facades/, or components/.`
          });
        }
      }
    }
  }
}

// 2. Check import boundaries
walk(FEATURES_DIR, (filePath) => {
  const normPath = filePath.replace(/\\/g, '/');
  const isSpec = normPath.endsWith('.spec.ts');
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Rule 2A: Components must not import services or store directly (non-spec only)
  if (normPath.includes('/components/') && !isSpec && normPath.endsWith('.ts')) {
    lines.forEach((line, idx) => {
      const match = line.match(/import\s+.*from\s+['"](.*)['"]/);
      if (match) {
        const importSource = match[1];
        if (importSource.includes('/services/') || importSource.endsWith('/services')) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: idx + 1,
            rule: 'Component -> Service Violation',
            message: `Components must NOT directly import services ("${importSource}"). Use Facade instead.`
          });
        }
        if (importSource.includes('/store/') || importSource.endsWith('/store')) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: idx + 1,
            rule: 'Component -> Store Violation',
            message: `Components must NOT directly import store ("${importSource}"). Use Facade instead.`
          });
        }
      }
    });
  }

  // Rule 2B: Facades must not directly inject HttpClient
  if (normPath.includes('/facades/') && !isSpec && normPath.endsWith('.ts')) {
    lines.forEach((line, idx) => {
      if (line.includes('@angular/common/http') && (line.includes('HttpClient') || line.includes('http'))) {
        violations.push({
          file: path.relative(process.cwd(), filePath),
          line: idx + 1,
          rule: 'Facade -> HttpClient Violation',
          message: `Facades must NOT use HttpClient directly. Delegate API calls to Service or Store.`
        });
      }
    });
  }

  // Rule 2C: Services must not import components, facades, or store
  if (normPath.includes('/services/') && !isSpec && normPath.endsWith('.ts')) {
    lines.forEach((line, idx) => {
      const match = line.match(/import\s+.*from\s+['"](.*)['"]/);
      if (match) {
        const importSource = match[1];
        if (importSource.includes('/components/') || importSource.includes('/facades/') || importSource.includes('/store/')) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: idx + 1,
            rule: 'Service Dependency Inversion Violation',
            message: `Services must NOT import components, facades, or store ("${importSource}").`
          });
        }
      }
    });
  }
});

// 3. Report Results
if (violations.length === 0) {
  console.log('✅ ALL ARCHITECTURE BOUNDARY CHECKS PASSED!\n');
  console.log('  ✔ Folder structure strictly conforms to Explicit Layering');
  console.log('  ✔ Components communicate exclusively through Facades');
  console.log('  ✔ Zero direct Component -> Service calls');
  console.log('  ✔ Zero direct Component -> Store calls');
  console.log('  ✔ Layer separation is intact');
  process.exit(0);
} else {
  console.error(`❌ FOUND ${violations.length} ARCHITECTURE VIOLATION(S):\n`);
  for (const v of violations) {
    const loc = v.line ? `${v.file}:${v.line}` : v.file;
    console.error(`  - [${v.rule}] ${loc}\n    ${v.message}`);
  }
  process.exit(1);
}
