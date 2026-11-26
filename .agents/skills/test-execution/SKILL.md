---
name: test-execution
description: Standardized test execution, result verification, and evidence reporting for all development agents.
---

# Test Execution Protocol

## 1. Canonical Test Execution
- Always use the project's canonical test command:
  - Run all tests: `npm run test:ci`
  - Run specific spec file: `npm run test:ci -- --include='<path-to-spec>'`
- Never invent custom test commands or alternative flags without explicit technical reason.
- Do not assume build completion (`Application bundle generation complete`) means test completion. Always verify the test execution summary or report.

## 2. Test Verification & Status
Tests automatically output a machine-readable JSON report to `artifacts/test-results.json`.
A test run is considered **TEST_PASSED** only when:
1. The process exit code is 0.
2. `artifacts/test-results.json` exists and confirms `"success": true` with `numFailedTests: 0`.
3. At least one test has been executed (`numTotalTests > 0`).

Status Taxonomy:
- **TEST_PASSED**: Process exited with 0 and all tests passed.
- **TEST_FAILED**: At least one test failed.
- **TEST_TIMEOUT**: Execution exceeded time limit.
- **TEST_UNKNOWN**: No report or verifiable result captured.

## 3. Retry Policy
- Never retry blindly by switching commands between `npm`, `ng`, and `cmd.exe`.
- Inspect `artifacts/test-results.json` first before retrying.
- Maximum ONE retry allowed only for a clear, justified environmental/infrastructure glitch.
- If results remain inconclusive, report `TEST_UNKNOWN` instead of looping.

## 4. Reporting
When reporting test results to Lead Orchestrator or Reviewer, always state:
- Executed command
- Tests passed / failed count
- Test report status (`artifacts/test-results.json`)
- Final verdict (`TEST_PASSED` or `TEST_FAILED`)
