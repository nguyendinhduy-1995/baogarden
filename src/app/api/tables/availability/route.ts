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
    const date = searchParams.get('date');
    const time = searchParams.get('time');

    if (!date || !time) {
      return NextResponse.json(
        { success: false, error: 'Ngày và giờ là bắt buộc (?date=YYYY-MM-DD&time=HH:mm)' },
        { status: 400 }
      );
    }

    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Ngày không hợp lệ' },
        { status: 400 }
      );
    }

    const tables = await prisma.restaurantTable.findMany({
      where: {
        status: { not: 'INACTIVE' },
      },
      include: {
        area: true,
        bookings: {
          where: {
            bookingDate: bookingDate,
            bookingTime: time,
            status: { in: ['PENDING', 'CONFIRMED', 'ARRIVED'] },
          },
          select: {
            id: true,
            bookingCode: true,
            status: true,
            guestCount: true,
            createdAt: true,
            customer: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ area: { name: 'asc' } }, { code: 'asc' }],
    });

    const tablesWithAvailability = tables.map((table) => {
      const activeBooking = table.bookings[0] || null;
      return {
        ...table,
        isAvailable: !activeBooking,
        isBooked: !!activeBooking,
        bookingStatus: activeBooking?.status || null,
        bookingCode: activeBooking?.bookingCode || null,
        bookingCreatedAt: activeBooking?.createdAt || null,
        bookingGuestCount: activeBooking?.guestCount || null,
      };
    });

    return NextResponse.json(
      { success: true, data: tablesWithAvailability },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
