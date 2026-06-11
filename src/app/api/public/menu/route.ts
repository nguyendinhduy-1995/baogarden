import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tableCode = searchParams.get('tableCode');
    const token = searchParams.get('token');

    if (!tableCode || !token) {
      return NextResponse.json(
        { success: false, error: 'Thiếu mã bàn hoặc token' },
        { status: 400 }
      );
    }

    const table = await prisma.restaurantTable.findUnique({
      where: { code: tableCode },
      select: { id: true, code: true, name: true, qrToken: true, status: true },
    });

    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bàn' },
        { status: 404 }
      );
    }

    if (table.qrToken !== token) {
      return NextResponse.json(
        { success: false, error: 'Token không hợp lệ' },
        { status: 403 }
      );
    }

    if (table.status === 'INACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Bàn hiện không hoạt động' },
        { status: 400 }
      );
    }

    const categories = await prisma.menuCategory.findMany({
      where: { isActive: true },
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            price: true,
            imageUrl: true,
            department: true,
            isFeatured: true,
            preparationTimeMinutes: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const menuGrouped = categories
      .filter((cat) => cat.items.length > 0)
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        items: cat.items,
      }));

    return NextResponse.json(
      {
        success: true,
        data: {
          table: { id: table.id, code: table.code, name: table.name },
          menu: menuGrouped,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
