/**
 * Standalone report regenerator from existing checkpoints.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { computeBenchmarkMetrics } from './benchmark-scorer.js';
import { generateBenchmarkReportHtml } from './benchmark-report-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORT_DIR = path.resolve(__dirname, '../reports/benchmark');
const CHECKPOINT_DIR = path.resolve(REPORT_DIR, 'checkpoints');

export function regenerateReport() {
  const datasetPath = path.resolve(__dirname, '../data/golden-dataset.json');
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

  const files = fs.readdirSync(CHECKPOINT_DIR).filter((f) => f.endsWith('.json'));

  const allResults = [];
  const strictResults = [];
  const hybridResults = [];

  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(CHECKPOINT_DIR, f), 'utf8'));
    allResults.push(...data);
    if (f.includes('-strict-')) {
      strictResults.push(...data);
    } else if (f.includes('-hybrid-')) {
      hybridResults.push(...data);
    }
  }

  const strictMetrics = strictResults.length > 0
    ? computeBenchmarkMetrics(strictResults, dataset, 'strict')
    : null;
  const hybridMetrics = hybridResults.length > 0
    ? computeBenchmarkMetrics(hybridResults, dataset, 'hybrid')
    : null;

  if (strictMetrics) {
    fs.writeFileSync(
      path.join(REPORT_DIR, 'benchmark-metrics-strict.json'),
      JSON.stringify(strictMetrics, null, 2),
      'utf8'
    );
  }
  if (hybridMetrics) {
    fs.writeFileSync(
      path.join(REPORT_DIR, 'benchmark-metrics-hybrid.json'),
      JSON.stringify(hybridMetrics, null, 2),
      'utf8'
    );
  }

  // Save synchronized raw results JSON
  fs.writeFileSync(
    path.join(REPORT_DIR, 'benchmark-results.json'),
    JSON.stringify(allResults, null, 2),
    'utf8'
  );

  const html = generateBenchmarkReportHtml(strictMetrics, hybridMetrics, allResults, dataset);
  fs.writeFileSync(path.join(REPORT_DIR, 'benchmark-report.html'), html, 'utf8');

  console.log('Successfully regenerated benchmark report:');
  if (strictMetrics) {
    const correct = Math.round(strictMetrics.decisionAccuracy * strictMetrics.totalQuestions);
    console.log(`  Strict Decision Accuracy: ${(strictMetrics.decisionAccuracy * 100).toFixed(1)}% (${correct}/${strictMetrics.totalQuestions})`);
    console.log(`  Strict Keyword Score:     ${(strictMetrics.avgKeywordHitRate * 100).toFixed(1)}%`);
  }
  if (hybridMetrics) {
    const correct = Math.round(hybridMetrics.decisionAccuracy * hybridMetrics.totalQuestions);
    console.log(`  Hybrid Decision Accuracy: ${(hybridMetrics.decisionAccuracy * 100).toFixed(1)}% (${correct}/${hybridMetrics.totalQuestions})`);
    console.log(`  Hybrid Keyword Score:     ${(hybridMetrics.avgKeywordHitRate * 100).toFixed(1)}%`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  regenerateReport();
}
