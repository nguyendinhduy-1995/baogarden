import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, requireRole } from '@/lib/auth';

export async function POST(
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
        status: 'OPEN',
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Không có phiên hoạt động cho bàn này' },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.tableSession.update({
        where: { id: session.id },
        data: { status: 'PAYMENT_REQUESTED' },
      });

      await tx.orderEvent.create({
        data: {
          tableSessionId: session.id,
          type: 'PAYMENT_REQUESTED',
          payload: {
            requestedBy: currentUser.id,
            requestedByName: currentUser.name,
          },
          createdByUserId: currentUser.id,
        },
      });

      return updatedSession;
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
