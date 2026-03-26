/**
 * FIRECRAWL API ROUTE - Server-Side Web Scraping with Redis Caching
 *
 * Features:
 * - Redis caching for repeated requests
 * - Latency breakdown tracking
 * - Enhanced metrics for resume
 * - Prometheus metrics instrumentation
 */

import { NextResponse } from "next/server";
import Firecrawl from "@mendable/firecrawl-js";
import { env } from "@/config/env";
import { Logger } from "@/utils/logger";
import { metrics } from "@/utils/metrics";
import { withCache, cacheStats } from "@/lib/redis";
import { z } from "zod";
import {
  withMetrics,
  startWorkflowTimer,
  recordWorkflowExecution,
} from "@/lib/prometheus";

const logger = new Logger("API:Firecrawl:Scrape");
const ENDPOINT = "/api/firecrawl/scrape";
const CACHE_TTL_SECONDS = 300; // 5 minutes

// Reuse Firecrawl client (connection pooling)
const firecrawl = new Firecrawl({ apiKey: env.FIRECRAWL_API_KEY });

const scrapeRequestSchema = z.object({
  url: z.string().url("Invalid URL format"),
});

/**
 * POST handler wrapped with Prometheus metrics instrumentation.
 * The withMetrics wrapper automatically records:
 * - http_requests_total{method="POST", route="/api/firecrawl/scrape", status_code}
 * - http_request_duration_seconds{method="POST", route="/api/firecrawl/scrape"}
 * - http_request_errors_total (for 5xx responses)
 */
async function handler(request: Request) {
  const totalStart = performance.now();
  const latencyBreakdown = {
    parsing: 0,
    cache: 0,
    externalApi: 0,
    processing: 0,
  };

  // Start workflow timer for Prometheus metrics
  const endWorkflowTimer = startWorkflowTimer("firecrawl");

  try {
    // ============================================================
    // STEP 1: PARSE AND VALIDATE REQUEST
    // ============================================================
    const parseStart = performance.now();
    const body = await request.json();
    const validationResult = scrapeRequestSchema.safeParse(body);
    latencyBreakdown.parsing = performance.now() - parseStart;

    if (!validationResult.success) {
      const totalDuration = performance.now() - totalStart;

      metrics.record({
        timestamp: Date.now(),
        endpoint: ENDPOINT,
        totalDuration,
        latencyBreakdown,
        success: false,
        statusCode: 400,
        errorType: "validation",
        cached: false,
      });

      // Record failed workflow execution for Prometheus (validation failure)
      endWorkflowTimer();
      recordWorkflowExecution("firecrawl", "failure");

      logger.error("Invalid request body", {
        errors: validationResult.error.errors,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: validationResult.error.errors,
        },
        {
          status: 400,
          headers: { "X-Response-Time": `${totalDuration.toFixed(2)}ms` },
        }
      );
    }

    const { url } = validationResult.data;
    logger.info("Scraping URL", { url });

    // ============================================================
    // STEP 2: CHECK CACHE OR SCRAPE
    // ============================================================
    const cacheStart = performance.now();

    const { data: result, cached, cacheLatencyMs, totalLatencyMs } = await withCache(
      "scrape",
      url,
      CACHE_TTL_SECONDS,
      async () => {
        const apiStart = performance.now();
        const scrapeResult = await firecrawl.scrape(url, {
          formats: ["markdown"], // Only request what we need
        });
        latencyBreakdown.externalApi = performance.now() - apiStart;
        return scrapeResult;
      }
    );

    latencyBreakdown.cache = cacheLatencyMs;
    if (cached) {
      // If cached, external API time is 0
      latencyBreakdown.externalApi = 0;
    }

    // ============================================================
    // STEP 3: RECORD METRICS AND RETURN
    // ============================================================
    const processingStart = performance.now();
    const totalDuration = performance.now() - totalStart;
    latencyBreakdown.processing = performance.now() - processingStart;

    metrics.record({
      timestamp: Date.now(),
      endpoint: ENDPOINT,
      totalDuration,
      latencyBreakdown,
      success: true,
      statusCode: 200,
      cached,
    });

    logger.info("Successfully scraped URL", {
      url,
      cached,
      latencyMs: totalDuration.toFixed(2),
    });

    // Record successful workflow execution for Prometheus
    endWorkflowTimer();
    recordWorkflowExecution("firecrawl", "success");

    return NextResponse.json(
      {
        success: true,
        data: result,
        // Performance info for debugging
        performance: {
          totalLatencyMs: Math.round(totalDuration * 100) / 100,
          cached,
          cacheLatencyMs: Math.round(cacheLatencyMs * 100) / 100,
          breakdown: {
            parsing: Math.round(latencyBreakdown.parsing * 100) / 100,
            cache: Math.round(latencyBreakdown.cache * 100) / 100,
            externalApi: Math.round(latencyBreakdown.externalApi * 100) / 100,
          },
        },
        // Cache stats for visibility
        cacheStats: cacheStats.getStats(),
      },
      {
        status: 200,
        headers: {
          "X-Response-Time": `${totalDuration.toFixed(2)}ms`,
          "X-Cache": cached ? "HIT" : "MISS",
        },
      }
    );
  } catch (error) {
    const totalDuration = performance.now() - totalStart;

    // Determine error type
    let errorType: "timeout" | "external_api" | "internal" = "internal";
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        errorType = "timeout";
      } else if (
        error.message.includes("Firecrawl") ||
        error.message.includes("API")
      ) {
        errorType = "external_api";
      }
    }

    metrics.record({
      timestamp: Date.now(),
      endpoint: ENDPOINT,
      totalDuration,
      latencyBreakdown,
      success: false,
      statusCode: 500,
      errorType,
      cached: false,
    });

    logger.error("Error scraping URL", { error, latencyMs: totalDuration });

    // Record failed workflow execution for Prometheus
    endWorkflowTimer();
    const isTimeout = error instanceof Error && error.message.includes("timeout");
    recordWorkflowExecution("firecrawl", isTimeout ? "timeout" : "failure");

    const errorMessage =
      error instanceof Error ? error.message : "Failed to scrape URL";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      {
        status: 500,
        headers: { "X-Response-Time": `${totalDuration.toFixed(2)}ms` },
      }
    );
  }
}

// Export the POST handler wrapped with Prometheus metrics
export const POST = withMetrics(ENDPOINT, handler);
