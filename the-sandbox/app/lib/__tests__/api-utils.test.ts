import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '../api-utils';

function makeRequest(method = 'GET', path = '/api/test') {
  return new NextRequest(new URL(path, 'http://localhost:3000'), { method });
}

describe('withErrorHandling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('passes through successful responses', async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrapped = withErrorHandling(handler);

    const res = await wrapped(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  it('catches thrown errors and returns 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = vi.fn(async () => {
      throw new Error('DB connection failed');
    });
    const wrapped = withErrorHandling(handler);

    const res = await wrapped(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'DB connection failed' });
  });

  it('catches non-Error throws and returns generic message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = vi.fn(async () => {
      throw 'some string';
    });
    const wrapped = withErrorHandling(handler);

    const res = await wrapped(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'Internal server error' });
  });

  it('passes request and context through to the handler', async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrapped = withErrorHandling(handler);

    const req = makeRequest('POST', '/api/foo');
    const ctx = { params: { id: '42' } };
    await wrapped(req, ctx);

    expect(handler).toHaveBeenCalledWith(req, ctx);
  });

  it('logs errors to console.error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('unexpected');
    const handler = vi.fn(async () => { throw err; });
    const wrapped = withErrorHandling(handler);

    await wrapped(makeRequest('GET', '/api/test'));

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toMatch(/\[API Error\] GET \/api\/test:/);
    expect(spy.mock.calls[0][1]).toBe(err);
  });
});
