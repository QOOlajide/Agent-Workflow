/**
 * METRICS API ENDPOINT - Production-Ready Observability
 *
 * GET /api/metrics - Returns comprehensive performance statistics
 *
 * This is your dashboard for resume-worthy metrics:
 * - P50/P95/P99 latency (overall and by cache status)
 * - Cache hit rate and performance
 * - Error rates by type
 * - Latency breakdown (where time is spent)
 * - Slow query tracking
 * - Uptime and SLA compliance
 */

import { NextResponse } from "next/server";
import { metrics } from "@/utils/metrics";
import { uptime } from "@/utils/uptime";
import { checkRedisHealth, cacheStats } from "@/lib/redis";

export async function GET() {
  // Perform health checks
  await uptime.performHealthCheck();
  const redisHealth = await checkRedisHealth();

  const metricsData = metrics.export();
  const uptimeData = uptime.getUptime();
  const slaData = uptime.getSLACompliance();

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),

    // ============================================================
    // PERFORMANCE METRICS
    // ============================================================
    performance: {
      overall: metricsData.overall,
      byEndpoint: metricsData.endpoints,
      latencyBreakdown: metricsData.latencyBreakdown,
    },

    // ============================================================
    // CACHE METRICS (Redis)
    // ============================================================
    cache: {
      ...metricsData.cache,
      redis: {
        connected: redisHealth.connected,
        pingLatencyMs: Math.round(redisHealth.latencyMs * 100) / 100,
      },
      // Savings calculation
      estimatedSavings: {
        apiCallsSaved: metricsData.cache.hits,
        latencySavedMs:
          metricsData.cache.hits *
          (metricsData.cache.avgMissLatencyMs - metricsData.cache.avgHitLatencyMs),
      },
    },

    // ============================================================
    // ERROR METRICS
    // ============================================================
    errors: metricsData.errors,

    // ============================================================
    // AVAILABILITY METRICS
    // ============================================================
    availability: {
      uptime: uptimeData,
      sla: slaData,
    },

    // ============================================================
    // SLOW QUERIES
    // ============================================================
    slowQueries: metricsData.slowQueries,

    // ============================================================
    // QUICK SUMMARY
    // ============================================================
    summary: {
      totalRequests: metricsData.overall.totalRequests,
      p50Latency: `${metricsData.overall.p50}ms`,
      p99Latency: `${metricsData.overall.p99}ms`,
      p99CacheHit: `${metricsData.overall.p99CacheHit || 0}ms`,
      p99CacheMiss: `${metricsData.overall.p99CacheMiss || 0}ms`,
      cacheHitRate: `${metricsData.cache.hitRate}%`,
      errorRate: `${metricsData.overall.errorRate}%`,
      uptimePercentage: `${uptimeData.uptimePercentage}%`,
      serverUptime: uptimeData.formatted,
      redisConnected: redisHealth.connected,
    },

    // ============================================================
    // RESUME-READY STATEMENTS (Generated from real data!)
    // ============================================================
    resumeStatements: metrics.generateResumeStatements(),

    // ============================================================
    // RAW STATS FOR DEBUGGING
    // ============================================================
    _debug: {
      cacheStats: cacheStats.getStats(),
      metricsWindowHours: metricsData.windowHours,
    },
  });
}
