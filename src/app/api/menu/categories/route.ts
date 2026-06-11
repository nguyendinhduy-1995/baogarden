import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, requireRole } from '@/lib/auth';

export async function GET() {
  try {
    const categories = await prisma.menuCategory.findMany({
      include: { _count: { select: { items: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ success: true, data: categories });
  } catch {
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || !requireRole(user.role, ['ADMIN', 'MANAGER'])) {
      return NextResponse.json({ success: false, error: 'Không có quyền' }, { status: 403 });
    }

    const body = await request.json();
    const { name, departmentDefault, sortOrder } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Tên danh mục bắt buộc' }, { status: 400 });
    }

    const category = await prisma.menuCategory.create({
      data: {
        name: name.trim(),
        departmentDefault: departmentDefault || 'KITCHEN',
        sortOrder: Number(sortOrder) || 0,
      },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
