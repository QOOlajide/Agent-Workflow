/**
 * PRODUCTION METRICS COLLECTOR
 * Enhanced with cache tracking, latency breakdown, and error categorization
 *
 * Resume metrics this enables:
 * - P50/P95/P99 latency with breakdown
 * - Cache hit rate
 * - Error rate by type
 * - Throughput (RPS)
 */

import { cacheStats } from "@/lib/redis";

type LatencyBreakdown = {
  parsing: number;
  cache: number;
  externalApi: number;
  processing: number;
};

type MetricEntry = {
  timestamp: number;
  endpoint: string;
  // Latency
  totalDuration: number;
  latencyBreakdown?: LatencyBreakdown;
  // Status
  success: boolean;
  statusCode: number;
  errorType?: "validation" | "timeout" | "external_api" | "rate_limit" | "internal";
  // Cache
  cached: boolean;
  // Request info
  requestSizeBytes?: number;
  responseSizeBytes?: number;
};

type SlowQuery = {
  timestamp: number;
  endpoint: string;
  latencyMs: number;
  identifier?: string;
  reason?: string;
};

class MetricsCollector {
  private metrics: MetricEntry[] = [];
  private slowQueries: SlowQuery[] = [];
  private readonly maxEntries = 10000;
  private readonly maxSlowQueries = 100;
  private readonly slowThresholdMs = 1000;

  /**
   * Record a request metric with enhanced data
   */
  record(entry: MetricEntry) {
    this.metrics.push(entry);

    // Track slow queries
    if (entry.totalDuration > this.slowThresholdMs) {
      this.slowQueries.push({
        timestamp: entry.timestamp,
        endpoint: entry.endpoint,
        latencyMs: entry.totalDuration,
        reason: entry.cached ? "Slow cache" : "External API delay",
      });

      if (this.slowQueries.length > this.maxSlowQueries) {
        this.slowQueries = this.slowQueries.slice(-this.maxSlowQueries);
      }
    }

    // Prevent memory leak
    if (this.metrics.length > this.maxEntries) {
      this.metrics = this.metrics.slice(-this.maxEntries);
    }
  }

  /**
   * Get metrics for a time window
   */
  getMetrics(windowMs: number = 3600000) {
    const cutoff = Date.now() - windowMs;
    return this.metrics.filter((m) => m.timestamp > cutoff);
  }

  /**
   * Calculate percentile latency
   */
  getPercentile(percentile: number, endpoint?: string, cacheHitOnly?: boolean): number {
    let data = this.getMetrics();

    if (endpoint) {
      data = data.filter((m) => m.endpoint === endpoint);
    }

    if (cacheHitOnly !== undefined) {
      data = data.filter((m) => m.cached === cacheHitOnly);
    }

    if (data.length === 0) return 0;

    const sorted = data.map((m) => m.totalDuration).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get error rate with breakdown by type
   */
  getErrorStats(endpoint?: string) {
    let data = this.getMetrics();
    if (endpoint) {
      data = data.filter((m) => m.endpoint === endpoint);
    }

    const total = data.length;
    if (total === 0) {
      return {
        totalRate: 0,
        byType: {
          validation: 0,
          timeout: 0,
          external_api: 0,
          rate_limit: 0,
          internal: 0,
        },
      };
    }

    const errors = data.filter((m) => !m.success);
    const byType = {
      validation: errors.filter((e) => e.errorType === "validation").length,
      timeout: errors.filter((e) => e.errorType === "timeout").length,
      external_api: errors.filter((e) => e.errorType === "external_api").length,
      rate_limit: errors.filter((e) => e.errorType === "rate_limit").length,
      internal: errors.filter((e) => e.errorType === "internal").length,
    };

    return {
      totalRate: (errors.length / total) * 100,
      byType,
      total: errors.length,
    };
  }

  /**
   * Get cache performance metrics
   */
  getCacheStats() {
    const data = this.getMetrics();
    const cachedRequests = data.filter((m) => m.cached);
    const uncachedRequests = data.filter((m) => !m.cached);

    const hitRate =
      data.length === 0 ? 0 : (cachedRequests.length / data.length) * 100;

    return {
      hitRate: Math.round(hitRate * 100) / 100,
      hits: cachedRequests.length,
      misses: uncachedRequests.length,
      avgHitLatencyMs:
        cachedRequests.length === 0
          ? 0
          : Math.round(
              (cachedRequests.reduce((sum, m) => sum + m.totalDuration, 0) /
                cachedRequests.length) *
                100
            ) / 100,
      avgMissLatencyMs:
        uncachedRequests.length === 0
          ? 0
          : Math.round(
              (uncachedRequests.reduce((sum, m) => sum + m.totalDuration, 0) /
                uncachedRequests.length) *
                100
            ) / 100,
      // From Redis module stats
      redisStats: cacheStats.getStats(),
    };
  }

  /**
   * Get latency breakdown (where time is spent)
   */
  getLatencyBreakdown(endpoint?: string) {
    let data = this.getMetrics().filter((m) => m.latencyBreakdown);
    if (endpoint) {
      data = data.filter((m) => m.endpoint === endpoint);
    }

    if (data.length === 0) {
      return {
        parsing: 0,
        cache: 0,
        externalApi: 0,
        processing: 0,
      };
    }

    const sum = data.reduce(
      (acc, m) => {
        if (m.latencyBreakdown) {
          acc.parsing += m.latencyBreakdown.parsing;
          acc.cache += m.latencyBreakdown.cache;
          acc.externalApi += m.latencyBreakdown.externalApi;
          acc.processing += m.latencyBreakdown.processing;
        }
        return acc;
      },
      { parsing: 0, cache: 0, externalApi: 0, processing: 0 }
    );

    return {
      parsing: Math.round((sum.parsing / data.length) * 100) / 100,
      cache: Math.round((sum.cache / data.length) * 100) / 100,
      externalApi: Math.round((sum.externalApi / data.length) * 100) / 100,
      processing: Math.round((sum.processing / data.length) * 100) / 100,
    };
  }

  /**
   * Get throughput (requests per second)
   */
  getThroughput(windowMs: number = 60000): number {
    const data = this.getMetrics(windowMs);
    return data.length / (windowMs / 1000);
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit: number = 10): SlowQuery[] {
    return this.slowQueries.slice(-limit);
  }

  /**
   * Get comprehensive stats
   */
  getStats(endpoint?: string) {
    const data = endpoint
      ? this.getMetrics().filter((m) => m.endpoint === endpoint)
      : this.getMetrics();

    if (data.length === 0) {
      return {
        totalRequests: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        errorRate: 0,
        avgLatency: 0,
        minLatency: 0,
        maxLatency: 0,
        throughputRPS: 0,
        successCount: 0,
        errorCount: 0,
        cacheHitRate: 0,
      };
    }

    const durations = data.map((m) => m.totalDuration);
    const sum = durations.reduce((a, b) => a + b, 0);
    const successCount = data.filter((m) => m.success).length;
    const errorCount = data.filter((m) => !m.success).length;
    const cachedCount = data.filter((m) => m.cached).length;

    return {
      totalRequests: data.length,
      p50: Math.round(this.getPercentile(50, endpoint) * 100) / 100,
      p95: Math.round(this.getPercentile(95, endpoint) * 100) / 100,
      p99: Math.round(this.getPercentile(99, endpoint) * 100) / 100,
      // Separate cache hit vs miss latencies
      p50CacheHit: Math.round(this.getPercentile(50, endpoint, true) * 100) / 100,
      p99CacheHit: Math.round(this.getPercentile(99, endpoint, true) * 100) / 100,
      p50CacheMiss: Math.round(this.getPercentile(50, endpoint, false) * 100) / 100,
      p99CacheMiss: Math.round(this.getPercentile(99, endpoint, false) * 100) / 100,
      errorRate: Math.round((errorCount / data.length) * 100 * 1000) / 1000,
      avgLatency: Math.round((sum / data.length) * 100) / 100,
      minLatency: Math.round(Math.min(...durations) * 100) / 100,
      maxLatency: Math.round(Math.max(...durations) * 100) / 100,
      throughputRPS: Math.round(this.getThroughput() * 1000) / 1000,
      successCount,
      errorCount,
      cacheHitRate: Math.round((cachedCount / data.length) * 100 * 100) / 100,
    };
  }

  /**
   * Export comprehensive metrics
   */
  export() {
    const endpoints = ["/api/openai/chat", "/api/firecrawl/scrape"];
    const endpointStats: Record<string, ReturnType<typeof this.getStats>> = {};

    for (const endpoint of endpoints) {
      const stats = this.getStats(endpoint);
      if (stats.totalRequests > 0) {
        endpointStats[endpoint] = stats;
      }
    }

    return {
      timestamp: new Date().toISOString(),
      windowHours: 1,
      endpoints: endpointStats,
      overall: this.getStats(),
      cache: this.getCacheStats(),
      errors: this.getErrorStats(),
      latencyBreakdown: this.getLatencyBreakdown(),
      slowQueries: this.getSlowQueries(),
    };
  }

  /**
   * Generate resume-ready statements from real data
   */
  generateResumeStatements(): string[] {
    const statements: string[] = [];
    const overall = this.getStats();
    const cache = this.getCacheStats();

    if (overall.totalRequests > 0) {
      // Latency statements
      if (overall.p99 > 0) {
        statements.push(
          `Achieved P99 latency of ${overall.p99}ms across ${overall.totalRequests} requests`
        );
      }

      // Cache statements
      if (cache.hitRate > 0) {
        statements.push(
          `Achieved ${cache.hitRate.toFixed(1)}% cache hit rate with Redis`
        );

        if (cache.avgHitLatencyMs > 0 && cache.avgMissLatencyMs > 0) {
          const improvement = Math.round(
            ((cache.avgMissLatencyMs - cache.avgHitLatencyMs) /
              cache.avgMissLatencyMs) *
              100
          );
          statements.push(
            `Reduced latency by ${improvement}% for cached requests (${cache.avgHitLatencyMs}ms vs ${cache.avgMissLatencyMs}ms)`
          );
        }

        if (cache.hits > 0) {
          statements.push(
            `Saved ${cache.hits} external API calls through intelligent caching`
          );
        }
      }

      // Error rate statement
      if (overall.errorRate < 1) {
        statements.push(
          `Maintained ${overall.errorRate.toFixed(2)}% error rate in production`
        );
      }

      // Throughput statement
      if (overall.throughputRPS > 0) {
        statements.push(
          `Handled ${overall.throughputRPS.toFixed(2)} requests per second`
        );
      }
    }

    if (statements.length === 0) {
      statements.push(
        "Make API requests to generate real metrics for your resume!"
      );
    }

    return statements;
  }
}

// Singleton instance
export const metrics = new MetricsCollector();
