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

    if (!requireRole(currentUser.role, ['CASHIER', 'MANAGER', 'ADMIN'])) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const sessions = await prisma.tableSession.findMany({
      where: {
        status: { in: ['OPEN', 'PAYMENT_REQUESTED'] },
      },
      include: {
        table: {
          select: { id: true, code: true, name: true },
        },
        orders: {
          where: { status: { not: 'CANCELLED' } },
          select: {
            id: true,
            orderCode: true,
            subtotal: true,
            status: true,
            _count: {
              select: { items: true },
            },
          },
        },
      },
      orderBy: { openedAt: 'asc' },
    });

    const data = sessions.map((session) => ({
      id: session.id,
      status: session.status,
      openedAt: session.openedAt,
      table: session.table,
      subtotal: session.subtotal,
      discountAmount: session.discountAmount,
      serviceCharge: session.serviceCharge,
      totalAmount: session.totalAmount,
      orderCount: session.orders.length,
      orders: session.orders,
    }));

    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
