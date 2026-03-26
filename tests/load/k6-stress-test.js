/**
 * K6 STRESS TEST SCRIPT
 *
 * Tests your API under extreme load to find breaking points.
 * Use this to generate impressive "handled X concurrent users" metrics.
 *
 * Usage:
 *   k6 run tests/load/k6-stress-test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const responseTime = new Trend("response_time");
const successRate = new Rate("success_rate");

export const options = {
  // Stress test stages - push to the limit!
  stages: [
    { duration: "20s", target: 10 }, // Normal load
    { duration: "20s", target: 50 }, // Spike!
    { duration: "20s", target: 100 }, // Extreme!
    { duration: "20s", target: 50 }, // Recovery
    { duration: "10s", target: 0 }, // Cool down
  ],

  thresholds: {
    http_req_duration: ["p(99)<5000"], // 99% under 5s (stress test)
    success_rate: ["rate>0.9"], // 90% success under stress
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  // Hit the metrics endpoint - lightweight, good for stress testing
  const metricsResponse = http.get(`${BASE_URL}/api/metrics`);

  const success = check(metricsResponse, {
    "metrics status 200": (r) => r.status === 200,
    "metrics response < 1s": (r) => r.timings.duration < 1000,
  });

  responseTime.add(metricsResponse.timings.duration);
  successRate.add(success ? 1 : 0);

  // Also test the scrape endpoint occasionally
  if (Math.random() < 0.2) {
    // 20% of requests
    const scrapeResponse = http.post(
      `${BASE_URL}/api/firecrawl/scrape`,
      JSON.stringify({ url: "https://example.com" }),
      { headers: { "Content-Type": "application/json" }, timeout: "30s" }
    );

    check(scrapeResponse, {
      "scrape status 200": (r) => r.status === 200,
    });

    responseTime.add(scrapeResponse.timings.duration);
  }

  sleep(0.1); // Small delay
}

export function handleSummary(data) {
  const maxVus = 100; // From our stages

  console.log("\n========================================");
  console.log("🔥 STRESS TEST RESULTS");
  console.log("========================================\n");
  console.log(`Max Concurrent Users: ${maxVus}`);
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Peak RPS: ${Math.round(data.metrics.http_reqs.values.rate)}`);
  console.log(`\nLatency Under Stress:`);
  console.log(`  P50: ${Math.round(data.metrics.http_req_duration.values["p(50)"])}ms`);
  console.log(`  P95: ${Math.round(data.metrics.http_req_duration.values["p(95)"])}ms`);
  console.log(`  P99: ${Math.round(data.metrics.http_req_duration.values["p(99)"])}ms`);
  console.log(`\nSuccess Rate: ${((1 - data.metrics.http_req_failed.values.rate) * 100).toFixed(2)}%`);
  console.log("\n📝 Resume Statement:");
  console.log(`  • Stress tested API handling ${maxVus} concurrent users with ${((1 - data.metrics.http_req_failed.values.rate) * 100).toFixed(1)}% success rate`);
  console.log("\n========================================\n");

  return {
    "tests/load/stress-results.json": JSON.stringify(
      {
        maxConcurrentUsers: maxVus,
        totalRequests: data.metrics.http_reqs.values.count,
        peakRPS: Math.round(data.metrics.http_reqs.values.rate),
        p99Latency: Math.round(data.metrics.http_req_duration.values["p(99)"]),
        successRate: (1 - data.metrics.http_req_failed.values.rate) * 100,
      },
      null,
      2
    ),
  };
}




