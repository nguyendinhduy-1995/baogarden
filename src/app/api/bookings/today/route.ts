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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookings = await prisma.booking.findMany({
      where: {
        bookingDate: today,
      },
      include: {
        customer: true,
        table: {
          include: { area: true },
        },
        createdByUser: {
          select: { id: true, name: true, email: true, role: true },
        },
        confirmedByUser: {
          select: { id: true, name: true, email: true, role: true },
        },
        checkedInByUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { bookingTime: 'asc' },
    });

    return NextResponse.json(
      { success: true, data: bookings },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
