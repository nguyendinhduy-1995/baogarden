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

    const bookings = await prisma.booking.findMany({
      where: dateFilter,
      select: {
        bookingTime: true,
        status: true,
        guestCount: true,
      },
    });

    const hourlyData = new Map<
      string,
      { hour: string; totalBookings: number; totalGuests: number; confirmedBookings: number }
    >();

    for (let h = 0; h < 24; h++) {
      const hourStr = h.toString().padStart(2, '0') + ':00';
      hourlyData.set(hourStr, {
        hour: hourStr,
        totalBookings: 0,
        totalGuests: 0,
        confirmedBookings: 0,
      });
    }

    for (const booking of bookings) {
      const hourPart = booking.bookingTime.substring(0, 2);
      const hourKey = hourPart + ':00';
      const data = hourlyData.get(hourKey);
      if (data) {
        data.totalBookings++;
        data.totalGuests += booking.guestCount;
        if (['CONFIRMED', 'ARRIVED', 'COMPLETED'].includes(booking.status)) {
          data.confirmedBookings++;
        }
      }
    }

    const hourlyPerformance = [...hourlyData.values()].filter(
      (h) => h.totalBookings > 0
    );

    const peakHour = hourlyPerformance.length > 0
      ? hourlyPerformance.reduce((max, h) =>
          h.totalBookings > max.totalBookings ? h : max
        )
      : null;

    return NextResponse.json(
      {
        success: true,
        data: {
          hourly: [...hourlyData.values()],
          peakHour,
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
