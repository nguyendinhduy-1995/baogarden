import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, requireRole } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    if (!requireRole(currentUser.role, ['MANAGER', 'ADMIN'])) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { fromTableId, toTableId } = body;

    if (!fromTableId || typeof fromTableId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bàn nguồn' },
        { status: 400 }
      );
    }

    if (!toTableId || typeof toTableId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bàn đích' },
        { status: 400 }
      );
    }

    if (fromTableId === toTableId) {
      return NextResponse.json(
        { success: false, error: 'Bàn nguồn và bàn đích không được trùng nhau' },
        { status: 400 }
      );
    }

    const [fromTable, toTable] = await Promise.all([
      prisma.restaurantTable.findUnique({
        where: { id: fromTableId },
        select: { id: true, code: true, name: true, status: true },
      }),
      prisma.restaurantTable.findUnique({
        where: { id: toTableId },
        select: { id: true, code: true, name: true, status: true },
      }),
    ]);

    if (!fromTable) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bàn nguồn' },
        { status: 404 }
      );
    }

    if (!toTable) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bàn đích' },
        { status: 404 }
      );
    }

    const fromSession = await prisma.tableSession.findFirst({
      where: {
        tableId: fromTableId,
        status: { in: ['OPEN', 'PAYMENT_REQUESTED'] },
      },
    });

    if (!fromSession) {
      return NextResponse.json(
        { success: false, error: 'Bàn nguồn không có phiên đang mở' },
        { status: 400 }
      );
    }

    const toSession = await prisma.tableSession.findFirst({
      where: {
        tableId: toTableId,
        status: { in: ['OPEN', 'PAYMENT_REQUESTED'] },
      },
    });

    if (toSession) {
      return NextResponse.json(
        { success: false, error: 'Bàn đích đang có phiên hoạt động' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Move session to new table
      const updatedSession = await tx.tableSession.update({
        where: { id: fromSession.id },
        data: { tableId: toTableId },
      });

      // Update table statuses
      await tx.restaurantTable.update({
        where: { id: fromTableId },
        data: { status: 'AVAILABLE' },
      });

      await tx.restaurantTable.update({
        where: { id: toTableId },
        data: { status: 'OCCUPIED' },
      });

      // Log event
      await tx.orderEvent.create({
        data: {
          tableSessionId: fromSession.id,
          type: 'TABLE_TRANSFERRED',
          payload: {
            fromTableId,
            fromTableCode: fromTable.code,
            fromTableName: fromTable.name,
            toTableId,
            toTableCode: toTable.code,
            toTableName: toTable.name,
            transferredBy: currentUser.name,
          },
          createdByUserId: currentUser.id,
        },
      });

      return updatedSession;
    });

    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
