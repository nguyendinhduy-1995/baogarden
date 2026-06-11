import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Không có quyền thực hiện' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { primaryId, duplicateId } = body;

    if (!primaryId || !duplicateId || typeof primaryId !== 'string' || typeof duplicateId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin primaryId hoặc duplicateId' },
        { status: 400 }
      );
    }

    if (primaryId === duplicateId) {
      return NextResponse.json(
        { success: false, error: 'Không thể gộp khách hàng với chính mình' },
        { status: 400 }
      );
    }

    const [primary, duplicate] = await Promise.all([
      prisma.customer.findUnique({ where: { id: primaryId } }),
      prisma.customer.findUnique({ where: { id: duplicateId } }),
    ]);

    if (!primary) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy khách hàng chính' },
        { status: 404 }
      );
    }

    if (!duplicate) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy khách hàng trùng' },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Transfer all bookings from duplicate to primary
      await tx.booking.updateMany({
        where: { customerId: duplicateId },
        data: { customerId: primaryId },
      });

      // Transfer all customer notes from duplicate to primary
      await tx.customerNote.updateMany({
        where: { customerId: duplicateId },
        data: { customerId: primaryId },
      });

      // Delete the duplicate customer
      await tx.customer.delete({
        where: { id: duplicateId },
      });
    });

    const updatedPrimary = await prisma.customer.findUnique({
      where: { id: primaryId },
      include: {
        _count: { select: { bookings: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedPrimary,
        message: `Đã gộp khách hàng "${duplicate.name}" vào "${primary.name}" thành công`,
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
