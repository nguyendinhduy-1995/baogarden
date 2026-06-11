import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, requireRole } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

function generateBookingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BG-${result}`;
}

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
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');

    const where: Prisma.BookingWhereInput = {};

    if (date) {
      where.bookingDate = new Date(date);
    }

    const validStatuses = ['PENDING', 'CONFIRMED', 'ARRIVED', 'CANCELLED', 'NO_SHOW', 'COMPLETED'];
    if (status && validStatuses.includes(status)) {
      where.status = status as Prisma.EnumBookingStatusFilter;
    }

    if (userId) {
      where.createdByUserId = userId;
    }

    if (currentUser.role === 'BOOKING') {
      where.createdByUserId = currentUser.id;
    }

    if (search && search.trim().length > 0) {
      const searchTerm = search.trim();
      where.OR = [
        { bookingCode: { contains: searchTerm, mode: 'insensitive' } },
        { customer: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { customer: { phone: { contains: searchTerm, mode: 'insensitive' } } },
        { note: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        customer: true,
        table: {
          include: { area: true },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [{ bookingDate: 'desc' }, { bookingTime: 'desc' }],
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

export async function POST(request: Request) {
  try {
    const currentUser = await getUserFromRequest(request);

    const body = await request.json();
    const {
      customerName,
      customerPhone,
      tableId,
      bookingDate,
      bookingTime,
      guestCount,
      depositAmount,
      minSpend,
      note,
      source,
    } = body;

    if (!customerPhone || typeof customerPhone !== 'string' || customerPhone.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Số điện thoại khách hàng là bắt buộc' },
        { status: 400 }
      );
    }

    if (!customerName || typeof customerName !== 'string' || customerName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tên khách hàng là bắt buộc' },
        { status: 400 }
      );
    }

    if (!tableId || typeof tableId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Bàn là bắt buộc' },
        { status: 400 }
      );
    }

    if (!bookingDate) {
      return NextResponse.json(
        { success: false, error: 'Ngày đặt bàn là bắt buộc' },
        { status: 400 }
      );
    }

    if (!bookingTime || typeof bookingTime !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Giờ đặt bàn là bắt buộc' },
        { status: 400 }
      );
    }

    if (!guestCount || Number(guestCount) < 1) {
      return NextResponse.json(
        { success: false, error: 'Số khách phải lớn hơn 0' },
        { status: 400 }
      );
    }

    const table = await prisma.restaurantTable.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Bàn không tồn tại' },
        { status: 404 }
      );
    }

    if (table.status === 'INACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Bàn đang không hoạt động' },
        { status: 400 }
      );
    }

    const parsedDate = new Date(bookingDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Ngày không hợp lệ' },
        { status: 400 }
      );
    }

    const existingBooking = await prisma.booking.findFirst({
      where: {
        tableId,
        bookingDate: parsedDate,
        bookingTime,
        status: { in: ['PENDING', 'CONFIRMED', 'ARRIVED'] },
      },
    });

    if (existingBooking) {
      return NextResponse.json(
        { success: false, error: 'Bàn đã được đặt vào thời gian này' },
        { status: 409 }
      );
    }

    let customer = await prisma.customer.findUnique({
      where: { phone: customerPhone.trim() },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
        },
      });
    }

    let bookingCode = generateBookingCode();
    let codeExists = await prisma.booking.findUnique({
      where: { bookingCode },
    });
    while (codeExists) {
      bookingCode = generateBookingCode();
      codeExists = await prisma.booking.findUnique({
        where: { bookingCode },
      });
    }

    const validSources = ['PUBLIC', 'STAFF', 'PHONE', 'FACEBOOK', 'ZALO', 'WALK_IN'];
    const bookingSource = source && validSources.includes(source)
      ? source
      : currentUser
        ? 'STAFF'
        : 'PUBLIC';

    const booking = await prisma.booking.create({
      data: {
        bookingCode,
        customerId: customer.id,
        tableId,
        bookingDate: parsedDate,
        bookingTime,
        guestCount: Number(guestCount),
        depositAmount: depositAmount != null ? Number(depositAmount) : Number(table.depositAmount),
        minSpend: minSpend != null ? Number(minSpend) : Number(table.minSpend),
        note: note?.trim() || null,
        source: bookingSource,
        createdByUserId: currentUser?.id || null,
        events: {
          create: {
            type: 'CREATED',
            newStatus: 'PENDING',
            userId: currentUser?.id || null,
            note: 'Đặt bàn mới được tạo',
          },
        },
      },
      include: {
        customer: true,
        table: {
          include: { area: true },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        events: true,
      },
    });

    const customerBookingCount = await prisma.booking.count({
      where: { customerId: customer.id },
    });

    if (customerBookingCount >= 2 && customer.customerType === 'NEW') {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { customerType: 'RETURNING' },
      });
    }

    return NextResponse.json(
      { success: true, data: booking },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
