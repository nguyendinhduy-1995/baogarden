import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
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
        id: true,
        status: true,
        guestCount: true,
        minSpend: true,
        createdByUserId: true,
      },
    });

    const totalBookings = bookings.length;

    const byStatus: Record<string, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      ARRIVED: 0,
      CANCELLED: 0,
      NO_SHOW: 0,
      COMPLETED: 0,
    };

    let totalGuests = 0;
    let estimatedRevenue = 0;
    let arrivedCount = 0;
    let cancelledCount = 0;

    for (const booking of bookings) {
      byStatus[booking.status]++;
      totalGuests += booking.guestCount;

      if (['CONFIRMED', 'ARRIVED', 'COMPLETED'].includes(booking.status)) {
        estimatedRevenue += Number(booking.minSpend);
      }

      if (['ARRIVED', 'COMPLETED'].includes(booking.status)) {
        arrivedCount++;
      }

      if (booking.status === 'CANCELLED') {
        cancelledCount++;
      }
    }

    const relevantForRate = totalBookings - byStatus['PENDING'];
    const arrivalRate = relevantForRate > 0
      ? Math.round((arrivedCount / relevantForRate) * 10000) / 100
      : 0;
    const cancellationRate = relevantForRate > 0
      ? Math.round((cancelledCount / relevantForRate) * 10000) / 100
      : 0;

    const userBookingCounts = new Map<string, number>();
    for (const booking of bookings) {
      if (booking.createdByUserId) {
        userBookingCounts.set(
          booking.createdByUserId,
          (userBookingCounts.get(booking.createdByUserId) || 0) + 1
        );
      }
    }

    const topUserIds = [...userBookingCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId]) => userId);

    const topUsers = topUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: topUserIds } },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        })
      : [];

    const topBookingUsers = topUserIds.map((userId) => {
      const user = topUsers.find((u) => u.id === userId);
      return {
        user,
        bookingCount: userBookingCounts.get(userId) || 0,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          totalBookings,
          byStatus,
          totalGuests,
          estimatedRevenue,
          arrivalRate,
          cancellationRate,
          topBookingUsers,
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
