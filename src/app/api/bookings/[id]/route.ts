import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
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
        events: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy đặt bàn' },
        { status: 404 }
      );
    }

    if (currentUser.role === 'BOOKING' && booking.createdByUserId !== currentUser.id) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: true, data: booking },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { note, guestCount, tableId, bookingTime, bookingDate, depositAmount, minSpend } = body;

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy đặt bàn' },
        { status: 404 }
      );
    }

    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(booking.status)) {
      return NextResponse.json(
        { success: false, error: 'Không thể cập nhật đặt bàn đã hoàn tất hoặc đã hủy' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const eventNotes: string[] = [];

    if (note !== undefined) {
      updateData.note = note?.trim() || null;
    }

    if (guestCount != null) {
      if (isNaN(Number(guestCount)) || Number(guestCount) < 1) {
        return NextResponse.json(
          { success: false, error: 'Số khách phải là số hợp lệ và lớn hơn 0' },
          { status: 400 }
        );
      }
      updateData.guestCount = Number(guestCount);
      eventNotes.push(`Số khách: ${booking.guestCount} → ${Number(guestCount)}`);
    }

    if (depositAmount != null) {
      if (isNaN(Number(depositAmount))) {
        return NextResponse.json(
          { success: false, error: 'Số tiền đặt cọc không hợp lệ' },
          { status: 400 }
        );
      }
      updateData.depositAmount = Number(depositAmount);
    }

    if (minSpend != null) {
      if (isNaN(Number(minSpend))) {
        return NextResponse.json(
          { success: false, error: 'Chi tiêu tối thiểu không hợp lệ' },
          { status: 400 }
        );
      }
      updateData.minSpend = Number(minSpend);
    }

    if (bookingDate) {
      const parsedDate = new Date(bookingDate);
      if (!isNaN(parsedDate.getTime())) {
        updateData.bookingDate = parsedDate;
      }
    }

    if (bookingTime && typeof bookingTime === 'string') {
      updateData.bookingTime = bookingTime;
    }

    if (tableId && typeof tableId === 'string' && tableId !== booking.tableId) {
      const table = await prisma.restaurantTable.findUnique({
        where: { id: tableId },
      });

      if (!table) {
        return NextResponse.json(
          { success: false, error: 'Bàn không tồn tại' },
          { status: 404 }
        );
      }

      const targetDate = updateData.bookingDate
        ? (updateData.bookingDate as Date)
        : booking.bookingDate;
      const targetTime = (updateData.bookingTime as string) || booking.bookingTime;

      const conflicting = await prisma.booking.findFirst({
        where: {
          tableId,
          bookingDate: targetDate,
          bookingTime: targetTime,
          status: { in: ['PENDING', 'CONFIRMED', 'ARRIVED'] },
          id: { not: id },
        },
      });

      if (conflicting) {
        return NextResponse.json(
          { success: false, error: 'Bàn đã được đặt vào thời gian này' },
          { status: 409 }
        );
      }

      updateData.tableId = tableId;
      eventNotes.push('Đã thay đổi bàn');
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        table: { include: { area: true } },
        createdByUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (eventNotes.length > 0) {
      await prisma.bookingEvent.create({
        data: {
          bookingId: id,
          userId: currentUser.id,
          type: tableId && tableId !== booking.tableId ? 'TABLE_CHANGED' : 'UPDATED',
          note: eventNotes.join('. '),
        },
      });
    }

    return NextResponse.json(
      { success: true, data: updatedBooking },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
