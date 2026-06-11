import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(
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

    const { id } = await params;
    const body = await request.json();
    const { note } = body;

    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nội dung ghi chú là bắt buộc' },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy khách hàng' },
        { status: 404 }
      );
    }

    const customerNote = await prisma.customerNote.create({
      data: {
        customerId: id,
        userId: currentUser.id,
        note: note.trim(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: customerNote },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
