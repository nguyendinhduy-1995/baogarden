# Báo Garden — CRM & Order Management System

Hệ thống quản lý đặt bàn và order theo bàn cho nhà hàng/bar Báo Garden.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (cookie-based)
- **UI**: React, inline CSS (dark luxury theme)

## Cài đặt

```bash
# 1. Clone repo
git clone https://github.com/nguyendinhduy-1995/baogarden.git
cd baogarden

# 2. Cài dependencies
npm install

# 3. Cấu hình database
cp .env.example .env
# Sửa DATABASE_URL trong .env

# 4. Chạy migration + seed
npx prisma migrate dev
npx prisma db seed

# 5. Chạy dev server
npm run dev
```

Mở http://localhost:3000

## Tài khoản test

| Email | Role | Password |
|---|---|---|
| admin@baogarden.vn | ADMIN | 123456 |
| manager@baogarden.vn | MANAGER | 123456 |
| waiter@baogarden.vn | WAITER | 123456 |
| kitchen@baogarden.vn | KITCHEN | 123456 |
| bar@baogarden.vn | BAR | 123456 |
| cashier@baogarden.vn | CASHIER | 123456 |
| staff@baogarden.vn | STAFF | 123456 |

## Các trang

### Công khai
| Route | Mô tả |
|---|---|
| `/` | Landing page |
| `/booking` | Đặt bàn online |
| `/order?table=A01&token=xxx` | Khách quét QR order món |

### Admin (ADMIN/MANAGER)
| Route | Mô tả |
|---|---|
| `/admin` | Dashboard tổng quan |
| `/admin/bookings` | Quản lý đặt bàn |
| `/admin/tables` | Quản lý bàn + QR code |
| `/admin/customers` | Quản lý khách hàng |
| `/admin/users` | Quản lý nhân viên |
| `/admin/menu` | Quản lý thực đơn |
| `/admin/settings` | Cài đặt hệ thống |

### Vận hành
| Route | Role | Mô tả |
|---|---|---|
| `/kitchen` | KITCHEN | Màn hình Bếp (Kanban) |
| `/bar` | BAR | Màn hình Bar (Kanban) |
| `/waiter` | WAITER | Giao diện phục vụ |
| `/cashier` | CASHIER | Giao diện thu ngân |
| `/reception` | STAFF | Tiếp tân |
| `/manager/order-dashboard` | MANAGER | Dashboard order |

## Luồng Order

```
Khách quét QR trên bàn
       ↓
Mở menu, chọn món, gửi order
       ↓
Hệ thống tự phân loại:
  Món ăn → Bếp (/kitchen)
  Thức uống → Bar (/bar)
       ↓
Bếp/Bar: Nhận → Đang làm → Hoàn thành
       ↓
Phục vụ (/waiter): Đánh dấu "Đã phục vụ"
       ↓
Khách/NV bấm "Gọi thanh toán"
       ↓
Thu ngân (/cashier): Xác nhận thanh toán → PAID
```

## API Endpoints

### Public (không cần auth)
- `GET /api/public/menu?tableCode=X&token=Y` — Menu theo QR
- `POST /api/public/orders` — Khách order món
- `POST /api/public/service-request` — Gọi phục vụ/thanh toán

### Menu (ADMIN/MANAGER)
- `GET/POST /api/menu/categories`
- `PATCH/DELETE /api/menu/categories/[id]`
- `GET/POST /api/menu/items`
- `GET/PATCH/DELETE /api/menu/items/[id]`

### Kitchen (KITCHEN/MANAGER/ADMIN)
- `GET /api/kitchen/orders` — Danh sách món cần làm
- `PATCH /api/kitchen/order-items/[id]` — Cập nhật trạng thái

### Bar (BAR/MANAGER/ADMIN)
- `GET /api/bar/orders`
- `PATCH /api/bar/order-items/[id]`

### Waiter (WAITER/MANAGER/ADMIN)
- `GET /api/waiter/tables` — Danh sách bàn
- `GET /api/waiter/tables/[id]/session` — Chi tiết phiên bàn
- `POST /api/waiter/orders` — Order thay khách
- `PATCH /api/waiter/order-items/[id]/served` — Đánh dấu đã phục vụ
- `POST /api/waiter/tables/[id]/request-payment` — Yêu cầu thanh toán

### Cashier (CASHIER/MANAGER/ADMIN)
- `GET /api/cashier/bills` — Danh sách bill đang mở
- `GET /api/cashier/bills/[id]` — Chi tiết bill
- `POST /api/cashier/bills/[id]/pay` — Thanh toán

### Manager (MANAGER/ADMIN)
- `GET /api/manager/order-dashboard` — Thống kê
- `GET /api/manager/orders` — Tất cả đơn hàng
- `PATCH /api/manager/orders/[id]/cancel` — Hủy đơn
- `PATCH /api/manager/order-items/[id]/cancel` — Hủy món
- `POST /api/manager/tables/transfer` — Chuyển bàn
- `POST /api/manager/tables/merge` — Gộp bàn
- `POST /api/manager/bills/[id]/discount` — Áp discount

### Service Requests
- `GET /api/service-requests` — Yêu cầu đang chờ
- `PATCH /api/service-requests/[id]` — Xử lý yêu cầu

### Tables
- `GET /api/tables/[id]/qr` — Lấy QR data
- `POST /api/tables/[id]/regenerate-qr` — Tạo lại QR token

## Database Models

| Model | Mô tả |
|---|---|
| User | Nhân viên (multi-role) |
| Customer | Khách hàng |
| Booking | Đặt bàn |
| RestaurantTable | Bàn (với qrToken) |
| TableArea | Khu vực bàn |
| MenuCategory | Danh mục món |
| MenuItem | Món ăn/thức uống |
| TableSession | Phiên bàn (gom nhiều order) |
| Order | Đơn hàng (BG-YYYYMMDD-NNNN) |
| OrderItem | Chi tiết món (snapshot giá) |
| Payment | Thanh toán |
| OrderEvent | Audit trail |
| ServiceRequest | Yêu cầu phục vụ |

## Seed Data

- 4 khu vực, 30 bàn
- 8 danh mục, 31 món
- 7 tài khoản nhân viên

## Deploy

```bash
npm run build
npm start
```

Yêu cầu: PostgreSQL database, Node.js 18+
