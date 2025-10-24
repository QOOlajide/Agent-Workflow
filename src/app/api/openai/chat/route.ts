import { NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/config/env";
import { Logger } from "@/utils/logger";

const logger = new Logger("API:OpenAI:Chat");

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
  };
  error?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { prompt, model, connectedData } = body;
    
    logger.info("Received chat request", {
      model,
      hasConnectedData: !!connectedData,
      promptLength: prompt?.length || 0,
    });
    
    if (!prompt || !prompt.trim()) {
      logger.warn("Missing or empty prompt in request");
      return NextResponse.json<ChatResponse>(
        {
          success: false,
          error: "Prompt is required",
        },
        { status: 400 }
      );
    }
    
    if (!model || !model.trim()) {
      logger.warn("Missing or empty model in request");
      return NextResponse.json<ChatResponse>(
        {
          success: false,
          error: "Model is required",
        },
        { status: 400 }
      );
    }
    
    const finalInput = connectedData
      ? `${connectedData}\n\n---\n\n${prompt}`
      : prompt;
    
    logger.info("Calling OpenAI API", { model });
    
    const response = await openai.responses.create({
      model: model,
      input: finalInput,
    });
    
    logger.info("OpenAI API call successful");
    
    return NextResponse.json<ChatResponse>(
      {
        success: true,
        data: {
          response: response.output_text || "",
          model: model,
          tokensUsed: response.usage?.total_tokens,
        },
      },
      { status: 200 }
    );
    
  } catch (error) {
    logger.error("Error calling OpenAI API", { error });
    
    const errorMessage = error instanceof Error ? error.message : "Failed to generate response";
    
    return NextResponse.json<ChatResponse>(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

