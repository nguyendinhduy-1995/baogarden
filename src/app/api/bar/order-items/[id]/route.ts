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

    if (!requireRole(currentUser.role, ['BAR', 'MANAGER', 'ADMIN'])) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Trạng thái không hợp lệ' },
        { status: 400 }
      );
    }

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

    if (orderItem.department !== 'BAR') {
      return NextResponse.json(
        { success: false, error: 'Món này không thuộc bộ phận bar' },
        { status: 400 }
      );
    }

    const eventTypeMap: Record<string, string> = {
      ACCEPTED: 'ITEM_ACCEPTED',
      PREPARING: 'ITEM_PREPARING',
      READY: 'ITEM_READY',
      SERVED: 'ITEM_SERVED',
      CANCELLED: 'ITEM_CANCELLED',
    };

    const updated = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.orderItem.update({
        where: { id },
        data: { status },
      });

      const eventType = eventTypeMap[status];
      if (eventType) {
        await tx.orderEvent.create({
          data: {
            orderId: orderItem.order.id,
            orderItemId: id,
            tableSessionId: orderItem.order.tableSessionId,
            type: eventType as 'ITEM_ACCEPTED' | 'ITEM_PREPARING' | 'ITEM_READY' | 'ITEM_SERVED' | 'ITEM_CANCELLED',
            payload: {
              itemName: orderItem.itemNameSnapshot,
              oldStatus: orderItem.status,
              newStatus: status,
            },
            createdByUserId: currentUser.id,
          },
        });
      }

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
