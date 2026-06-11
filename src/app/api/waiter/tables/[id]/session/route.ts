import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, requireRole } from '@/lib/auth';

export async function GET(
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

    const table = await prisma.restaurantTable.findUnique({
      where: { id },
      select: { id: true, code: true, name: true, status: true },
    });

    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bàn' },
        { status: 404 }
      );
    }

    const session = await prisma.tableSession.findFirst({
      where: {
        tableId: id,
        status: { in: ['OPEN', 'PAYMENT_REQUESTED'] },
      },
      include: {
        orders: {
          include: {
            items: {
              include: {
                menuItem: {
                  select: { id: true, name: true, imageUrl: true },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!session) {
      return NextResponse.json(
        { success: true, data: { table, session: null } },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: true, data: { table, session } },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
