// Table data matching the floor plan layout
// Zones: A (VIP area), B (Standard area), T (Center area), V (VIP rooms)

export const TABLE_ZONES = {
  A: { name: 'Khu A - Gần sân khấu', color: '#e74c3c', description: 'Vị trí đẹp, gần sân khấu' },
  B: { name: 'Khu B - Bên trái', color: '#3498db', description: 'Khu vực thoáng mát' },
  T: { name: 'Khu T - Trung tâm', color: '#2ecc71', description: 'Khu vực trung tâm' },
  V: { name: 'Phòng VIP', color: '#f39c12', description: 'Phòng riêng cao cấp' },
};

export const TABLE_TYPES = {
  standard: { label: 'Standard', color: '#4ade80', minSpend: 500000 },
  vip: { label: 'VIP', color: '#f59e0b', minSpend: 2000000 },
  premium: { label: 'Premium', color: '#a855f7', minSpend: 3000000 },
  room: { label: 'Phòng VIP', color: '#ec4899', minSpend: 5000000 },
};

export const TABLES = [
  // Zone A - Right side, near stage
  { id: 'A1', zone: 'A', type: 'vip',      capacity: [4, 6],  deposit: 500000,  minSpend: 2000000, position: { x: 80, y: 14 }, label: 'A1' },
  { id: 'A2', zone: 'A', type: 'vip',      capacity: [4, 6],  deposit: 500000,  minSpend: 2000000, position: { x: 90, y: 14 }, label: 'A2' },
  { id: 'A3', zone: 'A', type: 'standard', capacity: [4, 6],  deposit: 300000,  minSpend: 1000000, position: { x: 72, y: 24 }, label: 'A3' },
  { id: 'A4', zone: 'A', type: 'standard', capacity: [4, 6],  deposit: 300000,  minSpend: 1000000, position: { x: 81, y: 24 }, label: 'A4' },
  { id: 'A5', zone: 'A', type: 'standard', capacity: [4, 6],  deposit: 300000,  minSpend: 1000000, position: { x: 90, y: 24 }, label: 'A5' },
  { id: 'A6', zone: 'A', type: 'standard', capacity: [2, 4],  deposit: 200000,  minSpend: 800000,  position: { x: 72, y: 42 }, label: 'A6' },
  { id: 'A7', zone: 'A', type: 'standard', capacity: [2, 4],  deposit: 200000,  minSpend: 800000,  position: { x: 81, y: 42 }, label: 'A7' },
  { id: 'A8', zone: 'A', type: 'standard', capacity: [2, 4],  deposit: 200000,  minSpend: 800000,  position: { x: 90, y: 42 }, label: 'A8' },
  { id: 'A9', zone: 'A', type: 'vip',      capacity: [4, 8],  deposit: 500000,  minSpend: 2000000, position: { x: 72, y: 54 }, label: 'A9' },
  { id: 'A10',zone: 'A', type: 'vip',      capacity: [4, 6],  deposit: 500000,  minSpend: 2000000, position: { x: 81, y: 58 }, label: 'A10' },
  { id: 'A11',zone: 'A', type: 'standard', capacity: [4, 6],  deposit: 300000,  minSpend: 1000000, position: { x: 92, y: 53 }, label: 'A11' },
  { id: 'A13',zone: 'A', type: 'vip',      capacity: [6, 10], deposit: 800000,  minSpend: 3000000, position: { x: 92, y: 72 }, label: 'A13' },
  { id: 'A14',zone: 'A', type: 'standard', capacity: [2, 4],  deposit: 200000,  minSpend: 800000,  position: { x: 81, y: 68 }, label: 'A14' },
  { id: 'A15',zone: 'A', type: 'standard', capacity: [2, 4],  deposit: 200000,  minSpend: 800000,  position: { x: 72, y: 68 }, label: 'A15' },
  { id: 'A16',zone: 'A', type: 'standard', capacity: [2, 4],  deposit: 200000,  minSpend: 800000,  position: { x: 63, y: 68 }, label: 'A16' },
  { id: 'A17',zone: 'A', type: 'standard', capacity: [2, 4],  deposit: 200000,  minSpend: 800000,  position: { x: 54, y: 68 }, label: 'A17' },

  // Zone B - Left side (offset from VIP rooms)
  { id: 'B1', zone: 'B', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 25, y: 11 }, label: 'B1' },
  { id: 'B2', zone: 'B', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 16, y: 11 }, label: 'B2' },
  { id: 'B3', zone: 'B', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 30, y: 20 }, label: 'B3' },
  { id: 'B4', zone: 'B', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 21, y: 22 }, label: 'B4' },
  { id: 'B5', zone: 'B', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 12, y: 22 }, label: 'B5' },
  { id: 'B6', zone: 'B', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 14, y: 35 }, label: 'B6' },
  { id: 'B7', zone: 'B', type: 'standard', capacity: [4, 6], deposit: 300000, minSpend: 1000000, position: { x: 7,  y: 47 }, label: 'B7' },
  { id: 'B8', zone: 'B', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 23, y: 35 }, label: 'B8' },
  { id: 'B9', zone: 'B', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 23, y: 46 }, label: 'B9' },
  { id: 'B10',zone: 'B', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 32, y: 35 }, label: 'B10' },
  { id: 'B11',zone: 'B', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 32, y: 46 }, label: 'B11' },

  // Zone T - Center area (spaced better)
  { id: 'T1', zone: 'T', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 60, y: 28 }, label: 'T1' },
  { id: 'T2', zone: 'T', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 60, y: 38 }, label: 'T2' },
  { id: 'T3', zone: 'T', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 51, y: 28 }, label: 'T3' },
  { id: 'T4', zone: 'T', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 51, y: 38 }, label: 'T4' },
  { id: 'T5', zone: 'T', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 42, y: 28 }, label: 'T5' },
  { id: 'T6', zone: 'T', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 42, y: 38 }, label: 'T6' },
  { id: 'T7', zone: 'T', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 38, y: 29 }, label: 'T7' },
  { id: 'T8', zone: 'T', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 38, y: 38 }, label: 'T8' },
  { id: 'T9', zone: 'T', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 66, y: 50 }, label: 'T9' },
  { id: 'T10',zone: 'T', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 58, y: 50 }, label: 'T10' },
  { id: 'T11',zone: 'T', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 50, y: 50 }, label: 'T11' },
  { id: 'T12',zone: 'T', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 42, y: 50 }, label: 'T12' },
  { id: 'T13',zone: 'T', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 38, y: 50 }, label: 'T13' },
  { id: 'T14',zone: 'T', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 42, y: 58 }, label: 'T14' },
  { id: 'T15',zone: 'T', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 30, y: 58 }, label: 'T15' },
  { id: 'T16',zone: 'T', type: 'standard', capacity: [2, 4], deposit: 200000, minSpend: 800000, position: { x: 20, y: 58 }, label: 'T16' },

  // Zone V - VIP Rooms (clearly at bottom and left side)
  { id: 'V1-1', zone: 'V', type: 'room', capacity: [8, 15], deposit: 1000000, minSpend: 5000000, position: { x: 60, y: 84 }, label: 'V1-1' },
  { id: 'V1-2', zone: 'V', type: 'room', capacity: [8, 15], deposit: 1000000, minSpend: 5000000, position: { x: 44, y: 84 }, label: 'V1-2' },
  { id: 'V1-3', zone: 'V', type: 'room', capacity: [6, 10], deposit: 800000,  minSpend: 3000000, position: { x: 28, y: 78 }, label: 'V1-3' },
  { id: 'V2-1', zone: 'V', type: 'room', capacity: [8, 15], deposit: 1000000, minSpend: 5000000, position: { x: 8,  y: 33 }, label: 'V2-1' },
  { id: 'V2-2', zone: 'V', type: 'room', capacity: [6, 10], deposit: 800000,  minSpend: 3000000, position: { x: 8,  y: 14 }, label: 'V2-2' },
];

export const TIME_SLOTS = [
  '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30',
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00',
];

export const BOOKING_STATUSES = {
  PENDING: { label: 'Chờ xác nhận', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.15)' },
  ARRIVED: { label: 'Đã check-in', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  COMPLETED: { label: 'Hoàn thành', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  CANCELLED: { label: 'Đã hủy', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  NO_SHOW: { label: 'Không đến', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' },
};
