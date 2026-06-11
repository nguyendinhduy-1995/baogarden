import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data in order
  await prisma.bookingEvent.deleteMany();
  await prisma.customerNote.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.restaurantTable.deleteMany();
  await prisma.tableArea.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // ─── Users ──────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@123456', 12);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@booking.local',
      phone: '0900000001',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Nguyễn Văn Quản Lý',
      email: 'manager@booking.local',
      phone: '0900000002',
      passwordHash: await bcrypt.hash('Manager@123456', 12),
      role: 'MANAGER',
      status: 'ACTIVE',
    },
  });

  const booking1 = await prisma.user.create({
    data: {
      name: 'Trần Thị Booking',
      email: 'booking1@booking.local',
      phone: '0900000003',
      passwordHash: await bcrypt.hash('Booking@123456', 12),
      role: 'BOOKING',
      status: 'ACTIVE',
    },
  });

  const booking2 = await prisma.user.create({
    data: {
      name: 'Lê Văn Booking',
      email: 'booking2@booking.local',
      phone: '0900000004',
      passwordHash: await bcrypt.hash('Booking@123456', 12),
      role: 'BOOKING',
      status: 'ACTIVE',
    },
  });

  const reception = await prisma.user.create({
    data: {
      name: 'Phạm Thị Lễ Tân',
      email: 'reception@booking.local',
      phone: '0900000005',
      passwordHash: await bcrypt.hash('Reception@123456', 12),
      role: 'RECEPTION',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created users');

  // ─── Table Areas (5 khu vực theo sơ đồ 3D) ─────────────────────────
  const areaA = await prisma.tableArea.create({
    data: { name: 'Khu A', description: 'Bên phải, gần phòng chờ' },
  });
  const areaB = await prisma.tableArea.create({
    data: { name: 'Khu B', description: 'Bên trái' },
  });
  const areaT = await prisma.tableArea.create({
    data: { name: 'Khu T', description: 'Trung tâm, đối diện sân khấu' },
  });
  const areaV1 = await prisma.tableArea.create({
    data: { name: 'VIP 1', description: 'Phòng VIP phía dưới' },
  });
  const areaV2 = await prisma.tableArea.create({
    data: { name: 'VIP 2', description: 'Phòng VIP bên trái trên' },
  });

  console.log('✅ Created 5 table areas');

  // ─── Tables (51 bàn theo sơ đồ 3D Báo Garden) ──────────────────────
  //
  // Layout map (top = sân khấu, bottom = cửa vào):
  //
  //  V2-2  B2  B1       SÂN KHẤU      A1  A2
  //        B5  B4  B3   T7 T5 T3 T1   A3 A4 A5  PHÒNG CHỜ
  //  V2-1  B6  B8  B10  T8 T6 T4 T2      A7 A8
  //        B7  B9  B11                 A9
  //                     T15 T13 T11 T9
  //              B12    T16 T14 T12 T10   A11
  //   THU   B13
  //  NGÂN         V1-4  A17 A16 A15 A14   A11
  //                                       A13
  //                     V1-2    V1-1
  //
  // posX: 0=trái → 100=phải
  // posY: 0=trên (sân khấu) → 100=dưới (cửa vào)

  const tableData = [
    // ── Khu A (bên phải) ──
    // Hàng 1 (trên cùng, ngang sân khấu)
    { code: 'A1',  name: 'Bàn A1',  areaId: areaA.id, status: 'AVAILABLE' as const, minGuests: 4, maxGuests: 6, depositAmount: 500000, minSpend: 2000000, posX: 75, posY: 8,  width: 30, height: 20 },
    { code: 'A2',  name: 'Bàn A2',  areaId: areaA.id, status: 'AVAILABLE' as const, minGuests: 4, maxGuests: 6, depositAmount: 500000, minSpend: 2000000, posX: 85, posY: 8,  width: 30, height: 20 },
    // Hàng 2
    { code: 'A3',  name: 'Bàn A3',  areaId: areaA.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 300000, minSpend: 1000000, posX: 72, posY: 20, width: 28, height: 18 },
    { code: 'A4',  name: 'Bàn A4',  areaId: areaA.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 300000, minSpend: 1000000, posX: 80, posY: 20, width: 28, height: 18 },
    { code: 'A5',  name: 'Bàn A5',  areaId: areaA.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 300000, minSpend: 1000000, posX: 88, posY: 20, width: 28, height: 18 },
    // Hàng 3
    { code: 'A7',  name: 'Bàn A7',  areaId: areaA.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000,  posX: 80, posY: 32, width: 28, height: 18 },
    { code: 'A8',  name: 'Bàn A8',  areaId: areaA.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000,  posX: 88, posY: 32, width: 28, height: 18 },
    // Cột phải giữa
    { code: 'A9',  name: 'Bàn A9',  areaId: areaA.id, status: 'AVAILABLE' as const, minGuests: 4, maxGuests: 8, depositAmount: 500000, minSpend: 2000000, posX: 90, posY: 44, width: 30, height: 22 },
    // Hàng dưới phải
    { code: 'A11', name: 'Bàn A11', areaId: areaA.id, status: 'AVAILABLE' as const, minGuests: 4, maxGuests: 6, depositAmount: 300000, minSpend: 1000000, posX: 90, posY: 58, width: 28, height: 18 },
    { code: 'A13', name: 'Bàn A13', areaId: areaA.id, status: 'AVAILABLE' as const, minGuests: 4, maxGuests: 6, depositAmount: 300000, minSpend: 1000000, posX: 92, posY: 80, width: 28, height: 18 },
    // Hàng A14-A17 (ngang, phía dưới)
    { code: 'A14', name: 'Bàn A14', areaId: areaA.id, status: 'AVAILABLE' as const, minGuests: 4, maxGuests: 6, depositAmount: 300000, minSpend: 1000000, posX: 75, posY: 75, width: 30, height: 20 },
    { code: 'A15', name: 'Bàn A15', areaId: areaA.id, status: 'AVAILABLE' as const, minGuests: 4, maxGuests: 6, depositAmount: 300000, minSpend: 1000000, posX: 64, posY: 75, width: 30, height: 20 },
    { code: 'A16', name: 'Bàn A16', areaId: areaA.id, status: 'AVAILABLE' as const, minGuests: 4, maxGuests: 6, depositAmount: 300000, minSpend: 1000000, posX: 53, posY: 75, width: 30, height: 20 },
    { code: 'A17', name: 'Bàn A17', areaId: areaA.id, status: 'AVAILABLE' as const, minGuests: 4, maxGuests: 6, depositAmount: 300000, minSpend: 1000000, posX: 42, posY: 75, width: 30, height: 20 },

    // ── Khu B (bên trái) ──
    // Hàng 1
    { code: 'B1',  name: 'Bàn B1',  areaId: areaB.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 24, posY: 8,  width: 28, height: 18 },
    { code: 'B2',  name: 'Bàn B2',  areaId: areaB.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 14, posY: 8,  width: 28, height: 18 },
    // Hàng 2
    { code: 'B3',  name: 'Bàn B3',  areaId: areaB.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 30, posY: 20, width: 28, height: 18 },
    { code: 'B4',  name: 'Bàn B4',  areaId: areaB.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 21, posY: 20, width: 28, height: 18 },
    { code: 'B5',  name: 'Bàn B5',  areaId: areaB.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 12, posY: 20, width: 28, height: 18 },
    // Hàng 3
    { code: 'B6',  name: 'Bàn B6',  areaId: areaB.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 12, posY: 32, width: 28, height: 18 },
    { code: 'B8',  name: 'Bàn B8',  areaId: areaB.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 21, posY: 32, width: 28, height: 18 },
    { code: 'B10', name: 'Bàn B10', areaId: areaB.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 30, posY: 32, width: 28, height: 18 },
    // Hàng 4
    { code: 'B7',  name: 'Bàn B7',  areaId: areaB.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 12, posY: 44, width: 28, height: 18 },
    { code: 'B9',  name: 'Bàn B9',  areaId: areaB.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 21, posY: 44, width: 28, height: 18 },
    { code: 'B11', name: 'Bàn B11', areaId: areaB.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 30, posY: 44, width: 28, height: 18 },
    // B12, B13 (xanh, gần VIP)
    { code: 'B12', name: 'Bàn B12', areaId: areaB.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 28, posY: 58, width: 28, height: 14 },
    { code: 'B13', name: 'Bàn B13', areaId: areaB.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 28, posY: 64, width: 28, height: 14 },

    // ── Khu T (trung tâm, đối diện sân khấu) ──
    // Hàng T trên (gần sân khấu)
    { code: 'T1',  name: 'Bàn T1',  areaId: areaT.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 300000, minSpend: 1000000, posX: 63, posY: 20, width: 28, height: 18 },
    { code: 'T3',  name: 'Bàn T3',  areaId: areaT.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 300000, minSpend: 1000000, posX: 55, posY: 20, width: 28, height: 18 },
    { code: 'T5',  name: 'Bàn T5',  areaId: areaT.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 300000, minSpend: 1000000, posX: 47, posY: 20, width: 28, height: 18 },
    { code: 'T7',  name: 'Bàn T7',  areaId: areaT.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 300000, minSpend: 1000000, posX: 39, posY: 20, width: 28, height: 18 },
    // Hàng T dưới (hàng 2)
    { code: 'T2',  name: 'Bàn T2',  areaId: areaT.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 63, posY: 32, width: 28, height: 18 },
    { code: 'T4',  name: 'Bàn T4',  areaId: areaT.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 55, posY: 32, width: 28, height: 18 },
    { code: 'T6',  name: 'Bàn T6',  areaId: areaT.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 47, posY: 32, width: 28, height: 18 },
    { code: 'T8',  name: 'Bàn T8',  areaId: areaT.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 39, posY: 32, width: 28, height: 18 },
    // Hàng T giữa (hàng 3)
    { code: 'T9',  name: 'Bàn T9',  areaId: areaT.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 67, posY: 50, width: 28, height: 18 },
    { code: 'T11', name: 'Bàn T11', areaId: areaT.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 58, posY: 50, width: 28, height: 18 },
    { code: 'T13', name: 'Bàn T13', areaId: areaT.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 49, posY: 50, width: 28, height: 18 },
    { code: 'T15', name: 'Bàn T15', areaId: areaT.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 40, posY: 50, width: 28, height: 18 },
    // Hàng T dưới (hàng 4)
    { code: 'T10', name: 'Bàn T10', areaId: areaT.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 67, posY: 62, width: 28, height: 18 },
    { code: 'T12', name: 'Bàn T12', areaId: areaT.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 58, posY: 62, width: 28, height: 18 },
    { code: 'T14', name: 'Bàn T14', areaId: areaT.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 49, posY: 62, width: 28, height: 18 },
    { code: 'T16', name: 'Bàn T16', areaId: areaT.id, status: 'AVAILABLE' as const, minGuests: 2, maxGuests: 4, depositAmount: 200000, minSpend: 800000, posX: 40, posY: 62, width: 28, height: 18 },

    // ── VIP 1 (phía dưới, sofa xanh) ──
    { code: 'V1-1', name: 'Phòng VIP 1-1', areaId: areaV1.id, status: 'VIP' as const, minGuests: 8,  maxGuests: 15, depositAmount: 1500000, minSpend: 5000000, posX: 63, posY: 90, width: 50, height: 26 },
    { code: 'V1-2', name: 'Phòng VIP 1-2', areaId: areaV1.id, status: 'VIP' as const, minGuests: 8,  maxGuests: 15, depositAmount: 1500000, minSpend: 5000000, posX: 44, posY: 90, width: 50, height: 26 },
    { code: 'V1-4', name: 'Phòng VIP 1-4', areaId: areaV1.id, status: 'VIP' as const, minGuests: 6,  maxGuests: 12, depositAmount: 1000000, minSpend: 3000000, posX: 26, posY: 75, width: 36, height: 30 },

    // ── VIP 2 (bên trái trên, sofa xanh) ──
    { code: 'V2-1', name: 'Phòng VIP 2-1', areaId: areaV2.id, status: 'VIP' as const, minGuests: 8,  maxGuests: 15, depositAmount: 1500000, minSpend: 5000000, posX: 3, posY: 32, width: 36, height: 26 },
    { code: 'V2-2', name: 'Phòng VIP 2-2', areaId: areaV2.id, status: 'VIP' as const, minGuests: 6,  maxGuests: 10, depositAmount: 1000000, minSpend: 3000000, posX: 3, posY: 8,  width: 36, height: 22 },
  ];

  const tables: Record<string, { id: string }> = {};
  for (const t of tableData) {
    const table = await prisma.restaurantTable.create({ data: t });
    tables[t.code] = table;
  }

  console.log(`✅ Created ${tableData.length} tables (${Object.keys(tables).length} unique)`);

  // ─── Customers ──────────────────────────────────────────────────────
  const customerData = [
    { name: 'Nguyễn Văn An', phone: '0901234567', customerType: 'RETURNING' as const, note: 'Thích bàn gần sân khấu' },
    { name: 'Trần Thị Bình', phone: '0912345678', customerType: 'VIP' as const, note: 'Hay đặt phòng VIP cho nhóm bạn' },
    { name: 'Lê Hoàng Cường', phone: '0923456789', customerType: 'RETURNING' as const, note: '' },
    { name: 'Phạm Thị Dung', phone: '0934567890', customerType: 'NEW' as const, note: 'Ưu tiên vị trí yên tĩnh' },
    { name: 'Hoàng Minh Đức', phone: '0945678901', customerType: 'VIP' as const, note: 'Khách hàng thân thiết, luôn đặt trước 2 ngày' },
    { name: 'Vũ Thị Hà', phone: '0956789012', customerType: 'NEW' as const, note: '' },
    { name: 'Đỗ Quốc Hưng', phone: '0967890123', customerType: 'RETURNING' as const, note: 'Hay đặt bàn cho đối tác kinh doanh' },
    { name: 'Ngô Thanh Lan', phone: '0978901234', customerType: 'VIP' as const, note: 'Khách quen, thường đi vào cuối tuần' },
    { name: 'Bùi Văn Minh', phone: '0981234567', customerType: 'RETURNING' as const, note: 'Thường đặt bàn cho 6 người' },
    { name: 'Đặng Thị Ngọc', phone: '0992345678', customerType: 'NEW' as const, note: '' },
    { name: 'Cao Văn Phong', phone: '0903456789', customerType: 'RETURNING' as const, note: 'Khách doanh nghiệp' },
    { name: 'Hồ Thị Quỳnh', phone: '0914567890', customerType: 'NEW' as const, note: '' },
    { name: 'Lý Văn Sơn', phone: '0925678901', customerType: 'RETURNING' as const, note: 'Hay đi nhóm lớn' },
    { name: 'Mai Thị Thu', phone: '0936789012', customerType: 'VIP' as const, note: 'Khách VIP, thường book phòng riêng' },
    { name: 'Nguyễn Văn Uy', phone: '0947890123', customerType: 'NEW' as const, note: '' },
    { name: 'Phan Thị Vân', phone: '0958901234', customerType: 'RETURNING' as const, note: '' },
    { name: 'Trịnh Văn Xuân', phone: '0969012345', customerType: 'NEW' as const, note: '' },
    { name: 'Võ Thị Yến', phone: '0970123456', customerType: 'RETURNING' as const, note: 'Hay đặt dịp lễ' },
    { name: 'Đinh Văn Zung', phone: '0911223344', customerType: 'NEW' as const, note: '' },
    { name: 'Lương Thị Ánh', phone: '0922334455', customerType: 'BLACKLIST' as const, note: 'Đã hủy nhiều lần không báo trước' },
  ];

  const customers: Record<string, { id: string }> = {};
  for (const c of customerData) {
    const customer = await prisma.customer.create({ data: c });
    customers[c.phone] = customer;
  }

  console.log(`✅ Created ${customerData.length} customers`);

  // ─── Bookings ───────────────────────────────────────────────────────
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today.getTime() - 86400000);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const twoDaysAgo = new Date(today.getTime() - 2 * 86400000);
  const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
  const threeDaysAgo = new Date(today.getTime() - 3 * 86400000);
  const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];
  const tomorrow = new Date(today.getTime() + 86400000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  let bookingCounter = 1;
  function genCode() {
    return `BG-${String(bookingCounter++).padStart(6, '0')}`;
  }

  const bookingData = [
    // Today bookings
    { bookingCode: genCode(), customerId: customers['0901234567'].id, tableId: tables['A1'].id,   bookingDate: todayStr, bookingTime: '20:00', guestCount: 4, status: 'CONFIRMED' as const, depositAmount: 500000, minSpend: 2000000, note: 'Sinh nhật bạn', source: 'STAFF' as const, createdByUserId: booking1.id },
    { bookingCode: genCode(), customerId: customers['0912345678'].id, tableId: tables['V1-1'].id, bookingDate: todayStr, bookingTime: '21:00', guestCount: 10, status: 'CONFIRMED' as const, depositAmount: 1500000, minSpend: 5000000, note: 'Tiệc công ty', source: 'STAFF' as const, createdByUserId: booking1.id },
    { bookingCode: genCode(), customerId: customers['0945678901'].id, tableId: tables['A2'].id,   bookingDate: todayStr, bookingTime: '20:30', guestCount: 6, status: 'ARRIVED' as const, depositAmount: 500000, minSpend: 2000000, note: '', source: 'PHONE' as const, createdByUserId: booking2.id },
    { bookingCode: genCode(), customerId: customers['0923456789'].id, tableId: tables['T5'].id,   bookingDate: todayStr, bookingTime: '19:30', guestCount: 2, status: 'PENDING' as const, depositAmount: 300000, minSpend: 1000000, note: 'Lần đầu đến', source: 'PUBLIC' as const },
    { bookingCode: genCode(), customerId: customers['0978901234'].id, tableId: tables['B3'].id,   bookingDate: todayStr, bookingTime: '22:00', guestCount: 4, status: 'PENDING' as const, depositAmount: 200000, minSpend: 800000, note: '', source: 'PUBLIC' as const },
    { bookingCode: genCode(), customerId: customers['0981234567'].id, tableId: tables['B5'].id,   bookingDate: todayStr, bookingTime: '20:00', guestCount: 4, status: 'CONFIRMED' as const, depositAmount: 200000, minSpend: 800000, note: '', source: 'STAFF' as const, createdByUserId: booking1.id },
    { bookingCode: genCode(), customerId: customers['0903456789'].id, tableId: tables['B4'].id,   bookingDate: todayStr, bookingTime: '21:00', guestCount: 3, status: 'PENDING' as const, depositAmount: 200000, minSpend: 800000, note: 'Đối tác quan trọng', source: 'STAFF' as const, createdByUserId: booking2.id },
    { bookingCode: genCode(), customerId: customers['0967890123'].id, tableId: tables['A9'].id,   bookingDate: todayStr, bookingTime: '20:00', guestCount: 5, status: 'CONFIRMED' as const, depositAmount: 500000, minSpend: 2000000, note: 'Tiếp khách đối tác', source: 'PHONE' as const, createdByUserId: booking1.id },
    { bookingCode: genCode(), customerId: customers['0956789012'].id, tableId: tables['T9'].id,   bookingDate: todayStr, bookingTime: '21:30', guestCount: 2, status: 'PENDING' as const, depositAmount: 200000, minSpend: 800000, note: '', source: 'FACEBOOK' as const },
    { bookingCode: genCode(), customerId: customers['0936789012'].id, tableId: tables['A13'].id,  bookingDate: todayStr, bookingTime: '22:00', guestCount: 6, status: 'CONFIRMED' as const, depositAmount: 300000, minSpend: 1000000, note: '', source: 'STAFF' as const, createdByUserId: booking1.id },
    // Tomorrow bookings
    { bookingCode: genCode(), customerId: customers['0934567890'].id, tableId: tables['T3'].id,   bookingDate: tomorrowStr, bookingTime: '20:00', guestCount: 3, status: 'CONFIRMED' as const, depositAmount: 300000, minSpend: 1000000, note: '', source: 'PUBLIC' as const },
    { bookingCode: genCode(), customerId: customers['0947890123'].id, tableId: tables['A3'].id,   bookingDate: tomorrowStr, bookingTime: '21:00', guestCount: 5, status: 'PENDING' as const, depositAmount: 300000, minSpend: 1000000, note: '', source: 'PUBLIC' as const },
    { bookingCode: genCode(), customerId: customers['0958901234'].id, tableId: tables['B7'].id,   bookingDate: tomorrowStr, bookingTime: '20:30', guestCount: 4, status: 'PENDING' as const, depositAmount: 200000, minSpend: 800000, note: '', source: 'ZALO' as const },
    // Yesterday
    { bookingCode: genCode(), customerId: customers['0901234567'].id, tableId: tables['A5'].id,   bookingDate: yesterdayStr, bookingTime: '20:00', guestCount: 4, status: 'COMPLETED' as const, depositAmount: 300000, minSpend: 1000000, note: '', source: 'STAFF' as const, createdByUserId: booking1.id, confirmedByUserId: manager.id, checkedInByUserId: reception.id },
    { bookingCode: genCode(), customerId: customers['0912345678'].id, tableId: tables['V1-2'].id, bookingDate: yesterdayStr, bookingTime: '21:00', guestCount: 12, status: 'COMPLETED' as const, depositAmount: 1500000, minSpend: 5000000, note: 'Đại tiệc', source: 'STAFF' as const, createdByUserId: booking1.id, confirmedByUserId: manager.id, checkedInByUserId: reception.id },
    { bookingCode: genCode(), customerId: customers['0969012345'].id, tableId: tables['T1'].id,   bookingDate: yesterdayStr, bookingTime: '19:30', guestCount: 2, status: 'CANCELLED' as const, depositAmount: 300000, minSpend: 1000000, note: 'Khách hủy gấp', source: 'PUBLIC' as const },
    { bookingCode: genCode(), customerId: customers['0970123456'].id, tableId: tables['B1'].id,   bookingDate: yesterdayStr, bookingTime: '20:30', guestCount: 3, status: 'NO_SHOW' as const, depositAmount: 200000, minSpend: 800000, note: '', source: 'PUBLIC' as const },
    { bookingCode: genCode(), customerId: customers['0925678901'].id, tableId: tables['A7'].id,   bookingDate: yesterdayStr, bookingTime: '21:00', guestCount: 4, status: 'COMPLETED' as const, depositAmount: 200000, minSpend: 800000, note: '', source: 'STAFF' as const, createdByUserId: booking2.id, confirmedByUserId: manager.id, checkedInByUserId: reception.id },
    // 2 days ago
    { bookingCode: genCode(), customerId: customers['0945678901'].id, tableId: tables['A2'].id,   bookingDate: twoDaysAgoStr, bookingTime: '20:00', guestCount: 4, status: 'COMPLETED' as const, depositAmount: 500000, minSpend: 2000000, note: '', source: 'STAFF' as const, createdByUserId: booking1.id, confirmedByUserId: manager.id, checkedInByUserId: reception.id },
    { bookingCode: genCode(), customerId: customers['0978901234'].id, tableId: tables['B8'].id,   bookingDate: twoDaysAgoStr, bookingTime: '21:00', guestCount: 4, status: 'COMPLETED' as const, depositAmount: 200000, minSpend: 800000, note: '', source: 'PHONE' as const, createdByUserId: booking2.id, confirmedByUserId: manager.id, checkedInByUserId: reception.id },
    { bookingCode: genCode(), customerId: customers['0911223344'].id, tableId: tables['T4'].id,   bookingDate: twoDaysAgoStr, bookingTime: '19:30', guestCount: 2, status: 'NO_SHOW' as const, depositAmount: 200000, minSpend: 800000, note: '', source: 'PUBLIC' as const },
    { bookingCode: genCode(), customerId: customers['0992345678'].id, tableId: tables['T6'].id,   bookingDate: twoDaysAgoStr, bookingTime: '22:00', guestCount: 3, status: 'COMPLETED' as const, depositAmount: 200000, minSpend: 800000, note: '', source: 'STAFF' as const, createdByUserId: booking1.id },
    // 3 days ago
    { bookingCode: genCode(), customerId: customers['0914567890'].id, tableId: tables['B6'].id,   bookingDate: threeDaysAgoStr, bookingTime: '20:00', guestCount: 2, status: 'COMPLETED' as const, depositAmount: 200000, minSpend: 800000, note: '', source: 'PUBLIC' as const },
    { bookingCode: genCode(), customerId: customers['0936789012'].id, tableId: tables['V2-1'].id, bookingDate: threeDaysAgoStr, bookingTime: '21:00', guestCount: 10, status: 'COMPLETED' as const, depositAmount: 1500000, minSpend: 5000000, note: '', source: 'STAFF' as const, createdByUserId: booking2.id, confirmedByUserId: manager.id, checkedInByUserId: reception.id },
    { bookingCode: genCode(), customerId: customers['0903456789'].id, tableId: tables['A4'].id,   bookingDate: threeDaysAgoStr, bookingTime: '20:30', guestCount: 4, status: 'CANCELLED' as const, depositAmount: 300000, minSpend: 1000000, note: 'Khách bận', source: 'STAFF' as const, createdByUserId: booking1.id },
    { bookingCode: genCode(), customerId: customers['0981234567'].id, tableId: tables['T2'].id,   bookingDate: threeDaysAgoStr, bookingTime: '19:00', guestCount: 2, status: 'COMPLETED' as const, depositAmount: 200000, minSpend: 800000, note: '', source: 'WALK_IN' as const, createdByUserId: reception.id },
    { bookingCode: genCode(), customerId: customers['0922334455'].id, tableId: tables['A8'].id,   bookingDate: threeDaysAgoStr, bookingTime: '22:00', guestCount: 4, status: 'NO_SHOW' as const, depositAmount: 200000, minSpend: 800000, note: 'Không liên lạc được', source: 'STAFF' as const, createdByUserId: booking1.id },
    { bookingCode: genCode(), customerId: customers['0956789012'].id, tableId: tables['B10'].id,  bookingDate: threeDaysAgoStr, bookingTime: '20:00', guestCount: 2, status: 'COMPLETED' as const, depositAmount: 200000, minSpend: 800000, note: '', source: 'FACEBOOK' as const },
    { bookingCode: genCode(), customerId: customers['0947890123'].id, tableId: tables['T10'].id,  bookingDate: twoDaysAgoStr, bookingTime: '20:30', guestCount: 3, status: 'COMPLETED' as const, depositAmount: 200000, minSpend: 800000, note: '', source: 'PUBLIC' as const },
    { bookingCode: genCode(), customerId: customers['0934567890'].id, tableId: tables['B2'].id,   bookingDate: yesterdayStr, bookingTime: '22:00', guestCount: 2, status: 'COMPLETED' as const, depositAmount: 200000, minSpend: 800000, note: '', source: 'ZALO' as const },
  ];

  for (const b of bookingData) {
    const booking = await prisma.booking.create({
      data: {
        ...b,
        bookingDate: new Date(b.bookingDate),
      },
    });

    await prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        userId: b.createdByUserId || null,
        type: 'CREATED',
        newStatus: b.status,
        note: `Booking created via ${b.source}`,
      },
    });

    if (b.status === 'COMPLETED') {
      await prisma.bookingEvent.create({ data: { bookingId: booking.id, userId: b.confirmedByUserId || null, type: 'CONFIRMED', oldStatus: 'PENDING', newStatus: 'CONFIRMED' } });
      await prisma.bookingEvent.create({ data: { bookingId: booking.id, userId: b.checkedInByUserId || null, type: 'ARRIVED', oldStatus: 'CONFIRMED', newStatus: 'ARRIVED' } });
      await prisma.bookingEvent.create({ data: { bookingId: booking.id, userId: b.checkedInByUserId || null, type: 'COMPLETED', oldStatus: 'ARRIVED', newStatus: 'COMPLETED' } });
    } else if (b.status === 'CONFIRMED') {
      await prisma.bookingEvent.create({ data: { bookingId: booking.id, userId: b.confirmedByUserId || manager.id, type: 'CONFIRMED', oldStatus: 'PENDING', newStatus: 'CONFIRMED' } });
    } else if (b.status === 'CANCELLED') {
      await prisma.bookingEvent.create({ data: { bookingId: booking.id, type: 'CANCELLED', oldStatus: 'PENDING', newStatus: 'CANCELLED', note: b.note || 'Khách hủy' } });
    } else if (b.status === 'NO_SHOW') {
      await prisma.bookingEvent.create({ data: { bookingId: booking.id, type: 'NO_SHOW', oldStatus: 'CONFIRMED', newStatus: 'NO_SHOW' } });
    } else if (b.status === 'ARRIVED') {
      await prisma.bookingEvent.create({ data: { bookingId: booking.id, userId: b.checkedInByUserId || reception.id, type: 'ARRIVED', oldStatus: 'CONFIRMED', newStatus: 'ARRIVED' } });
    }
  }

  console.log(`✅ Created ${bookingData.length} bookings with events`);

  // ─── Customer Notes ─────────────────────────────────────────────────
  await prisma.customerNote.createMany({
    data: [
      { customerId: customers['0901234567'].id, userId: booking1.id, note: 'Khách rất vui vẻ, hay giới thiệu bạn bè' },
      { customerId: customers['0912345678'].id, userId: booking1.id, note: 'Luôn đặt phòng VIP, chi tiêu cao' },
      { customerId: customers['0945678901'].id, userId: booking2.id, note: 'Khách thân thiết, đặt bàn thường xuyên' },
      { customerId: customers['0922334455'].id, userId: booking1.id, note: 'Đã hủy 3 lần liên tiếp, cần lưu ý' },
    ],
  });

  console.log('✅ Created customer notes');
  console.log('\n🎉 Seed completed!');
  console.log('\n📋 Login credentials:');
  console.log('  Admin:     admin@booking.local / Admin@123456');
  console.log('  Manager:   manager@booking.local / Manager@123456');
  console.log('  Booking 1: booking1@booking.local / Booking@123456');
  console.log('  Booking 2: booking2@booking.local / Booking@123456');
  console.log('  Reception: reception@booking.local / Reception@123456');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
