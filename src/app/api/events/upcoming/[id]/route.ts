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

    const existing = await prisma.upcomingEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy sự kiện' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, date, time, description, tag, sortOrder, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (title && typeof title === 'string') updateData.title = title.trim();
    if (date && typeof date === 'string') updateData.date = date.trim();
    if (time && typeof time === 'string') updateData.time = time.trim();
    if (description && typeof description === 'string') updateData.description = description.trim();
    if (tag && typeof tag === 'string') updateData.tag = tag.trim();
    if (sortOrder != null) updateData.sortOrder = Number(sortOrder);
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.upcomingEvent.update({
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

    const existing = await prisma.upcomingEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy sự kiện' },
        { status: 404 }
      );
    }

    await prisma.upcomingEvent.delete({ where: { id } });

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
