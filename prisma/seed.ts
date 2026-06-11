import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding comprehensive test data...\n');
  const hash = await bcrypt.hash('123456', 10);

  // ==================== USERS (upsert - won't duplicate) ====================
  const users: Record<string, { name: string; role: string; phone: string }> = {
    'admin@baogarden.vn': { name: 'Admin Hệ Thống', role: 'ADMIN', phone: '0900000001' },
    'manager@baogarden.vn': { name: 'Nguyễn Quản Lý', role: 'MANAGER', phone: '0900000002' },
    'booking@baogarden.vn': { name: 'Trần Booking', role: 'BOOKING', phone: '0900000007' },
    'reception@baogarden.vn': { name: 'Lê Lễ Tân', role: 'RECEPTION', phone: '0900000008' },
    'waiter@baogarden.vn': { name: 'Phạm Phục Vụ', role: 'WAITER', phone: '0900000003' },
    'waiter2@baogarden.vn': { name: 'Hoàng Phục Vụ 2', role: 'WAITER', phone: '0900000009' },
    'kitchen@baogarden.vn': { name: 'Võ Bếp Trưởng', role: 'KITCHEN', phone: '0900000004' },
    'bar@baogarden.vn': { name: 'Đặng Bartender', role: 'BAR', phone: '0900000005' },
    'cashier@baogarden.vn': { name: 'Mai Thu Ngân', role: 'CASHIER', phone: '0900000006' },
  };

  const userRecords: Record<string, string> = {};
  for (const [email, info] of Object.entries(users)) {
    const u = await prisma.user.upsert({
      where: { email },
      update: { name: info.name, role: info.role as any, phone: info.phone },
      create: { name: info.name, email, passwordHash: hash, role: info.role as any, phone: info.phone },
    });
    userRecords[info.role] = u.id;
  }
  console.log('✅ 9 tài khoản nhân viên');

  // ==================== CUSTOMERS ====================
  const customerData = [
    { name: 'Nguyễn Văn An', phone: '0901234567', customerType: 'VIP' as const, note: 'Khách quen, thích bàn VIP' },
    { name: 'Trần Thị Bình', phone: '0907654321', customerType: 'RETURNING' as const, note: 'Hay đặt tiệc sinh nhật' },
    { name: 'Lê Hoàng Châu', phone: '0912345678', customerType: 'NEW' as const },
    { name: 'Phạm Minh Đức', phone: '0918765432', customerType: 'VIP' as const, note: 'CEO công ty XYZ' },
    { name: 'Huỳnh Thị Em', phone: '0923456789', customerType: 'RETURNING' as const },
    { name: 'Võ Văn Phúc', phone: '0934567890', customerType: 'NEW' as const },
    { name: 'Đặng Thị Giang', phone: '0945678901', customerType: 'RETURNING' as const, note: 'Thích cocktail Mojito' },
    { name: 'Bùi Quốc Hùng', phone: '0956789012', customerType: 'NEW' as const },
    { name: 'Lý Thị Khanh', phone: '0967890123', customerType: 'VIP' as const, note: 'Influencer, hay check-in' },
    { name: 'Ngô Thanh Linh', phone: '0978901234', customerType: 'BLACKLIST' as const, note: 'Gây rối 2 lần' },
  ];

  const customers: string[] = [];
  for (const c of customerData) {
    const cust = await prisma.customer.upsert({
      where: { phone: c.phone },
      update: { name: c.name, customerType: c.customerType, note: c.note },
      create: c,
    });
    customers.push(cust.id);
  }
  console.log('✅ 10 khách hàng mẫu (3 VIP, 3 Returning, 3 New, 1 Blacklist)');

  // ==================== TABLE AREAS ====================
  const existingAreas = await prisma.tableArea.findMany();
  let areaMap: Record<string, string> = {};

  if (existingAreas.length > 0) {
    for (const a of existingAreas) areaMap[a.name] = a.id;
    console.log(`✅ Giữ nguyên ${existingAreas.length} khu vực bàn hiện có`);
  } else {
    const areaDefs = [
      { name: 'Khu T', description: 'Trung tâm · View sân khấu gần nhất', sortOrder: 1 },
      { name: 'Khu A', description: 'Bên phải · Năng lượng đỉnh cao', sortOrder: 2 },
      { name: 'Khu B', description: 'Bên trái · Lounge & chill', sortOrder: 3 },
      { name: 'Khu VIP', description: 'Phòng VIP · Tiệc đặc biệt', sortOrder: 4 },
    ];
    for (const a of areaDefs) {
      const area = await prisma.tableArea.create({ data: a });
      areaMap[a.name] = area.id;
    }
    console.log('✅ 4 khu vực bàn');
  }

  // ==================== TABLES ====================
  const existingTables = await prisma.restaurantTable.findMany();
  let tableIds: string[] = [];

  if (existingTables.length > 0) {
    tableIds = existingTables.map(t => t.id);
    console.log(`✅ Giữ nguyên ${existingTables.length} bàn hiện có`);
  } else {
    const tableDefs = [
      // Khu T
      ...Array.from({ length: 8 }, (_, i) => ({ code: `T${i + 1}`, name: `Bàn T${i + 1}`, area: 'Khu T', min: 2, max: 6, status: 'AVAILABLE' as const })),
      // Khu A
      ...Array.from({ length: 8 }, (_, i) => ({ code: `A${i + 1}`, name: `Bàn A${i + 1}`, area: 'Khu A', min: 2, max: 6, status: 'AVAILABLE' as const })),
      // Khu B
      ...Array.from({ length: 8 }, (_, i) => ({ code: `B${i + 1}`, name: `Bàn B${i + 1}`, area: 'Khu B', min: 2, max: 4, status: 'AVAILABLE' as const })),
      // Khu VIP
      ...Array.from({ length: 4 }, (_, i) => ({ code: `VIP${i + 1}`, name: `Phòng VIP ${i + 1}`, area: 'Khu VIP', min: 4, max: 15, status: 'VIP' as const })),
    ];
    for (const t of tableDefs) {
      const table = await prisma.restaurantTable.create({
        data: {
          code: t.code, name: t.name, areaId: areaMap[t.area],
          minGuests: t.min, maxGuests: t.max, status: t.status,
        },
      });
      tableIds.push(table.id);
    }
    console.log('✅ 28 bàn (8T + 8A + 8B + 4VIP)');
  }

  // ==================== MENU CATEGORIES ====================
  const existingCats = await prisma.menuCategory.findMany();
  let catMap: Record<string, string> = {};

  if (existingCats.length > 0) {
    for (const c of existingCats) catMap[c.name] = c.id;
    console.log(`✅ Giữ nguyên ${existingCats.length} danh mục menu hiện có`);
  } else {
    const catDefs = [
      { name: 'Món khai vị', departmentDefault: 'KITCHEN' as const, sortOrder: 1 },
      { name: 'Món nướng', departmentDefault: 'KITCHEN' as const, sortOrder: 2 },
      { name: 'Hải sản', departmentDefault: 'KITCHEN' as const, sortOrder: 3 },
      { name: 'Món chính', departmentDefault: 'KITCHEN' as const, sortOrder: 4 },
      { name: 'Bia', departmentDefault: 'BAR' as const, sortOrder: 5 },
      { name: 'Rượu', departmentDefault: 'BAR' as const, sortOrder: 6 },
      { name: 'Cocktail', departmentDefault: 'BAR' as const, sortOrder: 7 },
      { name: 'Nước ngọt', departmentDefault: 'BAR' as const, sortOrder: 8 },
    ];
    for (const c of catDefs) {
      const cat = await prisma.menuCategory.create({ data: c });
      catMap[c.name] = cat.id;
    }
    console.log('✅ 8 danh mục menu');
  }

  // ==================== MENU ITEMS ====================
  const existingItems = await prisma.menuItem.findMany();
  const menuItemIds: string[] = existingItems.map(i => i.id);

  if (existingItems.length > 0) {
    console.log(`✅ Giữ nguyên ${existingItems.length} món ăn hiện có`);
  } else {
    function slugify(str: string): string {
      return str.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    const itemDefs = [
      { name: 'Mẹt khô tổng hợp', price: 189000, cat: 'Món khai vị', dept: 'KITCHEN' as const, desc: 'Tổng hợp các loại khô đặc biệt', time: 15, featured: true },
      { name: 'Khô gà lá chanh', price: 89000, cat: 'Món khai vị', dept: 'KITCHEN' as const, desc: 'Khô gà giòn rụm với lá chanh thơm', time: 10 },
      { name: 'Gỏi cuốn tôm thịt', price: 69000, cat: 'Món khai vị', dept: 'KITCHEN' as const, desc: 'Gỏi cuốn tươi mát, chấm mắm nêm', time: 10 },
      { name: 'Chả giò hải sản', price: 79000, cat: 'Món khai vị', dept: 'KITCHEN' as const, desc: 'Chả giò giòn nhân hải sản', time: 12 },
      { name: 'Mực nướng sa tế', price: 159000, cat: 'Món nướng', dept: 'KITCHEN' as const, desc: 'Mực tươi nướng sa tế cay thơm', time: 20, featured: true },
      { name: 'Tôm nướng muối ớt', price: 189000, cat: 'Món nướng', dept: 'KITCHEN' as const, desc: 'Tôm sú nướng muối ớt đỏ', time: 18 },
      { name: 'Sườn heo nướng BBQ', price: 169000, cat: 'Món nướng', dept: 'KITCHEN' as const, desc: 'Sườn heo non ướp sốt BBQ đặc biệt', time: 25 },
      { name: 'Gà nướng mật ong', price: 149000, cat: 'Món nướng', dept: 'KITCHEN' as const, desc: 'Gà ta nướng mật ong giòn da', time: 30 },
      { name: 'Hàu nướng phô mai', price: 139000, cat: 'Hải sản', dept: 'KITCHEN' as const, desc: 'Hàu tươi nướng phô mai vàng ươm', time: 15, featured: true },
      { name: 'Cua rang me', price: 359000, cat: 'Hải sản', dept: 'KITCHEN' as const, desc: 'Cua biển rang me chua ngọt', time: 25 },
      { name: 'Nghêu hấp xả', price: 99000, cat: 'Hải sản', dept: 'KITCHEN' as const, desc: 'Nghêu tươi hấp sả ớt', time: 12 },
      { name: 'Lẩu hải sản chua cay', price: 399000, cat: 'Món chính', dept: 'KITCHEN' as const, desc: 'Lẩu hải sản tổng hợp Tom Yum', time: 20, featured: true },
      { name: 'Cơm chiên hải sản', price: 129000, cat: 'Món chính', dept: 'KITCHEN' as const, desc: 'Cơm chiên dương châu hải sản', time: 15 },
      { name: 'Mì xào hải sản', price: 119000, cat: 'Món chính', dept: 'KITCHEN' as const, desc: 'Mì xào giòn với tôm, mực, nghêu', time: 15 },
      { name: 'Heineken Bạc', price: 35000, cat: 'Bia', dept: 'BAR' as const, desc: 'Lon 330ml', time: 1 },
      { name: 'Heineken', price: 30000, cat: 'Bia', dept: 'BAR' as const, desc: 'Lon 330ml', time: 1 },
      { name: 'Tiger', price: 25000, cat: 'Bia', dept: 'BAR' as const, desc: 'Lon 330ml', time: 1 },
      { name: 'Tiger Crystal', price: 28000, cat: 'Bia', dept: 'BAR' as const, desc: 'Lon 330ml', time: 1 },
      { name: 'Bia Sài Gòn Special', price: 22000, cat: 'Bia', dept: 'BAR' as const, desc: 'Lon 330ml', time: 1 },
      { name: 'Bia 333', price: 18000, cat: 'Bia', dept: 'BAR' as const, desc: 'Lon 330ml', time: 1 },
      { name: 'Soju Hàn Quốc', price: 85000, cat: 'Rượu', dept: 'BAR' as const, desc: 'Chai 360ml, nhiều vị', time: 1 },
      { name: 'Rượu vang đỏ Chile', price: 450000, cat: 'Rượu', dept: 'BAR' as const, desc: 'Chai 750ml', time: 2 },
      { name: 'Cocktail Signature Báo Garden', price: 120000, cat: 'Cocktail', dept: 'BAR' as const, desc: 'Cocktail đặc biệt của quán', time: 5, featured: true },
      { name: 'Mojito', price: 95000, cat: 'Cocktail', dept: 'BAR' as const, desc: 'Rum, chanh, bạc hà, soda', time: 5 },
      { name: 'Long Island Iced Tea', price: 110000, cat: 'Cocktail', dept: 'BAR' as const, desc: 'Hỗn hợp rượu mạnh, cola, chanh', time: 5 },
      { name: 'Margarita', price: 99000, cat: 'Cocktail', dept: 'BAR' as const, desc: 'Tequila, triple sec, chanh', time: 5 },
      { name: 'Pepsi', price: 20000, cat: 'Nước ngọt', dept: 'BAR' as const, desc: 'Lon 330ml', time: 1 },
      { name: '7Up', price: 20000, cat: 'Nước ngọt', dept: 'BAR' as const, desc: 'Lon 330ml', time: 1 },
      { name: 'Nước suối', price: 15000, cat: 'Nước ngọt', dept: 'BAR' as const, desc: 'Chai 500ml', time: 1 },
      { name: 'Red Bull', price: 30000, cat: 'Nước ngọt', dept: 'BAR' as const, desc: 'Lon 250ml', time: 1 },
      { name: 'Nước ép cam', price: 45000, cat: 'Nước ngọt', dept: 'BAR' as const, desc: 'Ly 400ml, cam vắt tươi', time: 3 },
    ];

    for (let i = 0; i < itemDefs.length; i++) {
      const item = itemDefs[i];
      const mi = await prisma.menuItem.create({
        data: {
          name: item.name, slug: slugify(item.name), description: item.desc,
          price: item.price, categoryId: catMap[item.cat], department: item.dept,
          preparationTimeMinutes: item.time, isFeatured: item.featured || false, sortOrder: i,
        },
      });
      menuItemIds.push(mi.id);
    }
    console.log('✅ 31 món ăn/đồ uống');
  }

  // ==================== BOOKINGS (today + tomorrow) ====================
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Delete old sample bookings to avoid conflicts
  const existingBookings = await prisma.booking.findMany({
    where: { bookingCode: { startsWith: 'DEMO-' } },
  });
  if (existingBookings.length > 0) {
    await prisma.bookingEvent.deleteMany({
      where: { bookingId: { in: existingBookings.map(b => b.id) } },
    });
    await prisma.booking.deleteMany({
      where: { bookingCode: { startsWith: 'DEMO-' } },
    });
  }

  const bookingDefs = [
    // Today bookings
    { code: 'DEMO-001', custIdx: 0, tableIdx: 0, date: today, time: '19:00', guests: 4, status: 'CONFIRMED' as const, source: 'PHONE' as const },
    { code: 'DEMO-002', custIdx: 1, tableIdx: 1, date: today, time: '19:30', guests: 6, status: 'PENDING' as const, source: 'PUBLIC' as const },
    { code: 'DEMO-003', custIdx: 3, tableIdx: 2, date: today, time: '20:00', guests: 3, status: 'CONFIRMED' as const, source: 'ZALO' as const },
    { code: 'DEMO-004', custIdx: 4, tableIdx: 8, date: today, time: '20:00', guests: 5, status: 'ARRIVED' as const, source: 'STAFF' as const },
    { code: 'DEMO-005', custIdx: 6, tableIdx: 16, date: today, time: '20:30', guests: 2, status: 'PENDING' as const, source: 'FACEBOOK' as const },
    { code: 'DEMO-006', custIdx: 0, tableIdx: Math.min(24, tableIds.length - 1), date: today, time: '21:00', guests: 10, status: 'CONFIRMED' as const, source: 'PHONE' as const },
    // Tomorrow bookings
    { code: 'DEMO-007', custIdx: 2, tableIdx: 3, date: tomorrow, time: '19:00', guests: 4, status: 'PENDING' as const, source: 'PUBLIC' as const },
    { code: 'DEMO-008', custIdx: 5, tableIdx: 10, date: tomorrow, time: '20:00', guests: 8, status: 'CONFIRMED' as const, source: 'PHONE' as const },
    { code: 'DEMO-009', custIdx: 7, tableIdx: Math.min(25, tableIds.length - 1), date: tomorrow, time: '20:00', guests: 12, status: 'CONFIRMED' as const, source: 'ZALO' as const },
    { code: 'DEMO-010', custIdx: 8, tableIdx: 5, date: tomorrow, time: '21:00', guests: 3, status: 'PENDING' as const, source: 'PUBLIC' as const },
  ];

  for (const b of bookingDefs) {
    if (b.tableIdx >= tableIds.length) continue;
    const booking = await prisma.booking.create({
      data: {
        bookingCode: b.code, customerId: customers[b.custIdx], tableId: tableIds[b.tableIdx],
        bookingDate: b.date, bookingTime: b.time, guestCount: b.guests,
        status: b.status, source: b.source,
        createdByUserId: b.source === 'PUBLIC' ? null : userRecords['BOOKING'],
        confirmedByUserId: b.status === 'CONFIRMED' || b.status === 'ARRIVED' ? userRecords['MANAGER'] : null,
      },
    });
    // Create booking events
    await prisma.bookingEvent.create({
      data: { bookingId: booking.id, type: 'CREATED', newStatus: 'PENDING' },
    });
    if (b.status === 'CONFIRMED' || b.status === 'ARRIVED') {
      await prisma.bookingEvent.create({
        data: { bookingId: booking.id, type: 'CONFIRMED', oldStatus: 'PENDING', newStatus: 'CONFIRMED', userId: userRecords['MANAGER'] },
      });
    }
    if (b.status === 'ARRIVED') {
      await prisma.bookingEvent.create({
        data: { bookingId: booking.id, type: 'ARRIVED', oldStatus: 'CONFIRMED', newStatus: 'ARRIVED', userId: userRecords['RECEPTION'] },
      });
    }
  }
  console.log('✅ 10 booking mẫu (6 hôm nay + 4 ngày mai)');

  // ==================== TABLE SESSION + ORDER (simulate active service) ====================
  // Clean old demo sessions
  const oldSessions = await prisma.tableSession.findMany({
    where: { tableId: { in: [tableIds[4], tableIds[12]] } },
  });
  for (const s of oldSessions) {
    await prisma.orderEvent.deleteMany({ where: { tableSessionId: s.id } });
    const orders = await prisma.order.findMany({ where: { tableSessionId: s.id } });
    for (const o of orders) {
      await prisma.orderItem.deleteMany({ where: { orderId: o.id } });
    }
    await prisma.order.deleteMany({ where: { tableSessionId: s.id } });
    await prisma.payment.deleteMany({ where: { tableSessionId: s.id } });
  }
  await prisma.tableSession.deleteMany({
    where: { tableId: { in: [tableIds[4], tableIds[12]] } },
  });

  if (menuItemIds.length >= 10) {
    // Session 1: Active table with orders being processed
    const session1 = await prisma.tableSession.create({
      data: {
        tableId: tableIds[4], // T5 or 5th table
        status: 'OPEN',
        openedByUserId: userRecords['WAITER'],
      },
    });

    const order1 = await prisma.order.create({
      data: {
        orderCode: 'DEMO-ORD-001',
        tableSessionId: session1.id,
        status: 'PROCESSING',
        source: 'WAITER',
        createdByUserId: userRecords['WAITER'],
      },
    });

    // Get menu item details for snapshots
    const menuItems = await prisma.menuItem.findMany({ where: { id: { in: menuItemIds } } });
    const menuMap = new Map(menuItems.map(m => [m.id, m]));

    // Add order items in various states
    const orderItems1 = [
      { menuItemId: menuItemIds[0], quantity: 1, price: 189000, dept: 'KITCHEN' as const, status: 'SERVED' as const },
      { menuItemId: menuItemIds[4], quantity: 2, price: 159000, dept: 'KITCHEN' as const, status: 'PREPARING' as const },
      { menuItemId: menuItemIds[14], quantity: 6, price: 35000, dept: 'BAR' as const, status: 'SERVED' as const },
      { menuItemId: menuItemIds[22], quantity: 2, price: 120000, dept: 'BAR' as const, status: 'READY' as const },
    ];

    for (const item of orderItems1) {
      const mi = menuMap.get(item.menuItemId);
      await prisma.orderItem.create({
        data: {
          orderId: order1.id, menuItemId: item.menuItemId,
          itemNameSnapshot: mi?.name || 'Unknown',
          priceSnapshot: item.price,
          quantity: item.quantity, totalPrice: item.price * item.quantity,
          department: item.dept, status: item.status,
        },
      });
    }

    // Session 2: Table requesting payment
    const session2 = await prisma.tableSession.create({
      data: {
        tableId: tableIds[12], // B5 or 13th table
        status: 'PAYMENT_REQUESTED',
        openedByUserId: userRecords['WAITER'],
      },
    });

    const order2 = await prisma.order.create({
      data: {
        orderCode: 'DEMO-ORD-002',
        tableSessionId: session2.id,
        status: 'PAYMENT_REQUESTED',
        source: 'WAITER',
        createdByUserId: userRecords['WAITER'],
      },
    });

    const orderItems2 = [
      { menuItemId: menuItemIds[8], quantity: 2, price: 139000, dept: 'KITCHEN' as const, status: 'SERVED' as const },
      { menuItemId: menuItemIds[11], quantity: 1, price: 399000, dept: 'KITCHEN' as const, status: 'SERVED' as const },
      { menuItemId: menuItemIds[15], quantity: 10, price: 30000, dept: 'BAR' as const, status: 'SERVED' as const },
      { menuItemId: menuItemIds[20], quantity: 3, price: 85000, dept: 'BAR' as const, status: 'SERVED' as const },
      { menuItemId: menuItemIds[29], quantity: 2, price: 30000, dept: 'BAR' as const, status: 'SERVED' as const },
    ];

    for (const item of orderItems2) {
      const mi = menuMap.get(item.menuItemId);
      await prisma.orderItem.create({
        data: {
          orderId: order2.id, menuItemId: item.menuItemId,
          itemNameSnapshot: mi?.name || 'Unknown',
          priceSnapshot: item.price,
          quantity: item.quantity, totalPrice: item.price * item.quantity,
          department: item.dept, status: item.status,
        },
      });
    }

    console.log('✅ 2 phiên bàn mẫu (1 đang phục vụ, 1 đợi thanh toán)');
    console.log('✅ 2 đơn hàng mẫu (9 món - đủ trạng thái PREPARING/READY/SERVED)');
  }

  // ==================== SERVICE REQUESTS ====================
  await prisma.serviceRequest.deleteMany({
    where: { type: { in: ['CALL_WAITER', 'ADD_ICE', 'CLEAN_TABLE'] }, status: 'PENDING' },
  });

  if (tableIds.length >= 15) {
    await prisma.serviceRequest.createMany({
      data: [
        { tableId: tableIds[4], type: 'CALL_WAITER', status: 'PENDING', note: 'Xin thêm đá' },
        { tableId: tableIds[12], type: 'REQUEST_PAYMENT', status: 'PENDING', note: 'Thanh toán bằng chuyển khoản' },
        { tableId: tableIds[8], type: 'ADD_ICE', status: 'PENDING' },
      ],
    });
    console.log('✅ 3 yêu cầu dịch vụ mẫu');
  }

  // ==================== SUMMARY ====================
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 SEEDING HOÀN TẤT!\n');
  console.log('📋 TÀI KHOẢN ĐĂNG NHẬP (Mật khẩu: 123456)');
  console.log('─'.repeat(60));
  console.log('  Email                      │ Vai trò    │ Tên');
  console.log('─'.repeat(60));
  for (const [email, info] of Object.entries(users)) {
    const role = info.role.padEnd(10);
    console.log(`  ${email.padEnd(28)} │ ${role} │ ${info.name}`);
  }
  console.log('─'.repeat(60));
  console.log('\n📊 DỮ LIỆU MẪU:');
  console.log('  • 10 khách hàng (3 VIP, 3 Returning, 3 New, 1 Blacklist)');
  console.log('  • 10 booking (6 hôm nay, 4 ngày mai - đủ status)');
  console.log('  • 2 phiên bàn đang hoạt động');
  console.log('  • 2 đơn hàng với 9 món (đủ trạng thái)');
  console.log('  • 3 yêu cầu dịch vụ');
  console.log('═'.repeat(60));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
