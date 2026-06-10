import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEYS = {
  bookings: 'bao_garden_bookings',
  customers: 'bao_garden_customers',
  tableStatuses: 'bao_garden_table_statuses',
};

// Helper to safely access localStorage (SSR-safe)
function getStorage(key) {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function setStorage(key, data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

// ─── Customers ────────────────────────────────────────────────────────
export function getCustomers() {
  return getStorage(STORAGE_KEYS.customers) || [];
}

export function getCustomerById(id) {
  const customers = getCustomers();
  return customers.find(c => c.id === id) || null;
}

export function getCustomerByPhone(phone) {
  const customers = getCustomers();
  return customers.find(c => c.phone === phone) || null;
}

export function saveCustomer(customer) {
  const customers = getCustomers();
  const existingIdx = customers.findIndex(c => c.id === customer.id);
  if (existingIdx >= 0) {
    customers[existingIdx] = { ...customers[existingIdx], ...customer, updatedAt: new Date().toISOString() };
  } else {
    customers.push({
      id: uuidv4(),
      ...customer,
      totalVisits: 0,
      totalSpent: 0,
      tags: [],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  setStorage(STORAGE_KEYS.customers, customers);
  return customers;
}

export function deleteCustomer(id) {
  const customers = getCustomers().filter(c => c.id !== id);
  setStorage(STORAGE_KEYS.customers, customers);
  return customers;
}

// ─── Bookings ─────────────────────────────────────────────────────────
export function getBookings() {
  return getStorage(STORAGE_KEYS.bookings) || [];
}

export function getBookingById(id) {
  const bookings = getBookings();
  return bookings.find(b => b.id === id) || null;
}

export function getBookingsByDate(date) {
  const bookings = getBookings();
  return bookings.filter(b => b.date === date);
}

export function getBookingsByTable(tableId, date) {
  const bookings = getBookings();
  return bookings.filter(b => b.tableId === tableId && b.date === date && !['cancelled', 'noShow'].includes(b.status));
}

export function saveBooking(booking) {
  const bookings = getBookings();
  const existingIdx = bookings.findIndex(b => b.id === booking.id);
  
  if (existingIdx >= 0) {
    bookings[existingIdx] = { ...bookings[existingIdx], ...booking, updatedAt: new Date().toISOString() };
  } else {
    const newBooking = {
      id: uuidv4(),
      ...booking,
      status: booking.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    bookings.push(newBooking);

    // Update customer visit count
    if (booking.customerId) {
      const customers = getCustomers();
      const custIdx = customers.findIndex(c => c.id === booking.customerId);
      if (custIdx >= 0) {
        customers[custIdx].totalVisits = (customers[custIdx].totalVisits || 0) + 1;
        customers[custIdx].updatedAt = new Date().toISOString();
        setStorage(STORAGE_KEYS.customers, customers);
      }
    }
  }
  
  setStorage(STORAGE_KEYS.bookings, bookings);
  return bookings;
}

export function updateBookingStatus(id, status) {
  const bookings = getBookings();
  const idx = bookings.findIndex(b => b.id === id);
  if (idx >= 0) {
    bookings[idx].status = status;
    bookings[idx].updatedAt = new Date().toISOString();
    setStorage(STORAGE_KEYS.bookings, bookings);
  }
  return bookings;
}

export function deleteBooking(id) {
  const bookings = getBookings().filter(b => b.id !== id);
  setStorage(STORAGE_KEYS.bookings, bookings);
  return bookings;
}

// ─── Table Statuses ───────────────────────────────────────────────────
export function getTableStatuses(date) {
  const allStatuses = getStorage(STORAGE_KEYS.tableStatuses) || {};
  return allStatuses[date] || {};
}

export function setTableStatus(tableId, date, status) {
  const allStatuses = getStorage(STORAGE_KEYS.tableStatuses) || {};
  if (!allStatuses[date]) allStatuses[date] = {};
  allStatuses[date][tableId] = status;
  setStorage(STORAGE_KEYS.tableStatuses, allStatuses);
}

// ─── Stats ────────────────────────────────────────────────────────────
export function getDashboardStats() {
  const bookings = getBookings();
  const customers = getCustomers();
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date === today);
  
  return {
    totalCustomers: customers.length,
    totalBookings: bookings.length,
    todayBookings: todayBookings.length,
    pendingBookings: todayBookings.filter(b => b.status === 'pending').length,
    confirmedBookings: todayBookings.filter(b => b.status === 'confirmed').length,
    checkedInBookings: todayBookings.filter(b => b.status === 'checkedIn').length,
    totalRevenue: bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.totalAmount || 0), 0),
    todayRevenue: todayBookings.filter(b => ['completed', 'checkedIn'].includes(b.status)).reduce((sum, b) => sum + (b.totalAmount || 0), 0),
  };
}

// ─── Seed Data ────────────────────────────────────────────────────────
export function seedSampleData() {
  if (getCustomers().length > 0) return; // Already seeded
  
  const customers = [
    { id: 'c1', name: 'Nguyễn Văn An', phone: '0901234567', email: 'an.nguyen@email.com', dob: '1990-05-15', gender: 'male', totalVisits: 12, totalSpent: 15000000, tags: ['VIP', 'Regular'], notes: 'Thích bàn gần sân khấu', createdAt: '2025-01-15T10:00:00Z', updatedAt: '2026-06-01T10:00:00Z' },
    { id: 'c2', name: 'Trần Thị Bình', phone: '0912345678', email: 'binh.tran@email.com', dob: '1995-08-20', gender: 'female', totalVisits: 8, totalSpent: 10000000, tags: ['VIP'], notes: 'Hay đặt phòng VIP cho nhóm bạn', createdAt: '2025-03-20T10:00:00Z', updatedAt: '2026-05-20T10:00:00Z' },
    { id: 'c3', name: 'Lê Hoàng Cường', phone: '0923456789', email: 'cuong.le@email.com', dob: '1988-12-01', gender: 'male', totalVisits: 5, totalSpent: 7500000, tags: ['Regular'], notes: '', createdAt: '2025-06-10T10:00:00Z', updatedAt: '2026-04-15T10:00:00Z' },
    { id: 'c4', name: 'Phạm Thị Dung', phone: '0934567890', email: 'dung.pham@email.com', dob: '1992-03-25', gender: 'female', totalVisits: 3, totalSpent: 4500000, tags: [], notes: 'Ưu tiên vị trí yên tĩnh', createdAt: '2025-09-05T10:00:00Z', updatedAt: '2026-06-05T10:00:00Z' },
    { id: 'c5', name: 'Hoàng Minh Đức', phone: '0945678901', email: 'duc.hoang@email.com', dob: '1985-07-10', gender: 'male', totalVisits: 20, totalSpent: 35000000, tags: ['VIP', 'VVIP', 'Regular'], notes: 'Khách hàng thân thiết, luôn đặt trước 2 ngày', createdAt: '2024-11-01T10:00:00Z', updatedAt: '2026-06-07T10:00:00Z' },
    { id: 'c6', name: 'Vũ Thị Hà', phone: '0956789012', email: 'ha.vu@email.com', dob: '1998-01-30', gender: 'female', totalVisits: 2, totalSpent: 1600000, tags: ['New'], notes: '', createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-06-02T10:00:00Z' },
    { id: 'c7', name: 'Đỗ Quốc Hưng', phone: '0967890123', email: 'hung.do@email.com', dob: '1993-11-18', gender: 'male', totalVisits: 7, totalSpent: 9800000, tags: ['Regular'], notes: 'Hay đặt bàn cho đối tác kinh doanh', createdAt: '2025-04-12T10:00:00Z', updatedAt: '2026-05-28T10:00:00Z' },
    { id: 'c8', name: 'Ngô Thanh Lan', phone: '0978901234', email: 'lan.ngo@email.com', dob: '1996-09-08', gender: 'female', totalVisits: 15, totalSpent: 22000000, tags: ['VIP', 'Regular'], notes: 'Khách quen, thường đi vào cuối tuần', createdAt: '2025-02-28T10:00:00Z', updatedAt: '2026-06-06T10:00:00Z' },
  ];
  
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  const bookings = [
    { id: 'b1', customerId: 'c1', customerName: 'Nguyễn Văn An', customerPhone: '0901234567', tableId: 'A10', date: today, time: '20:00', guests: 4, status: 'confirmed', deposit: 500000, totalAmount: 2500000, notes: 'Sinh nhật bạn', createdAt: '2026-06-07T08:00:00Z', updatedAt: '2026-06-07T09:00:00Z' },
    { id: 'b2', customerId: 'c2', customerName: 'Trần Thị Bình', customerPhone: '0912345678', tableId: 'V1-1', date: today, time: '21:00', guests: 10, status: 'confirmed', deposit: 1000000, totalAmount: 5000000, notes: 'Tiệc công ty', createdAt: '2026-06-06T14:00:00Z', updatedAt: '2026-06-06T15:00:00Z' },
    { id: 'b3', customerId: 'c5', customerName: 'Hoàng Minh Đức', customerPhone: '0945678901', tableId: 'A1', date: today, time: '20:30', guests: 6, status: 'checkedIn', deposit: 500000, totalAmount: 3000000, notes: '', createdAt: '2026-06-07T10:00:00Z', updatedAt: '2026-06-08T20:30:00Z' },
    { id: 'b4', customerId: 'c3', customerName: 'Lê Hoàng Cường', customerPhone: '0923456789', tableId: 'T5', date: today, time: '19:30', guests: 2, status: 'pending', deposit: 200000, totalAmount: 0, notes: 'Lần đầu đến', createdAt: '2026-06-08T10:00:00Z', updatedAt: '2026-06-08T10:00:00Z' },
    { id: 'b5', customerId: 'c8', customerName: 'Ngô Thanh Lan', customerPhone: '0978901234', tableId: 'B3', date: today, time: '22:00', guests: 4, status: 'pending', deposit: 200000, totalAmount: 0, notes: '', createdAt: '2026-06-08T11:00:00Z', updatedAt: '2026-06-08T11:00:00Z' },
    { id: 'b6', customerId: 'c4', customerName: 'Phạm Thị Dung', customerPhone: '0934567890', tableId: 'T3', date: tomorrow, time: '20:00', guests: 3, status: 'confirmed', deposit: 200000, totalAmount: 0, notes: '', createdAt: '2026-06-08T09:00:00Z', updatedAt: '2026-06-08T09:30:00Z' },
    { id: 'b7', customerId: 'c7', customerName: 'Đỗ Quốc Hưng', customerPhone: '0967890123', tableId: 'A3', date: tomorrow, time: '21:00', guests: 5, status: 'pending', deposit: 300000, totalAmount: 0, notes: 'Tiếp khách đối tác', createdAt: '2026-06-08T12:00:00Z', updatedAt: '2026-06-08T12:00:00Z' },
  ];
  
  setStorage(STORAGE_KEYS.customers, customers);
  setStorage(STORAGE_KEYS.bookings, bookings);
}
