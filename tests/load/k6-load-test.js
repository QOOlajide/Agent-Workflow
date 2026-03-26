/**
 * K6 LOAD TESTING SCRIPT
 *
 * This script generates real production metrics for your resume.
 *
 * Installation:
 *   - Mac: brew install k6
 *   - Windows: choco install k6
 *   - Linux: https://k6.io/docs/getting-started/installation/
 *
 * Usage:
 *   k6 run tests/load/k6-load-test.js
 *
 * With more users:
 *   k6 run --vus 50 --duration 60s tests/load/k6-load-test.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// Custom metrics for detailed tracking
const firecrawlLatency = new Trend("firecrawl_latency");
const cacheHitRate = new Rate("cache_hit_rate");
const apiErrors = new Counter("api_errors");

// Test configuration
export const options = {
  // Stages for ramping up load
  stages: [
    { duration: "10s", target: 5 }, // Ramp up to 5 users
    { duration: "30s", target: 10 }, // Hold at 10 users
    { duration: "10s", target: 20 }, // Spike to 20 users
    { duration: "10s", target: 5 }, // Ramp down
  ],

  // Thresholds for pass/fail criteria
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% of requests under 2s
    http_req_failed: ["rate<0.05"], // Less than 5% errors
    cache_hit_rate: ["rate>0.5"], // More than 50% cache hits
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// Test URLs to scrape (simple, fast-loading sites)
const TEST_URLS = [
  "https://example.com",
  "https://httpbin.org/html",
  "https://jsonplaceholder.typicode.com",
];

export default function () {
  group("Firecrawl API Load Test", function () {
    // Pick a random URL (but repeat to test caching)
    const url = TEST_URLS[Math.floor(Math.random() * TEST_URLS.length)];

    const payload = JSON.stringify({ url });

    const params = {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: "30s",
    };

    const startTime = Date.now();
    const response = http.post(
      `${BASE_URL}/api/firecrawl/scrape`,
      payload,
      params
    );
    const latency = Date.now() - startTime;

    // Record custom metrics
    firecrawlLatency.add(latency);

    // Check response
    const success = check(response, {
      "status is 200": (r) => r.status === 200,
      "response has data": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true;
        } catch {
          return false;
        }
      },
      "response time < 2s": (r) => r.timings.duration < 2000,
    });

    if (!success) {
      apiErrors.add(1);
    }

    // Track cache hits
    try {
      const body = JSON.parse(response.body);
      if (body.performance && body.performance.cached) {
        cacheHitRate.add(1);
      } else {
        cacheHitRate.add(0);
      }
    } catch {
      // Ignore parse errors
    }

    // Small delay between requests
    sleep(Math.random() * 2 + 0.5); // 0.5-2.5s delay
  });
}

// Runs once at the end of the test
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    testDuration: data.state.testRunDurationMs,
    totalRequests: data.metrics.http_reqs.values.count,
    
    // Latency metrics
    latency: {
      avg: data.metrics.http_req_duration.values.avg,
      min: data.metrics.http_req_duration.values.min,
      max: data.metrics.http_req_duration.values.max,
      p50: data.metrics.http_req_duration.values["p(50)"],
      p90: data.metrics.http_req_duration.values["p(90)"],
      p95: data.metrics.http_req_duration.values["p(95)"],
      p99: data.metrics.http_req_duration.values["p(99)"],
    },
    
    // Error rate
    errorRate: data.metrics.http_req_failed.values.rate * 100,
    
    // Throughput
    requestsPerSecond:
      data.metrics.http_reqs.values.count /
      (data.state.testRunDurationMs / 1000),
    
    // Cache hit rate (if available)
    cacheHitRate: data.metrics.cache_hit_rate
      ? data.metrics.cache_hit_rate.values.rate * 100
      : null,

    // Resume-ready statements
    resumeStatements: [
      `Load tested API handling ${Math.round(data.metrics.http_reqs.values.count / (data.state.testRunDurationMs / 1000))} requests/second`,
      `Achieved P95 latency of ${Math.round(data.metrics.http_req_duration.values["p(95)"])}ms under load`,
      `Maintained ${((1 - data.metrics.http_req_failed.values.rate) * 100).toFixed(2)}% success rate with ${data.metrics.http_reqs.values.count} requests`,
    ],
  };

  console.log("\n========================================");
  console.log("📊 LOAD TEST RESULTS");
  console.log("========================================\n");
  console.log(`Total Requests: ${summary.totalRequests}`);
  console.log(`Requests/sec: ${summary.requestsPerSecond.toFixed(2)}`);
  console.log(`\nLatency:`);
  console.log(`  P50: ${Math.round(summary.latency.p50)}ms`);
  console.log(`  P95: ${Math.round(summary.latency.p95)}ms`);
  console.log(`  P99: ${Math.round(summary.latency.p99)}ms`);
  console.log(`\nError Rate: ${summary.errorRate.toFixed(2)}%`);
  if (summary.cacheHitRate !== null) {
    console.log(`Cache Hit Rate: ${summary.cacheHitRate.toFixed(2)}%`);
  }
  console.log("\n📝 Resume Statements:");
  summary.resumeStatements.forEach((s) => console.log(`  • ${s}`));
  console.log("\n========================================\n");

  return {
    "tests/load/results.json": JSON.stringify(summary, null, 2),
    stdout: "", // Suppress default output
  };
}




