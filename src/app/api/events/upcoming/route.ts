import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, requireRole } from '@/lib/auth';

export async function GET() {
  try {
    const upcomingEvents = await prisma.upcomingEvent.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(
      { success: true, data: upcomingEvents },
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
    const { title, date, time, description, tag, sortOrder, isActive } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tiêu đề là bắt buộc' },
        { status: 400 }
      );
    }

    if (!date || typeof date !== 'string' || date.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ngày là bắt buộc' },
        { status: 400 }
      );
    }

    if (!time || typeof time !== 'string' || time.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Giờ là bắt buộc' },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Mô tả là bắt buộc' },
        { status: 400 }
      );
    }

    if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tag là bắt buộc' },
        { status: 400 }
      );
    }

    const upcomingEvent = await prisma.upcomingEvent.create({
      data: {
        title: title.trim(),
        date: date.trim(),
        time: time.trim(),
        description: description.trim(),
        tag: tag.trim(),
        sortOrder: sortOrder != null ? Number(sortOrder) : 0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(
      { success: true, data: upcomingEvent },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
