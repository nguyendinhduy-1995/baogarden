/* ═══════════════════════════════════════════════════════════════
   Báo Garden – Homepage Data Configuration
   ═══════════════════════════════════════════════════════════════ */

// ─── Types ───────────────────────────────────────────────────

export interface EventItem {
  day: string;
  dayShort: string;
  name: string;
  description: string;
  type: 'chill' | 'ladies' | 'acoustic' | 'dj' | 'party' | 'birthday' | 'recovery';
  time: string;
}

export interface WeeklyScheduleItem {
  day: string;
  time: string;
  program: string;
  artist: string;
  type: string;
}

export interface PartyPackage {
  title: string;
  guests: string;
  description: string;
  features: string[];
}

export interface PromotionItem {
  title: string;
  description: string;
  condition: string;
}

export interface SpaceItem {
  name: string;
  description: string;
  image: string;
}

export interface UpcomingEvent {
  title: string;
  date: string;
  time: string;
  description: string;
  tag: string;
}

// ─── Brand Constants ─────────────────────────────────────────

export const BRAND_NAME = 'Báo Garden';
export const ADDRESS = '118–120 Tân Sơn Nhì, Tân Phú, Hồ Chí Minh';
export const HOTLINE = '08 777 6666 3';
export const HOTLINE_RAW = '0877766663';
export const HOURS = '17h00 – 03h00';
export const GOOGLE_MAPS_URL = 'https://maps.google.com/?q=118+Tan+Son+Nhi+Tan+Phu+Ho+Chi+Minh';

// ─── Daily Events (Mon–Sun) ─────────────────────────────────

export const DAILY_EVENTS: EventItem[] = [
  {
    day: 'Thứ Hai',
    dayShort: 'T2',
    name: 'Chill Monday',
    description: 'Acoustic nhẹ nhàng, giảm giá bia cho dân văn phòng xả stress đầu tuần.',
    type: 'chill',
    time: '19h00 – 23h00',
  },
  {
    day: 'Thứ Ba',
    dayShort: 'T3',
    name: 'Ladies Night',
    description: 'Đêm dành cho chị em – free 2 ly đầu tiên, DJ nữ chơi nhạc chill.',
    type: 'ladies',
    time: '20h00 – 00h00',
  },
  {
    day: 'Thứ Tư',
    dayShort: 'T4',
    name: 'Acoustic Wednesday',
    description: 'Ca sĩ acoustic live, không gian lãng mạn, menu cocktail đặc biệt.',
    type: 'acoustic',
    time: '19h30 – 23h30',
  },
  {
    day: 'Thứ Năm',
    dayShort: 'T5',
    name: 'Warm Up Thursday',
    description: 'DJ bắt đầu khuấy động, ưu đãi combo bia cho nhóm bạn.',
    type: 'dj',
    time: '20h00 – 01h00',
  },
  {
    day: 'Thứ Sáu',
    dayShort: 'T6',
    name: 'Friday Fever',
    description: 'Đêm bùng nổ – DJ top, dancer, laser show, bia tươi không giới hạn.',
    type: 'party',
    time: '20h00 – 03h00',
  },
  {
    day: 'Thứ Bảy',
    dayShort: 'T7',
    name: 'Saturday Night Live',
    description: 'Đỉnh cao cuối tuần – ca sĩ khách mời, DJ set đặc biệt, vibe sân vườn.',
    type: 'party',
    time: '20h00 – 03h00',
  },
  {
    day: 'Chủ Nhật',
    dayShort: 'CN',
    name: 'Sunday Recovery',
    description: 'Brunch & chill, nhạc lo-fi, combo đồ nhắm giá mềm để nạp năng lượng.',
    type: 'recovery',
    time: '17h00 – 23h00',
  },
];

// ─── Weekly Schedule (Thu–Sun Performers) ────────────────────

export const WEEKLY_SCHEDULE: WeeklyScheduleItem[] = [
  { day: 'Thứ Năm', time: '20h00 – 22h00', program: 'Warm Up Set', artist: 'DJ Minh Tú', type: 'DJ' },
  { day: 'Thứ Năm', time: '22h00 – 01h00', program: 'Main Set', artist: 'DJ Hùng Vũ', type: 'DJ' },
  { day: 'Thứ Sáu', time: '20h00 – 21h30', program: 'Acoustic Live', artist: 'Band Sài Gòn Night', type: 'Live' },
  { day: 'Thứ Sáu', time: '21h30 – 00h00', program: 'DJ & Dancer Show', artist: 'DJ Alex + Dancer Team', type: 'DJ' },
  { day: 'Thứ Sáu', time: '00h00 – 03h00', program: 'After Party', artist: 'DJ Lộc', type: 'DJ' },
  { day: 'Thứ Bảy', time: '20h00 – 21h00', program: 'Ca Sĩ Khách Mời', artist: 'Tuỳ tuần', type: 'Live' },
  { day: 'Thứ Bảy', time: '21h00 – 00h00', program: 'Saturday Mix', artist: 'DJ Phương + MC', type: 'DJ' },
  { day: 'Thứ Bảy', time: '00h00 – 03h00', program: 'Late Night Vibes', artist: 'DJ Bảo', type: 'DJ' },
  { day: 'Chủ Nhật', time: '18h00 – 21h00', program: 'Acoustic Chill', artist: 'Various Artists', type: 'Acoustic' },
  { day: 'Chủ Nhật', time: '21h00 – 23h00', program: 'Sunset Mix', artist: 'DJ Tâm An', type: 'DJ' },
];

// ─── Party Packages ─────────────────────────────────────────

export const PARTY_PACKAGES: PartyPackage[] = [
  {
    title: 'Sinh Nhật Cơ Bản',
    guests: '5 – 10 người',
    description: 'Trọn gói sinh nhật với bánh kem, nến, và không gian riêng.',
    features: [
      'Bánh kem sinh nhật',
      'Bàn trang trí sẵn',
      'MC chúc mừng trên sân khấu',
      'Tặng 1 xô bia Tiger',
    ],
  },
  {
    title: 'Sinh Nhật VIP',
    guests: '10 – 20 người',
    description: 'Phòng VIP riêng, DJ chơi nhạc theo yêu cầu, trang trí theo theme.',
    features: [
      'Phòng VIP riêng tư',
      'DJ chơi nhạc yêu cầu',
      'Trang trí bóng bay + banner',
      'Combo đồ ăn + 2 xô bia',
      'MC chúc mừng đặc biệt',
    ],
  },
  {
    title: 'Tiệc Công Ty',
    guests: '20 – 50 người',
    description: 'Tổ chức team building, year-end party với setup chuyên nghiệp.',
    features: [
      'Khu vực riêng biệt',
      'Hệ thống âm thanh riêng',
      'Menu buffet tuỳ chỉnh',
      'MC dẫn chương trình',
      'Trang trí theo branding',
      'Hỗ trợ mini game',
    ],
  },
  {
    title: 'Họp Mặt Bạn Bè',
    guests: '8 – 15 người',
    description: 'Gặp gỡ, trò chuyện trong không gian thoải mái với combo giá tốt.',
    features: [
      'Bàn nhóm thoải mái',
      'Combo bia + đồ nhắm',
      'Nhạc theo yêu cầu',
      'Giá ưu đãi khi đặt trước',
    ],
  },
];

// ─── Promotions ─────────────────────────────────────────────

export const PROMOTIONS: PromotionItem[] = [
  {
    title: 'Đặt bàn trước 20h – Giảm 10%',
    description: 'Đặt bàn online trước 20h00 được giảm 10% tổng bill đồ uống.',
    condition: 'Áp dụng từ T2 – T5, không cộng dồn khuyến mãi khác.',
  },
  {
    title: 'Nhóm 10+ người – Tặng 1 xô bia',
    description: 'Nhóm từ 10 người trở lên đặt bàn trước được tặng ngay 1 xô bia Tiger.',
    condition: 'Áp dụng tất cả các ngày, cần đặt trước ít nhất 2 tiếng.',
  },
  {
    title: 'Happy Hour 17h – 19h',
    description: 'Mua 1 tặng 1 tất cả bia tươi và cocktail trong khung giờ vàng.',
    condition: 'Áp dụng hàng ngày, không giới hạn số lượng.',
  },
  {
    title: 'Sinh nhật trong tháng – Giảm 15%',
    description: 'Khách có sinh nhật trong tháng được giảm 15% khi đặt tiệc sinh nhật.',
    condition: 'Cần xuất trình CCCD, áp dụng cho bill từ 1 triệu.',
  },
];

// ─── Spaces ─────────────────────────────────────────────────

export const SPACES: SpaceItem[] = [
  {
    name: 'Sân Vườn Trung Tâm',
    description: 'View sân khấu chính, vibe sôi động nhất Báo Garden.',
    image: '/home/hero.png',
  },
  {
    name: 'Khu VIP Phòng Riêng',
    description: 'Không gian riêng tư cho tiệc sinh nhật, họp mặt đặc biệt.',
    image: '/home/birthday.png',
  },
  {
    name: 'Sân Khấu & DJ Booth',
    description: 'Nơi DJ và dancer biểu diễn mỗi đêm, âm thanh đỉnh cao.',
    image: '/home/dj.png',
  },
  {
    name: 'Khu Chill Ngoài Trời',
    description: 'Gió mát, đèn vàng, ngồi nhâm nhi bia với bạn bè.',
    image: '/home/chill.png',
  },
  {
    name: 'Khu A – Gần Phòng Chờ',
    description: 'Vị trí thuận tiện, thoáng mát, dễ di chuyển.',
    image: '/home/hero.png',
  },
  {
    name: 'Khu B – Bên Trái',
    description: 'Yên tĩnh hơn, phù hợp nhóm nhỏ muốn trò chuyện.',
    image: '/home/chill.png',
  },
];

// ─── Upcoming Events ────────────────────────────────────────

export const UPCOMING_EVENTS: UpcomingEvent[] = [
  {
    title: 'Friday Fever – EDM Night',
    date: 'Thứ Sáu tuần này',
    time: '20h00 – 03h00',
    description: 'DJ Alex đặc biệt quay trở lại với set EDM bùng nổ nhất mùa hè.',
    tag: 'Hot',
  },
  {
    title: 'Saturday Night Live – Guest Star',
    date: 'Thứ Bảy tuần này',
    time: '20h00 – 03h00',
    description: 'Ca sĩ khách mời bí ẩn, chỉ tiết lộ vào thứ Năm. Đặt bàn ngay!',
    tag: 'Bí ẩn',
  },
  {
    title: 'Ladies Night Special',
    date: 'Thứ Ba tuần sau',
    time: '20h00 – 00h00',
    description: 'Phiên bản đặc biệt với 3 ly free cho chị em, DJ nữ quốc tế.',
    tag: 'Ladies',
  },
  {
    title: 'Pool Party – Mùa Hè Bùng Nổ',
    date: 'Cuối tháng này',
    time: '15h00 – 23h00',
    description: 'Sự kiện lớn nhất mùa hè – pool party ngoài trời, bikini, bia tươi.',
    tag: 'Sắp tới',
  },
];
