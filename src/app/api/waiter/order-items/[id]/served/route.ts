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

    if (!requireRole(currentUser.role, ['WAITER', 'MANAGER', 'ADMIN'])) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const orderItem = await prisma.orderItem.findUnique({
      where: { id },
      include: {
        order: { select: { id: true, tableSessionId: true } },
      },
    });

    if (!orderItem) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy món order' },
        { status: 404 }
      );
    }

    if (orderItem.status !== 'READY') {
      return NextResponse.json(
        { success: false, error: 'Chỉ có thể phục vụ món đã sẵn sàng' },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.orderItem.update({
        where: { id },
        data: { status: 'SERVED' },
      });

      await tx.orderEvent.create({
        data: {
          orderId: orderItem.order.id,
          orderItemId: id,
          tableSessionId: orderItem.order.tableSessionId,
          type: 'ITEM_SERVED',
          payload: {
            itemName: orderItem.itemNameSnapshot,
            oldStatus: orderItem.status,
            newStatus: 'SERVED',
          },
          createdByUserId: currentUser.id,
        },
      });

      return updatedItem;
    });

    return NextResponse.json(
      { success: true, data: updated },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
