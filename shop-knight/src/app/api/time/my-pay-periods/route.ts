import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const PAY_PERIOD_DAYS = 14;
const WEEK_DAYS = 7;
// Monday anchor for bi-weekly periods
const ANCHOR_UTC = new Date(Date.UTC(2026, 0, 5, 0, 0, 0));

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function getCurrentPeriodStart(now: Date) {
  const days = Math.floor((startOfUtcDay(now).getTime() - ANCHOR_UTC.getTime()) / DAY_MS);
  const periodIndex = Math.floor(days / PAY_PERIOD_DAYS);
  return new Date(ANCHOR_UTC.getTime() + periodIndex * PAY_PERIOD_DAYS * DAY_MS);
}

function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * DAY_MS);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = session.user.companyId;
  if (!companyId) return NextResponse.json({ error: 'No active company selected' }, { status: 400 });

  const url = new URL(request.url);
  const periodsRequested = Math.min(12, Math.max(1, Number(url.searchParams.get('periods') || 6)));

  const now = new Date();
  const currentStart = getCurrentPeriodStart(now);
  const earliestStart = addDays(currentStart, -PAY_PERIOD_DAYS * (periodsRequested - 1));
  const latestEnd = addDays(currentStart, PAY_PERIOD_DAYS);

  const entries = await prisma.timeEntry.findMany({
    where: {
      companyId,
      userId: session.user.id,
      clockInAt: { gte: earliestStart, lt: latestEnd },
    },
    orderBy: { clockInAt: 'desc' },
    select: {
      id: true,
      clockInAt: true,
      clockOutAt: true,
      minutesWorked: true,
    },
  });

  const periods = Array.from({ length: periodsRequested }).map((_, idx) => {
    const periodStart = addDays(currentStart, -PAY_PERIOD_DAYS * idx);
    const periodEnd = addDays(periodStart, PAY_PERIOD_DAYS);
    const week1End = addDays(periodStart, WEEK_DAYS);

    let week1Minutes = 0;
    let week2Minutes = 0;

    for (const entry of entries) {
      if (entry.clockInAt < periodStart || entry.clockInAt >= periodEnd) continue;
      const minutes = entry.minutesWorked ?? (entry.clockOutAt ? Math.max(0, Math.round((entry.clockOutAt.getTime() - entry.clockInAt.getTime()) / 60000)) : 0);
      if (entry.clockInAt < week1End) week1Minutes += minutes;
      else week2Minutes += minutes;
    }

    return {
      periodIndex: idx,
      isCurrent: idx === 0,
      start: periodStart.toISOString(),
      endExclusive: periodEnd.toISOString(),
      week1: {
        start: periodStart.toISOString(),
        endExclusive: week1End.toISOString(),
        minutes: week1Minutes,
        hours: Number((week1Minutes / 60).toFixed(2)),
      },
      week2: {
        start: week1End.toISOString(),
        endExclusive: periodEnd.toISOString(),
        minutes: week2Minutes,
        hours: Number((week2Minutes / 60).toFixed(2)),
      },
      totalMinutes: week1Minutes + week2Minutes,
      totalHours: Number(((week1Minutes + week2Minutes) / 60).toFixed(2)),
    };
  });

  return NextResponse.json({
    anchorUtc: ANCHOR_UTC.toISOString(),
    payPeriodDays: PAY_PERIOD_DAYS,
    periods,
  });
}
