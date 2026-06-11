import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay() + 1);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Bookings data
    const [todayBookings, weekBookings, monthBookings, lastMonthBookings, allCustomers, recentBookings] = await Promise.all([
      prisma.booking.findMany({ where: { bookingDate: { gte: today } }, select: { id: true, status: true, guestCount: true, source: true } }),
      prisma.booking.findMany({ where: { bookingDate: { gte: thisWeekStart } }, select: { id: true, status: true, guestCount: true, source: true } }),
      prisma.booking.findMany({ where: { createdAt: { gte: thisMonthStart } }, select: { id: true, status: true, guestCount: true, source: true, createdAt: true } }),
      prisma.booking.findMany({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }, select: { id: true, status: true, guestCount: true, source: true } }),
      prisma.customer.groupBy({ by: ['customerType'], _count: { id: true } }),
      prisma.booking.findMany({
        take: 10, orderBy: { createdAt: 'desc' },
        select: { bookingCode: true, status: true, guestCount: true, source: true, bookingDate: true, bookingTime: true, createdAt: true, customer: { select: { name: true, phone: true, customerType: true } }, table: { select: { code: true } } },
      }),
    ]);

    // Source breakdown
    const sourceCount = (bookings: Array<{ source: string }>) => {
      const map: Record<string, number> = {};
      for (const b of bookings) { map[b.source] = (map[b.source] || 0) + 1; }
      return map;
    };

    // Status breakdown
    const statusCount = (bookings: Array<{ status: string }>) => {
      const map: Record<string, number> = {};
      for (const b of bookings) { map[b.status] = (map[b.status] || 0) + 1; }
      return map;
    };

    // Guests total
    const guestTotal = (bookings: Array<{ guestCount: number; status: string }>) =>
      bookings.filter(b => !['CANCELLED', 'NO_SHOW'].includes(b.status)).reduce((s, b) => s + b.guestCount, 0);

    // Conversion rate (confirmed+arrived+completed / total)
    const conversionRate = (bookings: Array<{ status: string }>) => {
      if (bookings.length === 0) return 0;
      const converted = bookings.filter(b => ['CONFIRMED', 'ARRIVED', 'COMPLETED'].includes(b.status)).length;
      return Math.round((converted / bookings.length) * 10000) / 100;
    };

    // Daily trend (last 7 days)
    const dailyTrend: Array<{ date: string; count: number; guests: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dayBookings = await prisma.booking.findMany({
        where: { bookingDate: { gte: d, lt: next } },
        select: { guestCount: true, status: true },
      });
      dailyTrend.push({
        date: d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }),
        count: dayBookings.length,
        guests: dayBookings.filter(b => !['CANCELLED', 'NO_SHOW'].includes(b.status)).reduce((s, b) => s + b.guestCount, 0),
      });
    }

    // Customer distribution
    const customerDist: Record<string, number> = {};
    for (const c of allCustomers) { customerDist[c.customerType] = c._count.id; }

    // Table area popularity
    const tableAreaPopularity = await prisma.booking.groupBy({
      by: ['tableId'],
      _count: { id: true },
      where: { createdAt: { gte: thisMonthStart } },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const topTableIds = tableAreaPopularity.map(t => t.tableId);
    const topTables = topTableIds.length > 0
      ? await prisma.restaurantTable.findMany({
          where: { id: { in: topTableIds } },
          select: { id: true, code: true, area: { select: { name: true } } },
        })
      : [];

    const popularTables = tableAreaPopularity.map(tp => {
      const table = topTables.find(t => t.id === tp.tableId);
      return { code: table?.code || '?', area: table?.area?.name || '?', bookings: tp._count.id };
    });

    // Peak hours
    const peakHours: Record<string, number> = {};
    const recentHourBookings = await prisma.booking.findMany({
      where: { createdAt: { gte: thisMonthStart } },
      select: { bookingTime: true },
    });
    for (const b of recentHourBookings) {
      const hour = b.bookingTime?.split(':')[0] || 'N/A';
      peakHours[hour + ':00'] = (peakHours[hour + ':00'] || 0) + 1;
    }

    // Growth rate vs last month
    const growthRate = lastMonthBookings.length > 0
      ? Math.round(((monthBookings.length - lastMonthBookings.length) / lastMonthBookings.length) * 10000) / 100
      : monthBookings.length > 0 ? 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        today: {
          bookings: todayBookings.length,
          guests: guestTotal(todayBookings),
          byStatus: statusCount(todayBookings),
          bySource: sourceCount(todayBookings),
          conversionRate: conversionRate(todayBookings),
        },
        week: {
          bookings: weekBookings.length,
          guests: guestTotal(weekBookings),
          bySource: sourceCount(weekBookings),
          conversionRate: conversionRate(weekBookings),
        },
        month: {
          bookings: monthBookings.length,
          guests: guestTotal(monthBookings),
          bySource: sourceCount(monthBookings),
          conversionRate: conversionRate(monthBookings),
          growthRate,
        },
        dailyTrend,
        customerDistribution: customerDist,
        popularTables,
        peakHours,
        recentBookings: recentBookings.map(b => ({
          code: b.bookingCode,
          customer: b.customer.name,
          phone: b.customer.phone,
          customerType: b.customer.customerType,
          table: b.table.code,
          date: b.bookingDate,
          time: b.bookingTime,
          guests: b.guestCount,
          status: b.status,
          source: b.source,
          createdAt: b.createdAt,
        })),
      },
    });
  } catch (e) {
    console.error('Marketing analytics error:', e);
    return NextResponse.json({ success: false, error: 'Đã xảy ra lỗi server' }, { status: 500 });
  }
}
