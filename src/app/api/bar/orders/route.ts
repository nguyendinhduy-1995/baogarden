import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, requireRole } from '@/lib/auth';

export async function GET(request: Request) {
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

    const orderItems = await prisma.orderItem.findMany({
      where: {
        department: 'BAR',
        status: { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'] },
        order: {
          status: { not: 'CANCELLED' },
        },
      },
      include: {
        order: {
          select: {
            id: true,
            orderCode: true,
            source: true,
            customerName: true,
            createdAt: true,
            session: {
              select: {
                table: {
                  select: { code: true, name: true },
                },
              },
            },
          },
        },
        menuItem: {
          select: { id: true, name: true, imageUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const orderMap = new Map<string, {
      orderId: string;
      orderCode: string;
      source: string;
      customerName: string | null;
      tableCode: string;
      tableName: string;
      createdAt: Date;
      items: typeof orderItems;
    }>();

    for (const item of orderItems) {
      const key = item.order.id;
      if (!orderMap.has(key)) {
        orderMap.set(key, {
          orderId: item.order.id,
          orderCode: item.order.orderCode,
          source: item.order.source,
          customerName: item.order.customerName,
          tableCode: item.order.session.table.code,
          tableName: item.order.session.table.name,
          createdAt: item.order.createdAt,
          items: [],
        });
      }
      orderMap.get(key)!.items.push(item);
    }

    const grouped = Array.from(orderMap.values());

    return NextResponse.json(
      { success: true, data: grouped },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
