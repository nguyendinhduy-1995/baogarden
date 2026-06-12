import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, requireRole } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    if (!requireRole(currentUser.role, ['ADMIN', 'MANAGER'])) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const dateFilter: { bookingDate?: { gte?: Date; lte?: Date } } = {};
    if (from || to) {
      dateFilter.bookingDate = {};
      if (from) dateFilter.bookingDate.gte = new Date(from);
      if (to) dateFilter.bookingDate.lte = new Date(to);
    }

    const bookingUsers = await prisma.user.findMany({
      where: { role: 'BOOKING' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    const bookings = await prisma.booking.findMany({
      where: {
        ...dateFilter,
        createdByUserId: { in: bookingUsers.map((u) => u.id) },
      },
      select: {
        id: true,
        status: true,
        minSpend: true,
        createdByUserId: true,
      },
    });

    const userStatsMap = new Map<
      string,
      {
        total: number;
        confirmed: number;
        arrived: number;
        cancelled: number;
        noShow: number;
        completed: number;
        estimatedRevenue: number;
      }
    >();

    for (const user of bookingUsers) {
      userStatsMap.set(user.id, {
        total: 0,
        confirmed: 0,
        arrived: 0,
        cancelled: 0,
        noShow: 0,
        completed: 0,
        estimatedRevenue: 0,
      });
    }

    for (const booking of bookings) {
      if (!booking.createdByUserId) continue;
      const stats = userStatsMap.get(booking.createdByUserId);
      if (!stats) continue;

      stats.total++;

      switch (booking.status) {
        case 'CONFIRMED':
          stats.confirmed++;
          stats.estimatedRevenue += Number(booking.minSpend);
          break;
        case 'ARRIVED':
          stats.arrived++;
          stats.estimatedRevenue += Number(booking.minSpend);
          break;
        case 'COMPLETED':
          stats.completed++;
          stats.estimatedRevenue += Number(booking.minSpend);
          break;
        case 'CANCELLED':
          stats.cancelled++;
          break;
        case 'NO_SHOW':
          stats.noShow++;
          break;
      }
    }

    const userPerformance = bookingUsers.map((user) => {
      const stats = userStatsMap.get(user.id)!;
      const arrivedAndCompleted = stats.arrived + stats.completed;
      const relevantForRate = stats.total - (stats.total - stats.confirmed - stats.arrived - stats.completed - stats.cancelled - stats.noShow);
      const arrivalRate = relevantForRate > 0
        ? Math.round((arrivedAndCompleted / relevantForRate) * 10000) / 100
        : 0;

      return {
        user,
        ...stats,
        arrivalRate,
      };
    });

    userPerformance.sort((a, b) => b.total - a.total);

    return NextResponse.json(
      { success: true, data: userPerformance },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
