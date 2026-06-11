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

    if (!requireRole(currentUser.role, ['MANAGER', 'ADMIN'])) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [
      tablesOccupied,
      pendingKitchenItems,
      pendingBarItems,
      paidSessionsToday,
      topItems,
    ] = await Promise.all([
      prisma.restaurantTable.count({
        where: { status: 'OCCUPIED' },
      }),
      prisma.orderItem.count({
        where: {
          department: 'KITCHEN',
          status: { in: ['PENDING', 'ACCEPTED', 'PREPARING'] },
          order: { status: { not: 'CANCELLED' } },
        },
      }),
      prisma.orderItem.count({
        where: {
          department: 'BAR',
          status: { in: ['PENDING', 'ACCEPTED', 'PREPARING'] },
          order: { status: { not: 'CANCELLED' } },
        },
      }),
      prisma.tableSession.findMany({
        where: {
          status: 'PAID',
          closedAt: {
            gte: today,
            lte: endOfDay,
          },
        },
        select: { totalAmount: true },
      }),
      prisma.orderItem.groupBy({
        by: ['menuItemId', 'itemNameSnapshot'],
        where: {
          status: { not: 'CANCELLED' },
          createdAt: {
            gte: today,
            lte: endOfDay,
          },
        },
        _sum: {
          quantity: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    const revenueToday = paidSessionsToday.reduce(
      (sum, s) => sum + Number(s.totalAmount),
      0
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          tablesOccupied,
          pendingKitchenItems,
          pendingBarItems,
          revenueToday,
          topItems: topItems.map((item) => ({
            menuItemId: item.menuItemId,
            itemName: item.itemNameSnapshot,
            totalQuantity: item._sum.quantity || 0,
          })),
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
