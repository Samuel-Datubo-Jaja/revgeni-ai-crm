import { describe, it, expect, vi } from 'vitest';
import { traceOperation } from '../langfuse-helpers';

vi.mock('../langfuse', () => ({
  langfuse: {
    trace: vi.fn(() => ({
      update: vi.fn(),
    })),
    flushAsync: vi.fn(),
  },
}));

describe('Langfuse Helpers', () => {
  it('executes operation successfully', async () => {
    const mockOperation = vi.fn(async () => 'test-result');

    const result = await traceOperation(
      { name: 'test', userId: '123' },
      mockOperation
    );

    expect(result).toBe('test-result');
    expect(mockOperation).toHaveBeenCalledOnce();
  });

  it('handles errors correctly', async () => {
    const mockError = new Error('Test error');
    const mockOperation = vi.fn(async () => {
      throw mockError;
    });

    await expect(
      traceOperation({ name: 'test' }, mockOperation)
    ).rejects.toThrow('Test error');
  });

  it('includes metadata in trace', async () => {
    const mockOperation = vi.fn(async () => 'done');

    await traceOperation(
      {
        name: 'test-op',
        userId: 'user-123',
        input: { query: 'test' },
        metadata: { version: '1.0' },
      },
      mockOperation
    );

    expect(mockOperation).toHaveBeenCalledOnce();
  });
});