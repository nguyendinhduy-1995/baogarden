import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding comprehensive test data...\n');
  const hash = await bcrypt.hash('123456', 10);

  // ==================== USERS (upsert - won't duplicate) ====================
  const users: Record<string, { name: string; role: string; phone: string }> = {
    'admin': { name: 'Admin Hệ Thống', role: 'ADMIN', phone: '0900000001' },
    'manager': { name: 'Nguyễn Quản Lý', role: 'MANAGER', phone: '0900000002' },
    'marketing': { name: 'Marketing Team', role: 'MARKETING', phone: '0900000010' },
    'booking': { name: 'Trần Booking', role: 'BOOKING', phone: '0900000007' },
    'reception': { name: 'Lê Lễ Tân', role: 'RECEPTION', phone: '0900000008' },
    'waiter': { name: 'Phạm Phục Vụ', role: 'WAITER', phone: '0900000003' },
    'waiter2': { name: 'Hoàng Phục Vụ 2', role: 'WAITER', phone: '0900000009' },
    'kitchen': { name: 'Võ Bếp Trưởng', role: 'KITCHEN', phone: '0900000004' },
    'bar': { name: 'Đặng Bartender', role: 'BAR', phone: '0900000005' },
    'cashier': { name: 'Mai Thu Ngân', role: 'CASHIER', phone: '0900000006' },
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
  console.log('✅ 10 tài khoản nhân viên (bao gồm Marketing)');

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
      { name: 'Nghêu', departmentDefault: 'KITCHEN' as const, sortOrder: 1 },
      { name: 'Vẹm xanh', departmentDefault: 'KITCHEN' as const, sortOrder: 2 },
      { name: 'Cơm', departmentDefault: 'KITCHEN' as const, sortOrder: 3 },
      { name: 'Lẩu', departmentDefault: 'KITCHEN' as const, sortOrder: 4 },
      { name: 'Khai vị & Snacks', departmentDefault: 'KITCHEN' as const, sortOrder: 5 },
      { name: 'Salads', departmentDefault: 'KITCHEN' as const, sortOrder: 6 },
      { name: 'Raw Bar', departmentDefault: 'KITCHEN' as const, sortOrder: 7 },
      { name: 'Món chính', departmentDefault: 'KITCHEN' as const, sortOrder: 8 },
      { name: 'Cơm - Mì - Phở', departmentDefault: 'KITCHEN' as const, sortOrder: 9 },
      { name: 'New Combo', departmentDefault: 'KITCHEN' as const, sortOrder: 10 },
      { name: 'Combo 2 khách', departmentDefault: 'KITCHEN' as const, sortOrder: 11 },
      { name: 'Combo 4 khách', departmentDefault: 'KITCHEN' as const, sortOrder: 12 },
      { name: 'Combo 6-8 khách', departmentDefault: 'KITCHEN' as const, sortOrder: 13 },
      { name: 'Combo 8-10 khách', departmentDefault: 'KITCHEN' as const, sortOrder: 14 },
      { name: 'Cocktail', departmentDefault: 'BAR' as const, sortOrder: 15 },
      { name: 'Rượu vang', departmentDefault: 'BAR' as const, sortOrder: 16 },
      { name: 'Bia Heineken', departmentDefault: 'BAR' as const, sortOrder: 17 },
      { name: 'Bia Tiger', departmentDefault: 'BAR' as const, sortOrder: 18 },
      { name: 'Rượu khác', departmentDefault: 'BAR' as const, sortOrder: 19 },
      { name: 'Nước ngọt', departmentDefault: 'BAR' as const, sortOrder: 20 },
      { name: 'Trái cây', departmentDefault: 'BAR' as const, sortOrder: 21 },
      { name: 'Phụ phí', departmentDefault: 'SERVICE' as const, sortOrder: 22 },
    ];
    for (const c of catDefs) {
      const cat = await prisma.menuCategory.create({ data: c });
      catMap[c.name] = cat.id;
    }
    console.log('✅ 22 danh mục menu (thực tế)');
  }

  // ==================== MENU ITEMS (ACTUAL MENU) ====================
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
      // --- Nghêu ---
      { name: 'Nghêu nướng mỡ chài', price: 259000, cat: 'Nghêu', dept: 'KITCHEN' as const, desc: 'Clams grilled with pork fat', time: 15, featured: true },
      { name: 'Nghêu hấp Thái / hấp xả', price: 179000, cat: 'Nghêu', dept: 'KITCHEN' as const, desc: 'Clams steamed with Thai herbs or lemongrass', time: 12 },
      { name: 'Nghêu xào rau quế', price: 179000, cat: 'Nghêu', dept: 'KITCHEN' as const, desc: 'Clams stir-fried with basil', time: 12 },
      // --- Vẹm xanh ---
      { name: 'Vẹm xanh New Zealand sốt Thái', price: 269000, cat: 'Vẹm xanh', dept: 'KITCHEN' as const, desc: 'New Zealand green mussels in Thai sauce', time: 15, featured: true },
      { name: 'Vẹm xanh New Zealand đút lò phô mai', price: 269000, cat: 'Vẹm xanh', dept: 'KITCHEN' as const, desc: 'Baked green mussels with cheese', time: 18 },
      // --- Cơm ---
      { name: 'Cơm chiên cá mặn', price: 199000, cat: 'Cơm', dept: 'KITCHEN' as const, desc: 'Salted fish fried rice', time: 15 },
      { name: 'Cơm chiên Hoàng Báo', price: 199000, cat: 'Cơm', dept: 'KITCHEN' as const, desc: 'Royal golden fried rice', time: 15, featured: true },
      { name: 'Cơm chiên hải sản X.O', price: 199000, cat: 'Cơm', dept: 'KITCHEN' as const, desc: 'Seafood fried rice with XO sauce', time: 15 },
      { name: 'Cơm chiên Dương Châu', price: 199000, cat: 'Cơm', dept: 'KITCHEN' as const, desc: 'Yangzhou-style fried rice', time: 15 },
      // --- Lẩu ---
      { name: 'Lẩu hải sản TomYum', price: 469000, cat: 'Lẩu', dept: 'KITCHEN' as const, desc: 'Tom Yum seafood hotpot', time: 20, featured: true },
      { name: 'Lẩu hải sản Vương Quốc Nấm', price: 469000, cat: 'Lẩu', dept: 'KITCHEN' as const, desc: 'Seafood & mushroom kingdom hotpot', time: 20 },
      { name: 'Lẩu gà tre tiềm ớt hiểm', price: 469000, cat: 'Lẩu', dept: 'KITCHEN' as const, desc: 'Stewed free-range chicken with bird\'s eye chili hotpot', time: 25 },
      // --- Khai vị & Snacks ---
      { name: 'Bắp bò ngâm nước mắm', price: 269000, cat: 'Khai vị & Snacks', dept: 'KITCHEN' as const, desc: 'Beef shank marinated in fish sauce', time: 10 },
      { name: 'Nạc nọng chiên kiểu Thái', price: 189000, cat: 'Khai vị & Snacks', dept: 'KITCHEN' as const, desc: 'Thai-style fried pork jowl', time: 12 },
      { name: 'Khô mực cháy tỏi', price: 279000, cat: 'Khai vị & Snacks', dept: 'KITCHEN' as const, desc: 'Dried squid with garlic', time: 10, featured: true },
      { name: 'Khô mực chiên nước mắm', price: 279000, cat: 'Khai vị & Snacks', dept: 'KITCHEN' as const, desc: 'Dried squid fried with fish sauce', time: 10 },
      { name: 'Que hải sản chiên giòn', price: 169000, cat: 'Khai vị & Snacks', dept: 'KITCHEN' as const, desc: 'Crispy fried seafood sticks', time: 12 },
      // --- Salads ---
      { name: 'Salad chanh dây ức gà hạc óc chó', price: 249000, cat: 'Salads', dept: 'KITCHEN' as const, desc: 'Passion fruit salad with chicken breast & walnuts', time: 10 },
      { name: 'Salad gà nướng', price: 249000, cat: 'Salads', dept: 'KITCHEN' as const, desc: 'Grilled chicken salad', time: 10 },
      { name: 'Gỏi hải sản miến Thái', price: 279000, cat: 'Salads', dept: 'KITCHEN' as const, desc: 'Thai-style seafood glass noodle salad', time: 12 },
      { name: 'Gỏi đu đủ bò một nắng kiểu Thái', price: 179000, cat: 'Salads', dept: 'KITCHEN' as const, desc: 'Thai papaya salad with sun-dried beef', time: 10 },
      // --- Raw Bar ---
      { name: 'Hào Úc sống sốt Tabaco', price: 59000, cat: 'Raw Bar', dept: 'KITCHEN' as const, desc: 'Australian oyster with Tabasco sauce (1 con)', time: 3, featured: true },
      { name: 'Hào Úc Tartare', price: 59000, cat: 'Raw Bar', dept: 'KITCHEN' as const, desc: 'Australian oyster tartare (1 con)', time: 3 },
      { name: 'Cá hồi Tartare trứng cá đen', price: 329000, cat: 'Raw Bar', dept: 'KITCHEN' as const, desc: 'Salmon tartare with black caviar', time: 10 },
      // --- Món chính ---
      { name: 'Bò Tenderloin nướng va nấm áp chảo bơ tỏi', price: 489000, cat: 'Món chính', dept: 'KITCHEN' as const, desc: 'Grilled beef tenderloin with butter garlic mushrooms', time: 25, featured: true },
      { name: 'Sườn bò Úc đút lò sốt BBQ', price: 489000, cat: 'Món chính', dept: 'KITCHEN' as const, desc: 'Oven-baked Australian beef ribs with BBQ sauce', time: 30 },
      { name: 'Đùi vịt nướng kiểu Pháp', price: 279000, cat: 'Món chính', dept: 'KITCHEN' as const, desc: 'French-style roasted duck leg', time: 25 },
      { name: 'File cá chẽm chiên giòn sốt Sambal', price: 219000, cat: 'Món chính', dept: 'KITCHEN' as const, desc: 'Crispy fried barramundi fillet with Sambal sauce', time: 20 },
      { name: 'Cá hồi sốt cay Tokyo', price: 329000, cat: 'Món chính', dept: 'KITCHEN' as const, desc: 'Salmon with spicy Tokyo sauce', time: 20 },
      // --- Cơm - Mì - Phở ---
      { name: 'Cơm chiên Sambal và cá hồi áp chảo', price: 269000, cat: 'Cơm - Mì - Phở', dept: 'KITCHEN' as const, desc: 'Sambal fried rice with pan-seared salmon', time: 15 },
      { name: 'Mì Udon sốt tiêu và bò nướng hương thảo', price: 249000, cat: 'Cơm - Mì - Phở', dept: 'KITCHEN' as const, desc: 'Udon noodles with pepper sauce & rosemary grilled beef', time: 18 },
      // --- Bia Heineken ---
      { name: 'Heineken chai 330ml', price: 79000, cat: 'Bia Heineken', dept: 'BAR' as const, desc: 'Chai 330ml', time: 1 },
      { name: 'Heineken lon 350ml', price: 38000, cat: 'Bia Heineken', dept: 'BAR' as const, desc: 'Lon 350ml', time: 1 },
      { name: 'Heineken lon (bạc)', price: 38000, cat: 'Bia Heineken', dept: 'BAR' as const, desc: 'Lon 250ml - Silver', time: 1 },
      { name: 'Heineken lon 250ml', price: 30000, cat: 'Bia Heineken', dept: 'BAR' as const, desc: 'Lon 250ml', time: 1 },
      { name: 'Heineken tháp 2 lít', price: 369000, cat: 'Bia Heineken', dept: 'BAR' as const, desc: 'Tháp bia 2 lít', time: 3, featured: true },
      // --- Bia Tiger ---
      { name: 'Tiger tháp 3 lít', price: 389000, cat: 'Bia Tiger', dept: 'BAR' as const, desc: 'Tháp bia 3 lít', time: 3 },
      { name: 'Tiger lon', price: 35000, cat: 'Bia Tiger', dept: 'BAR' as const, desc: 'Lon Tiger Lager', time: 1 },
      { name: 'Tiger Crystal lon', price: 35000, cat: 'Bia Tiger', dept: 'BAR' as const, desc: 'Lon Tiger Crystal', time: 1 },
      { name: 'Tiger chai', price: 33000, cat: 'Bia Tiger', dept: 'BAR' as const, desc: 'Chai Tiger', time: 1 },
      // --- Cocktail ---
      { name: 'Cocktail tháp 3L - Only You', price: 690000, cat: 'Cocktail', dept: 'BAR' as const, desc: 'Cocktail tower 3L - Only You', time: 8 },
      { name: 'Cocktail tháp 3L - Lovely Susana', price: 690000, cat: 'Cocktail', dept: 'BAR' as const, desc: 'Cocktail tower 3L - Lovely Susana', time: 8 },
      { name: 'Cocktail tháp 3L - The Eight One', price: 690000, cat: 'Cocktail', dept: 'BAR' as const, desc: 'Cocktail tower 3L - The Eight One', time: 8, featured: true },
      // --- Rượu vang ---
      { name: 'Rượu vang Casati', price: 540000, cat: 'Rượu vang', dept: 'BAR' as const, desc: 'Chai 750ml', time: 2 },
      { name: 'Rượu vang Vincenzo', price: 630000, cat: 'Rượu vang', dept: 'BAR' as const, desc: 'Chai 750ml', time: 2 },
      { name: 'Rượu vang Segrecto', price: 720000, cat: 'Rượu vang', dept: 'BAR' as const, desc: 'Chai 750ml', time: 2 },
      // --- Rượu khác ---
      { name: 'Rượu mơ', price: 199000, cat: 'Rượu khác', dept: 'BAR' as const, desc: 'Chai rượu mơ', time: 2 },
      { name: 'Rượu Soju - Truyền thống', price: 159000, cat: 'Rượu khác', dept: 'BAR' as const, desc: 'Soju truyền thống', time: 1 },
      { name: 'Rượu Soju - Đào', price: 159000, cat: 'Rượu khác', dept: 'BAR' as const, desc: 'Soju vị đào', time: 1 },
      { name: 'Rượu Soju - Việt quất', price: 159000, cat: 'Rượu khác', dept: 'BAR' as const, desc: 'Soju vị việt quất', time: 1 },
      { name: 'Strongbow lon', price: 33000, cat: 'Rượu khác', dept: 'BAR' as const, desc: 'Strongbow Sparkling Ciders', time: 1 },
      // --- Nước ngọt ---
      { name: 'Dasani', price: 26000, cat: 'Nước ngọt', dept: 'BAR' as const, desc: 'Nước suối Dasani', time: 1 },
      { name: 'Coca/Pepsi', price: 32000, cat: 'Nước ngọt', dept: 'BAR' as const, desc: 'Coca-Cola hoặc Pepsi', time: 1 },
      { name: 'Sprite', price: 32000, cat: 'Nước ngọt', dept: 'BAR' as const, desc: 'Sprite lon', time: 1 },
      { name: 'Sting', price: 32000, cat: 'Nước ngọt', dept: 'BAR' as const, desc: 'Sting lon', time: 1 },
      // --- Trái cây ---
      { name: 'Trái cây nhỏ', price: 199000, cat: 'Trái cây', dept: 'BAR' as const, desc: 'Đĩa trái cây tổng hợp nhỏ', time: 5 },
      { name: 'Trái cây lớn', price: 299000, cat: 'Trái cây', dept: 'BAR' as const, desc: 'Đĩa trái cây tổng hợp lớn', time: 5 },
      // --- Phụ phí ---
      { name: 'Khăn lạnh', price: 5000, cat: 'Phụ phí', dept: 'SERVICE' as const, desc: 'Khăn lạnh phục vụ', time: 1 },
      { name: 'Khăn giấy khô', price: 15000, cat: 'Phụ phí', dept: 'SERVICE' as const, desc: 'Khăn giấy khô', time: 1 },
      { name: 'Bánh tráng nướng', price: 28000, cat: 'Phụ phí', dept: 'SERVICE' as const, desc: 'Bánh tráng nướng', time: 5 },
    ];

    const usedSlugs = new Set<string>();
    for (let i = 0; i < itemDefs.length; i++) {
      const item = itemDefs[i];
      let slug = slugify(item.name);
      if (usedSlugs.has(slug)) {
        let counter = 2;
        while (usedSlugs.has(`${slug}-${counter}`)) counter++;
        slug = `${slug}-${counter}`;
      }
      usedSlugs.add(slug);
      const mi = await prisma.menuItem.create({
        data: {
          name: item.name, slug, description: item.desc,
          price: item.price, categoryId: catMap[item.cat], department: item.dept,
          preparationTimeMinutes: item.time, isFeatured: item.featured || false, sortOrder: i,
        },
      });
      menuItemIds.push(mi.id);
    }
    console.log('✅ Menu thực tế Báo Garden (58 món)');
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
  console.log('  Tên đăng nhập │ Vai trò    │ Tên');
  console.log('─'.repeat(60));
  for (const [username, info] of Object.entries(users)) {
    const role = info.role.padEnd(10);
    console.log(`  ${username.padEnd(15)} │ ${role} │ ${info.name}`);
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
