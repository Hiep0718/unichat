/**
 * Benchmark scoring engine for RAG evaluation.
 * Computes decision accuracy, intent accuracy, keyword hit rate,
 * citation presence, refusal F1, and latency statistics.
 */

import type { BenchmarkResult } from './chat-helper.js';

/** Metrics for a single intent group. */
export interface IntentMetrics {
  readonly intent: string;
  readonly total: number;
  readonly decisionCorrect: number;
  readonly decisionAccuracy: number;
  readonly avgKeywordHitRate: number;
  readonly avgLatencyMs: number;
}

/** Metrics for a single workspace. */
export interface WorkspaceMetrics {
  readonly workspace: string;
  readonly total: number;
  readonly decisionAccuracy: number;
  readonly avgKeywordHitRate: number;
  readonly citationPresenceRate: number;
  readonly avgLatencyMs: number;
  readonly latencyP50Ms: number;
  readonly latencyP95Ms: number;
}

/** Top-level benchmark metrics. */
export interface BenchmarkMetrics {
  readonly runId: string;
  readonly ragMode: 'strict' | 'hybrid';
  readonly timestamp: string;
  readonly totalQuestions: number;
  readonly successCount: number;
  readonly timeoutCount: number;
  readonly errorCount: number;
  readonly decisionAccuracy: number;
  readonly intentAccuracy: number;
  readonly avgKeywordHitRate: number;
  readonly citationPresenceRate: number;
  readonly refusalPrecision: number;
  readonly refusalRecall: number;
  readonly refusalF1: number;
  readonly avgLatencyMs: number;
  readonly latencyP50Ms: number;
  readonly latencyP95Ms: number;
  readonly perWorkspace: Record<string, WorkspaceMetrics>;
  readonly perIntent: Record<string, IntentMetrics>;
}

/** Golden dataset entry. */
export interface GoldenDatasetEntry {
  readonly id: string;
  readonly workspace: string;
  readonly question: string;
  readonly expectedIntent: string;
  readonly expectedDecision: string;
  readonly groundTruth: string;
  readonly keywords: string[];
  readonly split: string;
}

/**
 * Compute keyword hit rate for a single answer.
 *
 * @param answer - Actual answer text
 * @param keywords - Expected keywords to match
 * @returns Hit rate 0.0 - 1.0
 */
export function computeKeywordHitRate(answer: string, keywords: string[]): number {
  if (!keywords.length || !answer) return 0;
  const lowerAnswer = answer.toLowerCase();
  const hits = keywords.filter((kw) => lowerAnswer.includes(kw.toLowerCase()));
  return hits.length / keywords.length;
}

/**
 * Calculate percentile value from a sorted array of numbers.
 *
 * @param values - Array of numeric values
 * @param percentile - Percentile to calculate (0-100)
 * @returns Percentile value
 */
function calcPercentile(values: number[], percentile: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const k = (sorted.length - 1) * (percentile / 100);
  const f = Math.floor(k);
  const c = Math.ceil(k);
  if (f === c) return sorted[f];
  return sorted[f] * (c - k) + sorted[c] * (k - f);
}

/**
 * Compute comprehensive benchmark metrics from results and golden dataset.
 *
 * @param results - Array of BenchmarkResult from test runs
 * @param dataset - Golden dataset entries for keyword matching
 * @param ragMode - RAG mode used for this run
 * @returns Complete BenchmarkMetrics
 */
export function computeBenchmarkMetrics(
  results: BenchmarkResult[],
  dataset: GoldenDatasetEntry[],
  ragMode: 'strict' | 'hybrid',
): BenchmarkMetrics {
  const datasetMap = new Map(dataset.map((d) => [d.id, d]));
  const total = results.length;
  const successResults = results.filter((r) => r.status === 'SUCCESS');
  const timeoutCount = results.filter((r) => r.status === 'TIMEOUT').length;
  const errorCount = results.filter((r) => r.status === 'ERROR').length;

  // Decision accuracy
  const decisionCorrect = successResults.filter(
    (r) => r.actualDecision === r.expectedDecision,
  ).length;
  const decisionAccuracy = total > 0 ? decisionCorrect / total : 0;

  // Intent accuracy (only for successful responses)
  const intentCorrect = successResults.filter(
    (r) => r.actualIntent.toUpperCase() === r.expectedIntent.toUpperCase(),
  ).length;
  const intentAccuracy = successResults.length > 0 ? intentCorrect / successResults.length : 0;

  // Keyword hit rate
  const keywordHitRates = successResults.map((r) => {
    const golden = datasetMap.get(r.questionId);
    if (!golden || !golden.keywords.length) return 0;
    return computeKeywordHitRate(r.actualAnswer, golden.keywords);
  });
  const avgKeywordHitRate = keywordHitRates.length > 0
    ? keywordHitRates.reduce((a, b) => a + b, 0) / keywordHitRates.length
    : 0;

  // Citation presence (for ANSWER decisions)
  const answerResults = successResults.filter((r) => r.expectedDecision === 'ANSWER');
  const withCitations = answerResults.filter((r) => r.citations.length > 0).length;
  const citationPresenceRate = answerResults.length > 0 ? withCitations / answerResults.length : 0;

  // Refusal F1
  const trueRefusals = successResults.filter(
    (r) => r.expectedDecision === 'REFUSE' && r.actualDecision === 'REFUSE',
  ).length;
  const falseRefusals = successResults.filter(
    (r) => r.expectedDecision !== 'REFUSE' && r.actualDecision === 'REFUSE',
  ).length;
  const missedRefusals = successResults.filter(
    (r) => r.expectedDecision === 'REFUSE' && r.actualDecision !== 'REFUSE',
  ).length;

  const refusalPrecision =
    trueRefusals + falseRefusals > 0 ? trueRefusals / (trueRefusals + falseRefusals) : 0;
  const refusalRecall =
    trueRefusals + missedRefusals > 0 ? trueRefusals / (trueRefusals + missedRefusals) : 0;
  const refusalF1 =
    refusalPrecision + refusalRecall > 0
      ? (2 * refusalPrecision * refusalRecall) / (refusalPrecision + refusalRecall)
      : 0;

  // Latency stats
  const latencies = successResults.map((r) => r.latencyMs);
  const avgLatencyMs = latencies.length > 0
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : 0;
  const latencyP50Ms = calcPercentile(latencies, 50);
  const latencyP95Ms = calcPercentile(latencies, 95);

  // Per-workspace metrics
  const workspaces = [...new Set(results.map((r) => r.workspace))];
  const perWorkspace: Record<string, WorkspaceMetrics> = {};
  for (const ws of workspaces) {
    const wsResults = results.filter((r) => r.workspace === ws);
    const wsSuccess = wsResults.filter((r) => r.status === 'SUCCESS');
    const wsLatencies = wsSuccess.map((r) => r.latencyMs);
    const wsDecisionOk = wsResults.filter((r) => r.actualDecision === r.expectedDecision).length;
    const wsAnswers = wsSuccess.filter((r) => r.expectedDecision === 'ANSWER');
    const wsCitations = wsAnswers.filter((r) => r.citations.length > 0).length;
    const wsKeywords = wsSuccess.map((r) => {
      const golden = datasetMap.get(r.questionId);
      return golden ? computeKeywordHitRate(r.actualAnswer, golden.keywords) : 0;
    });

    perWorkspace[ws] = {
      workspace: ws,
      total: wsResults.length,
      decisionAccuracy: wsResults.length > 0 ? wsDecisionOk / wsResults.length : 0,
      avgKeywordHitRate: wsKeywords.length > 0
        ? wsKeywords.reduce((a, b) => a + b, 0) / wsKeywords.length
        : 0,
      citationPresenceRate: wsAnswers.length > 0 ? wsCitations / wsAnswers.length : 0,
      avgLatencyMs: wsLatencies.length > 0
        ? wsLatencies.reduce((a, b) => a + b, 0) / wsLatencies.length
        : 0,
      latencyP50Ms: calcPercentile(wsLatencies, 50),
      latencyP95Ms: calcPercentile(wsLatencies, 95),
    };
  }

  // Per-intent metrics
  const intents = [...new Set(results.map((r) => r.expectedIntent))];
  const perIntent: Record<string, IntentMetrics> = {};
  for (const intent of intents) {
    const intResults = results.filter((r) => r.expectedIntent === intent);
    const intSuccess = intResults.filter((r) => r.status === 'SUCCESS');
    const intDecisionOk = intResults.filter((r) => r.actualDecision === r.expectedDecision).length;
    const intKeywords = intSuccess.map((r) => {
      const golden = datasetMap.get(r.questionId);
      return golden ? computeKeywordHitRate(r.actualAnswer, golden.keywords) : 0;
    });
    const intLatencies = intSuccess.map((r) => r.latencyMs);

    perIntent[intent] = {
      intent,
      total: intResults.length,
      decisionCorrect: intDecisionOk,
      decisionAccuracy: intResults.length > 0 ? intDecisionOk / intResults.length : 0,
      avgKeywordHitRate: intKeywords.length > 0
        ? intKeywords.reduce((a, b) => a + b, 0) / intKeywords.length
        : 0,
      avgLatencyMs: intLatencies.length > 0
        ? intLatencies.reduce((a, b) => a + b, 0) / intLatencies.length
        : 0,
    };
  }

  return {
    runId: `benchmark-${ragMode}-${Date.now()}`,
    ragMode,
    timestamp: new Date().toISOString(),
    totalQuestions: total,
    successCount: successResults.length,
    timeoutCount,
    errorCount,
    decisionAccuracy,
    intentAccuracy,
    avgKeywordHitRate,
    citationPresenceRate,
    refusalPrecision,
    refusalRecall,
    refusalF1,
    avgLatencyMs,
    latencyP50Ms,
    latencyP95Ms,
    perWorkspace,
    perIntent,
  };
}
