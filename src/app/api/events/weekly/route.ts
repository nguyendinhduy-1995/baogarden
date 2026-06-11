import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, requireRole } from '@/lib/auth';

export async function GET() {
  try {
    const weeklySchedules = await prisma.weeklySchedule.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(
      { success: true, data: weeklySchedules },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const { day, program, artist, type, sortOrder, isActive } = body;

    if (!day || typeof day !== 'string' || day.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ngày là bắt buộc' },
        { status: 400 }
      );
    }

    if (!program || typeof program !== 'string' || program.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Chương trình là bắt buộc' },
        { status: 400 }
      );
    }

    if (!artist || typeof artist !== 'string' || artist.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nghệ sĩ là bắt buộc' },
        { status: 400 }
      );
    }

    if (!type || typeof type !== 'string' || type.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Loại là bắt buộc' },
        { status: 400 }
      );
    }

    const weeklySchedule = await prisma.weeklySchedule.create({
      data: {
        day: day.trim(),
        program: program.trim(),
        artist: artist.trim(),
        type: type.trim(),
        sortOrder: sortOrder != null ? Number(sortOrder) : 0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(
      { success: true, data: weeklySchedule },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
