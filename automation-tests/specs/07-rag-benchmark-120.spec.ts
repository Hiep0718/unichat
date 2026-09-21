/**
 * RAG Benchmark 120 Questions — E2E Automation Test Suite.
 *
 * Runs 120 questions across 3 workspaces (40 each) via the real Chat UI,
 * collects responses, computes scoring metrics, and generates an HTML report.
 *
 * Supports A/B comparison between Strict and Hybrid RAG modes.
 *
 * Usage:
 *   npx playwright test specs/07-rag-benchmark-120.spec.ts --project=benchmark
 *
 * @see docs/specifications/evaluation-protocol.md
 * @see docs/specifications/rag-evaluation-plan.md
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { loginAndGetPage } from '../helpers/auth-helper.js';
import { navigateToWorkspaceChat, startNewChat } from '../helpers/workspace-helper.js';
import {
  sendQuestionAndCollectResponse,
  setRagMode,
  INTER_QUESTION_DELAY_MS,
  type BenchmarkResult,
} from '../helpers/chat-helper.js';
import {
  computeBenchmarkMetrics,
  type GoldenDatasetEntry,
  type BenchmarkMetrics,
} from '../helpers/benchmark-scorer.js';
import { generateBenchmarkReportHtml } from '../helpers/benchmark-report-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/** Target workspaces in test order. */
const WORKSPACES = [
  'Quản lý dự án',
  'Lập trình hướng đối tượng',
  'MongoDB Basic',
] as const;

/** RAG modes to benchmark (A/B comparison). */
const RAG_MODES = ['strict', 'hybrid'] as const;

/** Start a new conversation every N questions to avoid context overflow. */
const NEW_CHAT_EVERY = 10;

/** Checkpoint save interval (number of questions). */
const CHECKPOINT_INTERVAL = 1;

/** Report output directory. */
const REPORT_DIR = path.resolve(__dirname, '../reports/benchmark');

/** Checkpoint directory. */
const CHECKPOINT_DIR = path.resolve(REPORT_DIR, 'checkpoints');

/**
 * Load golden dataset from JSON file.
 */
function loadGoldenDataset(): GoldenDatasetEntry[] {
  const dataPath = path.resolve(__dirname, '../data/golden-dataset.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw) as GoldenDatasetEntry[];
}

/**
 * Save checkpoint of results to resume if crashed.
 */
function saveCheckpoint(
  results: BenchmarkResult[],
  ragMode: string,
  workspace: string,
): void {
  fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  const filename = `checkpoint-${ragMode}-${workspace.replace(/\s+/g, '_')}.json`;
  const filePath = path.join(CHECKPOINT_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf-8');
}

/**
 * Load checkpoint if exists.
 */
function loadCheckpoint(ragMode: string, workspace: string): BenchmarkResult[] {
  const filename = `checkpoint-${ragMode}-${workspace.replace(/\s+/g, '_')}.json`;
  const filePath = path.join(CHECKPOINT_DIR, filename);
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as BenchmarkResult[];
  }
  return [];
}

/**
 * Save final results and generate HTML report.
 */
function saveFinalReport(
  allResults: BenchmarkResult[],
  dataset: GoldenDatasetEntry[],
): void {
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  // Save raw results JSON
  const resultsPath = path.join(REPORT_DIR, 'benchmark-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(allResults, null, 2), 'utf-8');

  // Compute metrics for each mode
  const strictResults = allResults.filter((r) => r.ragMode === 'strict');
  const hybridResults = allResults.filter((r) => r.ragMode === 'hybrid');

  const strictMetrics = strictResults.length > 0
    ? computeBenchmarkMetrics(strictResults, dataset, 'strict')
    : null;
  const hybridMetrics = hybridResults.length > 0
    ? computeBenchmarkMetrics(hybridResults, dataset, 'hybrid')
    : null;

  // Save metrics JSON
  if (strictMetrics) {
    const metricsPath = path.join(REPORT_DIR, 'benchmark-metrics-strict.json');
    fs.writeFileSync(metricsPath, JSON.stringify(strictMetrics, null, 2), 'utf-8');
  }
  if (hybridMetrics) {
    const metricsPath = path.join(REPORT_DIR, 'benchmark-metrics-hybrid.json');
    fs.writeFileSync(metricsPath, JSON.stringify(hybridMetrics, null, 2), 'utf-8');
  }

  // Generate HTML report
  const html = generateBenchmarkReportHtml(strictMetrics, hybridMetrics, allResults);
  const htmlPath = path.join(REPORT_DIR, 'benchmark-report.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');
}

// ─── Test Suite ─────────────────────────────────────────────────────────

test.describe('RAG Benchmark 120 Câu Hỏi — A/B Strict vs Hybrid', () => {
  // Set generous timeout for the full benchmark suite
  test.setTimeout(7_200_000); // 2 hours max per test

  const allResults: BenchmarkResult[] = [];
  let dataset: GoldenDatasetEntry[] = [];

  test.beforeAll(() => {
    dataset = loadGoldenDataset();
    expect(dataset.length).toBe(120);
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  });

  for (const ragMode of RAG_MODES) {
    for (const workspaceName of WORKSPACES) {
      test(`Benchmark [${ragMode.toUpperCase()}] — ${workspaceName} (40 câu)`, async ({ browser }) => {
        // Filter questions for this workspace
        const workspaceQuestions = dataset.filter(
          (d) => d.workspace === workspaceName,
        );
        expect(workspaceQuestions.length).toBe(40);

        // Check for existing checkpoint to resume
        const existingResults = loadCheckpoint(ragMode, workspaceName);
        const completedIds = new Set(existingResults.map((r) => r.questionId));
        const remainingQuestions = workspaceQuestions.filter(
          (q) => !completedIds.has(q.id),
        );

        const results: BenchmarkResult[] = [...existingResults];

        if (remainingQuestions.length === 0) {
          // All questions already completed from checkpoint
          allResults.push(...results);
          return;
        }

        // Login and navigate to workspace chat
        const baseURL = process.env.BASE_URL || 'http://localhost:5173';
        const { context, page } = await loginAndGetPage(browser, baseURL);

        try {
          await navigateToWorkspaceChat(page, workspaceName);
          await setRagMode(page, ragMode);

          let questionCounter = existingResults.length;

          for (let i = 0; i < remainingQuestions.length; i++) {
            const q = remainingQuestions[i];
            questionCounter++;

            // Start new conversation every N questions
            if (questionCounter > 1 && (questionCounter - 1) % NEW_CHAT_EVERY === 0) {
              await startNewChat(page);
              await setRagMode(page, ragMode);
            }

            // Send question and collect response
            const result = await sendQuestionAndCollectResponse(
              page,
              q.id,
              q.workspace,
              q.question,
              q.expectedIntent,
              q.expectedDecision,
              ragMode,
            );

            results.push(result);

            // Take screenshot for OUT_OF_SCOPE questions
            if (q.expectedIntent === 'OUT_OF_SCOPE') {
              const screenshotDir = path.join(REPORT_DIR, 'screenshots');
              fs.mkdirSync(screenshotDir, { recursive: true });
              await page.screenshot({
                path: path.join(screenshotDir, `${q.id}-${ragMode}.png`),
                fullPage: false,
              });
            }

            // Checkpoint save
            if ((i + 1) % CHECKPOINT_INTERVAL === 0 || i === remainingQuestions.length - 1) {
              saveCheckpoint(results, ragMode, workspaceName);
            }

            // Rate limit delay between questions
            if (i < remainingQuestions.length - 1) {
              await page.waitForTimeout(INTER_QUESTION_DELAY_MS);
            }
          }
        } finally {
          await context.close();
        }

        allResults.push(...results);
      });
    }
  }

  test.afterAll(() => {
    if (allResults.length > 0) {
      saveFinalReport(allResults, dataset);
    }
  });
});
