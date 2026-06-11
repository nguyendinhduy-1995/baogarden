import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const table = await prisma.restaurantTable.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        qrToken: true,
      },
    });

    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bàn' },
        { status: 404 }
      );
    }

    if (!table.qrToken) {
      return NextResponse.json(
        { success: false, error: 'Bàn chưa có mã QR' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://baogarden.vn';
    const menuUrl = `${baseUrl}/order?table=${table.code}&token=${table.qrToken}`;

    return NextResponse.json(
      {
        success: true,
        data: {
          tableId: table.id,
          tableCode: table.code,
          tableName: table.name,
          qrToken: table.qrToken,
          menuUrl,
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
