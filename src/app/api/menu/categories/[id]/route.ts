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

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.departmentDefault !== undefined) updateData.departmentDefault = body.departmentDefault;
    if (body.sortOrder !== undefined) updateData.sortOrder = Number(body.sortOrder);
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const category = await prisma.menuCategory.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: category });
  } catch {
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
