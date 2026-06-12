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

    if (!requireRole(currentUser.role, ['ADMIN', 'MANAGER'])) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { code, name, areaId, status, minGuests, maxGuests, depositAmount, minSpend, note, posX, posY, width, height } = body;

    const existingTable = await prisma.restaurantTable.findUnique({
      where: { id },
    });

    if (!existingTable) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bàn' },
        { status: 404 }
      );
    }

    if (code && typeof code === 'string' && code.trim() !== existingTable.code) {
      const codeTaken = await prisma.restaurantTable.findUnique({
        where: { code: code.trim() },
      });
      if (codeTaken) {
        return NextResponse.json(
          { success: false, error: 'Mã bàn đã tồn tại' },
          { status: 409 }
        );
      }
    }

    if (areaId) {
      const area = await prisma.tableArea.findUnique({ where: { id: areaId } });
      if (!area) {
        return NextResponse.json(
          { success: false, error: 'Khu vực không tồn tại' },
          { status: 404 }
        );
      }
    }

    const validStatuses = ['AVAILABLE', 'BOOKED', 'OCCUPIED', 'VIP', 'CLEANING', 'INACTIVE'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Trạng thái bàn không hợp lệ' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (code && typeof code === 'string') updateData.code = code.trim();
    if (name && typeof name === 'string') updateData.name = name.trim();
    if (areaId) updateData.areaId = areaId;
    if (status) updateData.status = status;

    const numericFields = { minGuests, maxGuests, depositAmount, minSpend, posX, posY };
    for (const [key, val] of Object.entries(numericFields)) {
      if (val != null) {
        if (isNaN(Number(val))) {
          return NextResponse.json(
            { success: false, error: `Trường ${key} không hợp lệ` },
            { status: 400 }
          );
        }
        updateData[key] = Number(val);
      }
    }

    if (note !== undefined) updateData.note = note?.trim() || null;
    if (width != null) updateData.width = Number(width);
    if (height != null) updateData.height = Number(height);

    const updatedTable = await prisma.restaurantTable.update({
      where: { id },
      data: updateData,
      include: { area: true },
    });

    return NextResponse.json(
      { success: true, data: updatedTable },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    if (!requireRole(currentUser.role, ['ADMIN'])) {
      return NextResponse.json(
        { success: false, error: 'Không có quyền truy cập' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const table = await prisma.restaurantTable.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bookings: {
              where: {
                status: { in: ['PENDING', 'CONFIRMED', 'ARRIVED'] },
              },
            },
          },
        },
      },
    });

    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bàn' },
        { status: 404 }
      );
    }

    if (table._count.bookings > 0) {
      return NextResponse.json(
        { success: false, error: 'Không thể xóa bàn đang có đặt chỗ hoạt động' },
        { status: 400 }
      );
    }

    await prisma.restaurantTable.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
