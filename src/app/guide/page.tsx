'use client';

import { useState, useEffect } from 'react';

/* ─── Section Data ── */
interface Section {
  id: string;
  icon: string;
  title: string;
  role: string;
  route: string;
  desc: string;
  steps: { title: string; detail: string }[];
}

const SECTIONS: Section[] = [
  {
    id: 'login',
    icon: '🔐',
    title: 'Đăng Nhập Hệ Thống',
    role: 'Tất cả nhân viên',
    route: '/login',
    desc: 'Mỗi nhân viên sẽ được cấp tài khoản riêng. Sau khi đăng nhập, hệ thống tự động chuyển đến trang phù hợp với vai trò.',
    steps: [
      { title: 'Truy cập trang đăng nhập', detail: 'Mở trình duyệt, vào địa chỉ /login. Nhập Email và Mật khẩu được cấp.' },
      { title: 'Hệ thống tự điều hướng', detail: 'Admin → /admin · Quản lý → /manager · Booking → /booking-staff · Lễ tân → /reception · Phục vụ → /waiter · Bếp → /kitchen · Bar → /bar · Thu ngân → /cashier' },
      { title: 'Đăng xuất', detail: 'Nhấn avatar hoặc nút menu góc trên phải → chọn "Đăng xuất" để thoát hệ thống.' },
    ],
  },
  {
    id: 'booking-public',
    icon: '📱',
    title: 'Đặt Bàn Online (Khách)',
    role: 'Khách hàng',
    route: '/booking',
    desc: 'Khách truy cập trực tiếp để chọn ngày, giờ, xem sơ đồ bàn và đặt bàn tự phục vụ.',
    steps: [
      { title: 'Bước 1: Chọn ngày & giờ', detail: 'Chọn ngày đến và giờ mong muốn (17h–03h). Hệ thống hiển thị bàn trống theo thời gian thực.' },
      { title: 'Bước 2: Xem sơ đồ & chọn bàn', detail: 'Xem sơ đồ tổng quan → Lọc theo khu (Khu T, Khu A, Khu B, VIP) → Nhấn vào bàn muốn đặt. Bàn xanh = trống, đỏ = đã đặt, vàng = VIP.' },
      { title: 'Bước 3: Điền thông tin', detail: 'Nhập họ tên, số điện thoại, số khách. Thêm ghi chú nếu cần (sinh nhật, yêu cầu đặc biệt...).' },
      { title: 'Bước 4: Xác nhận', detail: 'Nhấn "Đặt Bàn" → Nhận mã đặt bàn → Nhân viên sẽ gọi xác nhận trong ít phút.' },
    ],
  },
  {
    id: 'order-qr',
    icon: '📲',
    title: 'Gọi Món Qua QR (Khách)',
    role: 'Khách hàng tại bàn',
    route: '/order',
    desc: 'Khách quét mã QR trên bàn để tự gọi món, gọi phục vụ, yêu cầu thanh toán.',
    steps: [
      { title: 'Quét QR trên bàn', detail: 'Dùng camera điện thoại quét mã QR dán trên bàn. Trang gọi món mở tự động, hiển thị đúng bàn.' },
      { title: 'Chọn món & thêm vào giỏ', detail: 'Duyệt menu theo danh mục, tìm kiếm món, nhấn "+" để thêm. Điều chỉnh số lượng, thêm ghi chú cho món.' },
      { title: 'Gửi đơn hàng', detail: 'Nhấn "Gửi đơn" → Đơn hàng chuyển thẳng đến Bếp/Bar. Theo dõi trạng thái đơn trên màn hình.' },
      { title: 'Nút hỗ trợ nhanh', detail: '🔔 Gọi phục vụ · 🧊 Thêm đá · 💳 Yêu cầu thanh toán — Nhấn nút, nhân viên nhận thông báo ngay.' },
    ],
  },
  {
    id: 'booking-staff',
    icon: '📋',
    title: 'Quản Lý Đặt Bàn (Staff)',
    role: 'BOOKING',
    route: '/booking-staff',
    desc: 'Dashboard dành cho nhân viên booking: xem, tạo, xác nhận, hủy, thống kê đặt bàn.',
    steps: [
      { title: 'Tổng quan KPI', detail: 'Xem nhanh: tổng đặt bàn, đã xác nhận, đã đến, đã hủy, không đến, doanh thu dự kiến.' },
      { title: 'Lọc theo trạng thái', detail: 'Tabs: Tất cả · Chờ xác nhận · Đã xác nhận · Đã đến · Đã hủy · Không đến · Hoàn tất.' },
      { title: 'Tạo đặt bàn mới', detail: 'Nhấn "Tạo đặt bàn" → Nhập tên, SĐT khách → Chọn bàn, ngày giờ, số khách → Lưu.' },
      { title: 'Xử lý đặt bàn', detail: 'Nhấn nút trạng thái: Xác nhận ✓ · Hủy ✗ · Đánh dấu "Đã đến" · Đánh dấu "Không đến".' },
    ],
  },
  {
    id: 'reception',
    icon: '🎪',
    title: 'Lễ Tân – Check-in',
    role: 'RECEPTION',
    route: '/reception',
    desc: 'Quầy lễ tân: xem booking hôm nay, check-in khách đến, xử lý nhanh.',
    steps: [
      { title: 'Danh sách booking hôm nay', detail: 'Tự động hiển thị booking ngày hiện tại. Tìm kiếm theo tên hoặc SĐT khách.' },
      { title: 'Check-in khách', detail: 'Khi khách đến, nhấn "Check-in" → Trạng thái chuyển sang "Đã đến". Bàn tự động đổi trạng thái.' },
      { title: 'Đánh dấu không đến', detail: 'Quá giờ hẹn, nhấn "No-show" → Giải phóng bàn cho khách khác.' },
      { title: 'Auto-refresh', detail: 'Danh sách tự làm mới mỗi 30 giây. Đồng hồ thời gian thực hiển thị góc trên.' },
    ],
  },
  {
    id: 'waiter',
    icon: '🍸',
    title: 'Phục Vụ – Quản Lý Bàn',
    role: 'WAITER',
    route: '/waiter',
    desc: 'Xem trạng thái bàn, nhận yêu cầu phục vụ, tạo order, đánh dấu món đã phục vụ.',
    steps: [
      { title: 'Sơ đồ bàn trực tiếp', detail: 'Xem tất cả bàn dạng lưới. Màu sắc cho biết: xanh = trống, đỏ/cam = có khách, nhấp nháy = cần chú ý.' },
      { title: 'Nhận yêu cầu phục vụ', detail: 'Khi khách bấm nút hỗ trợ (QR), thông báo hiện ngay. Nhấn bàn → xem yêu cầu cụ thể.' },
      { title: 'Tạo order cho bàn', detail: 'Chọn bàn → "Tạo order" → Duyệt menu, thêm món → "Gửi đơn" → Đơn vào Bếp/Bar.' },
      { title: 'Đánh dấu đã phục vụ', detail: 'Khi Bếp/Bar báo "Sẵn sàng", nhận món và nhấn "Đã phục vụ" để cập nhật trạng thái.' },
    ],
  },
  {
    id: 'kitchen',
    icon: '👨‍🍳',
    title: 'Bếp – Màn Hình Bếp (KDS)',
    role: 'KITCHEN',
    route: '/kitchen',
    desc: 'Hệ thống hiển thị đơn hàng dạng Kanban cho bếp. Chỉ hiện món thuộc bộ phận Bếp.',
    steps: [
      { title: '3 cột Kanban', detail: '📥 Chờ xử lý → 🔥 Đang làm → ✅ Sẵn sàng. Kéo thả hoặc nhấn nút chuyển trạng thái.' },
      { title: 'Nhận đơn mới', detail: 'Đơn hàng mới tự động xuất hiện ở cột "Chờ xử lý". Có âm thanh + hiệu ứng thông báo.' },
      { title: 'Xử lý đơn', detail: 'Nhấn "Bắt đầu làm" → Món chuyển sang "Đang làm". Xong → nhấn "Sẵn sàng" để thông báo phục vụ.' },
      { title: 'Ưu tiên đơn cũ', detail: 'Đơn chờ lâu tự động đổi màu (vàng → đỏ) để nhắc bếp ưu tiên xử lý.' },
    ],
  },
  {
    id: 'bar',
    icon: '🍹',
    title: 'Bar – Màn Hình Bar',
    role: 'BAR',
    route: '/bar',
    desc: 'Tương tự màn hình Bếp nhưng chỉ hiển thị các món thuộc bộ phận Bar (cocktail, bia, nước...).',
    steps: [
      { title: 'Giao diện giống Bếp', detail: '3 cột Kanban: Chờ → Đang pha → Sẵn sàng. Chỉ hiện đồ uống và món bar.' },
      { title: 'Nhận & xử lý đơn', detail: 'Nhấn "Bắt đầu pha" → "Sẵn sàng" khi xong. Phục vụ nhận thông báo để mang ra bàn.' },
      { title: 'Auto-refresh', detail: 'Tự cập nhật liên tục, không cần refresh tay.' },
    ],
  },
  {
    id: 'cashier',
    icon: '💰',
    title: 'Thu Ngân – Thanh Toán',
    role: 'CASHIER',
    route: '/cashier',
    desc: 'Xem bill từng bàn, áp dụng giảm giá, xử lý thanh toán, in hóa đơn.',
    steps: [
      { title: 'Danh sách bàn có bill', detail: 'Hiển thị tất cả bàn đang có order. Nhấn bàn để xem chi tiết bill.' },
      { title: 'Xem chi tiết bill', detail: 'Danh sách tất cả món đã order, số lượng, giá, tạm tính, tổng cộng.' },
      { title: 'Áp dụng giảm giá', detail: 'Chọn giảm giá: theo % hoặc số tiền cố định. Tổng bill tự động cập nhật.' },
      { title: 'Thanh toán', detail: 'Chọn hình thức: Tiền mặt · Thẻ · Chuyển khoản · MoMo → Nhấn "Thanh toán" → Bill chuyển sang PAID.' },
      { title: 'In hóa đơn', detail: 'Nhấn "In hóa đơn" → Cửa sổ in mở ra, chọn máy in và in.' },
    ],
  },
  {
    id: 'manager',
    icon: '📊',
    title: 'Quản Lý – Dashboard Vận Hành',
    role: 'MANAGER / ADMIN',
    route: '/manager/order-dashboard',
    desc: 'Giám sát toàn bộ hoạt động real-time: bàn, bếp, bar, doanh thu, yêu cầu phục vụ.',
    steps: [
      { title: '8 thẻ KPI', detail: 'Bàn đang phục vụ · Bếp chờ · Bar chờ · Đang chuẩn bị · Sẵn sàng · Chờ thanh toán · Doanh thu dự kiến · Doanh thu thực thu.' },
      { title: 'Món bán chạy', detail: 'Xếp hạng top món theo doanh thu và số lượng bán. Cập nhật real-time.' },
      { title: 'Đơn hàng gần đây', detail: 'Xem mã đơn, trạng thái, bàn, danh sách món, số tiền, nguồn, thời gian.' },
      { title: 'Yêu cầu phục vụ', detail: 'Danh sách yêu cầu chưa xử lý (gọi phục vụ, thanh toán, thêm đá...). Nhấn "Xử lý xong" khi hoàn tất.' },
    ],
  },
  {
    id: 'admin-booking',
    icon: '📅',
    title: 'Admin – Đặt Bàn',
    role: 'ADMIN / MANAGER',
    route: '/admin/bookings',
    desc: 'Quản lý toàn bộ đặt bàn: tạo, sửa, lọc, xuất CSV, xem lịch, thao tác hàng loạt.',
    steps: [
      { title: 'Danh sách + Lịch', detail: 'Chuyển giữa 2 chế độ: Danh sách (bảng) hoặc Lịch (theo tuần). Lọc theo ngày, trạng thái, tìm kiếm.' },
      { title: 'Tạo đặt bàn', detail: 'Nhấn "Tạo đặt bàn" → Điền thông tin khách, chọn bàn, chọn nguồn (Staff/Phone/Facebook/Zalo/Walk-in).' },
      { title: 'Thao tác hàng loạt', detail: 'Tích chọn nhiều booking → "Xác nhận tất cả" hoặc "Hủy tất cả" một lượt.' },
      { title: 'Chi tiết & in', detail: 'Nhấn booking → Xem mã, khách, bàn, lịch sử trạng thái, ghi chú nội bộ. Có thể in phiếu.' },
      { title: 'Xuất dữ liệu', detail: 'Nhấn "Xuất CSV" → Tải file Excel với toàn bộ booking theo bộ lọc hiện tại.' },
    ],
  },
  {
    id: 'admin-customers',
    icon: '👥',
    title: 'Admin – Khách Hàng (CRM)',
    role: 'ADMIN / MANAGER',
    route: '/admin/customers',
    desc: 'Cơ sở dữ liệu khách hàng: xem lịch sử, phân loại VIP, gộp trùng, blacklist.',
    steps: [
      { title: 'Danh sách khách', detail: 'Xem: tên, SĐT, số lần booking, lần cuối, tổng doanh thu, loại khách, ghi chú.' },
      { title: 'Phân loại khách', detail: '4 loại: Mới · Quay lại · VIP · Blacklist. Lọc nhanh bằng tabs.' },
      { title: 'Gộp khách trùng', detail: 'Chọn 2 khách → "Gộp" → Chuyển toàn bộ booking sang 1 profile chính. Dùng khi khách đặt nhiều SĐT.' },
      { title: 'Chi tiết khách', detail: 'Nhấn tên khách → Trang chi tiết: lịch sử booking, tổng chi tiêu, ghi chú nội bộ.' },
    ],
  },
  {
    id: 'admin-tables',
    icon: '🪑',
    title: 'Admin – Bàn & Sơ Đồ',
    role: 'ADMIN / MANAGER',
    route: '/admin/tables',
    desc: 'Quản lý bàn: thêm/sửa/xóa bàn, cấu hình sức chứa, deposit, QR code, sơ đồ.',
    steps: [
      { title: 'Danh sách bàn', detail: 'Xem mã bàn, tên, khu vực, sức chứa (min-max), deposit, min spend, trạng thái.' },
      { title: 'Thêm / Sửa bàn', detail: 'Nhấn "+ Thêm bàn" hoặc nút sửa → Nhập mã, tên, chọn khu vực, cấu hình sức chứa, giá deposit, min spend.' },
      { title: 'QR Code', detail: 'Mỗi bàn có QR riêng cho khách gọi món. Nhấn "QR" → Xem, tải, in, hoặc in tất cả QR cùng lúc.' },
      { title: 'Sơ đồ trực quan', detail: 'Chuyển sang "Sơ đồ" → Xem bàn theo vị trí thực tế, màu sắc theo trạng thái.' },
    ],
  },
  {
    id: 'admin-menu',
    icon: '🍽️',
    title: 'Admin – Thực Đơn',
    role: 'ADMIN / MANAGER',
    route: '/admin/menu',
    desc: 'Quản lý menu: thêm/sửa/xóa món, danh mục, giá, bộ phận phụ trách, on/off nhanh.',
    steps: [
      { title: 'Danh sách món', detail: 'Xem: tên món, danh mục, giá, bộ phận (Bếp/Bar), trạng thái có bán, nổi bật.' },
      { title: 'Thêm / Sửa món', detail: 'Nhấn "+ Thêm" → Nhập tên, mô tả, giá, chọn danh mục, bộ phận, thời gian chuẩn bị, ảnh.' },
      { title: 'Bật/Tắt nhanh', detail: 'Toggle "Có bán" để tạm ẩn món hết nguyên liệu. Toggle "Nổi bật" để đẩy món lên đầu menu khách.' },
      { title: 'Quản lý danh mục', detail: 'Tạo/sửa danh mục: Đồ uống, Đồ ăn, Cocktail, Bia, v.v. Gán bộ phận và thứ tự hiển thị.' },
    ],
  },
  {
    id: 'admin-events',
    icon: '🎤',
    title: 'Admin – Sự Kiện',
    role: 'ADMIN / MANAGER',
    route: '/admin/events',
    desc: 'Quản lý nội dung sự kiện hiển thị trên trang chủ: daily events, lịch DJ, upcoming.',
    steps: [
      { title: 'Sự kiện hàng ngày', detail: 'Tab "Hàng ngày" → Cấu hình chủ đề mỗi ngày (Thứ 2: Chill Night, Thứ 6: DJ Party...). Upload poster.' },
      { title: 'Lịch DJ / Dancer', detail: 'Tab "Lịch DJ" → Thêm lịch diễn: ngày, chương trình, nghệ sĩ, loại (DJ/Dancer/Ca sĩ).' },
      { title: 'Sự kiện sắp tới', detail: 'Tab "Sắp tới" → Thêm event một lần: tiêu đề, ngày giờ, mô tả, tag. Hiện trên trang chủ.' },
      { title: 'Bật/Tắt sự kiện', detail: 'Toggle active/inactive để hiện/ẩn sự kiện mà không cần xóa.' },
    ],
  },
  {
    id: 'admin-reports',
    icon: '📈',
    title: 'Admin – Báo Cáo',
    role: 'ADMIN / MANAGER',
    route: '/admin/reports',
    desc: 'Thống kê & phân tích: booking, doanh thu, tỷ lệ đến, hiệu suất nhân viên & bàn.',
    steps: [
      { title: 'Lọc thời gian', detail: 'Chọn khoảng: Hôm nay · 7 ngày · 30 ngày · 90 ngày hoặc tùy chỉnh.' },
      { title: '4 KPI chính', detail: 'Tổng booking · Doanh thu dự kiến · Tỷ lệ hoàn tất % · Tỷ lệ đến %.' },
      { title: 'Biểu đồ', detail: 'Booking theo trạng thái (bar chart) · Booking theo giờ (peak hours) — Giúp tối ưu lịch nhân sự.' },
      { title: 'Hiệu suất', detail: 'Bảng xếp hạng nhân viên: tổng booking, tỷ lệ đến, đóng góp %. Bảng xếp hạng bàn: lượt đặt, fill rate %.' },
    ],
  },
  {
    id: 'admin-users',
    icon: '👤',
    title: 'Admin – Nhân Viên',
    role: 'ADMIN',
    route: '/admin/users',
    desc: 'Quản lý tài khoản nhân viên: tạo, phân quyền, đặt lại mật khẩu, kích hoạt/khóa.',
    steps: [
      { title: 'Danh sách nhân viên', detail: 'Xem: tên, email, SĐT, vai trò, trạng thái, ngày tạo, thống kê booking.' },
      { title: 'Tạo tài khoản', detail: 'Nhấn "+ Thêm" → Nhập tên, email, SĐT, mật khẩu → Chọn vai trò: Booking / Lễ tân / Quản lý / Admin.' },
      { title: 'Đặt lại mật khẩu', detail: 'Nhấn "Reset MK" → Nhập mật khẩu mới → Nhân viên đăng nhập bằng MK mới.' },
      { title: 'Kích hoạt / Khóa', detail: 'Toggle trạng thái Active ↔ Inactive. Nhân viên bị khóa không đăng nhập được.' },
    ],
  },
  {
    id: 'admin-settings',
    icon: '⚙️',
    title: 'Admin – Cài Đặt',
    role: 'ADMIN',
    route: '/admin/settings',
    desc: 'Cấu hình hệ thống: thông tin quán, giờ hoạt động, cài đặt booking, thông báo.',
    steps: [
      { title: 'Thông tin quán', detail: 'Tên quán, SĐT, email, địa chỉ — Hiển thị trên trang chủ và các trang công khai.' },
      { title: 'Giờ hoạt động', detail: 'Giờ mở cửa, đóng cửa, thời gian giữ bàn (phút), số khách tối đa/bàn.' },
      { title: 'Cài đặt booking', detail: 'Số tiền deposit mặc định, bật/tắt tự động xác nhận booking.' },
      { title: 'Thông báo', detail: 'Bật/tắt thông báo qua Email, SMS cho booking mới.' },
    ],
  },
];

const ROLES = [
  { key: 'ADMIN', name: 'Admin', icon: '👑', desc: 'Toàn quyền quản trị hệ thống', color: '#E8C464' },
  { key: 'MANAGER', name: 'Quản lý', icon: '📊', desc: 'Giám sát vận hành & báo cáo', color: '#a78bfa' },
  { key: 'BOOKING', name: 'Booking', icon: '📋', desc: 'Quản lý đặt bàn', color: '#60a5fa' },
  { key: 'RECEPTION', name: 'Lễ tân', icon: '🎪', desc: 'Check-in khách đến', color: '#34d399' },
  { key: 'WAITER', name: 'Phục vụ', icon: '🍸', desc: 'Phục vụ bàn & gọi món', color: '#f472b6' },
  { key: 'KITCHEN', name: 'Bếp', icon: '👨‍🍳', desc: 'Nhận & chế biến món ăn', color: '#fb923c' },
  { key: 'BAR', name: 'Bar', icon: '🍹', desc: 'Pha chế đồ uống', color: '#38bdf8' },
  { key: 'CASHIER', name: 'Thu ngân', icon: '💰', desc: 'Thanh toán & in hóa đơn', color: '#4ade80' },
];

export default function GuidePage() {
  const [active, setActive] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const filtered = search.trim()
    ? SECTIONS.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.desc.toLowerCase().includes(search.toLowerCase()) ||
        s.role.toLowerCase().includes(search.toLowerCase())
      )
    : SECTIONS;

  return (
    <div className="gd" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.4s' }}>
      <style>{CSS}</style>

      {/* Hero */}
      <header className="gd-hero">
        <div className="gd-hero-glow" />
        <div className="gd-hero-content">
          <a href="/" className="gd-back">← Trang chủ</a>
          <div className="gd-brand">BÁO GARDEN</div>
          <div className="gd-brand-line"><span>✦</span></div>
          <h1 className="gd-title">Hướng Dẫn Sử Dụng Hệ Thống</h1>
          <p className="gd-subtitle">Tài liệu hướng dẫn toàn bộ chức năng cho nhân viên và khách hàng</p>
        </div>
      </header>

      {/* Role Overview */}
      <section className="gd-section">
        <h2 className="gd-sec-title">
          <span className="gd-sec-icon">🎭</span>
          Vai Trò Trong Hệ Thống
        </h2>
        <p className="gd-sec-desc">Mỗi nhân viên được cấp 1 tài khoản với vai trò phù hợp. Hệ thống tự hiển thị giao diện riêng cho từng vai trò.</p>
        <div className="gd-roles">
          {ROLES.map(r => (
            <div key={r.key} className="gd-role" style={{ borderColor: `${r.color}30`, background: `linear-gradient(135deg, ${r.color}08, ${r.color}03)` }}>
              <span className="gd-role-icon">{r.icon}</span>
              <span className="gd-role-name" style={{ color: r.color }}>{r.name}</span>
              <span className="gd-role-desc">{r.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Search */}
      <div className="gd-search-wrap">
        <input
          type="text"
          placeholder="🔍  Tìm kiếm chức năng..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="gd-search"
        />
      </div>

      {/* Quick Nav */}
      <nav className="gd-nav">
        {SECTIONS.map(s => (
          <a key={s.id} href={`#${s.id}`} className="gd-nav-item" onClick={() => setActive(s.id)}>
            <span className="gd-nav-icon">{s.icon}</span>
            <span className="gd-nav-text">{s.title.replace(/^(Admin – |Quản Lý – )/, '')}</span>
          </a>
        ))}
      </nav>

      {/* Sections */}
      <div className="gd-sections">
        {filtered.map((s, i) => (
          <section key={s.id} id={s.id} className="gd-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <button className="gd-card-head" onClick={() => setActive(active === s.id ? null : s.id)}>
              <div className="gd-card-left">
                <span className="gd-card-icon">{s.icon}</span>
                <div>
                  <h3 className="gd-card-title">{s.title}</h3>
                  <div className="gd-card-meta">
                    <span className="gd-card-role">{s.role}</span>
                    <span className="gd-card-route">{s.route}</span>
                  </div>
                </div>
              </div>
              <span className={`gd-card-arrow ${active === s.id ? 'gd-arrow-open' : ''}`}>▾</span>
            </button>
            <div className={`gd-card-body ${active === s.id ? 'gd-body-open' : ''}`}>
              <p className="gd-card-desc">{s.desc}</p>
              <div className="gd-steps">
                {s.steps.map((step, j) => (
                  <div key={j} className="gd-step">
                    <div className="gd-step-num">{j + 1}</div>
                    <div className="gd-step-content">
                      <h4 className="gd-step-title">{step.title}</h4>
                      <p className="gd-step-detail">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Flow Diagram */}
      <section className="gd-section">
        <h2 className="gd-sec-title">
          <span className="gd-sec-icon">🔄</span>
          Quy Trình Vận Hành
        </h2>
        <div className="gd-flow">
          <div className="gd-flow-step">
            <div className="gd-flow-num">1</div>
            <div className="gd-flow-label">Khách đặt bàn</div>
            <div className="gd-flow-sub">/booking hoặc Hotline</div>
          </div>
          <div className="gd-flow-arrow">→</div>
          <div className="gd-flow-step">
            <div className="gd-flow-num">2</div>
            <div className="gd-flow-label">Staff xác nhận</div>
            <div className="gd-flow-sub">Booking Staff</div>
          </div>
          <div className="gd-flow-arrow">→</div>
          <div className="gd-flow-step">
            <div className="gd-flow-num">3</div>
            <div className="gd-flow-label">Khách check-in</div>
            <div className="gd-flow-sub">Lễ tân</div>
          </div>
          <div className="gd-flow-arrow">→</div>
          <div className="gd-flow-step">
            <div className="gd-flow-num">4</div>
            <div className="gd-flow-label">Gọi món (QR)</div>
            <div className="gd-flow-sub">Khách / Phục vụ</div>
          </div>
          <div className="gd-flow-arrow">→</div>
          <div className="gd-flow-step">
            <div className="gd-flow-num">5</div>
            <div className="gd-flow-label">Bếp / Bar làm</div>
            <div className="gd-flow-sub">KDS</div>
          </div>
          <div className="gd-flow-arrow">→</div>
          <div className="gd-flow-step">
            <div className="gd-flow-num">6</div>
            <div className="gd-flow-label">Thanh toán</div>
            <div className="gd-flow-sub">Thu ngân</div>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className="gd-section">
        <h2 className="gd-sec-title">
          <span className="gd-sec-icon">💡</span>
          Mẹo Sử Dụng
        </h2>
        <div className="gd-tips">
          <div className="gd-tip">
            <span className="gd-tip-icon">📱</span>
            <div>
              <strong>Tối ưu cho điện thoại</strong>
              <p>Tất cả giao diện đều responsive. Nhân viên có thể dùng điện thoại cá nhân để vận hành.</p>
            </div>
          </div>
          <div className="gd-tip">
            <span className="gd-tip-icon">🔄</span>
            <div>
              <strong>Tự động làm mới</strong>
              <p>Các trang Bếp, Bar, Lễ tân, Quản lý tự cập nhật dữ liệu mỗi 10-30 giây. Không cần F5.</p>
            </div>
          </div>
          <div className="gd-tip">
            <span className="gd-tip-icon">🔔</span>
            <div>
              <strong>Thông báo âm thanh</strong>
              <p>Trang Bếp và Bar có chuông báo khi có đơn mới. Đảm bảo bật loa thiết bị.</p>
            </div>
          </div>
          <div className="gd-tip">
            <span className="gd-tip-icon">🖨️</span>
            <div>
              <strong>In QR & hóa đơn</strong>
              <p>Dùng chức năng in trong Admin → Bàn để in QR dán bàn. Thu ngân in hóa đơn trực tiếp.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="gd-footer">
        <div className="gd-footer-brand">BÁO GARDEN</div>
        <p>Hệ thống quản lý vận hành nhà hàng & bar</p>
        <a href="tel:0877766663" className="gd-footer-phone">📞 Hotline: 08 777 6666 3</a>
        <p className="gd-footer-addr">118-120 Tân Sơn Nhì, Tân Phú, TP.HCM</p>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════ CSS ═══════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;500;600;700;800&display=swap');

/* reset */
.gd *{margin:0;padding:0;box-sizing:border-box}

.gd{
  min-height:100dvh;max-width:800px;margin:0 auto;
  background:linear-gradient(180deg,#04060a 0%,#0a0e1a 30%,#0d1225 60%,#08091a 100%);
  font-family:'Inter',-apple-system,sans-serif;
  color:#e2ddd5;position:relative;
}

/* hero */
.gd-hero{
  position:relative;padding:40px 24px 32px;text-align:center;overflow:hidden;
}
.gd-hero::after{
  content:'';position:absolute;bottom:0;left:10%;right:10%;height:1px;
  background:linear-gradient(90deg,transparent,rgba(212,168,74,0.2),transparent);
}
.gd-hero-glow{
  position:absolute;top:-100px;left:50%;transform:translateX(-50%);
  width:500px;height:300px;
  background:radial-gradient(ellipse,rgba(212,168,74,0.08) 0%,rgba(120,80,220,0.03) 40%,transparent 70%);
  pointer-events:none;animation:gd-breathe 5s ease-in-out infinite alternate;
}
@keyframes gd-breathe{0%{opacity:0.7;transform:translateX(-50%) scale(1)}100%{opacity:1;transform:translateX(-50%) scale(1.1)}}
.gd-hero-content{position:relative;z-index:1}
.gd-back{
  display:inline-block;margin-bottom:16px;font-size:13px;color:rgba(212,168,74,0.5);
  text-decoration:none;font-weight:600;transition:color 0.2s;
}
.gd-back:hover{color:#D4A84A}
.gd-brand{
  font-family:'Playfair Display',serif;font-size:26px;font-weight:800;letter-spacing:0.2em;
  background:linear-gradient(135deg,#FFF1C9,#E8C464,#D4A84A,#B8892E,#D4A84A);
  background-size:200% auto;-webkit-background-clip:text;background-clip:text;
  -webkit-text-fill-color:transparent;animation:gd-shimmer 4s linear infinite;
}
@keyframes gd-shimmer{0%{background-position:0% center}100%{background-position:200% center}}
.gd-brand-line{
  width:60px;margin:10px auto;height:1px;position:relative;
  background:linear-gradient(90deg,transparent,#D4A84A,transparent);
}
.gd-brand-line span{position:absolute;top:-5px;left:50%;transform:translateX(-50%);font-size:7px;color:rgba(212,168,74,0.4)}
.gd-title{
  font-family:'Playfair Display',serif;font-size:22px;font-weight:700;
  color:#e2ddd5;margin-top:12px;letter-spacing:0.02em;
}
.gd-subtitle{font-size:13px;color:rgba(226,221,213,0.4);margin-top:8px;line-height:1.6}

/* section */
.gd-section{padding:24px 20px}
.gd-sec-title{
  font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:#E8C464;
  display:flex;align-items:center;gap:10px;margin-bottom:8px;
}
.gd-sec-icon{font-size:20px}
.gd-sec-desc{font-size:13px;color:rgba(226,221,213,0.4);margin-bottom:16px;line-height:1.6}

/* roles */
.gd-roles{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.gd-role{
  padding:14px;border-radius:14px;border:1.5px solid;
  display:flex;flex-direction:column;gap:4px;transition:all 0.2s;
}
.gd-role:hover{transform:translateY(-2px)}
.gd-role-icon{font-size:22px}
.gd-role-name{font-size:13px;font-weight:800;letter-spacing:0.03em}
.gd-role-desc{font-size:10px;color:rgba(226,221,213,0.4);font-weight:500}

/* search */
.gd-search-wrap{padding:8px 20px 16px}
.gd-search{
  width:100%;padding:14px 18px;border-radius:14px;font-size:14px;font-weight:500;
  background:rgba(212,168,74,0.04);border:1.5px solid rgba(212,168,74,0.1);
  color:#e2ddd5;outline:none;font-family:'Inter',sans-serif;transition:all 0.25s;
}
.gd-search:focus{border-color:rgba(212,168,74,0.35);box-shadow:0 0 0 3px rgba(212,168,74,0.05)}
.gd-search::placeholder{color:rgba(226,221,213,0.25)}

/* nav */
.gd-nav{
  display:flex;gap:8px;padding:0 20px 20px;overflow-x:auto;
  scrollbar-width:none;-ms-overflow-style:none;
}
.gd-nav::-webkit-scrollbar{display:none}
.gd-nav-item{
  flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:4px;
  padding:10px 14px;border-radius:12px;text-decoration:none;
  background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);
  transition:all 0.2s;min-width:72px;
}
.gd-nav-item:hover{border-color:rgba(212,168,74,0.2);background:rgba(212,168,74,0.04)}
.gd-nav-icon{font-size:20px}
.gd-nav-text{font-size:8px;font-weight:700;color:rgba(226,221,213,0.35);text-align:center;letter-spacing:0.02em}

/* cards */
.gd-sections{padding:0 20px 16px;display:flex;flex-direction:column;gap:10px}
.gd-card{
  border-radius:16px;overflow:hidden;
  border:1.5px solid rgba(255,255,255,0.05);
  background:linear-gradient(160deg,rgba(17,26,44,0.5),rgba(12,18,32,0.6));
  transition:all 0.25s;animation:gd-fade-in 0.5s ease both;
}
@keyframes gd-fade-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.gd-card:hover{border-color:rgba(212,168,74,0.12)}
.gd-card-head{
  display:flex;justify-content:space-between;align-items:center;
  width:100%;padding:18px 18px;cursor:pointer;
  background:none;border:none;color:inherit;font-family:inherit;text-align:left;
}
.gd-card-left{display:flex;align-items:center;gap:14px}
.gd-card-icon{font-size:28px;flex-shrink:0}
.gd-card-title{font-size:14px;font-weight:700;color:#e2ddd5;margin-bottom:4px}
.gd-card-meta{display:flex;gap:8px;align-items:center}
.gd-card-role{
  font-size:9px;font-weight:700;letter-spacing:0.05em;
  padding:3px 8px;border-radius:6px;
  background:rgba(212,168,74,0.1);color:#D4A84A;
}
.gd-card-route{font-size:10px;color:rgba(226,221,213,0.25);font-weight:500;font-family:monospace}
.gd-card-arrow{
  font-size:16px;color:rgba(212,168,74,0.4);transition:transform 0.3s;flex-shrink:0;
}
.gd-arrow-open{transform:rotate(180deg);color:#D4A84A}

.gd-card-body{
  max-height:0;overflow:hidden;transition:max-height 0.4s ease,padding 0.3s ease;padding:0 18px;
}
.gd-body-open{max-height:1200px;padding:0 18px 20px}
.gd-card-desc{
  font-size:13px;color:rgba(226,221,213,0.45);line-height:1.7;margin-bottom:16px;
  padding-bottom:14px;border-bottom:1px solid rgba(212,168,74,0.06);
}

/* steps */
.gd-steps{display:flex;flex-direction:column;gap:12px}
.gd-step{display:flex;gap:14px;align-items:flex-start}
.gd-step-num{
  width:28px;height:28px;border-radius:50%;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:800;
  background:linear-gradient(135deg,rgba(212,168,74,0.15),rgba(212,168,74,0.05));
  border:1.5px solid rgba(212,168,74,0.2);color:#D4A84A;
}
.gd-step-content{flex:1;padding-top:2px}
.gd-step-title{font-size:13px;font-weight:700;color:#e2ddd5;margin-bottom:4px}
.gd-step-detail{font-size:12px;color:rgba(226,221,213,0.4);line-height:1.7}

/* flow */
.gd-flow{
  display:flex;align-items:center;gap:6px;overflow-x:auto;padding:8px 0;
  scrollbar-width:none;-ms-overflow-style:none;
}
.gd-flow::-webkit-scrollbar{display:none}
.gd-flow-step{
  flex-shrink:0;text-align:center;padding:14px 10px;border-radius:12px;min-width:90px;
  background:linear-gradient(160deg,rgba(212,168,74,0.08),rgba(212,168,74,0.02));
  border:1px solid rgba(212,168,74,0.12);
}
.gd-flow-num{
  width:24px;height:24px;border-radius:50%;margin:0 auto 6px;
  display:flex;align-items:center;justify-content:center;
  font-size:10px;font-weight:800;
  background:linear-gradient(135deg,#E8C464,#D4A84A);color:#04060a;
}
.gd-flow-label{font-size:11px;font-weight:700;color:#e2ddd5;margin-bottom:2px}
.gd-flow-sub{font-size:9px;color:rgba(212,168,74,0.4);font-weight:600}
.gd-flow-arrow{color:rgba(212,168,74,0.3);font-size:14px;font-weight:700;flex-shrink:0}

/* tips */
.gd-tips{display:flex;flex-direction:column;gap:10px}
.gd-tip{
  display:flex;gap:14px;align-items:flex-start;padding:16px;border-radius:14px;
  background:rgba(212,168,74,0.03);border:1px solid rgba(212,168,74,0.08);
}
.gd-tip-icon{font-size:24px;flex-shrink:0}
.gd-tip strong{font-size:13px;color:#E8C464;display:block;margin-bottom:4px}
.gd-tip p{font-size:12px;color:rgba(226,221,213,0.4);line-height:1.6;margin:0}

/* footer */
.gd-footer{
  text-align:center;padding:32px 20px 48px;
  border-top:1px solid rgba(212,168,74,0.06);margin-top:16px;
}
.gd-footer-brand{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:#D4A84A;margin-bottom:8px}
.gd-footer p{font-size:12px;color:rgba(226,221,213,0.3);margin-bottom:8px}
.gd-footer-phone{display:block;color:#D4A84A;font-size:14px;font-weight:700;text-decoration:none;margin-bottom:6px}
.gd-footer-phone:hover{color:#E8C464}
.gd-footer-addr{font-size:11px;color:rgba(226,221,213,0.2)}

/* responsive */
@media(max-width:480px){
  .gd-title{font-size:18px}
  .gd-roles{grid-template-columns:repeat(2,1fr)}
  .gd-flow{flex-wrap:wrap;justify-content:center}
  .gd-flow-arrow{display:none}
}
`;
