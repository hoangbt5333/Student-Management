import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function runStep(name, command) {
  console.log(`\n⏳ [Step] ${name}...`);
  try {
    execSync(command, { stdio: 'inherit', shell: true });
    console.log(`✔ [Step] ${name}: PASSED`);
    return true;
  } catch (error) {
    console.error(`❌ [Step] ${name}: FAILED (exit code: ${error.status})`);
    return false;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let spec = null;
  for (const arg of args) {
    if (arg.startsWith('--spec=')) {
      spec = arg.split('=')[1].replace(/['"]/g, '');
    } else if (arg.endsWith('.spec.ts')) {
      spec = arg;
    }
  }
  return { spec };
}

function verifyTestResults() {
  const reportPath = path.resolve('artifacts/test-results.json');
  if (!fs.existsSync(reportPath)) {
    console.error('❌ Test report artifacts/test-results.json was not generated.');
    return false;
  }

  try {
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    if (!data.success || data.numFailedTests > 0 || data.numTotalTests === 0) {
      console.error(
        `❌ Test report indicates failure: total=${data.numTotalTests}, passed=${data.numPassedTests}, failed=${data.numFailedTests}`
      );
      return false;
    }
    console.log(
      `✔ Test report verified: ${data.numPassedTests}/${data.numTotalTests} tests passed.`
    );
    return true;
  } catch (err) {
    console.error(`❌ Failed to read or parse artifacts/test-results.json: ${err.message}`);
    return false;
  }
}

function main() {
  console.log('=============================================');
  console.log('🚀 STEP 5: AUTOMATED VALIDATION (DETERMINISTIC)');
  console.log('=============================================');

  const { spec } = parseArgs();

  // 1. Architecture Boundary Checks
  if (!runStep('Architecture Boundary Checks', 'node scripts/check-architecture.mjs')) {
    process.exit(1);
  }

  // 2. TypeScript Type Checking
  if (!runStep('TypeScript Type Check (tsc --noEmit)', 'npx tsc --noEmit')) {
    process.exit(1);
  }

  // 3. Unit Tests (Targeted or Full)
  const testCmd = spec
    ? `npm run test:ci -- --include='${spec}'`
    : 'npm run test:ci';

  if (!runStep(`Unit Test Execution (${spec || 'All Tests'})`, testCmd)) {
    process.exit(1);
  }

  // 4. Verify JSON Artifact Evidence
  if (!verifyTestResults()) {
    process.exit(1);
  }

  console.log('\n=============================================');
  console.log('🎉 ALL AUTOMATED VALIDATION CHECKS PASSED!');
  console.log('✔ Architecture: OK');
  console.log('✔ Type Check: OK');
  console.log('✔ Unit Tests & Evidence: OK');
  console.log('=============================================\n');
  process.exit(0);
}

main();
