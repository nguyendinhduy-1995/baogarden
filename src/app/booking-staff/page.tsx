'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';


interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface BookingData {
  id: string;
  bookingCode: string;
  bookingDate: string;
  bookingTime: string;
  guestCount: number;
  status: string;
  depositAmount: string;
  minSpend: string;
  note: string;
  customer: { name: string; phone: string };
  table: { code: string; area?: { name: string } };
}

interface TableOption {
  id: string;
  code: string;
  name: string;
  minGuests: number;
  maxGuests: number;
  depositAmount: string;
  minSpend: string;
  status: string;
  isBooked?: boolean;
  area?: { name: string };
}

const TIME_SLOTS = [
  '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30',
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00',
];

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  PENDING: { label: 'Chờ xác nhận', badge: 'bs-badge-gold' },
  CONFIRMED: { label: 'Đã xác nhận', badge: 'bs-badge-blue' },
  ARRIVED: { label: 'Đã đến', badge: 'bs-badge-green' },
  CANCELLED: { label: 'Đã hủy', badge: 'bs-badge-red' },
  NO_SHOW: { label: 'Không đến', badge: 'bs-badge-gray' },
  COMPLETED: { label: 'Hoàn tất', badge: 'bs-badge-purple' },
};

const formatVND = (v: number | string) => Number(v).toLocaleString('vi-VN') + 'đ';

const PAGE_CSS = `
/* ─── Booking Staff Layout ─── */
.bs-page {
  min-height: 100dvh;
  background: var(--bg-primary);
}

/* ─── Header ─── */
.bs-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(17, 17, 24, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-subtle);
  padding: var(--space-md) var(--space-lg);
}

.bs-header-inner {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.bs-header-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.bs-header-sub {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin-top: 1px;
}

.bs-header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.bs-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  white-space: nowrap;
  cursor: pointer;
  border: none;
  line-height: 1.4;
  min-height: 44px;
  padding: 0 var(--space-lg);
}

.bs-btn-primary {
  background: var(--gold-gradient);
  color: #0a0a0f;
  box-shadow: var(--shadow-gold);
}
.bs-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 25px rgba(251, 191, 36, 0.25);
}
.bs-btn-primary:active { transform: translateY(0); }

.bs-btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  padding: 0 var(--space-md);
}
.bs-btn-ghost:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.bs-btn-secondary {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
}
.bs-btn-secondary:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-gold);
}

.bs-btn-danger {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}
.bs-btn-danger:hover {
  background: rgba(239, 68, 68, 0.25);
}

.bs-btn:disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* ─── Main Content ─── */
.bs-content {
  max-width: 1280px;
  margin: 0 auto;
  padding: var(--space-lg);
}

/* ─── KPI Cards ─── */
.bs-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.bs-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-lg) var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  transition: border-color var(--transition-base);
}
.bs-stat-card:hover {
  border-color: var(--border-default);
}

.bs-stat-label {
  font-size: 0.72rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
}

.bs-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

.bs-stat-value-sm {
  font-size: 1.2rem;
}

/* ─── Quick Stats ─── */
.bs-quick-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.bs-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.4;
  min-height: 28px;
}

.bs-badge-gold {
  background: rgba(251, 191, 36, 0.15);
  color: var(--gold-400);
  border: 1px solid rgba(251, 191, 36, 0.2);
}
.bs-badge-green {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.2);
}
.bs-badge-red {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}
.bs-badge-blue {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.2);
}
.bs-badge-purple {
  background: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
  border: 1px solid rgba(139, 92, 246, 0.2);
}
.bs-badge-gray {
  background: rgba(107, 114, 128, 0.15);
  color: #9ca3af;
  border: 1px solid rgba(107, 114, 128, 0.2);
}

/* ─── Filter Tabs ─── */
.bs-tabs {
  display: flex;
  gap: 2px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: 3px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  margin-bottom: var(--space-lg);
}
.bs-tabs::-webkit-scrollbar { display: none; }

.bs-tab {
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
  white-space: nowrap;
  cursor: pointer;
  border: none;
  background: transparent;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bs-tab:hover { color: var(--text-secondary); }
.bs-tab-active {
  background: var(--bg-card);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

/* ─── Loading ─── */
.bs-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-3xl) 0;
}
.bs-spinner {
  width: 32px;
  height: 32px;
  border: 2px solid var(--gold-400);
  border-top-color: transparent;
  border-radius: 50%;
  animation: bs-spin 0.8s linear infinite;
}
@keyframes bs-spin {
  to { transform: rotate(360deg); }
}

/* ─── Empty State ─── */
.bs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-4xl) var(--space-xl);
  text-align: center;
  color: var(--text-tertiary);
}
.bs-empty-icon {
  font-size: 3rem;
  margin-bottom: var(--space-lg);
  opacity: 0.5;
}
.bs-empty h3 {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
}
.bs-empty p {
  font-size: 0.9rem;
}

/* ─── Desktop Table ─── */
.bs-table-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.bs-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.bs-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.bs-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-card);
  white-space: nowrap;
}

.bs-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 0.9rem;
  vertical-align: middle;
}

.bs-table tbody tr {
  transition: background var(--transition-fast);
}
.bs-table tbody tr:hover {
  background: var(--bg-card-hover);
}
.bs-table tbody tr:last-child td {
  border-bottom: none;
}

.bs-code {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.78rem;
  color: var(--gold-400);
}
.bs-text-sm {
  font-size: 0.88rem;
}
.bs-text-medium {
  font-weight: 500;
}
.bs-text-secondary {
  color: var(--text-secondary);
  font-size: 0.88rem;
}
.bs-text-center {
  text-align: center;
}

/* ─── Mobile Card Layout ─── */
.bs-card-list {
  display: none;
  flex-direction: column;
  gap: var(--space-md);
}

.bs-booking-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  transition: border-color var(--transition-base);
}
.bs-booking-card:hover {
  border-color: var(--border-default);
}

.bs-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.bs-card-code {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.82rem;
  color: var(--gold-400);
  font-weight: 600;
}

.bs-card-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm) var(--space-lg);
}

.bs-card-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.bs-card-field-label {
  font-size: 0.68rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.bs-card-field-value {
  font-size: 0.88rem;
  color: var(--text-primary);
}
.bs-card-field-full {
  grid-column: 1 / -1;
}

/* ─── Modal ─── */
.bs-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-xl);
  animation: bs-fadeIn 0.2s ease;
}

.bs-modal {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  overflow-y: auto;
  animation: bs-slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.bs-modal-header {
  padding: var(--space-xl) var(--space-xl) var(--space-lg);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bs-modal-header h2 {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
}

.bs-modal-close {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  font-size: 1.1rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}
.bs-modal-close:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.bs-modal-body {
  padding: var(--space-xl);
}

.bs-modal-footer {
  padding: var(--space-lg) var(--space-xl);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
}

/* ─── Confirm Dialog ─── */
.bs-confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: var(--space-xl);
  animation: bs-fadeIn 0.2s ease;
}
.bs-confirm-dialog {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 400px;
  padding: var(--space-xl);
  animation: bs-slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: center;
}
.bs-confirm-icon {
  font-size: 2.5rem;
  margin-bottom: var(--space-md);
}
.bs-confirm-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-sm);
}
.bs-confirm-msg {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-xl);
  line-height: 1.5;
}
.bs-confirm-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
}
.bs-confirm-actions .bs-btn {
  flex: 1;
  max-width: 160px;
}

/* ─── Form ─── */
.bs-form-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.bs-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
}

.bs-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bs-form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.bs-input,
.bs-select,
.bs-textarea {
  font-family: inherit;
  font-size: 0.92rem;
  color: var(--text-primary);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 11px 14px;
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  width: 100%;
  min-height: 44px;
}
.bs-input:focus,
.bs-select:focus,
.bs-textarea:focus {
  border-color: var(--gold-400);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
}
.bs-input::placeholder,
.bs-textarea::placeholder {
  color: var(--text-tertiary);
}
.bs-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2371717a' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}
.bs-textarea {
  resize: vertical;
  min-height: 72px;
}

/* ─── Toast ─── */
.bs-toast-wrap {
  position: fixed;
  top: var(--space-xl);
  right: var(--space-xl);
  z-index: 2000;
}
.bs-toast {
  padding: 14px 20px;
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-lg);
  animation: bs-slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
  gap: var(--space-md);
  font-size: 0.9rem;
  min-width: 260px;
  color: var(--text-primary);
}
.bs-toast-success { border-left: 3px solid var(--success); }
.bs-toast-error { border-left: 3px solid var(--error); }
.bs-toast-warning { border-left: 3px solid var(--warning); }

@keyframes bs-fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes bs-slideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes bs-slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

/* ─── Responsive ≤ 640px ─── */
@media (max-width: 640px) {
  .bs-header {
    padding: var(--space-sm) var(--space-md);
  }
  .bs-header-title { font-size: 1rem; }

  .bs-content {
    padding: var(--space-md);
  }

  .bs-stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-sm);
  }
  .bs-stat-card {
    padding: var(--space-md);
  }
  .bs-stat-value {
    font-size: 1.25rem;
  }
  .bs-stat-value-sm {
    font-size: 1rem;
  }

  .bs-table-card { display: none; }
  .bs-card-list { display: flex; }

  .bs-overlay {
    padding: 0;
    align-items: flex-end;
  }
  .bs-modal {
    max-height: 92vh;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    animation: bs-slideFromBottom 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .bs-confirm-overlay {
    padding: var(--space-lg);
  }

  .bs-form-row {
    grid-template-columns: 1fr;
  }

  .bs-modal-footer {
    flex-direction: column;
  }
  .bs-modal-footer .bs-btn {
    width: 100%;
  }

  .bs-toast-wrap {
    top: auto;
    bottom: var(--space-lg);
    right: var(--space-md);
    left: var(--space-md);
  }
  .bs-toast {
    min-width: 0;
    width: 100%;
  }
}

@keyframes bs-slideFromBottom {
  from { opacity: 0; transform: translateY(100%); }
  to { opacity: 1; transform: translateY(0); }
}
`;

export default function BookingStaffPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({ total: 0, confirmed: 0, arrived: 0, cancelled: 0, noShow: 0, completed: 0, revenue: 0 });

  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    customerName: '', customerPhone: '', tableId: '',
    bookingDate: today, bookingTime: '20:00', guestCount: 2,
    note: '', status: 'PENDING',
  });

  // Auth check
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data.success || data.user.role !== 'BOOKING') {
          router.push('/login');
          return;
        }
        setUser(data.user);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setBookings(data.data);
        // Calculate stats
        const all = data.data as BookingData[];
        setStats({
          total: all.length,
          confirmed: all.filter((b: BookingData) => b.status === 'CONFIRMED').length,
          arrived: all.filter((b: BookingData) => b.status === 'ARRIVED').length,
          cancelled: all.filter((b: BookingData) => b.status === 'CANCELLED').length,
          noShow: all.filter((b: BookingData) => b.status === 'NO_SHOW').length,
          completed: all.filter((b: BookingData) => b.status === 'COMPLETED').length,
          revenue: all
            .filter((b: BookingData) => ['CONFIRMED', 'ARRIVED', 'COMPLETED'].includes(b.status))
            .reduce((sum: number, b: BookingData) => sum + Number(b.minSpend), 0),
        });
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Fetch available tables
  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch(`/api/tables/availability?date=${formData.bookingDate}&time=${formData.bookingTime}`);
      const data = await res.json();
      if (data.success) setTables(data.data);
    } catch { /* ignore */ }
  }, [formData.bookingDate, formData.bookingTime]);

  useEffect(() => { if (showForm) fetchTables(); }, [showForm, fetchTables]);

  const showToast = (message: string, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async () => {
    if (!formData.customerName.trim() || !formData.customerPhone.trim() || !formData.tableId) {
      showToast('Vui lòng nhập đầy đủ thông tin', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, source: 'STAFF' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Tạo booking thành công!');
        setShowForm(false);
        setFormData({ customerName: '', customerPhone: '', tableId: '', bookingDate: today, bookingTime: '20:00', guestCount: 2, note: '', status: 'PENDING' });
        fetchBookings();
      } else {
        showToast(data.error || 'Tạo booking thất bại', 'error');
      }
    } catch {
      showToast('Lỗi kết nối server', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const arrivalRate = stats.total > 0 ? Math.round(((stats.arrived + stats.completed) / stats.total) * 100) : 0;
  const filteredBookings = filterStatus === 'all' ? bookings : bookings.filter(b => b.status === filterStatus);

  if (!user) return (
    <div className="bs-page">
      <style>{PAGE_CSS}</style>
      <div className="bs-loading" style={{ minHeight: '100dvh' }}>
        <div className="bs-spinner" />
      </div>
    </div>
  );

  return (
    <div className="bs-page">
      <style>{PAGE_CSS}</style>

      {/* Header */}
      <header className="bs-header">
        <div className="bs-header-inner">
          <div>
            <h1 className="bs-header-title">Hiệu suất booking</h1>
            <p className="bs-header-sub">{user.name}</p>
          </div>
          <div className="bs-header-actions">
            <button onClick={() => setShowForm(true)} className="bs-btn bs-btn-primary" id="new-staff-booking">
              Tạo booking
            </button>
            <button onClick={handleLogout} className="bs-btn bs-btn-ghost" id="logout-btn">
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <div className="bs-content">
        {/* KPI Cards */}
        <div className="bs-stats-grid">
          <div className="bs-stat-card">
            <div className="bs-stat-label">Tổng booking</div>
            <div className="bs-stat-value">{stats.total}</div>
          </div>
          <div className="bs-stat-card">
            <div className="bs-stat-label">Khách đến</div>
            <div className="bs-stat-value">{stats.arrived + stats.completed}</div>
          </div>
          <div className="bs-stat-card">
            <div className="bs-stat-label">Tỷ lệ đến</div>
            <div className="bs-stat-value">{arrivalRate}%</div>
          </div>
          <div className="bs-stat-card">
            <div className="bs-stat-label">Doanh số DK</div>
            <div className="bs-stat-value bs-stat-value-sm">{formatVND(stats.revenue)}</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bs-quick-stats">
          <span className="bs-badge bs-badge-gold">Chờ: {stats.confirmed - stats.arrived > 0 ? bookings.filter(b => b.status === 'PENDING').length : 0}</span>
          <span className="bs-badge bs-badge-red">Hủy: {stats.cancelled}</span>
          <span className="bs-badge bs-badge-gray">Không đến: {stats.noShow}</span>
        </div>

        {/* Filter Tabs */}
        <div className="bs-tabs">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'PENDING', label: 'Chờ XN' },
            { key: 'CONFIRMED', label: 'Đã XN' },
            { key: 'ARRIVED', label: 'Đã đến' },
            { key: 'COMPLETED', label: 'Hoàn tất' },
            { key: 'CANCELLED', label: 'Hủy' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`bs-tab ${filterStatus === tab.key ? 'bs-tab-active' : ''}`}
              onClick={() => setFilterStatus(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bookings */}
        {loading ? (
          <div className="bs-loading"><div className="bs-spinner" /></div>
        ) : filteredBookings.length === 0 ? (
          <div className="bs-empty">
            <div className="bs-empty-icon">📋</div>
            <h3>Chưa có booking</h3>
            <p>Tạo booking mới để bắt đầu</p>
          </div>
        ) : (
          <>
            {/* Desktop: Table */}
            <div className="bs-table-card">
              <div className="bs-table-scroll">
                <table className="bs-table">
                  <thead>
                    <tr>
                      <th>Mã</th>
                      <th>Ngày</th>
                      <th>Giờ</th>
                      <th>Khách</th>
                      <th>SĐT</th>
                      <th>Bàn</th>
                      <th>Người</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map(b => (
                      <tr key={b.id}>
                        <td className="bs-code">{b.bookingCode}</td>
                        <td className="bs-text-sm">{new Date(b.bookingDate).toLocaleDateString('vi-VN')}</td>
                        <td className="bs-text-sm">{b.bookingTime}</td>
                        <td className="bs-text-medium">{b.customer.name}</td>
                        <td className="bs-text-secondary">{b.customer.phone}</td>
                        <td><span className="bs-badge bs-badge-gold">{b.table.code}</span></td>
                        <td className="bs-text-center">{b.guestCount}</td>
                        <td><span className={`bs-badge ${STATUS_MAP[b.status]?.badge || 'bs-badge-gray'}`}>{STATUS_MAP[b.status]?.label || b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile: Card Layout */}
            <div className="bs-card-list">
              {filteredBookings.map(b => (
                <div key={b.id} className="bs-booking-card">
                  <div className="bs-card-header">
                    <span className="bs-card-code">{b.bookingCode}</span>
                    <span className={`bs-badge ${STATUS_MAP[b.status]?.badge || 'bs-badge-gray'}`}>
                      {STATUS_MAP[b.status]?.label || b.status}
                    </span>
                  </div>
                  <div className="bs-card-body">
                    <div className="bs-card-field">
                      <span className="bs-card-field-label">Khách</span>
                      <span className="bs-card-field-value">{b.customer.name}</span>
                    </div>
                    <div className="bs-card-field">
                      <span className="bs-card-field-label">SĐT</span>
                      <span className="bs-card-field-value">{b.customer.phone}</span>
                    </div>
                    <div className="bs-card-field">
                      <span className="bs-card-field-label">Ngày</span>
                      <span className="bs-card-field-value">{new Date(b.bookingDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div className="bs-card-field">
                      <span className="bs-card-field-label">Giờ</span>
                      <span className="bs-card-field-value">{b.bookingTime}</span>
                    </div>
                    <div className="bs-card-field">
                      <span className="bs-card-field-label">Bàn</span>
                      <span className="bs-card-field-value">
                        <span className="bs-badge bs-badge-gold">{b.table.code}</span>
                      </span>
                    </div>
                    <div className="bs-card-field">
                      <span className="bs-card-field-label">Số người</span>
                      <span className="bs-card-field-value">{b.guestCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Booking Modal */}
      {showForm && (
        <div className="bs-overlay" onClick={() => setShowForm(false)}>
          <div className="bs-modal" onClick={e => e.stopPropagation()}>
            <div className="bs-modal-header">
              <h2>Tạo booking cho khách</h2>
              <button onClick={() => setShowForm(false)} className="bs-modal-close" id="close-staff-form">✕</button>
            </div>
            <div className="bs-modal-body">
              <div className="bs-form-stack">
                <div className="bs-form-row">
                  <div className="bs-form-group">
                    <label className="bs-form-label">Họ tên khách *</label>
                    <input className="bs-input" value={formData.customerName} onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))} placeholder="Nhập tên khách" id="staff-name" />
                  </div>
                  <div className="bs-form-group">
                    <label className="bs-form-label">Số điện thoại *</label>
                    <input className="bs-input" value={formData.customerPhone} onChange={e => setFormData(p => ({ ...p, customerPhone: e.target.value }))} placeholder="0901234567" id="staff-phone" />
                  </div>
                </div>
                <div className="bs-form-row">
                  <div className="bs-form-group">
                    <label className="bs-form-label">Ngày đặt</label>
                    <input className="bs-input" type="date" value={formData.bookingDate} onChange={e => setFormData(p => ({ ...p, bookingDate: e.target.value, tableId: '' }))} id="staff-date" />
                  </div>
                  <div className="bs-form-group">
                    <label className="bs-form-label">Giờ đặt</label>
                    <select className="bs-select" value={formData.bookingTime} onChange={e => setFormData(p => ({ ...p, bookingTime: e.target.value, tableId: '' }))} id="staff-time">
                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="bs-form-row">
                  <div className="bs-form-group">
                    <label className="bs-form-label">Số khách</label>
                    <input className="bs-input" type="number" min={1} max={20} value={formData.guestCount} onChange={e => setFormData(p => ({ ...p, guestCount: Number(e.target.value) }))} id="staff-guests" />
                  </div>
                  <div className="bs-form-group">
                    <label className="bs-form-label">Bàn *</label>
                    <select className="bs-select" value={formData.tableId} onChange={e => setFormData(p => ({ ...p, tableId: e.target.value }))} id="staff-table">
                      <option value="">Chọn bàn...</option>
                      {tables.filter(t => !t.isBooked && t.status !== 'INACTIVE').map(t => (
                        <option key={t.id} value={t.id}>
                          {t.code} ({t.minGuests}-{t.maxGuests} khách) - {t.area?.name || ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="bs-form-row">
                  <div className="bs-form-group">
                    <label className="bs-form-label">Trạng thái</label>
                    <select className="bs-select" value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))} id="staff-status">
                      <option value="PENDING">Chờ xác nhận</option>
                      <option value="CONFIRMED">Đã xác nhận</option>
                    </select>
                  </div>
                </div>
                <div className="bs-form-group">
                  <label className="bs-form-label">Ghi chú</label>
                  <textarea className="bs-textarea" value={formData.note} onChange={e => setFormData(p => ({ ...p, note: e.target.value }))} placeholder="Ghi chú..." rows={2} id="staff-note" />
                </div>
              </div>
            </div>
            <div className="bs-modal-footer">
              <button onClick={() => setShowForm(false)} className="bs-btn bs-btn-secondary">Hủy</button>
              <button onClick={handleSubmit} disabled={submitting} className="bs-btn bs-btn-primary" id="staff-submit">
                {submitting ? 'Đang tạo...' : 'Tạo booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="bs-toast-wrap">
          <div className={`bs-toast bs-toast-${toast.type}`}>
            {toast.type === 'error' ? '✕ ' : toast.type === 'warning' ? '⚠ ' : '✓ '}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
