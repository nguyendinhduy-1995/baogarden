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

    const requests = await prisma.serviceRequest.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        table: {
          select: { id: true, code: true, name: true },
        },
        session: {
          select: { id: true, status: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(
      { success: true, data: requests },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
