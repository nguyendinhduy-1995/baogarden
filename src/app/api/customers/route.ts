import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const type = searchParams.get('type');

    const where: Prisma.CustomerWhereInput = {};

    if (search && search.trim().length > 0) {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const validTypes = ['NEW', 'RETURNING', 'VIP', 'BLACKLIST'];
    if (type && validTypes.includes(type)) {
      where.customerType = type as Prisma.EnumCustomerTypeFilter;
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      { success: true, data: customers },
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

    const body = await request.json();
    const { name, phone, note, customerType } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tên khách hàng là bắt buộc' },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Số điện thoại là bắt buộc' },
        { status: 400 }
      );
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { phone: phone.trim() },
    });

    if (existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'Số điện thoại đã được sử dụng' },
        { status: 409 }
      );
    }

    const validTypes = ['NEW', 'RETURNING', 'VIP', 'BLACKLIST'];
    if (customerType && !validTypes.includes(customerType)) {
      return NextResponse.json(
        { success: false, error: 'Loại khách hàng không hợp lệ' },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        note: note?.trim() || null,
        customerType: customerType || 'NEW',
      },
    });

    return NextResponse.json(
      { success: true, data: customer },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Đã xảy ra lỗi server' },
      { status: 500 }
    );
  }
}
