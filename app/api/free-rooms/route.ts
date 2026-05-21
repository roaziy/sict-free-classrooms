import { NextRequest, NextResponse } from 'next/server';
import { getFreeRooms } from '@/lib/sict';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const includeAll = searchParams.get('all') === '1';
    const periodParam = searchParams.get('period');
    const overridePeriod = periodParam ? parseInt(periodParam, 10) : null;
    const data = await getFreeRooms(includeAll, overridePeriod);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
