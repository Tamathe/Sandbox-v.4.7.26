import { NextRequest, NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (req: NextRequest, context?: any) => Promise<NextResponse | Response>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InnerHandler = (req: NextRequest, context?: any) => Promise<NextResponse | Response | undefined>;

export function withErrorHandling(handler: InnerHandler): RouteHandler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: NextRequest, context?: any) => {
    try {
      const result = await handler(req, context);
      return result ?? NextResponse.json({ error: 'No response' }, { status: 500 });
    } catch (error) {
      console.error(`[API Error] ${req.method} ${req.nextUrl.pathname}:`, error);
      const status =
        typeof (error as { status?: unknown })?.status === 'number'
          ? (error as { status: number }).status
          : 500;
      const message =
        status < 500 && error instanceof Error
          ? error.message
          : process.env.NODE_ENV === 'development' && error instanceof Error
          ? error.message
          : 'Internal server error';
      return NextResponse.json({ error: message }, { status });
    }
  };
}
