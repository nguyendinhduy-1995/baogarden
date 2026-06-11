'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';


interface UserData {
  id: string;
  name: string;
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
  createdByUser?: { name: string } | null;
}

const STATUS_MAP: Record<string, { label: string; badge: string; color: string }> = {
  PENDING: { label: 'Chờ XN', badge: 'badge-gold', color: '#f59e0b' },
  CONFIRMED: { label: 'Đã XN', badge: 'badge-blue', color: '#3b82f6' },
  ARRIVED: { label: 'Đã đến', badge: 'badge-green', color: '#4ade80' },
  CANCELLED: { label: 'Hủy', badge: 'badge-red', color: '#ef4444' },
  NO_SHOW: { label: 'Không đến', badge: 'badge-gray', color: '#6b7280' },
  COMPLETED: { label: 'Hoàn tất', badge: 'badge-purple', color: '#8b5cf6' },
};

const TIME_GROUPS = [
  { label: '18:00 - 19:30', times: ['18:00', '18:30', '19:00', '19:30'] },
  { label: '20:00 - 21:30', times: ['20:00', '20:30', '21:00', '21:30'] },
  { label: '22:00 - 23:30', times: ['22:00', '22:30', '23:00', '23:30'] },
  { label: '00:00 - 01:00', times: ['00:00', '00:30', '01:00'] },
];

export default function ReceptionPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data.success || !['RECEPTION', 'ADMIN', 'MANAGER'].includes(data.user.role)) {
          router.push('/login');
          return;
        }
        setUser(data.user);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings/today');
      const data = await res.json();
      if (data.success) setBookings(data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const showToast = (message: string, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateStatus = async (bookingId: string, status: string) => {
    setActionLoading(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Cập nhật thành công');
        fetchBookings();
      } else {
        showToast(data.error || 'Cập nhật thất bại', 'error');
      }
    } catch {
      showToast('Lỗi server', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const filteredBookings = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'PENDING').length,
    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
    arrived: bookings.filter(b => b.status === 'ARRIVED').length,
  };

  if (!user) return (
    <>
      <style>{rcStyles}</style>
      <div className="rc-loading"><div className="rc-spinner" /></div>
    </>
  );

  return (
    <>
      <style>{rcStyles}</style>
      <div className="rc-page">
        {/* Header */}
        <header className="rc-header">
          <div className="rc-header-inner">
            <div className="rc-header-left">
              <h1 className="rc-header-title">Lễ tân</h1>
              <p className="rc-header-sub">
                Booking hôm nay • {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="rc-header-actions">
              <button onClick={fetchBookings} className="rc-btn rc-btn-ghost" id="refresh-reception">
                Tải lại
              </button>
              <button onClick={handleLogout} className="rc-btn rc-btn-ghost" id="logout-reception">
                Đăng xuất
              </button>
            </div>
          </div>
        </header>

        <div className="rc-content">
          {/* Quick Stats */}
          <div className="rc-stats">
            <div className="rc-stat-item rc-stat-default">
              <div className="rc-stat-value">{stats.total}</div>
              <div className="rc-stat-label">Tổng</div>
            </div>
            <div className="rc-stat-item rc-stat-pending">
              <div className="rc-stat-value rc-stat-value-pending">{stats.pending}</div>
              <div className="rc-stat-label">Chờ XN</div>
            </div>
            <div className="rc-stat-item rc-stat-confirmed">
              <div className="rc-stat-value rc-stat-value-confirmed">{stats.confirmed}</div>
              <div className="rc-stat-label">Đã XN</div>
            </div>
            <div className="rc-stat-item rc-stat-arrived">
              <div className="rc-stat-value rc-stat-value-arrived">{stats.arrived}</div>
              <div className="rc-stat-label">Đã đến</div>
            </div>
          </div>

          {/* Filter */}
          <div className="rc-tabs">
            {[
              { key: 'all', label: `Tất cả (${bookings.length})` },
              { key: 'PENDING', label: `Chờ XN (${stats.pending})` },
              { key: 'CONFIRMED', label: `Đã XN (${stats.confirmed})` },
              { key: 'ARRIVED', label: `Đã đến (${stats.arrived})` },
              { key: 'CANCELLED', label: 'Hủy' },
              { key: 'NO_SHOW', label: 'Không đến' },
            ].map(tab => (
              <button key={tab.key} className={`rc-tab ${filter === tab.key ? 'rc-tab-active' : ''}`}
                onClick={() => setFilter(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Bookings by Time Group */}
          {loading ? (
            <div className="rc-loading-content"><div className="rc-spinner" /></div>
          ) : filteredBookings.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📋</div><h3>Không có booking</h3></div>
          ) : (
            <div className="rc-groups">
              {TIME_GROUPS.map(group => {
                const groupBookings = filteredBookings.filter(b => group.times.includes(b.bookingTime));
                if (groupBookings.length === 0) return null;
                return (
                  <div key={group.label} className="rc-group">
                    <div className="rc-group-header">
                      <h3 className="rc-group-title">{group.label}</h3>
                      <span className="badge badge-gold rc-group-count">{groupBookings.length}</span>
                    </div>
                    <div className="rc-group-list">
                      {groupBookings.sort((a, b) => a.bookingTime.localeCompare(b.bookingTime)).map(booking => (
                        <div key={booking.id} className="rc-booking-card"
                          style={{ borderLeftColor: STATUS_MAP[booking.status]?.color || '#6b7280' }}>
                          <div className="rc-booking-main">
                            <div className="rc-booking-info">
                              <div className="rc-booking-meta">
                                <span className="rc-booking-code">{booking.bookingCode}</span>
                                <span className={`badge ${STATUS_MAP[booking.status]?.badge || 'badge-gray'} rc-badge-sm`}>
                                  {STATUS_MAP[booking.status]?.label || booking.status}
                                </span>
                                <span className="rc-booking-time">{booking.bookingTime}</span>
                              </div>
                              <div className="rc-booking-customer">
                                <span className="rc-customer-name">
                                  {booking.customer.name}
                                </span>
                                <span className="rc-customer-phone">
                                  {booking.customer.phone}
                                </span>
                              </div>
                              <div className="rc-booking-details">
                                <span>Bàn <strong className="rc-table-code">{booking.table.code}</strong></span>
                                <span>{booking.guestCount} khách</span>
                                {booking.note && <span className="rc-note">{booking.note}</span>}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="rc-booking-actions">
                              {booking.status === 'PENDING' && (
                                <button onClick={() => updateStatus(booking.id, 'CONFIRMED')}
                                  disabled={actionLoading === booking.id}
                                  className="rc-action-btn rc-action-confirm"
                                  id={`confirm-${booking.id}`}>
                                  XN
                                </button>
                              )}
                              {booking.status === 'CONFIRMED' && (
                                <button onClick={() => updateStatus(booking.id, 'ARRIVED')}
                                  disabled={actionLoading === booking.id}
                                  className="rc-action-btn rc-action-checkin"
                                  id={`checkin-${booking.id}`}>
                                  Check-in
                                </button>
                              )}
                              {booking.status === 'ARRIVED' && (
                                <button onClick={() => updateStatus(booking.id, 'COMPLETED')}
                                  disabled={actionLoading === booking.id}
                                  className="rc-action-btn rc-action-complete"
                                  id={`complete-${booking.id}`}>
                                  Xong
                                </button>
                              )}
                              {!['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(booking.status) && (
                                <button onClick={() => updateStatus(booking.id, 'NO_SHOW')}
                                  disabled={actionLoading === booking.id}
                                  className="rc-action-btn rc-action-noshow"
                                  id={`noshow-${booking.id}`}>
                                  Không đến
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type}`}>
              {toast.type === 'error' ? '✕ ' : toast.type === 'warning' ? '! ' : '✓ '}
              {toast.message}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const rcStyles = `
  /* ─── Reception Page ─── */
  .rc-page {
    min-height: 100dvh;
    background: var(--bg-primary);
  }

  .rc-loading {
    min-height: 100dvh;
    background: var(--bg-primary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .rc-spinner {
    width: 32px;
    height: 32px;
    border: 2px solid var(--gold-400);
    border-top-color: transparent;
    border-radius: 50%;
    animation: rcSpin 0.8s linear infinite;
  }

  @keyframes rcSpin {
    to { transform: rotate(360deg); }
  }

  /* ─── Header ─── */
  .rc-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(17, 17, 24, 0.95);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border-subtle);
    padding: var(--space-md) var(--space-lg);
  }

  .rc-header-inner {
    max-width: 56rem;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
  }

  .rc-header-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    line-height: 1.3;
  }

  .rc-header-sub {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin: 2px 0 0;
    line-height: 1.3;
  }

  .rc-header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-shrink: 0;
  }

  /* ─── Buttons ─── */
  .rc-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 0.8rem;
    white-space: nowrap;
    transition: all var(--transition-fast);
    min-height: 36px;
    border: none;
    cursor: pointer;
  }

  .rc-btn-ghost {
    background: transparent;
    color: var(--text-secondary);
  }

  .rc-btn-ghost:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  /* ─── Content ─── */
  .rc-content {
    max-width: 56rem;
    margin: 0 auto;
    padding: var(--space-lg);
  }

  /* ─── Stats ─── */
  .rc-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
  }

  .rc-stat-item {
    text-align: center;
    padding: var(--space-md);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-subtle);
  }

  .rc-stat-default {
    background: var(--bg-card);
  }

  .rc-stat-pending {
    background: rgba(245, 158, 11, 0.08);
    border-color: rgba(245, 158, 11, 0.15);
  }

  .rc-stat-confirmed {
    background: rgba(59, 130, 246, 0.08);
    border-color: rgba(59, 130, 246, 0.15);
  }

  .rc-stat-arrived {
    background: rgba(74, 222, 128, 0.08);
    border-color: rgba(74, 222, 128, 0.15);
  }

  .rc-stat-value {
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .rc-stat-value-pending { color: #f59e0b; }
  .rc-stat-value-confirmed { color: #3b82f6; }
  .rc-stat-value-arrived { color: #4ade80; }

  .rc-stat-label {
    font-size: 0.7rem;
    color: var(--text-tertiary);
    margin-top: 2px;
  }

  /* ─── Tabs ─── */
  .rc-tabs {
    display: flex;
    gap: 2px;
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    padding: 3px;
    overflow-x: auto;
    margin-bottom: var(--space-lg);
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .rc-tabs::-webkit-scrollbar {
    display: none;
  }

  .rc-tab {
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text-tertiary);
    transition: all var(--transition-fast);
    white-space: nowrap;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    cursor: pointer;
  }

  .rc-tab:hover {
    color: var(--text-secondary);
  }

  .rc-tab-active {
    background: var(--bg-card);
    color: var(--text-primary);
    box-shadow: var(--shadow-sm);
  }

  /* ─── Loading Content ─── */
  .rc-loading-content {
    display: flex;
    justify-content: center;
    padding: var(--space-3xl) 0;
  }

  /* ─── Time Groups ─── */
  .rc-groups {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
  }

  .rc-group-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-sm);
  }

  .rc-group-title {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-secondary);
    margin: 0;
  }

  .rc-group-count {
    font-size: 0.72rem;
  }

  .rc-group-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  /* ─── Booking Card ─── */
  .rc-booking-card {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    transition: all var(--transition-base);
    border-left-width: 3px;
    border-left-style: solid;
  }

  .rc-booking-card:hover {
    border-color: var(--border-default);
    border-left-color: inherit;
  }

  .rc-booking-main {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-md);
  }

  .rc-booking-info {
    flex: 1;
    min-width: 0;
  }

  .rc-booking-meta {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-xs);
    flex-wrap: wrap;
  }

  .rc-booking-code {
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 0.75rem;
    color: var(--gold-400);
  }

  .rc-badge-sm {
    font-size: 0.72rem;
  }

  .rc-booking-time {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .rc-booking-customer {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    font-size: 0.88rem;
  }

  .rc-customer-name {
    color: var(--text-primary);
    font-weight: 500;
  }

  .rc-customer-phone {
    color: var(--text-secondary);
  }

  .rc-booking-details {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-top: var(--space-xs);
    font-size: 0.78rem;
    color: var(--text-tertiary);
  }

  .rc-table-code {
    color: var(--gold-400);
  }

  .rc-note {
    font-style: italic;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 150px;
  }

  /* ─── Action Buttons ─── */
  .rc-booking-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    flex-shrink: 0;
  }

  .rc-action-btn {
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    font-size: 0.78rem;
    font-weight: 600;
    white-space: nowrap;
    transition: all var(--transition-fast);
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    cursor: pointer;
  }

  .rc-action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .rc-action-confirm {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
    border-color: rgba(59, 130, 246, 0.2);
  }
  .rc-action-confirm:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.25);
  }

  .rc-action-checkin {
    background: rgba(74, 222, 128, 0.15);
    color: #4ade80;
    border-color: rgba(74, 222, 128, 0.2);
  }
  .rc-action-checkin:hover:not(:disabled) {
    background: rgba(74, 222, 128, 0.25);
  }

  .rc-action-complete {
    background: rgba(139, 92, 246, 0.15);
    color: #8b5cf6;
    border-color: rgba(139, 92, 246, 0.2);
  }
  .rc-action-complete:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.25);
  }

  .rc-action-noshow {
    background: transparent;
    color: var(--text-secondary);
  }
  .rc-action-noshow:hover:not(:disabled) {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  /* ─── Mobile Responsive ≤640px ─── */
  @media (max-width: 640px) {
    .rc-header {
      padding: var(--space-sm) var(--space-md);
    }

    .rc-header-inner {
      flex-wrap: wrap;
    }

    .rc-header-title {
      font-size: 1.05rem;
    }

    .rc-header-sub {
      font-size: 0.7rem;
    }

    .rc-content {
      padding: var(--space-md);
    }

    .rc-stats {
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-sm);
    }

    .rc-stat-value {
      font-size: 1.4rem;
    }

    .rc-tab {
      padding: 8px 12px;
      font-size: 0.78rem;
    }

    /* Card layout for bookings on mobile */
    .rc-booking-card {
      padding: var(--space-md);
    }

    .rc-booking-main {
      flex-direction: column;
      gap: var(--space-md);
    }

    .rc-booking-meta {
      gap: 6px;
    }

    .rc-booking-customer {
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }

    .rc-booking-details {
      flex-wrap: wrap;
      gap: var(--space-sm);
    }

    .rc-note {
      max-width: 100%;
    }

    /* Actions go horizontal on mobile */
    .rc-booking-actions {
      flex-direction: row;
      flex-wrap: wrap;
      gap: var(--space-sm);
      width: 100%;
      border-top: 1px solid var(--border-subtle);
      padding-top: var(--space-md);
    }

    .rc-action-btn {
      min-height: 44px;
      padding: 10px 16px;
      font-size: 0.82rem;
      flex: 1;
      min-width: 80px;
    }

    /* Header actions */
    .rc-btn {
      min-height: 44px;
      padding: 10px 14px;
    }
  }

  /* ─── Small mobile ≤375px ─── */
  @media (max-width: 375px) {
    .rc-stats {
      gap: 6px;
    }

    .rc-stat-item {
      padding: var(--space-sm);
    }

    .rc-stat-value {
      font-size: 1.2rem;
    }

    .rc-stat-label {
      font-size: 0.65rem;
    }

    .rc-booking-code {
      font-size: 0.7rem;
    }

    .rc-booking-time {
      font-size: 0.82rem;
    }
  }
`;
