import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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
    const body = await request.json();
    const { tableCode, token, items, customerName, customerPhone } = body;

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

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Danh sách món không được trống' },
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

    if (table.status === 'INACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Bàn hiện không hoạt động' },
        { status: 400 }
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
          },
        });

        await tx.orderEvent.create({
          data: {
            tableSessionId: session.id,
            type: 'SESSION_OPENED',
            payload: { source: 'CUSTOMER_QR', tableCode },
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
          customerName: customerName?.trim() || null,
          customerPhone: customerPhone?.trim() || null,
          source: 'CUSTOMER_QR',
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
          payload: { source: 'CUSTOMER_QR', itemCount: items.length },
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
