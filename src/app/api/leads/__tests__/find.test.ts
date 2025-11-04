import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock environment variables BEFORE importing the route
beforeAll(() => {
  process.env.EXA_API_KEY = 'test-key';
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.OPENAI_API_KEY = 'test-key';
});

// Mock the lead agent to avoid real API calls
vi.mock('@/lib/agents/lead-agent', () => ({
  findLeadsStructured: vi.fn(async () => [
    {
      name: 'Test Company',
      domain: 'test.com',
      industry: 'AI',
      geography: 'UK',
      size: 'startup',
      score: 85,
    }
  ]),
}));

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: 'test-user-123' })),
  currentUser: vi.fn(() => Promise.resolve({
    id: 'test-user-123',
    emailAddresses: [{ emailAddress: 'test@example.com' }]
  })),
}));

// Mock Langfuse
vi.mock('@/lib/langfuse-helpers', () => ({
  traceOperation: vi.fn(async (options, operation) => await operation()),
}));

// Now import after mocks
import { GET } from '../find/route';

describe('Lead Finder API', () => {
  it('GET returns status', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.message).toContain('Lead finding API');
  });
});