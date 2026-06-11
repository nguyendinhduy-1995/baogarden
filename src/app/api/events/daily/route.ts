import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, requireRole } from '@/lib/auth';

export async function GET() {
  try {
    const dailyEvents = await prisma.dailyEvent.findMany({
      where: { isActive: true },
      orderBy: { dayIndex: 'asc' },
    });

    return NextResponse.json(
      { success: true, data: dailyEvents },
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
    const { dayIndex, dayName, dayShort, name, description, type, posterUrl, isActive } = body;

    if (dayIndex == null || typeof dayIndex !== 'number' || dayIndex < 0 || dayIndex > 6) {
      return NextResponse.json(
        { success: false, error: 'dayIndex phải từ 0 đến 6' },
        { status: 400 }
      );
    }

    if (!dayName || typeof dayName !== 'string' || dayName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tên ngày là bắt buộc' },
        { status: 400 }
      );
    }

    if (!dayShort || typeof dayShort !== 'string' || dayShort.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tên ngày viết tắt là bắt buộc' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tên sự kiện là bắt buộc' },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Mô tả là bắt buộc' },
        { status: 400 }
      );
    }

    if (!type || typeof type !== 'string' || type.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Loại sự kiện là bắt buộc' },
        { status: 400 }
      );
    }

    const dailyEvent = await prisma.dailyEvent.create({
      data: {
        dayIndex,
        dayName: dayName.trim(),
        dayShort: dayShort.trim(),
        name: name.trim(),
        description: description.trim(),
        type: type.trim(),
        posterUrl: posterUrl?.trim() || null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(
      { success: true, data: dailyEvent },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
