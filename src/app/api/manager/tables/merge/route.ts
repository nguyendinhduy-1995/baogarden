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
    const { sourceTableId, targetTableId } = body;

    if (!sourceTableId || typeof sourceTableId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bàn nguồn' },
        { status: 400 }
      );
    }

    if (!targetTableId || typeof targetTableId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bàn đích' },
        { status: 400 }
      );
    }

    if (sourceTableId === targetTableId) {
      return NextResponse.json(
        { success: false, error: 'Bàn nguồn và bàn đích không được trùng nhau' },
        { status: 400 }
      );
    }

    const [sourceTable, targetTable] = await Promise.all([
      prisma.restaurantTable.findUnique({
        where: { id: sourceTableId },
        select: { id: true, code: true, name: true, status: true },
      }),
      prisma.restaurantTable.findUnique({
        where: { id: targetTableId },
        select: { id: true, code: true, name: true, status: true },
      }),
    ]);

    if (!sourceTable) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bàn nguồn' },
        { status: 404 }
      );
    }

    if (!targetTable) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bàn đích' },
        { status: 404 }
      );
    }

    const [sourceSession, targetSession] = await Promise.all([
      prisma.tableSession.findFirst({
        where: {
          tableId: sourceTableId,
          status: { in: ['OPEN', 'PAYMENT_REQUESTED'] },
        },
        include: {
          orders: {
            where: { status: { not: 'CANCELLED' } },
            select: { id: true, subtotal: true },
          },
        },
      }),
      prisma.tableSession.findFirst({
        where: {
          tableId: targetTableId,
          status: { in: ['OPEN', 'PAYMENT_REQUESTED'] },
        },
      }),
    ]);

    if (!sourceSession) {
      return NextResponse.json(
        { success: false, error: 'Bàn nguồn không có phiên đang mở' },
        { status: 400 }
      );
    }

    if (!targetSession) {
      return NextResponse.json(
        { success: false, error: 'Bàn đích không có phiên đang mở' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Move all orders from source session to target session
      await tx.order.updateMany({
        where: { tableSessionId: sourceSession.id },
        data: { tableSessionId: targetSession.id },
      });

      // Close source session
      await tx.tableSession.update({
        where: { id: sourceSession.id },
        data: {
          status: 'CANCELLED',
          closedAt: new Date(),
          closedByUserId: currentUser.id,
          subtotal: 0,
          totalAmount: 0,
        },
      });

      // Set source table to AVAILABLE
      await tx.restaurantTable.update({
        where: { id: sourceTableId },
        data: { status: 'AVAILABLE' },
      });

      // Recalculate target session totals
      const targetOrders = await tx.order.findMany({
        where: {
          tableSessionId: targetSession.id,
          status: { not: 'CANCELLED' },
        },
        select: { subtotal: true },
      });

      const newSubtotal = targetOrders.reduce(
        (sum, o) => sum + Number(o.subtotal),
        0
      );

      const totalAmount =
        newSubtotal -
        Number(targetSession.discountAmount) +
        Number(targetSession.serviceCharge);

      const updatedTargetSession = await tx.tableSession.update({
        where: { id: targetSession.id },
        data: {
          subtotal: newSubtotal,
          totalAmount: Math.max(totalAmount, 0),
        },
      });

      // Log event
      await tx.orderEvent.create({
        data: {
          tableSessionId: targetSession.id,
          type: 'TABLE_MERGED',
          payload: {
            sourceTableId,
            sourceTableCode: sourceTable.code,
            sourceTableName: sourceTable.name,
            sourceSessionId: sourceSession.id,
            targetTableId,
            targetTableCode: targetTable.code,
            targetTableName: targetTable.name,
            targetSessionId: targetSession.id,
            movedOrderCount: sourceSession.orders.length,
            mergedBy: currentUser.name,
          },
          createdByUserId: currentUser.id,
        },
      });

      return updatedTargetSession;
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
