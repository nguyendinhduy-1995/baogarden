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

    const tables = await prisma.restaurantTable.findMany({
      include: {
        area: true,
        bookings: {
          where: dateFilter,
          select: {
            id: true,
            status: true,
            guestCount: true,
            minSpend: true,
          },
        },
      },
      orderBy: [{ area: { name: 'asc' } }, { code: 'asc' }],
    });

    const tablePerformance = tables.map((table) => {
      const totalBookings = table.bookings.length;
      const confirmedBookings = table.bookings.filter((b) =>
        ['CONFIRMED', 'ARRIVED', 'COMPLETED'].includes(b.status)
      ).length;
      const totalGuests = table.bookings.reduce((sum, b) => sum + b.guestCount, 0);
      const estimatedRevenue = table.bookings
        .filter((b) => ['CONFIRMED', 'ARRIVED', 'COMPLETED'].includes(b.status))
        .reduce((sum, b) => sum + Number(b.minSpend), 0);

      return {
        table: {
          id: table.id,
          code: table.code,
          name: table.name,
          minGuests: table.minGuests,
          maxGuests: table.maxGuests,
        },
        area: {
          id: table.area.id,
          name: table.area.name,
        },
        totalBookings,
        confirmedBookings,
        totalGuests,
        estimatedRevenue,
      };
    });

    const areaMap = new Map<
      string,
      { id: string; name: string; totalBookings: number; totalGuests: number; estimatedRevenue: number }
    >();

    for (const tp of tablePerformance) {
      const existing = areaMap.get(tp.area.id);
      if (existing) {
        existing.totalBookings += tp.totalBookings;
        existing.totalGuests += tp.totalGuests;
        existing.estimatedRevenue += tp.estimatedRevenue;
      } else {
        areaMap.set(tp.area.id, {
          id: tp.area.id,
          name: tp.area.name,
          totalBookings: tp.totalBookings,
          totalGuests: tp.totalGuests,
          estimatedRevenue: tp.estimatedRevenue,
        });
      }
    }

    const areaPerformance = [...areaMap.values()].sort(
      (a, b) => b.totalBookings - a.totalBookings
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          tables: tablePerformance,
          areas: areaPerformance,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
