import { langfuse } from './langfuse';

interface TraceOptions {
  name: string;
  userId?: string;
  input?: any;
  metadata?: Record<string, any>;
}

interface TraceResult {
  output?: any;
  metadata?: Record<string, any>;
  error?: Error;
}

/**
 * Simple wrapper to trace API operations
 * Automatically handles success/error and flushing
 */
export async function traceOperation<T>(
  options: TraceOptions,
  operation: () => Promise<T>
): Promise<T> {
  const trace = langfuse.trace({
    name: options.name,
    userId: options.userId,
    input: options.input,
    metadata: {
      timestamp: new Date().toISOString(),
      ...options.metadata,
    },
  });

  const startTime = Date.now();

  try {
    const result = await operation();

    trace.update({
      output: result,
      metadata: {
        duration: Date.now() - startTime,
        status: 'success',
      },
    });

    await langfuse.flushAsync();
    return result;

  } catch (error) {
    trace.update({
      level: 'ERROR',
      statusMessage: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        duration: Date.now() - startTime,
        status: 'error',
        error: error instanceof Error ? error.stack : String(error),
      },
    });

    await langfuse.flushAsync();
    throw error;
  }
}