import { langfuse } from './langfuse';

type MetadataRecord = Record<string, string | number | boolean | null | undefined>;

interface TraceOptions<TInput = unknown> {
  name: string;
  userId?: string;
  input?: TInput;
  metadata?: MetadataRecord;
}

/**
 * Simple wrapper to trace API operations
 * Automatically handles success/error and flushing
 */
export async function traceOperation<T>(
  options: TraceOptions<unknown>,
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    trace.update({
      metadata: {
        duration: Date.now() - startTime,
        status: 'error',
        level: 'ERROR',
        errorMessage: errorMessage,
        error: errorStack || errorMessage,
      },
    });

    await langfuse.flushAsync();
    throw error;
  }
}

/**
 * Type-safe wrapper for traced operations with generic input/output types
 */
export async function traceOperationTyped<TInput, TOutput>(
  options: TraceOptions<TInput>,
  operation: () => Promise<TOutput>
): Promise<TOutput> {
  return traceOperation(options, operation);
}