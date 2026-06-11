import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, requireRole } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const tableId = searchParams.get('tableId');

    const where: Prisma.OrderWhereInput = {};

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const validStatuses = [
      'DRAFT', 'SUBMITTED', 'PARTIALLY_PROCESSING', 'PROCESSING',
      'READY', 'SERVED', 'PAYMENT_REQUESTED', 'PAID', 'CANCELLED',
    ];
    if (status && validStatuses.includes(status)) {
      where.status = status as Prisma.EnumOrderStatusFilter;
    }

    if (tableId) {
      where.session = {
        tableId,
      };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        session: {
          select: {
            id: true,
            table: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        items: {
          select: {
            id: true,
            itemNameSnapshot: true,
            priceSnapshot: true,
            quantity: true,
            totalPrice: true,
            status: true,
            department: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      { success: true, data: orders },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
