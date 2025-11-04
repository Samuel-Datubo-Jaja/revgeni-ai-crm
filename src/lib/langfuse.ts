// src/lib/langfuse.ts
import { Langfuse } from 'langfuse';

/**
 * Initialize Langfuse for LLM monitoring
 * Track OpenAI API calls, costs, and latency
 */
export const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',

  // Development settings
  flushAt: 1, // Send immediately (good for dev/demo)
  flushInterval: 1000, // Flush every second

  // Production settings (comment out for now)
  // flushAt: 10,
  // flushInterval: 10000,
});

/**
 * Track OpenAI AI Worker calls
 */
export function trackAICall(params: {
  name: string;
  input: string;
  output: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  duration?: number;
}) {
  if (!process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY) {
    return null; // Disabled if no key
  }

  const trace = langfuse.trace({
    name: params.name,
    userId: 'system',
    metadata: {
      model: params.model,
      type: 'ai-worker',
      provider: 'openai',
    },
  });

  trace.generation({
    name: params.name,
    model: params.model,
    input: params.input,
    output: params.output,
    usage: params.usage ? {
      input: params.usage.inputTokens,
      output: params.usage.outputTokens,
      total: params.usage.inputTokens + params.usage.outputTokens,
      unit: 'TOKENS',
    } : undefined,
    endTime: new Date(Date.now() + (params.duration || 0)),
  });

  return trace;
}

/**
 * Flush pending events before serverless function ends
 */
export async function flushLangfuse() {
  if (!process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY) {
    return;
  }
  await langfuse.flush();
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    console.log('🔄 Flushing Langfuse before shutdown...');
    await langfuse.shutdownAsync();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('🔄 Flushing Langfuse before shutdown...');
    await langfuse.shutdownAsync();
    process.exit(0);
  });
}

// Debug: Check if env vars are loaded
console.log('🔍 Langfuse env check:', {
  secretKey: process.env.LANGFUSE_SECRET_KEY ? '✅ Set' : '❌ Missing',
  publicKey: process.env.LANGFUSE_PUBLIC_KEY ? '✅ Set' : '❌ Missing',
  host: process.env.LANGFUSE_HOST || 'Using default',
});

// Export for convenience
export default langfuse;