import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, requireRole } from '@/lib/auth';
import { format } from 'date-fns';

async function generateOrderCode(): Promise<string> {
  const today = new Date();
  const dateStr = format(today, 'yyyyMMdd');
  const prefix = `BG-${dateStr}-`;

  const lastOrder = await prisma.order.findFirst({
    where: {
      orderCode: { startsWith: prefix },
    },
    orderBy: { orderCode: 'desc' },
    select: { orderCode: true },
  });

  let counter = 1;
  if (lastOrder) {
    const lastNum = parseInt(lastOrder.orderCode.replace(prefix, ''), 10);
    if (!isNaN(lastNum)) {
      counter = lastNum + 1;
    }
  }

  return `${prefix}${counter.toString().padStart(4, '0')}`;
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

    if (!requireRole(currentUser.role, ['WAITER', 'MANAGER', 'ADMIN'])) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tableId, tableSessionId, items } = body;

    if (!tableId && !tableSessionId) {
      return NextResponse.json(
        { success: false, error: 'Bàn hoặc phiên là bắt buộc' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Danh sách món không được trống' },
        { status: 400 }
      );
    }

    let resolvedTableId = tableId;

    if (!resolvedTableId && tableSessionId) {
      const existingSession = await prisma.tableSession.findUnique({
        where: { id: tableSessionId },
        select: { tableId: true, status: true },
      });
      if (!existingSession) {
        return NextResponse.json(
          { success: false, error: 'Không tìm thấy phiên' },
          { status: 404 }
        );
      }
      resolvedTableId = existingSession.tableId;
    }

    const table = await prisma.restaurantTable.findUnique({
      where: { id: resolvedTableId },
    });

    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bàn' },
        { status: 404 }
      );
    }

    for (const item of items) {
      if (!item.menuItemId || typeof item.menuItemId !== 'string') {
        return NextResponse.json(
          { success: false, error: 'menuItemId là bắt buộc cho mỗi món' },
          { status: 400 }
        );
      }
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) {
        return NextResponse.json(
          { success: false, error: 'Số lượng phải lớn hơn 0' },
          { status: 400 }
        );
      }
    }

    const menuItemIds = items.map((i: { menuItemId: string }) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isAvailable: true },
    });

    if (menuItems.length !== menuItemIds.length) {
      const foundIds = new Set(menuItems.map((m) => m.id));
      const missing = menuItemIds.filter((id: string) => !foundIds.has(id));
      return NextResponse.json(
        { success: false, error: `Một số món không khả dụng: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    const result = await prisma.$transaction(async (tx) => {
      let session = await tx.tableSession.findFirst({
        where: {
          tableId: table.id,
          status: { in: ['OPEN', 'PAYMENT_REQUESTED'] },
        },
      });

      if (!session) {
        session = await tx.tableSession.create({
          data: {
            tableId: table.id,
            status: 'OPEN',
            openedByUserId: currentUser.id,
          },
        });

        await tx.orderEvent.create({
          data: {
            tableSessionId: session.id,
            type: 'SESSION_OPENED',
            payload: { source: 'WAITER', userId: currentUser.id },
            createdByUserId: currentUser.id,
          },
        });
      }

      if (table.status !== 'OCCUPIED') {
        await tx.restaurantTable.update({
          where: { id: table.id },
          data: { status: 'OCCUPIED' },
        });
      }

      const orderCode = await generateOrderCode();

      const orderItemsData = items.map((item: { menuItemId: string; quantity: number; note?: string }) => {
        const menuItem = menuItemMap.get(item.menuItemId)!;
        const totalPrice = Number(menuItem.price) * item.quantity;
        return {
          menuItemId: item.menuItemId,
          itemNameSnapshot: menuItem.name,
          priceSnapshot: Number(menuItem.price),
          quantity: item.quantity,
          totalPrice,
          note: item.note?.trim() || null,
          department: menuItem.department,
          status: 'PENDING' as const,
        };
      });

      const subtotal = orderItemsData.reduce((sum, i) => sum + Number(i.totalPrice), 0);

      const order = await tx.order.create({
        data: {
          orderCode,
          tableSessionId: session.id,
          createdByUserId: currentUser.id,
          source: 'WAITER',
          status: 'SUBMITTED',
          subtotal,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          tableSessionId: session.id,
          type: 'ORDER_SUBMITTED',
          payload: { source: 'WAITER', itemCount: items.length },
          createdByUserId: currentUser.id,
        },
      });

      const allOrders = await tx.order.findMany({
        where: {
          tableSessionId: session.id,
          status: { not: 'CANCELLED' },
        },
        select: { subtotal: true },
      });

      const sessionSubtotal = allOrders.reduce(
        (sum, o) => sum + Number(o.subtotal),
        0
      );

      await tx.tableSession.update({
        where: { id: session.id },
        data: {
          subtotal: sessionSubtotal,
          totalAmount: sessionSubtotal,
        },
      });

      return order;
    });

    return NextResponse.json(
      { success: true, data: result },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
