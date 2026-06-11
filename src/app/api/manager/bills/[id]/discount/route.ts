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

    if (!requireRole(currentUser.role, ['MANAGER', 'ADMIN'])) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { discountAmount, note } = body;

    if (discountAmount == null || typeof discountAmount !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Số tiền giảm giá không hợp lệ' },
        { status: 400 }
      );
    }

    if (discountAmount < 0) {
      return NextResponse.json(
        { success: false, error: 'Số tiền giảm giá không được âm' },
        { status: 400 }
      );
    }

    const session = await prisma.tableSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy phiên' },
        { status: 404 }
      );
    }

    const allowedStatuses = ['OPEN', 'PAYMENT_REQUESTED'];
    if (!allowedStatuses.includes(session.status)) {
      return NextResponse.json(
        { success: false, error: 'Chỉ có thể áp dụng giảm giá cho phiên đang mở hoặc đang chờ thanh toán' },
        { status: 400 }
      );
    }

    if (discountAmount > Number(session.subtotal)) {
      return NextResponse.json(
        { success: false, error: 'Số tiền giảm giá không được lớn hơn tổng tiền' },
        { status: 400 }
      );
    }

    const totalAmount =
      Number(session.subtotal) -
      discountAmount +
      Number(session.serviceCharge);

    const updatedSession = await prisma.tableSession.update({
      where: { id },
      data: {
        discountAmount,
        totalAmount: Math.max(totalAmount, 0),
        note: note?.trim() || session.note,
      },
    });

    return NextResponse.json(
      { success: true, data: updatedSession },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
