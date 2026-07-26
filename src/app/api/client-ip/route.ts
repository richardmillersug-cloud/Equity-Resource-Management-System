import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function firstForwarded(value: string | null): string | undefined {
  if (!value) return undefined;
  return value.split(',')[0]?.trim() || undefined;
}

export async function GET(request: NextRequest) {
  const fromHeaders =
    firstForwarded(request.headers.get('x-forwarded-for')) ||
    request.headers.get('x-real-ip') ||
    undefined;

  const fromRequest = (request as NextRequest & { ip?: string }).ip;
  const ip = fromHeaders || fromRequest || 'unknown';

  return NextResponse.json({ ip });
}
