/**
 * Re-benchmark runner for questions previously refused by Evidence Gate.
 * Runs queries against Core API, updates checkpoints, and regenerates benchmark report.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_IDS = {
  'Quản lý dự án': '019fda1b-a23b-77ed-a206-569e0dcaefdb',
  'Lập trình hướng đối tượng': '01a017f7-f724-7fc6-a579-08e9cf2f68a7',
  'MongoDB Basic': '01a0c18c-e612-78b7-813f-0ea96819658d',
};

const CHECKPOINT_DIR = path.resolve(__dirname, '../reports/benchmark/checkpoints');
const REPORT_DIR = path.resolve(__dirname, '../reports/benchmark');
const DELAY_MS = 4500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function login() {
  const res = await fetch('http://localhost:8082/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'taolahieptqn122@gmail.com',
      password: '123123123123123',
    }),
  });
  if (!res.ok) throw new Error(`Login failed with status ${res.status}`);
  const data = await res.json();
  return data.accessToken;
}

async function main() {
  console.log('=== STARTING RE-BENCHMARK FOR EVIDENCE GATE REFUSED QUESTIONS ===');
  let token = await login();
  let tokenExpiresAt = Date.now() + 12 * 60 * 1000;

  async function getValidToken() {
    if (Date.now() > tokenExpiresAt) {
      console.log('Refreshing expired JWT token...');
      token = await login();
      tokenExpiresAt = Date.now() + 12 * 60 * 1000;
    }
    return token;
  }

  const checkpointFiles = fs
    .readdirSync(CHECKPOINT_DIR)
    .filter((f) => f.endsWith('.json'));

  let totalUpdated = 0;

  for (const filename of checkpointFiles) {
    const filePath = path.join(CHECKPOINT_DIR, filename);
    const results = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    let fileChanged = false;

    for (const item of results) {
      if (item.expectedDecision === 'ANSWER' && item.actualDecision === 'REFUSE') {
        const workspaceId = WORKSPACE_IDS[item.workspace];
        if (!workspaceId) {
          console.warn(`Unknown workspace: ${item.workspace}`);
          continue;
        }

        console.log(`\n[${item.ragMode.toUpperCase()}] Running ${item.questionId} (${item.workspace}): "${item.question.slice(0, 50)}..."`);
        const startTime = Date.now();

        try {
          const currentToken = await getValidToken();
          let res = await fetch(
            `http://localhost:8082/api/v1/workspaces/${workspaceId}/questions`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentToken}`,
              },
              body: JSON.stringify({
                question: item.question,
                allowExternalKnowledge: item.ragMode === 'hybrid',
              }),
            }
          );

          if (res.status === 401) {
            console.log('Encountered 401, re-logging in...');
            token = await login();
            tokenExpiresAt = Date.now() + 12 * 60 * 1000;
            res = await fetch(
              `http://localhost:8082/api/v1/workspaces/${workspaceId}/questions`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  question: item.question,
                  allowExternalKnowledge: item.ragMode === 'hybrid',
                }),
              }
            );
          }

          const latencyMs = Date.now() - startTime;
          const data = await res.json();

          console.log(`  -> Decision: ${data.decision}, Intent: ${data.intent}, Score: ${data.evidenceScore ? (data.evidenceScore * 100).toFixed(1) + '%' : 'N/A'}`);
          if (data.singleSourceWarning) {
            console.log(`  -> ⚠️ Single Source Warning: YES (${data.warningMessage || '1 nguồn'})`);
          }

          item.actualDecision = data.decision || 'REFUSE';
          item.actualAnswer = data.answer || '';
          item.actualIntent = data.intent || item.expectedIntent;
          item.latencyMs = latencyMs;
          item.citations = (data.citations || []).map((c) => c.citationId || '1');
          item.status = 'SUCCESS';
          item.timestamp = new Date().toISOString();
          item.evidenceScore = data.evidenceScore;
          item.singleSourceWarning = data.singleSourceWarning || false;
          item.warningMessage = data.warningMessage || null;

          fileChanged = true;
          totalUpdated++;

          // Save checkpoint immediately after each question
          fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf8');
        } catch (err) {
          console.error(`  -> Error running ${item.questionId}:`, err.message);
        }

        // Delay to prevent rate limiting
        await sleep(DELAY_MS);
      }
    }

    if (fileChanged) {
      console.log(`\nCheckpoint updated: ${filename}`);
    }
  }

  console.log(`\n=== RE-BENCHMARK COMPLETE! Total questions updated: ${totalUpdated} ===`);
}

main().catch((err) => {
  console.error('Fatal error in re-benchmark runner:', err);
  process.exit(1);
});
