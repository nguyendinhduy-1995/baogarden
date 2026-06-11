import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomPick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function padNum(n: number, len = 3): string { return n.toString().padStart(len, '0'); }

const FIRST_NAMES = ['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý'];
const MIDDLE_NAMES = ['Văn','Thị','Minh','Quốc','Thanh','Hoàng','Đức','Thúy','Ngọc','Hữu','Kim','Bảo','Anh','Phương','Hải','Xuân'];
const LAST_NAMES = ['An','Bình','Châu','Dũng','Em','Phúc','Giang','Hùng','Khanh','Linh','Mai','Nam','Oanh','Phong','Quân','Ry','Sơn','Tâm','Uyên','Vy','Xuân','Yên','Tuấn','Hà','Trang','Thảo','Đạt','Huy','Lan','Long'];
const NOTES_VIP = ['Khách VIP thường xuyên','CEO công ty','Đối tác kinh doanh','Khách ruột từ 2024','Hay đặt tiệc lớn'];
const NOTES_RETURNING = ['Hay đặt cuối tuần','Thích khu VIP','Thường đến nhóm 4-6','Fan cocktail','Đặt sinh nhật thường xuyên'];
const SOURCES = ['PUBLIC','STAFF','PHONE','FACEBOOK','ZALO','WALK_IN'] as const;
const TIMES = ['18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'];

async function main() {
  console.log('🌱 Seeding 50 entries per category...\n');

  // ==================== 50 CUSTOMERS ====================
  const existingPhones = new Set((await prisma.customer.findMany({ select: { phone: true } })).map(c => c.phone));
  let newCustCount = 0;
  const allCustomerIds: string[] = [];

  for (let i = 1; i <= 50; i++) {
    const phone = `09${randomInt(10, 99)}${padNum(randomInt(100, 999))}${padNum(randomInt(10, 99), 2)}`;
    if (existingPhones.has(phone)) continue;
    existingPhones.add(phone);

    const type = i <= 12 ? 'VIP' : i <= 25 ? 'RETURNING' : i <= 45 ? 'NEW' : 'BLACKLIST';
    const name = `${randomPick(FIRST_NAMES)} ${randomPick(MIDDLE_NAMES)} ${randomPick(LAST_NAMES)}`;
    const note = type === 'VIP' ? randomPick(NOTES_VIP) : type === 'RETURNING' ? randomPick(NOTES_RETURNING) : type === 'BLACKLIST' ? 'Gây rối/vi phạm nội quy' : undefined;

    const c = await prisma.customer.create({
      data: { name, phone, customerType: type as any, note },
    });
    allCustomerIds.push(c.id);
    newCustCount++;
  }
  // Also include existing customers
  const allExisting = await prisma.customer.findMany({ select: { id: true } });
  for (const c of allExisting) { if (!allCustomerIds.includes(c.id)) allCustomerIds.push(c.id); }
  console.log(`✅ ${newCustCount} khách hàng mới (tổng: ${allCustomerIds.length})`);

  // ==================== GET TABLES & MENU ====================
  const allTables = await prisma.restaurantTable.findMany({ select: { id: true, code: true } });
  const allMenuItems = await prisma.menuItem.findMany({ select: { id: true, name: true, price: true, department: true } });
  const kitchenItems = allMenuItems.filter(m => m.department === 'KITCHEN');
  const barItems = allMenuItems.filter(m => m.department === 'BAR');
  const allUsers = await prisma.user.findMany({ select: { id: true, role: true } });
  const adminId = allUsers.find(u => u.role === 'ADMIN')?.id || allUsers[0].id;
  const waiterId = allUsers.find(u => u.role === 'WAITER')?.id || adminId;
  const bookingStaffId = allUsers.find(u => u.role === 'BOOKING')?.id || adminId;

  if (allTables.length === 0 || allMenuItems.length === 0) {
    console.log('❌ Cần có bàn và menu trước khi seed. Chạy seed.ts chính trước.');
    return;
  }

  // ==================== 50 BOOKINGS ====================
  const statuses = ['PENDING', 'CONFIRMED', 'ARRIVED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;
  let bookingCount = 0;

  for (let i = 1; i <= 50; i++) {
    const daysOffset = randomInt(-7, 7); // past 7 days to next 7 days
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + daysOffset);
    bookingDate.setHours(0, 0, 0, 0);

    const dateStr = bookingDate.toISOString().split('T')[0];
    const time = randomPick(TIMES);
    const tableIdx = randomInt(0, allTables.length - 1);
    const customerId = randomPick(allCustomerIds);
    const source = randomPick([...SOURCES]);
    const guestCount = randomInt(2, 8);

    // Past dates get completed/cancelled/no_show, future dates get pending/confirmed
    let status: string;
    if (daysOffset < -1) {
      status = randomPick(['COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);
    } else if (daysOffset < 0) {
      status = randomPick(['COMPLETED', 'ARRIVED', 'CANCELLED']);
    } else if (daysOffset === 0) {
      status = randomPick(['PENDING', 'CONFIRMED', 'CONFIRMED', 'ARRIVED']);
    } else {
      status = randomPick(['PENDING', 'PENDING', 'CONFIRMED']);
    }

    const code = `BK-${dateStr.replace(/-/g, '')}-${padNum(i, 4)}`;

    try {
      await prisma.booking.create({
        data: {
          bookingCode: code,
          customerId,
          tableId: allTables[tableIdx].id,
          bookingDate,
          bookingTime: time,
          guestCount,
          status: status as any,
          source: source as any,
          note: i % 5 === 0 ? 'Sinh nhật bạn' : i % 7 === 0 ? 'Kỷ niệm' : i % 3 === 0 ? 'Tiệc công ty' : undefined,
          minSpend: guestCount > 4 ? randomInt(500000, 2000000) : 0,
          createdByUserId: randomPick([bookingStaffId, adminId, null as any]),
          confirmedByUserId: ['CONFIRMED', 'ARRIVED', 'COMPLETED'].includes(status) ? bookingStaffId : undefined,
        },
      });
      bookingCount++;
    } catch { /* skip duplicate codes */ }
  }
  console.log(`✅ ${bookingCount} booking mới`);

  // ==================== 10 TABLE SESSIONS with ORDERS ====================
  // Create sessions for various tables
  const sessionTables = allTables.slice(0, Math.min(10, allTables.length));
  let sessionCount = 0;
  let orderCount = 0;
  let itemCount = 0;

  for (const table of sessionTables) {
    const sessionStatus = randomPick(['OPEN', 'OPEN', 'PAYMENT_REQUESTED', 'CLOSED', 'CLOSED']);

    const session = await prisma.tableSession.create({
      data: {
        tableId: table.id,
        status: sessionStatus as any,
        openedByUserId: waiterId,
        closedAt: sessionStatus === 'CLOSED' ? new Date() : undefined,
      },
    });
    sessionCount++;

    // Each session has 1-3 orders
    const orderNum = randomInt(1, 3);
    for (let o = 0; o < orderNum; o++) {
      const orderCode = `BG-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${padNum(randomInt(100, 999), 4)}`;
      const numItems = randomInt(2, 6);
      const orderItems: Array<{ menuItemId: string; itemNameSnapshot: string; priceSnapshot: number; quantity: number; totalPrice: number; department: string; status: string; note?: string }> = [];

      for (let it = 0; it < numItems; it++) {
        const menuItem = randomPick([...kitchenItems, ...barItems]);
        const qty = menuItem.department === 'BAR' ? randomInt(1, 10) : randomInt(1, 3);
        const price = Number(menuItem.price);
        const itemStatus = sessionStatus === 'CLOSED' ? 'SERVED' : randomPick(['PENDING', 'PREPARING', 'READY', 'SERVED']);

        orderItems.push({
          menuItemId: menuItem.id,
          itemNameSnapshot: menuItem.name,
          priceSnapshot: price,
          quantity: qty,
          totalPrice: price * qty,
          department: menuItem.department,
          status: itemStatus,
          note: it === 0 && o === 0 ? 'Ít cay' : undefined,
        });
      }

      const subtotal = orderItems.reduce((s, i) => s + i.totalPrice, 0);

      try {
        await prisma.order.create({
          data: {
            orderCode,
            tableSessionId: session.id,
            createdByUserId: waiterId,
            source: 'WAITER',
            status: sessionStatus === 'CLOSED' ? 'COMPLETED' : 'SUBMITTED',
            subtotal,
            items: { create: orderItems.map(i => ({ ...i, status: i.status as any, department: i.department as any })) },
          },
        });
        orderCount++;
        itemCount += orderItems.length;
      } catch { /* skip duplicate order codes */ }
    }

    // Update session subtotal
    const sessionOrders = await prisma.order.findMany({
      where: { tableSessionId: session.id }, select: { subtotal: true },
    });
    const total = sessionOrders.reduce((s, o) => s + Number(o.subtotal), 0);
    await prisma.tableSession.update({
      where: { id: session.id },
      data: { subtotal: total, totalAmount: total },
    });
  }
  console.log(`✅ ${sessionCount} phiên bàn, ${orderCount} đơn hàng, ${itemCount} món`);

  // ==================== 20 SERVICE REQUESTS ====================
  const srTypes = ['CALL_WAITER', 'REQUEST_PAYMENT', 'ADD_ICE', 'CLEAN_TABLE', 'OTHER'] as const;
  const srNotes = ['Xin thêm đá', 'Gọi phục vụ', 'Cần khăn lạnh', 'Thêm muỗng đũa', 'Thanh toán chuyển khoản', 'Xin menu', 'Gọi quản lý', 'Xin thêm nước chấm', 'Đổi bàn', 'Xin hộp mang về'];
  let srCount = 0;

  for (let i = 0; i < 20; i++) {
    const table = randomPick(allTables);
    const type = randomPick([...srTypes]);
    const resolved = Math.random() > 0.4;
    const resolvedBy = allUsers.find(u => u.role === 'WAITER') || allUsers[0];

    await prisma.serviceRequest.create({
      data: {
        tableId: table.id,
        type: type as any,
        note: randomPick(srNotes),
        status: resolved ? 'RESOLVED' : 'PENDING',
        resolvedAt: resolved ? new Date() : undefined,
        resolvedByUserId: resolved ? resolvedBy.id : undefined,
      },
    });
    srCount++;
  }
  console.log(`✅ ${srCount} yêu cầu dịch vụ`);

  // ==================== 14 DAILY EVENTS (2 per day) ====================
  const eventTypes = ['chill', 'ladies', 'acoustic', 'dj', 'party', 'recovery'];
  const dayDefs = [
    { index: 0, name: 'Thứ Hai', short: 'T2' }, { index: 1, name: 'Thứ Ba', short: 'T3' },
    { index: 2, name: 'Thứ Tư', short: 'T4' }, { index: 3, name: 'Thứ Năm', short: 'T5' },
    { index: 4, name: 'Thứ Sáu', short: 'T6' }, { index: 5, name: 'Thứ Bảy', short: 'T7' },
    { index: 6, name: 'Chủ Nhật', short: 'CN' },
  ];
  const eventNames: Record<string, string[]> = {
    chill: ['Chill Monday', 'Acoustic Sunset', 'Relax Vibes'],
    ladies: ['Ladies Night Special', 'Pink Night', 'Girls Power'],
    acoustic: ['Acoustic Live', 'Guitar Unplugged', 'Vocal Night'],
    dj: ['DJ Night', 'Electronic Wave', 'Bass Drop'],
    party: ['Friday Fever', 'Weekend Blast', 'Saturday Madness'],
    recovery: ['Sunday Recovery', 'Brunch & Beats', 'Detox Day'],
  };

  // Keep existing, skip if already seeded plenty
  const existingEvents = await prisma.dailyEvent.count();
  if (existingEvents < 14) {
    await prisma.dailyEvent.deleteMany({});
    for (const day of dayDefs) {
      const type1 = eventTypes[day.index % eventTypes.length];
      const type2 = eventTypes[(day.index + 3) % eventTypes.length];
      await prisma.dailyEvent.create({
        data: { dayIndex: day.index, dayName: day.name, dayShort: day.short, name: randomPick(eventNames[type1]), description: `Chương trình ${type1} đặc biệt tại Báo Garden mỗi ${day.name}. Ưu đãi hấp dẫn cho khách đến sớm!`, type: type1 },
      });
      await prisma.dailyEvent.create({
        data: { dayIndex: day.index, dayName: day.name, dayShort: day.short, name: randomPick(eventNames[type2]), description: `Set 2 - ${type2} vibes cùng Báo Garden. Đến và cảm nhận không gian đỉnh cao!`, type: type2 },
      });
    }
    console.log('✅ 14 sự kiện hàng ngày (2/ngày)');
  }

  // ==================== 10 WEEKLY SCHEDULE ====================
  const existingWeekly = await prisma.weeklySchedule.count();
  if (existingWeekly < 10) {
    await prisma.weeklySchedule.deleteMany({});
    const schedules = [
      { day: 'Thứ Hai', program: 'Acoustic Set', artist: 'Ca sĩ Minh Tú', type: 'Acoustic' },
      { day: 'Thứ Ba', program: 'Chill Lounge', artist: 'DJ Hùng Vương', type: 'DJ' },
      { day: 'Thứ Tư', program: 'Ladies Special', artist: 'Band The Roses', type: 'Live' },
      { day: 'Thứ Năm', program: 'Warm Up Set', artist: 'DJ Minh Tú', type: 'DJ' },
      { day: 'Thứ Năm', program: 'Main Set', artist: 'DJ Hùng Vương', type: 'DJ' },
      { day: 'Thứ Sáu', program: 'Friday Fever', artist: 'DJ Alex', type: 'DJ' },
      { day: 'Thứ Sáu', program: 'Dance Show', artist: 'Dancer Team BG', type: 'Dance' },
      { day: 'Thứ Bảy', program: 'Saturday Night', artist: 'DJ Khoa', type: 'DJ' },
      { day: 'Thứ Bảy', program: 'Live Vocal', artist: 'Ca sĩ Thảo Vy', type: 'Live' },
      { day: 'Chủ Nhật', program: 'Sunday Acoustic', artist: 'Guitar Club', type: 'Acoustic' },
    ];
    for (let i = 0; i < schedules.length; i++) {
      await prisma.weeklySchedule.create({ data: { ...schedules[i], sortOrder: i } });
    }
    console.log('✅ 10 lịch DJ/Dancer/Ca sĩ');
  }

  // ==================== 8 UPCOMING EVENTS ====================
  const existingUpcoming = await prisma.upcomingEvent.count();
  if (existingUpcoming < 8) {
    await prisma.upcomingEvent.deleteMany({});
    const upcomingDefs = [
      { title: 'Friday Fever – EDM Night', date: 'Thứ Sáu tuần này', time: '20h00 – 03h00', tag: 'Hot', description: 'DJ Alex đặc biệt quay trở lại với set EDM bùng nổ nhất mùa hè.' },
      { title: 'Ladies Night – Free Cocktail', date: 'Thứ Tư tuần này', time: '19h00 – 23h00', tag: 'Ladies', description: 'Phái đẹp được tặng 2 cocktail miễn phí. Dress code: Elegant.' },
      { title: 'Full Moon Party', date: 'Thứ Bảy, 15/06', time: '20h00 – 04h00', tag: 'Special', description: 'Đêm trăng tròn huyền bí. Trang trí neon, body paint, DJ quốc tế.' },
      { title: 'Acoustic Night – Tình Ca Việt', date: 'Chủ Nhật tuần này', time: '19h00 – 22h00', tag: 'Acoustic', description: 'Đêm nhạc acoustic với những bản tình ca Việt bất hủ.' },
      { title: 'Birthday Bash – Tháng 6', date: 'Thứ Bảy, 21/06', time: '20h00 – 02h00', tag: 'Birthday', description: 'Tiệc sinh nhật tập thể cho các bạn sinh tháng 6. Miễn phí bánh kem!' },
      { title: 'World Cup Watch Party', date: 'Thứ Năm, 19/06', time: '23h00 – 05h00', tag: 'Sport', description: 'Xem bóng đá trực tiếp trên màn hình khổng lồ. Bia giảm 30%!' },
      { title: 'Wine Tasting Night', date: 'Thứ Sáu, 20/06', time: '18h00 – 21h00', tag: 'Premium', description: 'Thưởng thức rượu vang cao cấp từ Pháp và Ý với chuyên gia.' },
      { title: 'Tropical Summer Party', date: 'Thứ Bảy, 28/06', time: '20h00 – 03h00', tag: 'Hot', description: 'Pool party phong cách nhiệt đới. Dress code: Hawaii.' },
    ];
    for (let i = 0; i < upcomingDefs.length; i++) {
      await prisma.upcomingEvent.create({ data: { ...upcomingDefs[i], sortOrder: i } });
    }
    console.log('✅ 8 sự kiện sắp tới');
  }

  // ==================== ORDER EVENTS (audit log) ====================
  const sessions = await prisma.tableSession.findMany({ take: 5, select: { id: true }, orderBy: { createdAt: 'desc' } });
  const orders = await prisma.order.findMany({ take: 5, select: { id: true, tableSessionId: true }, orderBy: { createdAt: 'desc' } });
  let eventCount = 0;

  for (const sess of sessions) {
    await prisma.orderEvent.create({
      data: { tableSessionId: sess.id, type: 'SESSION_OPENED', payload: { source: 'SEED' }, createdByUserId: waiterId },
    });
    eventCount++;
  }
  for (const ord of orders) {
    await prisma.orderEvent.create({
      data: { orderId: ord.id, tableSessionId: ord.tableSessionId, type: 'ORDER_SUBMITTED', payload: { source: 'SEED' }, createdByUserId: waiterId },
    });
    eventCount++;
  }
  console.log(`✅ ${eventCount} order events`);

  // ==================== SUMMARY ====================
  const counts = {
    customers: await prisma.customer.count(),
    bookings: await prisma.booking.count(),
    sessions: await prisma.tableSession.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    serviceRequests: await prisma.serviceRequest.count(),
    dailyEvents: await prisma.dailyEvent.count(),
    weeklySchedule: await prisma.weeklySchedule.count(),
    upcomingEvents: await prisma.upcomingEvent.count(),
    users: await prisma.user.count(),
  };

  console.log('\n' + '═'.repeat(60));
  console.log('🎉 SEED MASSIVE HOÀN TẤT!\n');
  console.log('📊 TỔNG DỮ LIỆU TRONG HỆ THỐNG:');
  console.log('─'.repeat(40));
  console.log(`  👤 Users:            ${counts.users}`);
  console.log(`  👥 Customers:        ${counts.customers}`);
  console.log(`  📅 Bookings:         ${counts.bookings}`);
  console.log(`  🍽️  Table Sessions:   ${counts.sessions}`);
  console.log(`  📝 Orders:           ${counts.orders}`);
  console.log(`  🍜 Order Items:      ${counts.orderItems}`);
  console.log(`  🔔 Service Requests: ${counts.serviceRequests}`);
  console.log(`  🎵 Daily Events:     ${counts.dailyEvents}`);
  console.log(`  🎧 Weekly Schedule:  ${counts.weeklySchedule}`);
  console.log(`  🎉 Upcoming Events:  ${counts.upcomingEvents}`);
  console.log('═'.repeat(60));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
