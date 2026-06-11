import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, requireRole } from '@/lib/auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !requireRole(user.role, ['ADMIN', 'MANAGER'])) {
      return NextResponse.json({ success: false, error: 'Không có quyền' }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.price !== undefined) updateData.price = Number(body.price);
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
    if (body.department !== undefined) updateData.department = body.department;
    if (body.isAvailable !== undefined) updateData.isAvailable = body.isAvailable;
    if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;
    if (body.preparationTimeMinutes !== undefined) updateData.preparationTimeMinutes = Number(body.preparationTimeMinutes);
    if (body.sortOrder !== undefined) updateData.sortOrder = Number(body.sortOrder);
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl?.trim() || null;

    const item = await prisma.menuItem.update({
      where: { id },
      data: updateData,
      include: { category: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, data: item });
  } catch {
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !requireRole(user.role, ['ADMIN'])) {
      return NextResponse.json({ success: false, error: 'Không có quyền' }, { status: 403 });
    }
    const { id } = await params;

    const existing = await prisma.menuItem.findUnique({
      where: { id },
      include: { orderItems: { take: 1 } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy' }, { status: 404 });
    }
    if (existing.orderItems.length > 0) {
      return NextResponse.json({ success: false, error: 'Không thể xóa món đã có đơn hàng' }, { status: 400 });
    }

    await prisma.menuItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
