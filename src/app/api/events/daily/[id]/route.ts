import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, requireRole } from '@/lib/auth';

export async function PUT(
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

    const existing = await prisma.dailyEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy sự kiện' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { dayIndex, dayName, dayShort, name, description, type, posterUrl, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (dayIndex != null) {
      if (typeof dayIndex !== 'number' || dayIndex < 0 || dayIndex > 6) {
        return NextResponse.json(
          { success: false, error: 'dayIndex phải từ 0 đến 6' },
          { status: 400 }
        );
      }
      updateData.dayIndex = dayIndex;
    }
    if (dayName && typeof dayName === 'string') updateData.dayName = dayName.trim();
    if (dayShort && typeof dayShort === 'string') updateData.dayShort = dayShort.trim();
    if (name && typeof name === 'string') updateData.name = name.trim();
    if (description && typeof description === 'string') updateData.description = description.trim();
    if (type && typeof type === 'string') updateData.type = type.trim();
    if (posterUrl !== undefined) updateData.posterUrl = posterUrl?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.dailyEvent.update({
      where: { id },
      data: updateData,
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

    const existing = await prisma.dailyEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy sự kiện' },
        { status: 404 }
      );
    }

    await prisma.dailyEvent.delete({ where: { id } });

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
