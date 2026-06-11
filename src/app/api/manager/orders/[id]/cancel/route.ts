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

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        session: {
          include: {
            orders: {
              where: { status: { not: 'CANCELLED' } },
              include: { items: true },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    if (order.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'Đơn hàng đã bị hủy trước đó' },
        { status: 400 }
      );
    }

    if (order.status === 'PAID') {
      return NextResponse.json(
        { success: false, error: 'Không thể hủy đơn hàng đã thanh toán' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Cancel all non-SERVED/non-CANCELLED items
      const cancellableItems = order.items.filter(
        (item) => item.status !== 'SERVED' && item.status !== 'CANCELLED'
      );

      for (const item of cancellableItems) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            status: 'CANCELLED',
            cancelReason: reason.trim(),
          },
        });
      }

      // Recalculate order subtotal (only SERVED items remain active)
      const servedItems = order.items.filter(
        (item) => item.status === 'SERVED'
      );
      const orderSubtotal = servedItems.reduce(
        (sum, item) => sum + Number(item.totalPrice),
        0
      );

      // Update order status to CANCELLED
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          subtotal: orderSubtotal,
        },
        include: { items: true },
      });

      // Recalculate session totals
      const sessionOrders = await tx.order.findMany({
        where: {
          tableSessionId: order.tableSessionId,
          status: { not: 'CANCELLED' },
        },
        select: { subtotal: true },
      });

      const sessionSubtotal = sessionOrders.reduce(
        (sum, o) => sum + Number(o.subtotal),
        0
      );
      const session = order.session;
      const totalAmount =
        sessionSubtotal -
        Number(session.discountAmount) +
        Number(session.serviceCharge);

      await tx.tableSession.update({
        where: { id: order.tableSessionId },
        data: {
          subtotal: sessionSubtotal,
          totalAmount: Math.max(totalAmount, 0),
        },
      });

      // Log event
      await tx.orderEvent.create({
        data: {
          orderId: id,
          tableSessionId: order.tableSessionId,
          type: 'ORDER_CANCELLED',
          payload: {
            reason: reason.trim(),
            cancelledItemCount: cancellableItems.length,
            cancelledBy: currentUser.name,
          },
          createdByUserId: currentUser.id,
        },
      });

      return updatedOrder;
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
