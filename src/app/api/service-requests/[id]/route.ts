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

    if (!requireRole(currentUser.role, ['WAITER', 'MANAGER', 'ADMIN'])) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id },
    });

    if (!serviceRequest) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy yêu cầu' },
        { status: 404 }
      );
    }

    if (serviceRequest.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Yêu cầu đã được xử lý' },
        { status: 400 }
      );
    }

    const updated = await prisma.serviceRequest.update({
      where: { id },
      data: {
        status: 'DONE',
        resolvedAt: new Date(),
        resolvedByUserId: currentUser.id,
      },
      include: {
        table: {
          select: { id: true, code: true, name: true },
        },
      },
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
