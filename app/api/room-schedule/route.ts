import { NextRequest, NextResponse } from 'next/server';
import { getRoomSchedule } from '@/lib/sict';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const number = req.nextUrl.searchParams.get('number');
  if (!number) return NextResponse.json({ error: 'Missing number' }, { status: 400 });
  try {
    const data = await getRoomSchedule(number);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
