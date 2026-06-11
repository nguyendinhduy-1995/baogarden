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

    if (!requireRole(currentUser.role, ['CASHIER', 'MANAGER', 'ADMIN'])) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { method, note, discountAmount, serviceCharge } = body;

    const validMethods = ['CASH', 'BANK_TRANSFER', 'CARD', 'E_WALLET', 'OTHER'];
    if (!method || !validMethods.includes(method)) {
      return NextResponse.json(
        { success: false, error: 'Phương thức thanh toán không hợp lệ' },
        { status: 400 }
      );
    }

    const session = await prisma.tableSession.findUnique({
      where: { id },
      include: {
        orders: {
          where: { status: { not: 'CANCELLED' } },
          select: { subtotal: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy phiên' },
        { status: 404 }
      );
    }

    if (session.status === 'PAID') {
      return NextResponse.json(
        { success: false, error: 'Phiên đã được thanh toán' },
        { status: 400 }
      );
    }

    if (session.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'Phiên đã bị hủy' },
        { status: 400 }
      );
    }

    const subtotal = session.orders.reduce(
      (sum, o) => sum + Number(o.subtotal),
      0
    );
    const discount = discountAmount != null ? Number(discountAmount) : 0;
    const service = serviceCharge != null ? Number(serviceCharge) : 0;
    const totalAmount = subtotal - discount + service;

    const result = await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.tableSession.update({
        where: { id },
        data: {
          status: 'PAID',
          closedAt: new Date(),
          closedByUserId: currentUser.id,
          subtotal,
          discountAmount: discount,
          serviceCharge: service,
          totalAmount,
          note: note?.trim() || session.note,
        },
      });

      const payment = await tx.payment.create({
        data: {
          tableSessionId: id,
          amount: totalAmount,
          method,
          status: 'PAID',
          paidAt: new Date(),
          cashierUserId: currentUser.id,
          note: note?.trim() || null,
        },
      });

      await tx.order.updateMany({
        where: {
          tableSessionId: id,
          status: { not: 'CANCELLED' },
        },
        data: { status: 'PAID' },
      });

      await tx.restaurantTable.update({
        where: { id: session.tableId },
        data: { status: 'CLEANING' },
      });

      await tx.orderEvent.create({
        data: {
          tableSessionId: id,
          type: 'BILL_PAID',
          payload: {
            method,
            subtotal,
            discountAmount: discount,
            serviceCharge: service,
            totalAmount,
            cashierId: currentUser.id,
            cashierName: currentUser.name,
          },
          createdByUserId: currentUser.id,
        },
      });

      return { session: updatedSession, payment };
    });

    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
