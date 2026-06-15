import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(str: string): string {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ==================== CATEGORY DEFINITIONS ====================
const categoryDefs = [
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

// ==================== MENU ITEM DEFINITIONS ====================

// --- NGHÊU (Clams) ---
const ngheuItems = [
  { name: 'Nghêu nướng mỡ chài', price: 259000, desc: 'Clams grilled with pork fat', time: 15, featured: true },
  { name: 'Nghêu hấp Thái / hấp xả', price: 179000, desc: 'Clams steamed with Thai herbs or lemongrass', time: 12 },
  { name: 'Nghêu xào rau quế', price: 179000, desc: 'Clams stir-fried with basil', time: 12 },
];

// --- VẸM XANH (Green Mussels) ---
const vemXanhItems = [
  { name: 'Vẹm xanh New Zealand sốt Thái', price: 269000, desc: 'New Zealand green mussels in Thai sauce', time: 15, featured: true },
  { name: 'Vẹm xanh New Zealand đút lò phô mai', price: 269000, desc: 'Baked green mussels with cheese', time: 18 },
];

// --- CƠM (Rice) ---
const comItems = [
  { name: 'Cơm chiên cá mặn', price: 199000, desc: 'Salted fish fried rice', time: 15 },
  { name: 'Cơm chiên Hoàng Báo', price: 199000, desc: 'Royal golden fried rice', time: 15, featured: true },
  { name: 'Cơm chiên hải sản X.O', price: 199000, desc: 'Seafood fried rice with XO sauce', time: 15 },
  { name: 'Cơm chiên Dương Châu', price: 199000, desc: 'Yangzhou-style fried rice', time: 15 },
];

// --- LẨU (Hotpots) ---
const lauItems = [
  { name: 'Lẩu hải sản TomYum', price: 469000, desc: 'Tom Yum seafood hotpot', time: 20, featured: true },
  { name: 'Lẩu hải sản Vương Quốc Nấm', price: 469000, desc: 'Seafood & mushroom kingdom hotpot', time: 20 },
  { name: 'Lẩu gà tre tiềm ớt hiểm', price: 469000, desc: 'Stewed free-range chicken with bird\'s eye chili hotpot', time: 25 },
];

// --- KHAI VỊ & SNACKS (Appetizers & Snacks) ---
const khaiViItems = [
  { name: 'Bắp bò ngâm nước mắm', price: 269000, desc: 'Beef shank marinated in fish sauce', time: 10 },
  { name: 'Nạc nọng chiên kiểu Thái', price: 189000, desc: 'Thai-style fried pork jowl', time: 12 },
  { name: 'Khô mực cháy tỏi', price: 279000, desc: 'Dried squid with garlic', time: 10, featured: true },
  { name: 'Khô mực chiên nước mắm', price: 279000, desc: 'Dried squid fried with fish sauce', time: 10 },
  { name: 'Que hải sản chiên giòn', price: 169000, desc: 'Crispy fried seafood sticks', time: 12 },
];

// --- SALADS ---
const saladItems = [
  { name: 'Salad chanh dây ức gà hạc óc chó', price: 249000, desc: 'Passion fruit salad with chicken breast & walnuts', time: 10 },
  { name: 'Salad gà nướng', price: 249000, desc: 'Grilled chicken salad', time: 10 },
  { name: 'Gỏi hải sản miến Thái', price: 279000, desc: 'Thai-style seafood glass noodle salad', time: 12 },
  { name: 'Gỏi đu đủ bò một nắng kiểu Thái', price: 179000, desc: 'Thai papaya salad with sun-dried beef', time: 10 },
];

// --- RAW BAR ---
const rawBarItems = [
  { name: 'Hào Úc sống sốt Tabaco', price: 59000, desc: 'Australian oyster with Tabasco sauce (1 con)', time: 3, featured: true },
  { name: 'Hào Úc Tartare', price: 59000, desc: 'Australian oyster tartare (1 con)', time: 3 },
  { name: 'Cá hồi Tartare trứng cá đen', price: 329000, desc: 'Salmon tartare with black caviar', time: 10 },
];

// --- MÓN CHÍNH (Main Courses) ---
const monChinhItems = [
  { name: 'Bò Tenderloin nướng va nấm áp chảo bơ tỏi', price: 489000, desc: 'Grilled beef tenderloin with butter garlic mushrooms', time: 25, featured: true },
  { name: 'Sườn bò Úc đút lò sốt BBQ', price: 489000, desc: 'Oven-baked Australian beef ribs with BBQ sauce', time: 30 },
  { name: 'Đùi vịt nướng kiểu Pháp', price: 279000, desc: 'French-style roasted duck leg', time: 25 },
  { name: 'File cá chẽm chiên giòn sốt Sambal', price: 219000, desc: 'Crispy fried barramundi fillet with Sambal sauce', time: 20 },
  { name: 'Cá hồi sốt cay Tokyo', price: 329000, desc: 'Salmon with spicy Tokyo sauce', time: 20 },
];

// --- CƠM - MÌ - PHỞ (Rice, Noodles & Soup) ---
const comMiPhoItems = [
  { name: 'Cơm chiên Sambal và cá hồi áp chảo', price: 269000, desc: 'Sambal fried rice with pan-seared salmon', time: 15 },
  { name: 'Mì Udon sốt tiêu và bò nướng hương thảo', price: 249000, desc: 'Udon noodles with pepper sauce & rosemary grilled beef', time: 18 },
  { name: 'Phật nhảy tường mini', price: 0, desc: 'Mini Buddha Jumps Over the Wall (theo thời giá / market price)', time: 30 },
];

// --- NEW COMBO ---
const newComboItems = [
  {
    name: 'Combo Tinh Hoa Ẩm Thực',
    price: 1989000,
    desc: '1. Chả giò chuối chiên giòn\n2. Salad gà chiên cay kiểu New York\n3. Ribeye Úc nướng và tôm áp chảo sốt nấm\n4. Tôm hùm đút lò kiểu Pháp\n5. Heo massage nướng hương thảo',
    time: 45, featured: true
  },
  {
    name: 'Combo Phong Cách Eight One',
    price: 1989000,
    desc: '1. Bánh khoai Tây chiên giòn\n2. Salad gà nướng kiểu Mỹ\n3. Bò Úc giác vàng 24K\n4. The Eight One Pate Tôm Hùm\n5. Nạc nọng Iberico xiên nướng sốt tiêu đen',
    time: 45
  },
];

// --- COMBO 2 KHÁCH ---
const combo2Items = [
  // Combo 999K (1.086K)
  { name: 'Combo 999K - Mỳ ý sốt bò bầm', price: 999000, desc: '1. Mỳ ý sốt bò bầm\n2. Vẹm xanh New Zealand đút lò\n3. Vảy cá hồi chiên nước mắm\nBia: 12 lon Heineken (250ml) / 1 tháp bia Heineken 2L / 10 lon Tiger Lager/Tiger Silver', time: 30 },
  { name: 'Combo 999K - Mì gói xào hải sản', price: 999000, desc: '1. Mì gói xào hải sản\n2. Tôm sú cháy tỏi\n3. Rau luộc thập cẩm + kho quẹt\nBia: 12 lon Heineken (250ml) / 1 tháp bia Heineken 2L / 10 lon Tiger Lager/Tiger Silver', time: 30 },
  // Combo 999K (1.036K)
  { name: 'Combo 999K - Hủ tiếu áp chảo hải sản A', price: 999000, desc: '1. Hủ tiếu áp chảo hải sản\n2. Ếch cháy tỏi lá cà ri\n3. Gỏi đu đủ tôm Thái\nBia: 12 lon Heineken (250ml) / 1 tháp bia Heineken 2L / 10 lon Tiger Lager/Tiger Silver', time: 30 },
  { name: 'Combo 999K - Hủ tiếu áp chảo hải sản B', price: 999000, desc: '1. Hủ tiếu áp chảo hải sản\n2. Ếch núp lùm\n3. Gỏi cóc bò 1 nắng\nBia: 12 lon Heineken (250ml) / 1 tháp bia Heineken 2L / 10 lon Tiger Lager/Tiger Silver', time: 30 },
  // Combo 959K (986K)
  { name: 'Combo 959K - Miến xào thịt cua', price: 959000, desc: '1. Miến xào thịt cua\n2. Mực xông đá muối\n3. Rau rừng Gia Lai xào tỏi\nBia: 12 lon Heineken (250ml) / 1 tháp bia Heineken 2L / 10 lon Tiger Lager/Tiger Silver', time: 30 },
  { name: 'Combo 959K - Miến xào hải sản', price: 959000, desc: '1. Miến xào hải sản\n2. Khô mực xóc mắm khoai môn\n3. Đậu rồng mắm ruốc\nBia: 12 lon Heineken (250ml) / 1 tháp bia Heineken 2L / 10 lon Tiger Lager/Tiger Silver', time: 30 },
  // Combo 1.199K (1.266K)
  { name: 'Combo 1.199K - Bò Fuji nướng đá', price: 1199000, desc: '1. Bò Fuji nướng đá\n2. Nghêu nướng mỡ cháy\n3. Cơm chiên Hoàng Bảo\nBia: 12 lon Heineken (250ml) / 1 tháp bia Heineken 2L / 10 lon Tiger Lager/Tiger Silver', time: 35 },
  { name: 'Combo 1.199K - Gỏi ốc hương Thái', price: 1199000, desc: '1. Gỏi ốc hương Thái\n2. Sườn heo nướng BBQ\n3. Cơm chiên Dương Châu\nBia: 12 lon Heineken (250ml) / 1 tháp bia Heineken 2L / 10 lon Tiger Lager/Tiger Silver', time: 35 },
];

// --- COMBO 4 KHÁCH ---
const combo4Items = [
  // Combo 1.179K (1.225K)
  { name: 'Combo 1.179K - Chả đùm + bánh đa', price: 1179000, desc: '1. Chả đùm + bánh đa\n2. Gỏi đu đủ tôm Thái\n3. Rau dạ yến xào tỏi\n4. Cơm chiên cá mặn\nBia: 12 lon Heineken (250ml) / 1 tháp bia Heineken 2L / 10 lon Tiger Lager/Tiger Silver', time: 35 },
  { name: 'Combo 1.179K - Đậu hủ chả bông chiên bách thảo', price: 1179000, desc: '1. Đậu hủ chả bông chiên bách thảo\n2. Vẹm xanh đút lò\n3. Sụn gà rang muối Hongkong\n4. Hủ tiếu áp chảo bò/hải sản\nBia: 12 lon Heineken (250ml) / 1 tháp bia Heineken 2L / 10 lon Tiger Lager/Tiger Silver', time: 35 },
  // Combo 1.169K (1.222K)
  { name: 'Combo 1.169K - Cánh gà chiên sốt cay', price: 1169000, desc: '1. Cánh gà chiên sốt cay\n2. Hàu đút lò (4 con)\n3. Rau luộc thập cẩm + kho quẹt\n4. Cơm lam khô cá dứa\nBia: 12 lon Heineken (250ml) / 1 tháp bia Heineken 2L / 10 lon Tiger Lager/Tiger Silver', time: 35 },
  { name: 'Combo 1.169K - Xúc xích tươi The Eight One', price: 1169000, desc: '1. Xúc xích tươi The Eight One\n2. Vảy cá hồi chiên nước mắm\n3. Đậu hủ chả bông, bách thảo\n4. Sườn heo nướng sốt tiêu đen\nBia: 12 lon Heineken (250ml) / 1 tháp bia Heineken 2L / 10 lon Tiger Lager/Tiger Silver', time: 35 },
  // Combo 1.159K (1.205K)
  { name: 'Combo 1.159K - Paté hàu + bánh mì', price: 1159000, desc: '1. Paté hàu + bánh mì\n2. Bồ câu nướng lá chúc\n3. Rau rừng Gia Lai xào tỏi\n4. Cá điêu hồng nấu Thái\nBia: 12 lon Heineken (250ml) / 1 tháp bia Heineken 2L / 10 lon Tiger Lager/Tiger Silver', time: 35 },
  { name: 'Combo 1.159K - Xúc xích tươi The Eight One B', price: 1159000, desc: '1. Xúc xích tươi The Eight One\n2. Sò huyết nướng mọi\n3. Mì ý hải sản\n4. Salad bắp bò rong nho trứng cá chuồn\nBia: 12 lon Heineken (250ml) / 1 tháp bia Heineken 2L / 10 lon Tiger Lager/Tiger Silver', time: 35 },
  // Combo 1.309K (1.362K)
  { name: 'Combo 1.309K - Xúc xích tươi The Eight One C', price: 1309000, desc: '1. Xúc xích tươi The Eight One\n2. Hàu Nhật đút lò phô mai (4 con)\n3. Măng tây xào tỏi\n4. Gà tre nướng ớt xiêm xanh + cơm lam\nBia: 12 lon Heineken (250ml) / 1 tháp bia Heineken 2L / 10 lon Tiger Lager/Tiger Silver', time: 40 },
  { name: 'Combo 1.309K - Ếch lúp lùm', price: 1309000, desc: '1. Ếch lúp lùm\n2. Đậu hủ hải sản giấy bạc\n3. Tôm sú rang muối Hongkong\n4. Giò heo muối The Eight One\nBia: 12 lon Heineken (250ml) / 1 tháp bia Heineken 2L / 10 lon Tiger Lager/Tiger Silver', time: 40 },
];

// --- COMBO 6-8 KHÁCH ---
const combo68Items = [
  // Combo 2.299K (2.403K)
  { name: 'Combo 2.299K - Combo thớt hải sản nướng A', price: 2299000, desc: '1. Combo thớt hải sản nướng\n2. Rau rừng Gia Lai xào tỏi\n3. Nghêu nướng mỡ cháy\n4. Giò heo muối The Eight One\n5. Cơm lam khô cá dứa\nBia: 24 lon Heineken (250ml) / 2 tháp bia Heineken 2L / 20 lon Tiger Lager/Tiger Silver', time: 45 },
  { name: 'Combo 2.299K - Ốc hương sốt trứng muối', price: 2299000, desc: '1. Ốc hương sốt trứng muối\n2. Đậu rồng mắm ruốc\n3. Salad bò trứng cá chuồn\n4. Gà tre hấp lá trúc\n5. Cá khoai 1 nắng chiên giòn mắm me\nBia: 24 lon Heineken (250ml) / 2 tháp bia Heineken 2L / 20 lon Tiger Lager/Tiger Silver', time: 45 },
  // Combo 2.579K (2.699K)
  { name: 'Combo 2.579K - Combo thớt thịt', price: 2579000, desc: '1. Combo thớt thịt\n2. Rau thập cẩm + kho quẹt\n3. Ốc hương hấp sả\n4. Vẹm xanh New Zealand đút lò phô mai\n5. Lẩu hải sản TomYum\nBia: 24 lon Heineken (250ml) / 2 tháp bia Heineken 2L / 20 lon Tiger Lager/Tiger Silver', time: 45 },
  { name: 'Combo 2.579K - Cá hồi Nauy sốt nấm Truffle', price: 2579000, desc: '1. Cá hồi Nauy sốt nấm Truffle\n2. Măng tây xào tỏi\n3. Cua cháy tỏi\n4. Bồ câu Roti\n5. Lẩu hải sản Vương Quốc Nấm\nBia: 24 lon Heineken (250ml) / 2 tháp bia Heineken 2L / 20 lon Tiger Lager/Tiger Silver', time: 50 },
  // Combo 2.469K (2.583K)
  { name: 'Combo 2.469K - Combo hải sản Thái A', price: 2469000, desc: '1. Combo hải sản Thái\n2. Nụ bí xào tỏi\n3. Bò Úc nướng bản ủi\n4. Gà tre hấp mắm nhĩ\n5. Chả đùm bánh đa\nBia: 24 lon Heineken (250ml) / 2 tháp bia Heineken 2L / 20 lon Tiger Lager/Tiger Silver', time: 45 },
  { name: 'Combo 2.469K - Tôm càng xanh nướng phô mai', price: 2469000, desc: '1. Tôm càng xanh nướng phô mai\n2. Rau thập cẩm kho quẹt\n3. Gỏi ốc hương Thái\n4. Gà tre nướng muối ớt + cơm lam\n5. Vảy cá hồi chiên nước mắm\nBia: 24 lon Heineken (250ml) / 2 tháp bia Heineken 2L / 20 lon Tiger Lager/Tiger Silver', time: 45 },
  // Combo 2.289K (2.393K)
  { name: 'Combo 2.289K - Combo thớt hải sản nướng B', price: 2289000, desc: '1. Combo thớt hải sản nướng\n2. Đậu rồng mắm ruốc\n3. Bò Fuji nướng đá\n4. Sò huyết nướng mọi\n5. Cá điêu hồng nấu Thái\nBia: 24 lon Heineken (250ml) / 2 tháp bia Heineken 2L / 20 lon Tiger Lager/Tiger Silver', time: 45 },
  { name: 'Combo 2.289K - Cua cháy tỏi', price: 2289000, desc: '1. Cua cháy tỏi\n2. Rau dạ yến xào tỏi\n3. Giò heo muối The Eight One\n4. Vẹm xanh đút lò phô mai\n5. Cá điêu hồng nấu ngọt\nBia: 24 lon Heineken (250ml) / 2 tháp bia Heineken 2L / 20 lon Tiger Lager/Tiger Silver', time: 45 },
];

// --- COMBO 8-10 KHÁCH ---
const combo810Items = [
  // Combo 2.719K (2.393K strikethrough)
  { name: 'Combo 2.719K - Combo thớt hải sản nướng', price: 2719000, desc: '1. Combo thớt hải sản nướng\n2. Đậu rồng mắm ruốc\n3. Ếch cháy tỏi lá cà ri\n4. Gà tre hấp lá trúc\n5. Chả giò hải sản mayonaise\n6. Cá điêu hồng nấu Thái\n7. Trái cây lớn\nBia: 24 lon Heineken (250ml) / 2 tháp bia Heineken 2L / 20 lon Tiger Lager/Tiger Silver', time: 50 },
  { name: 'Combo 2.719K - Ốc hương sốt trứng muối B', price: 2719000, desc: '1. Ốc hương sốt trứng muối\n2. Rau dạ yến xào tỏi\n3. Ếch chiên nước mắm\n4. Bồ câu quay (2 con)\n5. Tôm khô nổ muối\n6. Cá điêu hồng nấu ngọt\n7. Trái cây lớn\nBia: 24 lon Heineken (250ml) / 2 tháp bia Heineken 2L / 20 lon Tiger Lager/Tiger Silver', time: 50 },
  // Combo 2.989K (3.131K)
  { name: 'Combo 2.989K - Combo hải sản Thái', price: 2989000, desc: '1. Combo hải sản Thái\n2. Paté hàu + bánh mì\n3. Ếch cháy tỏi lá cà ri\n4. Giò heo muối The Eight One\n5. Rau thập cẩm + kho quẹt\n6. Lẩu gà tre tiềm ớt hiểm\n7. Trái cây lớn\nBia: 24 lon Heineken (250ml) / 2 tháp bia Heineken 2L / 20 lon Tiger Lager/Tiger Silver', time: 55 },
  { name: 'Combo 2.989K - Cua rang muối Hongkong', price: 2989000, desc: '1. Cua rang muối Hongkong\n2. Paté cột điện + bánh mì\n3. Xúc xích đức xông khói\n4. Bò Fuji nướng đá\n5. Măng tây xào tỏi\n6. Lẩu hải sản TomYum\n7. Trái cây lớn\nBia: 24 lon Heineken (250ml) / 2 tháp bia Heineken 2L / 20 lon Tiger Lager/Tiger Silver', time: 55 },
  // Combo 3.599K (3.772K)
  { name: 'Combo 3.599K - Bò Fuji nướng đá A', price: 3599000, desc: '1. Bò Fuji nướng đá\n2. Cua rang muối Hongkong\n3. Mực ống sốt Thái\n4. Rau dạ yến xào tỏi\n5. Cá chim nướng muối ớt\n6. 2 Cơm chiên Hoàng Bảo\n7. Trái cây lớn\nBia: 24 lon Heineken (250ml) / 2 tháp bia Heineken 2L / 20 lon Tiger Lager/Tiger Silver', time: 55, featured: true },
  { name: 'Combo 3.599K - Giò heo muối The Eight One', price: 3599000, desc: '1. Giò heo muối The Eight One\n2. Ốc hương sốt trứng muối\n3. Mực ống nướng ngũ vị\n4. Rau rừng Gia Lai xào tỏi\n5. Cá chim sốt Thái xoài bằm\n6. 2 Cơm chiên Dương Châu\n7. Trái cây lớn\nBia: 24 lon Heineken (250ml) / 2 tháp bia Heineken 2L / 20 lon Tiger Lager/Tiger Silver', time: 55 },
  // Combo 3.579K (3.752K)
  { name: 'Combo 3.579K - Combo thớt thịt A', price: 3579000, desc: '1. Combo thớt thịt\n2. Gỏi đu đủ tôm Thái\n3. Vảy cá hồi chiên\n4. Ốc hương sốt bơ cay\n5. Nụ bí xào tỏi\n6. Lẩu hải sản TomYum\n7. Trái cây lớn\nBia: 24 lon Heineken (250ml) / 2 tháp bia Heineken 2L / 20 lon Tiger Lager/Tiger Silver', time: 55 },
  { name: 'Combo 3.579K - Bò Úc nướng đá', price: 3579000, desc: '1. Bò Úc nướng đá\n2. Vẹm xanh đút lò\n3. Chả cá thác lác cánh bướm\n4. Cua rang muối Hongkong\n5. Rau rừng Gia Lai xào tỏi\n6. Lẩu hải sản Vương Quốc Nấm\n7. Trái cây lớn\nBia: 24 lon Heineken (250ml) / 2 tháp bia Heineken 2L / 20 lon Tiger Lager/Tiger Silver', time: 55 },
];

// --- COCKTAIL ---
const cocktailItems = [
  { name: 'Cocktail tháp 3L - Only You', price: 690000, desc: 'Cocktail tower 3L - Only You', time: 8 },
  { name: 'Cocktail tháp 3L - Lovely Susana', price: 690000, desc: 'Cocktail tower 3L - Lovely Susana', time: 8 },
  { name: 'Cocktail tháp 3L - The Eight One', price: 690000, desc: 'Cocktail tower 3L - The Eight One', time: 8, featured: true },
];

// --- RƯỢU VANG (Wine) ---
const ruouVangItems = [
  { name: 'Rượu vang Casati', price: 540000, desc: 'Chai 750ml', time: 2 },
  { name: 'Rượu vang Vincenzo', price: 630000, desc: 'Chai 750ml', time: 2 },
  { name: 'Rượu vang Segrecto', price: 720000, desc: 'Chai 750ml', time: 2 },
];

// --- BIA HEINEKEN ---
const biaHeinekenItems = [
  { name: 'Heineken chai 330ml', price: 79000, desc: 'Chai 330ml', time: 1 },
  { name: 'Heineken lon 350ml', price: 38000, desc: 'Lon 350ml', time: 1 },
  { name: 'Heineken lon (bạc)', price: 38000, desc: 'Lon 250ml - Silver', time: 1 },
  { name: 'Heineken lon 250ml', price: 30000, desc: 'Lon 250ml', time: 1 },
  { name: 'Heineken tháp 2 lít', price: 369000, desc: 'Tháp bia 2 lít', time: 3, featured: true },
];

// --- BIA TIGER ---
const biaTigerItems = [
  { name: 'Tiger tháp 3 lít', price: 389000, desc: 'Tháp bia 3 lít', time: 3 },
  { name: 'Tiger lon', price: 35000, desc: 'Lon Tiger Lager', time: 1 },
  { name: 'Tiger Crystal lon', price: 35000, desc: 'Lon Tiger Crystal', time: 1 },
  { name: 'Tiger chai', price: 33000, desc: 'Chai Tiger', time: 1 },
];

// --- RƯỢU KHÁC ---
const ruouKhacItems = [
  { name: 'Rượu mơ', price: 199000, desc: 'Chai rượu mơ', time: 2 },
  { name: 'Rượu Soju - Truyền thống', price: 159000, desc: 'Soju truyền thống', time: 1 },
  { name: 'Rượu Soju - Đào', price: 159000, desc: 'Soju vị đào', time: 1 },
  { name: 'Rượu Soju - Việt quất', price: 159000, desc: 'Soju vị việt quất', time: 1 },
  { name: 'Strongbow lon', price: 33000, desc: 'Strongbow Sparkling Ciders', time: 1 },
];

// --- NƯỚC NGỌT (Soft Drink) ---
const nuocNgotItems = [
  { name: 'Dasani', price: 26000, desc: 'Nước suối Dasani', time: 1 },
  { name: 'Coca/Pepsi', price: 32000, desc: 'Coca-Cola hoặc Pepsi', time: 1 },
  { name: 'Sprite', price: 32000, desc: 'Sprite lon', time: 1 },
  { name: 'Sting', price: 32000, desc: 'Sting lon', time: 1 },
];

// --- TRÁI CÂY (Fruits) ---
const traiCayItems = [
  { name: 'Trái cây nhỏ', price: 199000, desc: 'Đĩa trái cây tổng hợp nhỏ', time: 5 },
  { name: 'Trái cây lớn', price: 299000, desc: 'Đĩa trái cây tổng hợp lớn', time: 5 },
];

// --- PHỤ PHÍ ---
const phuPhiItems = [
  { name: 'Khăn lạnh', price: 5000, desc: 'Khăn lạnh phục vụ', time: 1 },
  { name: 'Khăn giấy khô', price: 15000, desc: 'Khăn giấy khô', time: 1 },
  { name: 'Bánh tráng nướng', price: 28000, desc: 'Bánh tráng nướng', time: 5 },
];

// ==================== MAIN FUNCTION ====================
async function main() {
  console.log('🍽️  Bắt đầu cập nhật menu thực tế Báo Garden...\n');

  // Step 1: Delete existing order items that reference menu items (to avoid FK constraint)
  console.log('📦 Đang kiểm tra order items liên quan...');
  const existingOrderItems = await prisma.orderItem.count();
  if (existingOrderItems > 0) {
    await prisma.orderItem.deleteMany({});
    console.log(`   ✅ Đã xóa ${existingOrderItems} order items`);
  }

  // Step 2: Delete existing orders
  const existingOrders = await prisma.order.count();
  if (existingOrders > 0) {
    await prisma.orderEvent.deleteMany({});
    await prisma.order.deleteMany({});
    console.log(`   ✅ Đã xóa ${existingOrders} orders`);
  }

  // Step 3: Delete old menu items
  const oldItemCount = await prisma.menuItem.count();
  if (oldItemCount > 0) {
    await prisma.menuItem.deleteMany({});
    console.log(`   ✅ Đã xóa ${oldItemCount} menu items cũ`);
  }

  // Step 4: Delete old categories
  const oldCatCount = await prisma.menuCategory.count();
  if (oldCatCount > 0) {
    await prisma.menuCategory.deleteMany({});
    console.log(`   ✅ Đã xóa ${oldCatCount} danh mục cũ`);
  }

  // Step 5: Create new categories
  console.log('\n📂 Đang tạo danh mục mới...');
  const catMap: Record<string, string> = {};
  for (const c of categoryDefs) {
    const cat = await prisma.menuCategory.create({ data: c });
    catMap[c.name] = cat.id;
  }
  console.log(`   ✅ Đã tạo ${categoryDefs.length} danh mục`);

  // Step 6: Insert menu items by category
  console.log('\n🍜 Đang thêm món ăn...');

  const allCategoryItems: { catName: string; items: typeof ngheuItems }[] = [
    { catName: 'Nghêu', items: ngheuItems },
    { catName: 'Vẹm xanh', items: vemXanhItems },
    { catName: 'Cơm', items: comItems },
    { catName: 'Lẩu', items: lauItems },
    { catName: 'Khai vị & Snacks', items: khaiViItems },
    { catName: 'Salads', items: saladItems },
    { catName: 'Raw Bar', items: rawBarItems },
    { catName: 'Món chính', items: monChinhItems },
    { catName: 'Cơm - Mì - Phở', items: comMiPhoItems },
    { catName: 'New Combo', items: newComboItems },
    { catName: 'Combo 2 khách', items: combo2Items },
    { catName: 'Combo 4 khách', items: combo4Items },
    { catName: 'Combo 6-8 khách', items: combo68Items },
    { catName: 'Combo 8-10 khách', items: combo810Items },
    { catName: 'Cocktail', items: cocktailItems },
    { catName: 'Rượu vang', items: ruouVangItems },
    { catName: 'Bia Heineken', items: biaHeinekenItems },
    { catName: 'Bia Tiger', items: biaTigerItems },
    { catName: 'Rượu khác', items: ruouKhacItems },
    { catName: 'Nước ngọt', items: nuocNgotItems },
    { catName: 'Trái cây', items: traiCayItems },
    { catName: 'Phụ phí', items: phuPhiItems },
  ];

  let totalItems = 0;
  const usedSlugs = new Set<string>();

  for (const { catName, items } of allCategoryItems) {
    const catId = catMap[catName];
    const catDef = categoryDefs.find(c => c.name === catName)!;
    const dept = catDef.departmentDefault;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let slug = slugify(item.name);
      // Ensure unique slug
      if (usedSlugs.has(slug)) {
        let counter = 2;
        while (usedSlugs.has(`${slug}-${counter}`)) counter++;
        slug = `${slug}-${counter}`;
      }
      usedSlugs.add(slug);

      await prisma.menuItem.create({
        data: {
          name: item.name,
          slug,
          description: item.desc,
          price: item.price,
          categoryId: catId,
          department: dept,
          preparationTimeMinutes: item.time,
          isFeatured: (item as any).featured || false,
          sortOrder: totalItems,
        },
      });
      totalItems++;
    }
    console.log(`   ✅ ${catName}: ${items.length} món`);
  }

  // ==================== SUMMARY ====================
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 CẬP NHẬT MENU HOÀN TẤT!\n');
  console.log(`📊 TỔNG KẾT:`);
  console.log(`   • ${categoryDefs.length} danh mục`);
  console.log(`   • ${totalItems} món ăn / đồ uống / combo`);
  console.log('\n📋 CHI TIẾT DANH MỤC:');
  for (const { catName, items } of allCategoryItems) {
    console.log(`   • ${catName}: ${items.length} món`);
  }
  console.log('═'.repeat(60));
}

main()
  .catch((e) => { console.error('❌ Lỗi:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
