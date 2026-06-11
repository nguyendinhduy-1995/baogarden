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

    if (!requireRole(currentUser.role, ['WAITER', 'MANAGER', 'ADMIN'])) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const tables = await prisma.restaurantTable.findMany({
      include: {
        area: { select: { id: true, name: true } },
        sessions: {
          where: {
            status: { in: ['OPEN', 'PAYMENT_REQUESTED'] },
          },
          select: {
            id: true,
            status: true,
            openedAt: true,
            subtotal: true,
            totalAmount: true,
            _count: {
              select: {
                orders: true,
              },
            },
          },
          take: 1,
          orderBy: { openedAt: 'desc' },
        },
      },
      orderBy: [{ area: { name: 'asc' } }, { code: 'asc' }],
    });

    const data = tables.map((table) => {
      const currentSession = table.sessions[0] || null;
      return {
        id: table.id,
        code: table.code,
        name: table.name,
        status: table.status,
        area: table.area,
        sessionId: currentSession?.id || null,
        sessionStatus: currentSession?.status || null,
        activeOrderCount: currentSession?._count.orders || 0,
        subtotal: currentSession?.subtotal || 0,
        totalAmount: currentSession?.totalAmount || 0,
      };
    });

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
