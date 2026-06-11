import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ==================== USERS ====================
  const hash = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@baogarden.vn' },
    update: {},
    create: { name: 'Admin', email: 'admin@baogarden.vn', passwordHash: hash, role: 'ADMIN', phone: '0900000001' },
  });
  const manager = await prisma.user.upsert({
    where: { email: 'manager@baogarden.vn' },
    update: {},
    create: { name: 'Quản lý', email: 'manager@baogarden.vn', passwordHash: hash, role: 'MANAGER', phone: '0900000002' },
  });
  await prisma.user.upsert({
    where: { email: 'waiter@baogarden.vn' },
    update: {},
    create: { name: 'Phục vụ 1', email: 'waiter@baogarden.vn', passwordHash: hash, role: 'WAITER', phone: '0900000003' },
  });
  await prisma.user.upsert({
    where: { email: 'kitchen@baogarden.vn' },
    update: {},
    create: { name: 'Bếp trưởng', email: 'kitchen@baogarden.vn', passwordHash: hash, role: 'KITCHEN', phone: '0900000004' },
  });
  await prisma.user.upsert({
    where: { email: 'bar@baogarden.vn' },
    update: {},
    create: { name: 'Bartender', email: 'bar@baogarden.vn', passwordHash: hash, role: 'BAR', phone: '0900000005' },
  });
  await prisma.user.upsert({
    where: { email: 'cashier@baogarden.vn' },
    update: {},
    create: { name: 'Thu ngân', email: 'cashier@baogarden.vn', passwordHash: hash, role: 'CASHIER', phone: '0900000006' },
  });
  await prisma.user.upsert({
    where: { email: 'booking@baogarden.vn' },
    update: {},
    create: { name: 'Booking Staff', email: 'booking@baogarden.vn', passwordHash: hash, role: 'BOOKING', phone: '0900000007' },
  });

  console.log('✅ Users seeded');

  // ==================== AREAS ====================
  const areas = await Promise.all([
    prisma.tableArea.create({ data: { name: 'Sảnh chính', description: 'Khu vực sảnh chính tầng trệt', sortOrder: 1 } }),
    prisma.tableArea.create({ data: { name: 'Khu ngoài trời', description: 'Khu sân vườn ngoài trời', sortOrder: 2 } }),
    prisma.tableArea.create({ data: { name: 'Khu VIP', description: 'Phòng VIP riêng tư', sortOrder: 3 } }),
    prisma.tableArea.create({ data: { name: 'Khu Bar', description: 'Khu vực quầy bar', sortOrder: 4 } }),
  ]);

  console.log('✅ Areas seeded');

  // ==================== TABLES ====================
  const tableDefs: Array<{ code: string; name: string; areaIdx: number; min: number; max: number }> = [];
  for (let i = 1; i <= 10; i++) tableDefs.push({ code: `A${String(i).padStart(2, '0')}`, name: `Bàn A${String(i).padStart(2, '0')}`, areaIdx: 0, min: 2, max: 6 });
  for (let i = 1; i <= 10; i++) tableDefs.push({ code: `B${String(i).padStart(2, '0')}`, name: `Bàn B${String(i).padStart(2, '0')}`, areaIdx: 1, min: 2, max: 4 });
  for (let i = 1; i <= 5; i++) tableDefs.push({ code: `VIP${String(i).padStart(2, '0')}`, name: `Phòng VIP ${String(i).padStart(2, '0')}`, areaIdx: 2, min: 4, max: 12 });
  for (let i = 1; i <= 5; i++) tableDefs.push({ code: `BAR${String(i).padStart(2, '0')}`, name: `Bàn Bar ${String(i).padStart(2, '0')}`, areaIdx: 3, min: 1, max: 4 });

  for (const t of tableDefs) {
    await prisma.restaurantTable.create({
      data: { code: t.code, name: t.name, areaId: areas[t.areaIdx].id, minGuests: t.min, maxGuests: t.max },
    });
  }

  console.log('✅ Tables seeded');

  // ==================== MENU CATEGORIES ====================
  const cats = await Promise.all([
    prisma.menuCategory.create({ data: { name: 'Món khai vị', departmentDefault: 'KITCHEN', sortOrder: 1 } }),
    prisma.menuCategory.create({ data: { name: 'Món nướng', departmentDefault: 'KITCHEN', sortOrder: 2 } }),
    prisma.menuCategory.create({ data: { name: 'Hải sản', departmentDefault: 'KITCHEN', sortOrder: 3 } }),
    prisma.menuCategory.create({ data: { name: 'Món chính', departmentDefault: 'KITCHEN', sortOrder: 4 } }),
    prisma.menuCategory.create({ data: { name: 'Bia', departmentDefault: 'BAR', sortOrder: 5 } }),
    prisma.menuCategory.create({ data: { name: 'Rượu', departmentDefault: 'BAR', sortOrder: 6 } }),
    prisma.menuCategory.create({ data: { name: 'Cocktail', departmentDefault: 'BAR', sortOrder: 7 } }),
    prisma.menuCategory.create({ data: { name: 'Nước ngọt', departmentDefault: 'BAR', sortOrder: 8 } }),
  ]);

  console.log('✅ Categories seeded');

  // ==================== MENU ITEMS ====================
  const items: Array<{ name: string; price: number; catIdx: number; dept: 'KITCHEN' | 'BAR'; desc: string; time: number; featured?: boolean }> = [
    // Khai vị
    { name: 'Mẹt khô tổng hợp', price: 189000, catIdx: 0, dept: 'KITCHEN', desc: 'Tổng hợp các loại khô đặc biệt', time: 15, featured: true },
    { name: 'Khô gà lá chanh', price: 89000, catIdx: 0, dept: 'KITCHEN', desc: 'Khô gà giòn rụm với lá chanh thơm', time: 10 },
    { name: 'Gỏi cuốn tôm thịt', price: 69000, catIdx: 0, dept: 'KITCHEN', desc: 'Gỏi cuốn tươi mát, chấm mắm nêm', time: 10 },
    { name: 'Chả giò hải sản', price: 79000, catIdx: 0, dept: 'KITCHEN', desc: 'Chả giò giòn nhân hải sản', time: 12 },
    // Nướng
    { name: 'Mực nướng sa tế', price: 159000, catIdx: 1, dept: 'KITCHEN', desc: 'Mực tươi nướng sa tế cay thơm', time: 20, featured: true },
    { name: 'Tôm nướng muối ớt', price: 189000, catIdx: 1, dept: 'KITCHEN', desc: 'Tôm sú nướng muối ớt đỏ', time: 18 },
    { name: 'Sườn heo nướng BBQ', price: 169000, catIdx: 1, dept: 'KITCHEN', desc: 'Sườn heo non ướp sốt BBQ đặc biệt', time: 25 },
    { name: 'Gà nướng mật ong', price: 149000, catIdx: 1, dept: 'KITCHEN', desc: 'Gà ta nướng mật ong giòn da', time: 30 },
    // Hải sản
    { name: 'Hàu nướng phô mai', price: 139000, catIdx: 2, dept: 'KITCHEN', desc: 'Hàu tươi nướng phô mai vàng ươm', time: 15, featured: true },
    { name: 'Cua rang me', price: 359000, catIdx: 2, dept: 'KITCHEN', desc: 'Cua biển rang me chua ngọt', time: 25 },
    { name: 'Nghêu hấp xả', price: 99000, catIdx: 2, dept: 'KITCHEN', desc: 'Nghêu tươi hấp sả ớt', time: 12 },
    // Món chính
    { name: 'Lẩu hải sản chua cay', price: 399000, catIdx: 3, dept: 'KITCHEN', desc: 'Lẩu hải sản tổng hợp Tom Yum', time: 20, featured: true },
    { name: 'Cơm chiên hải sản', price: 129000, catIdx: 3, dept: 'KITCHEN', desc: 'Cơm chiên dương châu hải sản', time: 15 },
    { name: 'Mì xào hải sản', price: 119000, catIdx: 3, dept: 'KITCHEN', desc: 'Mì xào giòn với tôm, mực, nghêu', time: 15 },
    // Bia
    { name: 'Heineken Bạc', price: 35000, catIdx: 4, dept: 'BAR', desc: 'Lon 330ml', time: 1 },
    { name: 'Heineken', price: 30000, catIdx: 4, dept: 'BAR', desc: 'Lon 330ml', time: 1 },
    { name: 'Tiger', price: 25000, catIdx: 4, dept: 'BAR', desc: 'Lon 330ml', time: 1 },
    { name: 'Tiger Crystal', price: 28000, catIdx: 4, dept: 'BAR', desc: 'Lon 330ml', time: 1 },
    { name: 'Bia Sài Gòn Special', price: 22000, catIdx: 4, dept: 'BAR', desc: 'Lon 330ml', time: 1 },
    { name: 'Bia 333', price: 18000, catIdx: 4, dept: 'BAR', desc: 'Lon 330ml', time: 1 },
    // Rượu
    { name: 'Soju Hàn Quốc', price: 85000, catIdx: 5, dept: 'BAR', desc: 'Chai 360ml, nhiều vị', time: 1 },
    { name: 'Rượu vang đỏ Chile', price: 450000, catIdx: 5, dept: 'BAR', desc: 'Chai 750ml', time: 2 },
    // Cocktail
    { name: 'Cocktail Signature Báo Garden', price: 120000, catIdx: 6, dept: 'BAR', desc: 'Cocktail đặc biệt của quán', time: 5, featured: true },
    { name: 'Mojito', price: 95000, catIdx: 6, dept: 'BAR', desc: 'Rum, chanh, bạc hà, soda', time: 5 },
    { name: 'Long Island Iced Tea', price: 110000, catIdx: 6, dept: 'BAR', desc: 'Hỗn hợp rượu mạnh, cola, chanh', time: 5 },
    { name: 'Margarita', price: 99000, catIdx: 6, dept: 'BAR', desc: 'Tequila, triple sec, chanh', time: 5 },
    // Nước ngọt
    { name: 'Pepsi', price: 20000, catIdx: 7, dept: 'BAR', desc: 'Lon 330ml', time: 1 },
    { name: '7Up', price: 20000, catIdx: 7, dept: 'BAR', desc: 'Lon 330ml', time: 1 },
    { name: 'Nước suối', price: 15000, catIdx: 7, dept: 'BAR', desc: 'Chai 500ml', time: 1 },
    { name: 'Red Bull', price: 30000, catIdx: 7, dept: 'BAR', desc: 'Lon 250ml', time: 1 },
    { name: 'Nước ép cam', price: 45000, catIdx: 7, dept: 'BAR', desc: 'Ly 400ml, cam vắt tươi', time: 3 },
  ];

  function slugify(str: string): string {
    return str.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  for (const item of items) {
    await prisma.menuItem.create({
      data: {
        name: item.name,
        slug: slugify(item.name),
        description: item.desc,
        price: item.price,
        categoryId: cats[item.catIdx].id,
        department: item.dept,
        preparationTimeMinutes: item.time,
        isFeatured: item.featured || false,
        sortOrder: items.indexOf(item),
      },
    });
  }

  console.log('✅ Menu items seeded');

  // ==================== SAMPLE CUSTOMERS ====================
  await prisma.customer.createMany({
    data: [
      { name: 'Nguyễn Văn An', phone: '0901234567', customerType: 'VIP' },
      { name: 'Trần Thị Bình', phone: '0907654321', customerType: 'RETURNING' },
      { name: 'Lê Hoàng Châu', phone: '0912345678', customerType: 'NEW' },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Customers seeded');
  console.log('🎉 Seeding complete!');
  console.log('\n📋 Login accounts (password: 123456):');
  console.log('  admin@baogarden.vn    (ADMIN)');
  console.log('  manager@baogarden.vn  (MANAGER)');
  console.log('  waiter@baogarden.vn   (WAITER)');
  console.log('  kitchen@baogarden.vn  (KITCHEN)');
  console.log('  bar@baogarden.vn      (BAR)');
  console.log('  cashier@baogarden.vn  (CASHIER)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
