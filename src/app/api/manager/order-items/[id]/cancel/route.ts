import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, requireRole } from '@/lib/auth';

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

    if (!requireRole(currentUser.role, ['MANAGER', 'ADMIN'])) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập lý do hủy' },
        { status: 400 }
      );
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            session: true,
          },
        },
      },
    });

    if (!orderItem) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy món' },
        { status: 404 }
      );
    }

    const cancellableStatuses = ['PENDING', 'ACCEPTED', 'PREPARING'];
    if (!cancellableStatuses.includes(orderItem.status)) {
      return NextResponse.json(
        { success: false, error: 'Không thể hủy món ở trạng thái hiện tại' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Cancel the item
      const updatedItem = await tx.orderItem.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelReason: reason.trim(),
        },
      });

      // Recalculate order subtotal from remaining active items
      const activeItems = await tx.orderItem.findMany({
        where: {
          orderId: orderItem.orderId,
          status: { not: 'CANCELLED' },
        },
        select: { totalPrice: true },
      });

      const orderSubtotal = activeItems.reduce(
        (sum, item) => sum + Number(item.totalPrice),
        0
      );

      await tx.order.update({
        where: { id: orderItem.orderId },
        data: { subtotal: orderSubtotal },
      });

      // Recalculate session totals from all non-cancelled orders
      const allSessionOrders = await tx.order.findMany({
        where: {
          tableSessionId: orderItem.order.tableSessionId,
          status: { not: 'CANCELLED' },
        },
        select: { subtotal: true },
      });

      const sessionSubtotal = allSessionOrders.reduce(
        (sum, o) => sum + Number(o.subtotal),
        0
      );

      const session = orderItem.order.session;
      const totalAmount =
        sessionSubtotal -
        Number(session.discountAmount) +
        Number(session.serviceCharge);

      await tx.tableSession.update({
        where: { id: orderItem.order.tableSessionId },
        data: {
          subtotal: sessionSubtotal,
          totalAmount: Math.max(totalAmount, 0),
        },
      });

      // Log event
      await tx.orderEvent.create({
        data: {
          orderId: orderItem.orderId,
          orderItemId: id,
          tableSessionId: orderItem.order.tableSessionId,
          type: 'ITEM_CANCELLED',
          payload: {
            reason: reason.trim(),
            itemName: orderItem.itemNameSnapshot,
            quantity: orderItem.quantity,
            cancelledBy: currentUser.name,
          },
          createdByUserId: currentUser.id,
        },
      });

      return updatedItem;
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
