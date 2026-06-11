import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import type { BookingStatus, BookingEventType } from '@prisma/client';

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ARRIVED', 'CANCELLED', 'NO_SHOW'],
  ARRIVED: ['COMPLETED'],
  CANCELLED: [],
  NO_SHOW: [],
  COMPLETED: [],
};

const STATUS_EVENT_MAP: Record<BookingStatus, BookingEventType> = {
  PENDING: 'CREATED',
  CONFIRMED: 'CONFIRMED',
  ARRIVED: 'ARRIVED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  COMPLETED: 'COMPLETED',
};

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
    const { status, note } = body;

    if (!status || typeof status !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Trạng thái mới là bắt buộc' },
        { status: 400 }
      );
    }

    const validStatuses: BookingStatus[] = ['PENDING', 'CONFIRMED', 'ARRIVED', 'CANCELLED', 'NO_SHOW', 'COMPLETED'];
    if (!validStatuses.includes(status as BookingStatus)) {
      return NextResponse.json(
        { success: false, error: 'Trạng thái không hợp lệ' },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy đặt bàn' },
        { status: 404 }
      );
    }

    const newStatus = status as BookingStatus;
    const currentStatus = booking.status;

    if (currentStatus === 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Không thể thay đổi trạng thái đặt bàn đã hoàn tất' },
        { status: 400 }
      );
    }

    if (newStatus !== 'CANCELLED') {
      const allowedTransitions = VALID_TRANSITIONS[currentStatus];
      if (!allowedTransitions.includes(newStatus)) {
        return NextResponse.json(
          {
            success: false,
            error: `Không thể chuyển từ ${currentStatus} sang ${newStatus}`,
          },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
    };

    if (newStatus === 'CONFIRMED') {
      updateData.confirmedByUserId = currentUser.id;
    }

    if (newStatus === 'ARRIVED') {
      updateData.checkedInByUserId = currentUser.id;
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
        confirmedByUser: {
          select: { id: true, name: true, email: true, role: true },
        },
        checkedInByUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    await prisma.bookingEvent.create({
      data: {
        bookingId: id,
        userId: currentUser.id,
        type: STATUS_EVENT_MAP[newStatus],
        oldStatus: currentStatus,
        newStatus: newStatus,
        note: note?.trim() || null,
      },
    });

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
