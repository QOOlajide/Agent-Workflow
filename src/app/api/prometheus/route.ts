/**
 * PROMETHEUS METRICS ENDPOINT
 *
 * GET /api/prometheus - Returns metrics in Prometheus exposition format
 *
 * SECURITY:
 * - This endpoint is intended for INTERNAL use only
 * - Prometheus should scrape via Docker internal network (app:3000)
 * - Requests with X-Forwarded-For or X-Real-IP headers are rejected
 * - Do NOT expose this endpoint through a public reverse proxy
 *
 * This endpoint returns all registered metrics including:
 * - Default Node.js process metrics (CPU, memory, event loop lag)
 * - HTTP request metrics (requests, errors, latency)
 * - Agent/workflow execution metrics
 * - Cache hit/miss metrics
 */

import { NextRequest } from "next/server";
import { getMetrics, getContentType } from "@/lib/prometheus";

/**
 * Check if the request should be allowed access to metrics.
 *
 * Security model:
 * - Development mode: Allow all requests (for local testing)
 * - Production: Only allow internal Docker network requests (no proxy headers)
 */
function isExternalRequest(request: NextRequest): boolean {
  // In development mode, allow all requests for easy testing
  // Next.js Turbopack adds proxy headers even for localhost requests
  if (process.env.NODE_ENV === "development") {
    return false;
  }

  // In production: reject if request came through a reverse proxy
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return !!(forwardedFor || realIp);
}

export async function GET(request: NextRequest) {
  // Security check: Reject requests that appear to be proxied externally
  if (isExternalRequest(request)) {
    return new Response(
      "Forbidden: /api/prometheus is for internal use only. Do not expose through a reverse proxy.",
      {
        status: 403,
        headers: {
          "Content-Type": "text/plain",
        },
      }
    );
  }

  try {
    // Get all metrics in Prometheus exposition format
    const metrics = await getMetrics();

    return new Response(metrics, {
      status: 200,
      headers: {
        "Content-Type": getContentType(),
        // Prevent caching of metrics
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating Prometheus metrics:", error);

    return new Response("Error generating metrics", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}

