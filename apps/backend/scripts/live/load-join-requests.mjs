#!/usr/bin/env node
import { performance } from 'node:perf_hooks';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    args[key] = value;
  }
  return args;
}

function percentile(sortedNumbers, p) {
  if (sortedNumbers.length === 0) return 0;
  const index = Math.min(sortedNumbers.length - 1, Math.max(0, Math.ceil((p / 100) * sortedNumbers.length) - 1));
  return sortedNumbers[index];
}

async function runPool(tasks, concurrency) {
  const results = new Array(tasks.length);
  let next = 0;

  async function worker() {
    while (true) {
      const current = next;
      next += 1;
      if (current >= tasks.length) return;
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = args.baseUrl || process.env.API_BASE_URL || 'http://localhost:4000';
  const sessionId = args.sessionId || process.env.LIVE_SESSION_ID;
  const count = Number(args.count || process.env.LOAD_COUNT || 50);
  const concurrency = Number(args.concurrency || process.env.LOAD_CONCURRENCY || 10);

  if (!sessionId) {
    console.error('Missing sessionId. Use --sessionId <id> or LIVE_SESSION_ID.');
    process.exit(1);
  }

  const url = `${baseUrl}/live-sessions/${sessionId}/request`;

  const tasks = Array.from({ length: count }, (_, i) => async () => {
    const displayName = `Load Student ${String(i + 1).padStart(3, '0')}`;
    const start = performance.now();

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });

      const elapsedMs = performance.now() - start;
      const payload = await res.json().catch(() => ({}));

      return {
        ok: res.ok,
        status: res.status,
        elapsedMs,
        message: payload?.message || null,
      };
    } catch (error) {
      const elapsedMs = performance.now() - start;
      return {
        ok: false,
        status: 0,
        elapsedMs,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  const t0 = performance.now();
  const results = await runPool(tasks, concurrency);
  const totalMs = performance.now() - t0;

  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const latencies = results.map((r) => r.elapsedMs).sort((a, b) => a - b);

  console.log('--- Join Request Load Test ---');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Session ID: ${sessionId}`);
  console.log(`Requested: ${count}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Success: ${ok.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Total Duration: ${totalMs.toFixed(2)} ms`);
  console.log(`Avg Latency: ${(latencies.reduce((a, b) => a + b, 0) / Math.max(1, latencies.length)).toFixed(2)} ms`);
  console.log(`P50: ${percentile(latencies, 50).toFixed(2)} ms`);
  console.log(`P95: ${percentile(latencies, 95).toFixed(2)} ms`);
  console.log(`P99: ${percentile(latencies, 99).toFixed(2)} ms`);
  console.log(`Throughput: ${(count / (totalMs / 1000)).toFixed(2)} req/s`);

  if (failed.length > 0) {
    console.log('\nFirst 10 failures:');
    failed.slice(0, 10).forEach((r, i) => {
      console.log(`${i + 1}. status=${r.status} latency=${r.elapsedMs.toFixed(2)}ms msg=${r.message || '-'}`);
    });
  }
}

main().catch((error) => {
  console.error('Load test crashed:', error);
  process.exit(1);
});
