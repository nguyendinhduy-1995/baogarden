import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableCode, token, type, note } = body;

    if (!tableCode || typeof tableCode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Mã bàn là bắt buộc' },
        { status: 400 }
      );
    }

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Token là bắt buộc' },
        { status: 400 }
      );
    }

    const validTypes = ['CALL_WAITER', 'REQUEST_PAYMENT', 'ADD_ICE', 'CLEAN_TABLE', 'OTHER'];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Loại yêu cầu không hợp lệ' },
        { status: 400 }
      );
    }

    const table = await prisma.restaurantTable.findUnique({
      where: { code: tableCode },
    });

    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bàn' },
        { status: 404 }
      );
    }

    if (table.qrToken !== token) {
      return NextResponse.json(
        { success: false, error: 'Token không hợp lệ' },
        { status: 403 }
      );
    }

    const openSession = await prisma.tableSession.findFirst({
      where: {
        tableId: table.id,
        status: { in: ['OPEN', 'PAYMENT_REQUESTED'] },
      },
      select: { id: true },
    });

    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        tableId: table.id,
        tableSessionId: openSession?.id || null,
        type,
        note: note?.trim() || null,
        status: 'PENDING',
      },
      include: {
        table: { select: { code: true, name: true } },
      },
    });

    return NextResponse.json(
      { success: true, data: serviceRequest },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
