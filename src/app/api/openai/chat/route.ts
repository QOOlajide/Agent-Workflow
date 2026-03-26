/**
 * OPENAI CHAT API ROUTE - With Enhanced Metrics Tracking
 *
 * Note: OpenAI responses are generally not cached because:
 * - Each prompt may need a unique response
 * - Caching would return stale AI responses
 * But we still track comprehensive metrics!
 *
 * Prometheus metrics instrumentation included.
 */

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/config/env";
import { Logger } from "@/utils/logger";
import { metrics } from "@/utils/metrics";
import {
  withMetrics,
  startWorkflowTimer,
  recordWorkflowExecution,
} from "@/lib/prometheus";

const logger = new Logger("API:OpenAI:Chat");
const ENDPOINT = "/api/openai/chat";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

type ChatRequest = {
  prompt: string;
  model: string;
  connectedData?: string;
};

type ChatResponse = {
  success: boolean;
  data?: {
    response: string;
    model: string;
    tokensUsed?: number;
    latencyMs?: number;
  };
  error?: string;
  performance?: {
    totalLatencyMs: number;
    breakdown: {
      parsing: number;
      externalApi: number;
      processing: number;
    };
  };
};

/**
 * POST handler wrapped with Prometheus metrics instrumentation.
 * The withMetrics wrapper automatically records:
 * - http_requests_total{method="POST", route="/api/openai/chat", status_code}
 * - http_request_duration_seconds{method="POST", route="/api/openai/chat"}
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
  const endWorkflowTimer = startWorkflowTimer("openai");

  try {
    // ============================================================
    // STEP 1: PARSE REQUEST
    // ============================================================
    const parseStart = performance.now();
    const body = (await request.json()) as ChatRequest;
    const { prompt, model, connectedData } = body;
    latencyBreakdown.parsing = performance.now() - parseStart;

    logger.info("Received chat request", {
      model,
      hasConnectedData: !!connectedData,
      promptLength: prompt?.length || 0,
    });

    // ============================================================
    // STEP 2: VALIDATE
    // ============================================================
    if (!prompt || !prompt.trim()) {
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
      recordWorkflowExecution("openai", "failure");

      logger.warn("Missing or empty prompt in request");
      return NextResponse.json<ChatResponse>(
        { success: false, error: "Prompt is required" },
        {
          status: 400,
          headers: { "X-Response-Time": `${totalDuration.toFixed(2)}ms` },
        }
      );
    }

    if (!model || !model.trim()) {
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
      recordWorkflowExecution("openai", "failure");

      logger.warn("Missing or empty model in request");
      return NextResponse.json<ChatResponse>(
        { success: false, error: "Model is required" },
        {
          status: 400,
          headers: { "X-Response-Time": `${totalDuration.toFixed(2)}ms` },
        }
      );
    }

    // ============================================================
    // STEP 3: CALL OPENAI API
    // ============================================================
    const finalInput = connectedData
      ? `${connectedData}\n\n---\n\n${prompt}`
      : prompt;

    logger.info("Calling OpenAI API", { model });

    const apiStart = performance.now();
    const response = await openai.responses.create({
      model: model,
      input: finalInput,
    });
    latencyBreakdown.externalApi = performance.now() - apiStart;

    // ============================================================
    // STEP 4: PROCESS RESPONSE AND RECORD METRICS
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
      cached: false, // OpenAI responses are not cached
    });

    logger.info("OpenAI API call successful", {
      latencyMs: totalDuration.toFixed(2),
      tokensUsed: response.usage?.total_tokens,
    });

    // Record successful workflow execution for Prometheus
    endWorkflowTimer();
    recordWorkflowExecution("openai", "success");

    return NextResponse.json<ChatResponse>(
      {
        success: true,
        data: {
          response: response.output_text || "",
          model: model,
          tokensUsed: response.usage?.total_tokens,
          latencyMs: Math.round(totalDuration * 100) / 100,
        },
        performance: {
          totalLatencyMs: Math.round(totalDuration * 100) / 100,
          breakdown: {
            parsing: Math.round(latencyBreakdown.parsing * 100) / 100,
            externalApi: Math.round(latencyBreakdown.externalApi * 100) / 100,
            processing: Math.round(latencyBreakdown.processing * 100) / 100,
          },
        },
      },
      {
        status: 200,
        headers: { "X-Response-Time": `${totalDuration.toFixed(2)}ms` },
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
        error.message.includes("OpenAI") ||
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

    logger.error("Error calling OpenAI API", { error, latencyMs: totalDuration });

    // Record failed workflow execution for Prometheus
    endWorkflowTimer();
    const isTimeout = error instanceof Error && error.message.includes("timeout");
    recordWorkflowExecution("openai", isTimeout ? "timeout" : "failure");

    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate response";

    return NextResponse.json<ChatResponse>(
      { success: false, error: errorMessage },
      {
        status: 500,
        headers: { "X-Response-Time": `${totalDuration.toFixed(2)}ms` },
      }
    );
  }
}

// Export the POST handler wrapped with Prometheus metrics
export const POST = withMetrics(ENDPOINT, handler);