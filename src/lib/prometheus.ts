/**
 * PROMETHEUS METRICS MODULE
 *
 * Production-grade metrics instrumentation using prom-client.
 *
 * This module provides:
 * - Custom Registry for all application metrics
 * - HTTP request metrics (counters, histograms)
 * - Agent/workflow execution metrics
 * - Cache metrics (bridged from existing cacheStats)
 * - withMetrics helper for wrapping route handlers
 *
 * Metric Naming Conventions:
 * - Counters end with _total
 * - Durations use _seconds suffix
 * - Histograms auto-generate _bucket, _sum, _count series
 */

import client, {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from "prom-client";

// =============================================================================
// REGISTRY SETUP
// =============================================================================

/**
 * Custom registry for all application metrics.
 * Using a dedicated registry makes it easy to extend and test.
 */
export const registry = new Registry();

// Set default labels that will be added to all metrics
registry.setDefaultLabels({
  app: "agent-workflow",
});

// Collect default Node.js metrics (CPU, memory, event loop lag, etc.)
collectDefaultMetrics({ register: registry });

// =============================================================================
// HTTP METRICS
// =============================================================================

/**
 * Counter: Total HTTP requests
 * Labels: method, route, status_code
 */
export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [registry],
});

/**
 * Counter: HTTP request errors (5xx only)
 * Labels: method, route, status_code
 */
export const httpRequestErrorsTotal = new Counter({
  name: "http_request_errors_total",
  help: "Total number of HTTP request errors (5xx status codes)",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [registry],
});

/**
 * Histogram: HTTP request duration in seconds
 * Labels: method, route
 * Buckets: Optimized for web API latencies
 *
 * Generated metrics:
 * - http_request_duration_seconds_bucket{method, route, le}
 * - http_request_duration_seconds_sum{method, route}
 * - http_request_duration_seconds_count{method, route}
 */
export const httpRequestDurationSeconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route"] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

// =============================================================================
// AGENT/WORKFLOW METRICS
// =============================================================================

/**
 * Counter: Total workflow executions
 * Labels: workflow_type, status (success, failure, timeout)
 */
export const agentWorkflowExecutionsTotal = new Counter({
  name: "agent_workflow_executions_total",
  help: "Total number of agent workflow executions",
  labelNames: ["workflow_type", "status"] as const,
  registers: [registry],
});

/**
 * Histogram: Workflow execution duration in seconds
 * Labels: workflow_type
 *
 * Generated metrics:
 * - agent_workflow_duration_seconds_bucket{workflow_type, le}
 * - agent_workflow_duration_seconds_sum{workflow_type}
 * - agent_workflow_duration_seconds_count{workflow_type}
 */
export const agentWorkflowDurationSeconds = new Histogram({
  name: "agent_workflow_duration_seconds",
  help: "Agent workflow execution duration in seconds",
  labelNames: ["workflow_type"] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [registry],
});

/**
 * Gauge: Current number of in-flight workflow jobs
 * Labels: workflow_type
 */
export const agentQueueInFlight = new Gauge({
  name: "agent_queue_in_flight",
  help: "Current number of in-flight workflow jobs",
  labelNames: ["workflow_type"] as const,
  registers: [registry],
});

// =============================================================================
// CACHE METRICS
// =============================================================================

/**
 * Counter: Cache hits
 * Labels: cache_name
 */
export const cacheHitTotal = new Counter({
  name: "cache_hit_total",
  help: "Total number of cache hits",
  labelNames: ["cache_name"] as const,
  registers: [registry],
});

/**
 * Counter: Cache misses
 * Labels: cache_name
 */
export const cacheMissTotal = new Counter({
  name: "cache_miss_total",
  help: "Total number of cache misses",
  labelNames: ["cache_name"] as const,
  registers: [registry],
});

// =============================================================================
// HELPER: withMetrics
// =============================================================================

/**
 * Type for Next.js route handler function
 */
type RouteHandler = (request: Request) => Promise<Response>;

/**
 * Wraps a route handler with Prometheus metrics instrumentation.
 *
 * This helper:
 * 1. Records start time before calling handler
 * 2. Calls the wrapped handler
 * 3. On completion, observes duration into http_request_duration_seconds
 * 4. Increments http_requests_total with {method, route, status_code}
 * 5. If status code >= 500, also increments http_request_errors_total
 *
 * @param route - Static route label (e.g., "/api/firecrawl/scrape")
 * @param handler - The route handler function to wrap
 * @returns Wrapped handler with metrics instrumentation
 *
 * @example
 * ```typescript
 * export const POST = withMetrics(
 *   "/api/firecrawl/scrape",
 *   async (request: Request) => {
 *     // ... handler logic ...
 *     return NextResponse.json({ success: true }, { status: 200 });
 *   }
 * );
 * ```
 */
export function withMetrics(route: string, handler: RouteHandler): RouteHandler {
  return async (request: Request): Promise<Response> => {
    const startTime = performance.now();
    const method = request.method;

    let response: Response;
    let statusCode: number;

    try {
      // Call the wrapped handler
      response = await handler(request);
      statusCode = response.status;
    } catch (error) {
      // If handler throws, treat as 500 error
      statusCode = 500;

      // Record metrics for the error
      const durationSeconds = (performance.now() - startTime) / 1000;

      httpRequestDurationSeconds.observe({ method, route }, durationSeconds);
      httpRequestsTotal.inc({ method, route, status_code: String(statusCode) });
      httpRequestErrorsTotal.inc({ method, route, status_code: String(statusCode) });

      // Re-throw the error
      throw error;
    }

    // Record metrics for successful handler execution
    const durationSeconds = (performance.now() - startTime) / 1000;

    httpRequestDurationSeconds.observe({ method, route }, durationSeconds);
    httpRequestsTotal.inc({ method, route, status_code: String(statusCode) });

    // Record error metric for 5xx status codes
    if (statusCode >= 500) {
      httpRequestErrorsTotal.inc({ method, route, status_code: String(statusCode) });
    }

    return response;
  };
}

// =============================================================================
// WORKFLOW METRICS HELPERS
// =============================================================================

/**
 * Records the start of a workflow execution.
 * Call this when a workflow begins.
 *
 * @param workflowType - Type of workflow (e.g., "firecrawl", "openai")
 * @returns Timer object to call when workflow completes
 */
export function startWorkflowTimer(workflowType: string): () => void {
  const startTime = performance.now();
  agentQueueInFlight.inc({ workflow_type: workflowType });

  return () => {
    const durationSeconds = (performance.now() - startTime) / 1000;
    agentWorkflowDurationSeconds.observe({ workflow_type: workflowType }, durationSeconds);
    agentQueueInFlight.dec({ workflow_type: workflowType });
  };
}

/**
 * Records a workflow execution completion.
 *
 * @param workflowType - Type of workflow
 * @param status - Execution status ("success", "failure", "timeout")
 */
export function recordWorkflowExecution(
  workflowType: string,
  status: "success" | "failure" | "timeout"
): void {
  agentWorkflowExecutionsTotal.inc({ workflow_type: workflowType, status });
}

// =============================================================================
// CACHE METRICS HELPERS
// =============================================================================

/**
 * Records a cache hit.
 *
 * @param cacheName - Name of the cache (e.g., "redis", "scrape")
 */
export function recordCacheHit(cacheName: string): void {
  cacheHitTotal.inc({ cache_name: cacheName });
}

/**
 * Records a cache miss.
 *
 * @param cacheName - Name of the cache (e.g., "redis", "scrape")
 */
export function recordCacheMiss(cacheName: string): void {
  cacheMissTotal.inc({ cache_name: cacheName });
}

// =============================================================================
// METRICS EXPORT
// =============================================================================

/**
 * Get all metrics in Prometheus exposition format.
 * Used by the /api/prometheus endpoint.
 */
export async function getMetrics(): Promise<string> {
  return registry.metrics();
}

/**
 * Get the content type for Prometheus metrics.
 */
export function getContentType(): string {
  return registry.contentType;
}

// Re-export client for advanced usage
export { client };
