import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, requireRole } from '@/lib/auth';

export async function GET() {
  try {
    const items = await prisma.menuItem.findMany({
      include: { category: { select: { id: true, name: true, departmentDefault: true } } },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ success: true, data: items });
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
    const { name, description, price, categoryId, department, isAvailable, isFeatured, preparationTimeMinutes, sortOrder, imageUrl } = body;

    if (!name || !categoryId || price == null) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now().toString(36);

    const item = await prisma.menuItem.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        price: Number(price),
        categoryId,
        department: department || 'KITCHEN',
        isAvailable: isAvailable !== false,
        isFeatured: isFeatured === true,
        preparationTimeMinutes: Number(preparationTimeMinutes) || 15,
        sortOrder: Number(sortOrder) || 0,
        imageUrl: imageUrl?.trim() || null,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
