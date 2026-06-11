import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Data from home-data.ts ─────────────────────────────────

const DAILY_EVENTS = [
  { dayIndex: 0, dayName: 'Thứ Hai', dayShort: 'T2', name: 'Chill Monday', description: 'Acoustic nhẹ nhàng, giảm giá bia cho dân văn phòng xả stress đầu tuần.', type: 'chill' },
  { dayIndex: 1, dayName: 'Thứ Ba', dayShort: 'T3', name: 'Ladies Night', description: 'Đêm dành cho chị em – free 2 ly đầu tiên, DJ nữ chơi nhạc chill.', type: 'ladies' },
  { dayIndex: 2, dayName: 'Thứ Tư', dayShort: 'T4', name: 'Acoustic Wednesday', description: 'Ca sĩ acoustic live, không gian lãng mạn, menu cocktail đặc biệt.', type: 'acoustic' },
  { dayIndex: 3, dayName: 'Thứ Năm', dayShort: 'T5', name: 'Warm Up Thursday', description: 'DJ bắt đầu khuấy động, ưu đãi combo bia cho nhóm bạn.', type: 'dj' },
  { dayIndex: 4, dayName: 'Thứ Sáu', dayShort: 'T6', name: 'Friday Fever', description: 'Đêm bùng nổ – DJ top, dancer, laser show, bia tươi không giới hạn.', type: 'party' },
  { dayIndex: 5, dayName: 'Thứ Bảy', dayShort: 'T7', name: 'Saturday Night Live', description: 'Đỉnh cao cuối tuần – ca sĩ khách mời, DJ set đặc biệt, năng lượng bất tận.', type: 'party' },
  { dayIndex: 6, dayName: 'Chủ Nhật', dayShort: 'CN', name: 'Sunday Recovery', description: 'Brunch & chill, nhạc lo-fi, combo đồ nhắm giá mềm để nạp năng lượng.', type: 'recovery' },
];

const WEEKLY_SCHEDULE = [
  { day: 'Thứ Năm', program: 'Warm Up Set', artist: 'DJ Minh Tú', type: 'DJ' },
  { day: 'Thứ Năm', program: 'Main Set', artist: 'DJ Hùng Vũ', type: 'DJ' },
  { day: 'Thứ Sáu', program: 'Acoustic Live', artist: 'Band Sài Gòn Night', type: 'Live' },
  { day: 'Thứ Sáu', program: 'DJ & Dancer Show', artist: 'DJ Alex + Dancer Team', type: 'DJ' },
  { day: 'Thứ Sáu', program: 'After Party', artist: 'DJ Lộc', type: 'DJ' },
  { day: 'Thứ Bảy', program: 'Ca Sĩ Khách Mời', artist: 'Tuỳ tuần', type: 'Live' },
  { day: 'Thứ Bảy', program: 'Saturday Mix', artist: 'DJ Phương + MC', type: 'DJ' },
  { day: 'Thứ Bảy', program: 'Late Night Vibes', artist: 'DJ Bảo', type: 'DJ' },
  { day: 'Chủ Nhật', program: 'Acoustic Chill', artist: 'Various Artists', type: 'Acoustic' },
  { day: 'Chủ Nhật', program: 'Sunset Mix', artist: 'DJ Tâm An', type: 'DJ' },
];

const UPCOMING_EVENTS = [
  { title: 'Friday Fever – EDM Night', date: 'Thứ Sáu tuần này', time: '20h00 – 03h00', description: 'DJ Alex đặc biệt quay trở lại với set EDM bùng nổ nhất mùa hè.', tag: 'Hot' },
  { title: 'Saturday Night Live – Guest Star', date: 'Thứ Bảy tuần này', time: '20h00 – 03h00', description: 'Ca sĩ khách mời bí ẩn, chỉ tiết lộ vào thứ Năm. Đặt bàn ngay!', tag: 'Bí ẩn' },
  { title: 'Ladies Night Special', date: 'Thứ Ba tuần sau', time: '20h00 – 00h00', description: 'Phiên bản đặc biệt với 3 ly free cho chị em, DJ nữ quốc tế.', tag: 'Ladies' },
  { title: 'Neon Night – Đêm Phát Sáng', date: 'Cuối tháng này', time: '20h00 – 03h00', description: 'Đêm neon UV đặc biệt – sơn phát sáng, vòng tay neon, laser tím xanh bất tận.', tag: 'Sắp tới' },
];

// ─── Seed function ──────────────────────────────────────────

async function seedEvents() {
  console.log('🌱 Seeding events data...\n');

  // --- Daily Events: deleteMany then createMany ---
  await prisma.dailyEvent.deleteMany();
  const dailyResult = await prisma.dailyEvent.createMany({ data: DAILY_EVENTS });
  console.log(`✅ Daily Events: inserted ${dailyResult.count} records`);

  // --- Weekly Schedule: deleteMany then createMany ---
  await prisma.weeklySchedule.deleteMany();
  const weeklyResult = await prisma.weeklySchedule.createMany({
    data: WEEKLY_SCHEDULE.map((item, index) => ({ ...item, sortOrder: index })),
  });
  console.log(`✅ Weekly Schedule: inserted ${weeklyResult.count} records`);

  // --- Upcoming Events: deleteMany then createMany ---
  await prisma.upcomingEvent.deleteMany();
  const upcomingResult = await prisma.upcomingEvent.createMany({
    data: UPCOMING_EVENTS.map((item, index) => ({ ...item, sortOrder: index })),
  });
  console.log(`✅ Upcoming Events: inserted ${upcomingResult.count} records`);

  console.log('\n🎉 Events seed completed!');
}

seedEvents()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
