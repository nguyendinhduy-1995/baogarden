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

    const existing = await prisma.weeklySchedule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy lịch tuần' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { day, program, artist, type, sortOrder, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (day && typeof day === 'string') updateData.day = day.trim();
    if (program && typeof program === 'string') updateData.program = program.trim();
    if (artist && typeof artist === 'string') updateData.artist = artist.trim();
    if (type && typeof type === 'string') updateData.type = type.trim();
    if (sortOrder != null) updateData.sortOrder = Number(sortOrder);
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.weeklySchedule.update({
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

    const existing = await prisma.weeklySchedule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy lịch tuần' },
        { status: 404 }
      );
    }

    await prisma.weeklySchedule.delete({ where: { id } });

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
