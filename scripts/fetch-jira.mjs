#!/usr/bin/env node
/**
 * Script tải thông tin Jira Issue và tự động sinh tasks/<KEY>/00-ticket.md
 * Sử dụng:
 *   node scripts/fetch-jira.mjs PROJ-101
 * Yêu cầu biến môi trường:
 *   JIRA_URL (hoặc JIRA_HOST), JIRA_EMAIL, JIRA_API_TOKEN
 */

import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

const issueKey = process.argv[2];
if (!issueKey) {
  console.error('Cách dùng: node scripts/fetch-jira.mjs <JIRA-ISSUE-KEY>');
  process.exit(1);
}

const jiraUrl = process.env.JIRA_URL || process.env.JIRA_HOST;
const jiraEmail = process.env.JIRA_EMAIL;
const jiraToken = process.env.JIRA_API_TOKEN;

const taskDir = path.join(process.cwd(), 'tasks', issueKey);
const ticketFile = path.join(taskDir, '00-ticket.md');

// Nếu file đã tồn tại và không có credentials thì giữ nguyên
if (fs.existsSync(ticketFile) && (!jiraUrl || !jiraToken)) {
  console.log(`[Jira] Sử dụng file ticket có sẵn: ${ticketFile}`);
  process.exit(0);
}

if (!jiraUrl || !jiraEmail || !jiraToken) {
  console.warn('[Jira] Thiếu cấu hình JIRA_URL, JIRA_EMAIL, hoặc JIRA_API_TOKEN.');
  console.warn(`[Jira] Đang sử dụng chế độ offline/local cho ${issueKey}.`);
  if (!fs.existsSync(ticketFile)) {
    console.error(`[Lỗi] Không tìm thấy file ticket local tại ${ticketFile}. Vui lòng cấu hình Jira hoặc tạo file trước.`);
    process.exit(1);
  }
  process.exit(0);
}

const authHeader = 'Basic ' + Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
const cleanUrl = jiraUrl.replace(/\/+$/, '');
const endpoint = `${cleanUrl}/rest/api/3/issue/${issueKey}`;

console.log(`[Jira] Đang tải ticket ${issueKey} từ ${cleanUrl}...`);

try {
  const res = await fetch(endpoint, {
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`Jira API trả về mã lỗi ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const summary = data.fields?.summary || issueKey;
  const rawIssueType = data.fields?.issuetype?.name || 'Task';
  let ticketType = 'feature';
  const lower = rawIssueType.toLowerCase();
  if (lower.includes('bug') || lower.includes('defect') || lower.includes('lỗi')) {
    ticketType = 'bug';
  } else if (lower.includes('refactor') || lower.includes('clean') || lower.includes('debt') || lower.includes('cải tiến')) {
    ticketType = 'refactor';
  }
  
  // Trích xuất mô tả (hỗ trợ Atlassian Document Format hoặc text đơn giản)
  let descriptionText = '';
  if (typeof data.fields?.description === 'string') {
    descriptionText = data.fields.description;
  } else if (data.fields?.description?.content) {
    descriptionText = extractAdfText(data.fields.description.content);
  }

  const markdownContent = `# ${issueKey}: ${summary}

Loại: ${ticketType}
Loại Jira gốc: ${rawIssueType}

## Mô tả
${descriptionText || 'Không có mô tả chi tiết từ Jira.'}

## Yêu cầu & Tiêu chí chấp nhận
- Xem kỹ phần mô tả trên để phân tích và lập kế hoạch thực hiện theo loại ticket: ${ticketType}.
- Đảm bảo tuân thủ tiêu chí hoàn thành của ticket và chạy verify test trước khi đóng.
`;

  if (!fs.existsSync(taskDir)) {
    fs.mkdirSync(taskDir, { recursive: true });
  }

  fs.writeFileSync(ticketFile, markdownContent, 'utf-8');
  console.log(`[Jira] Đã tạo thành công: ${ticketFile}`);
} catch (err) {
  console.error(`[Jira] Lỗi khi tải ticket:`, err.message);
  if (!fs.existsSync(ticketFile)) {
    process.exit(1);
  }
}

function extractAdfText(nodes) {
  if (!Array.isArray(nodes)) return '';
  return nodes.map(node => {
    if (node.type === 'text') return node.text || '';
    if (node.content) return extractAdfText(node.content);
    return '\n';
  }).join(' ').replace(/\n\s*\n/g, '\n\n').trim();
}
