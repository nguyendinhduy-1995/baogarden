import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

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

    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        bookings: {
          include: {
            table: {
              include: { area: true },
            },
            createdByUser: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { bookingDate: 'desc' },
        },
        customerNotes: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy khách hàng' },
        { status: 404 }
      );
    }

    // Compute stats
    const bookings = customer.bookings || [];
    const bookingCount = bookings.length;
    const totalRevenue = bookings.reduce(
      (sum, b) => sum + Number(b.depositAmount || 0),
      0
    );
    const noShowCount = bookings.filter((b) => b.status === 'NO_SHOW').length;
    const cancelledCount = bookings.filter((b) => b.status === 'CANCELLED').length;
    const completedCount = bookings.filter(
      (b) => b.status === 'COMPLETED' || b.status === 'ARRIVED'
    ).length;
    const avgGuestCount =
      bookingCount > 0
        ? Math.round(
            bookings.reduce((sum, b) => sum + (b.guestCount || 0), 0) /
              bookingCount
          )
        : 0;

    // Favorite table (most booked table)
    const tableCounts: Record<string, { count: number; code: string; name: string }> = {};
    for (const b of bookings) {
      const key = b.tableId;
      if (!tableCounts[key]) {
        tableCounts[key] = { count: 0, code: b.table?.code || '', name: b.table?.name || '' };
      }
      tableCounts[key].count++;
    }
    const favoriteTable =
      Object.values(tableCounts).sort((a, b) => b.count - a.count)[0] || null;

    return NextResponse.json(
      {
        success: true,
        data: {
          ...customer,
          bookingCount,
          totalRevenue,
          noShowCount,
          cancelledCount,
          completedCount,
          avgGuestCount,
          favoriteTable: favoriteTable
            ? { code: favoriteTable.code, name: favoriteTable.name, count: favoriteTable.count }
            : null,
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

    const { id } = await params;
    const body = await request.json();
    const { name, phone, note, customerType } = body;

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy khách hàng' },
        { status: 404 }
      );
    }

    if (phone && typeof phone === 'string' && phone.trim() !== customer.phone) {
      const phoneTaken = await prisma.customer.findUnique({
        where: { phone: phone.trim() },
      });
      if (phoneTaken) {
        return NextResponse.json(
          { success: false, error: 'Số điện thoại đã được sử dụng' },
          { status: 409 }
        );
      }
    }

    const validTypes = ['NEW', 'RETURNING', 'VIP', 'BLACKLIST'];
    if (customerType && !validTypes.includes(customerType)) {
      return NextResponse.json(
        { success: false, error: 'Loại khách hàng không hợp lệ' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name && typeof name === 'string') updateData.name = name.trim();
    if (phone && typeof phone === 'string') updateData.phone = phone.trim();
    if (note !== undefined) updateData.note = note?.trim() || null;
    if (customerType) updateData.customerType = customerType;

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(
      { success: true, data: updatedCustomer },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
