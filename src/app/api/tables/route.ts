import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, requireRole } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

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
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const time = searchParams.get('time');

    const where: Prisma.RestaurantTableWhereInput = {};

    if (status) {
      const validStatuses = ['AVAILABLE', 'BOOKED', 'OCCUPIED', 'VIP', 'CLEANING', 'INACTIVE'];
      if (validStatuses.includes(status)) {
        where.status = status as Prisma.EnumTableStatusFilter;
      }
    }

    const tables = await prisma.restaurantTable.findMany({
      where,
      include: {
        area: true,
        ...(date && time
          ? {
              bookings: {
                where: {
                  bookingDate: new Date(date),
                  bookingTime: time,
                  status: { in: ['PENDING', 'CONFIRMED', 'ARRIVED'] },
                },
                select: {
                  id: true,
                  bookingCode: true,
                  status: true,
                  guestCount: true,
                },
              },
            }
          : {}),
      },
      orderBy: [{ area: { name: 'asc' } }, { code: 'asc' }],
    });

    return NextResponse.json(
      { success: true, data: tables },
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
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    if (!requireRole(currentUser.role, ['ADMIN'])) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { code, name, areaId, status: tableStatus, minGuests, maxGuests, depositAmount, minSpend, note, posX, posY, width, height } = body;

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Mã bàn là bắt buộc' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tên bàn là bắt buộc' },
        { status: 400 }
      );
    }

    if (!areaId || typeof areaId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Khu vực là bắt buộc' },
        { status: 400 }
      );
    }

    const area = await prisma.tableArea.findUnique({ where: { id: areaId } });
    if (!area) {
      return NextResponse.json(
        { success: false, error: 'Khu vực không tồn tại' },
        { status: 404 }
      );
    }

    const existingTable = await prisma.restaurantTable.findUnique({
      where: { code: code.trim() },
    });

    if (existingTable) {
      return NextResponse.json(
        { success: false, error: 'Mã bàn đã tồn tại' },
        { status: 409 }
      );
    }

    const validStatuses = ['AVAILABLE', 'BOOKED', 'OCCUPIED', 'VIP', 'CLEANING', 'INACTIVE'];
    if (tableStatus && !validStatuses.includes(tableStatus)) {
      return NextResponse.json(
        { success: false, error: 'Trạng thái bàn không hợp lệ' },
        { status: 400 }
      );
    }

    const numMinGuests = minGuests != null ? Number(minGuests) : 2;
    const numMaxGuests = maxGuests != null ? Number(maxGuests) : 4;
    const numDepositAmount = depositAmount != null ? Number(depositAmount) : 0;
    const numMinSpend = minSpend != null ? Number(minSpend) : 0;
    const numPosX = posX != null ? Number(posX) : 0;
    const numPosY = posY != null ? Number(posY) : 0;

    if (isNaN(numMinGuests) || isNaN(numMaxGuests) || isNaN(numDepositAmount) || isNaN(numMinSpend) || isNaN(numPosX) || isNaN(numPosY)) {
      return NextResponse.json(
        { success: false, error: 'Các trường số không hợp lệ' },
        { status: 400 }
      );
    }

    const table = await prisma.restaurantTable.create({
      data: {
        code: code.trim(),
        name: name.trim(),
        areaId,
        status: tableStatus || 'AVAILABLE',
        minGuests: numMinGuests,
        maxGuests: numMaxGuests,
        depositAmount: numDepositAmount,
        minSpend: numMinSpend,
        note: note?.trim() || null,
        posX: numPosX,
        posY: numPosY,
        width: width != null ? Number(width) : 36,
        height: height != null ? Number(height) : 22,
      },
      include: { area: true },
    });

    return NextResponse.json(
      { success: true, data: table },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
