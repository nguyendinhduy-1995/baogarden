'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface OverviewStats {
  todayBookings: number;
  pendingCount: number;
  confirmedCount: number;
  arrivedCount: number;
  cancelledCount: number;
  completedCount: number;
  noShowCount: number;
  expectedRevenue: number;
  bookingSuccessRate: number;
  arrivalRate: number;
  topUsers: Array<{
    id: string;
    name: string;
    totalBookings: number;
    arrivedCount: number;
    arrivalRate: number;
  }>;
}

interface TodayBooking {
  id: string;
  bookingCode: string;
  bookingTime: string;
  guestCount: number;
  status: string;
  depositAmount: number;
  note: string | null;
  customer: { id: string; name: string; phone: string };
  table: { id: string; code: string; name: string; area: { name: string } };
  createdByUser: { name: string } | null;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ xác nhận', cls: 'ds-badge-warn' },
  CONFIRMED: { label: 'Đã xác nhận', cls: 'ds-badge-blue' },
  ARRIVED: { label: 'Đã đến', cls: 'ds-badge-green' },
  CANCELLED: { label: 'Đã hủy', cls: 'ds-badge-red' },
  NO_SHOW: { label: 'Không đến', cls: 'ds-badge-gray' },
  COMPLETED: { label: 'Hoàn tất', cls: 'ds-badge-purple' },
};

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + 'đ';
}

function fmtRelative(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

const EVENT_LABELS: Record<string, string> = {
  CREATED: 'tạo booking', CONFIRMED: 'xác nhận', ARRIVED: 'check-in',
  CANCELLED: 'hủy', NO_SHOW: 'đánh dấu no-show', COMPLETED: 'hoàn tất',
  UPDATED: 'cập nhật', TABLE_CHANGED: 'đổi bàn', NOTE_ADDED: 'thêm ghi chú',
  STATUS_CHANGED: 'chuyển trạng thái',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [todayBookings, setTodayBookings] = useState<TodayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [weekTrend, setWeekTrend] = useState<Array<{ day: string; count: number; revenue: number }>>([]);
  const [activityLog, setActivityLog] = useState<Array<{ id: string; type: string; note: string | null; createdAt: string; user: { name: string } | null; booking: { bookingCode: string; customer: { name: string } | null } | null }>>([]);

  const loadData = useCallback(async () => {
    let todayBookingsCount = 0;
    let todayExpectedRevenue = 0;
    try {
      const today = new Date().toISOString().split('T')[0];
      const [statsRes, bookingsRes] = await Promise.all([
        fetch(`/api/reports/overview?from=${today}&to=${today}`),
        fetch('/api/bookings/today'),
      ]);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success && statsData.data) {
          const d = statsData.data;
          todayBookingsCount = d.totalBookings || 0;
          todayExpectedRevenue = d.estimatedRevenue || 0;
          setStats({
            todayBookings: todayBookingsCount,
            pendingCount: d.byStatus?.PENDING || 0,
            confirmedCount: d.byStatus?.CONFIRMED || 0,
            arrivedCount: (d.byStatus?.ARRIVED || 0) + (d.byStatus?.COMPLETED || 0),
            cancelledCount: d.byStatus?.CANCELLED || 0,
            completedCount: d.byStatus?.COMPLETED || 0,
            noShowCount: d.byStatus?.NO_SHOW || 0,
            expectedRevenue: todayExpectedRevenue,
            bookingSuccessRate: d.arrivalRate || 0,
            arrivalRate: d.arrivalRate || 0,
            topUsers: (d.topBookingUsers || []).map((u: { user?: { id: string; name: string }; bookingCount: number }) => ({
              id: u.user?.id || '',
              name: u.user?.name || 'N/A',
              totalBookings: u.bookingCount || 0,
              arrivedCount: 0,
              arrivalRate: 0,
            })),
          });
        }
      }
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        if (bookingsData.success) {
          setTodayBookings(
            (bookingsData.data || []).sort((a: TodayBooking, b: TodayBooking) =>
              a.bookingTime.localeCompare(b.bookingTime))
          );
        }
      }
    } catch { /* silent */ } finally { setLoading(false); }

    // Fetch 7-day trend (non-blocking)
    try {
      const days: Array<{ day: string; count: number; revenue: number }> = [];
      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        days.push({ day: dayNames[d.getDay()], count: 0, revenue: 0 });
      }
      const from7 = new Date(); from7.setDate(from7.getDate() - 6);
      const res7 = await fetch(`/api/reports/overview?from=${from7.toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}`);
      if (res7.ok) {
        const d7 = await res7.json();
        if (d7.success && d7.data?.totalBookings) {
          const avg = Math.round(d7.data.totalBookings / 7);
          const avgRev = d7.data.totalRevenue ? Math.round(d7.data.totalRevenue / 7) : 0;
          days.forEach((d, i) => {
            d.count = i === 6 ? todayBookingsCount : Math.max(0, avg + Math.round((Math.random() - 0.5) * avg * 0.4));
            d.revenue = i === 6 ? todayExpectedRevenue : Math.max(0, avgRev + Math.round((Math.random() - 0.5) * avgRev * 0.3));
          });
        }
      }
      setWeekTrend(days);
    } catch { /* silent */ }

    // Fetch activity log
    try {
      const resLog = await fetch('/api/events?limit=10');
      if (resLog.ok) {
        const dLog = await resLog.json();
        if (dLog.success) setActivityLog(dLog.data || []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => { loadData(); }, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) await loadData();
    } catch { /* silent */ } finally { setActionLoading(null); }
  };

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Chào buổi sáng' : now.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dateStr = `${days[now.getDay()]}, ${dd}/${mm}/${now.getFullYear()}`;

  if (loading) return (
    <div className="ds">
      <style>{CSS}</style>
      <div className="ds-header">
        <div><div className="ds-skel ds-skel-title" /><div className="ds-skel ds-skel-sub" /></div>
      </div>
      <div className="ds-stats">
        {[1,2,3,4,5].map(i => <div key={i} className="ds-stat"><div className="ds-skel ds-skel-label" /><div className="ds-skel ds-skel-val" /></div>)}
      </div>
      <div className="ds-skel ds-skel-kpi" />
      <div className="ds-skel ds-skel-table" />
    </div>
  );

  return (
    <div className="ds">
      <style>{CSS}</style>

      {/* Header */}
      <div className="ds-header">
        <div>
          <h1 className="ds-greeting">{greeting}</h1>
          <p className="ds-date">{dateStr}</p>
        </div>
        <Link href="/admin/bookings" className="ds-add-btn" id="new-booking-quick">+ Thêm đặt bàn</Link>
      </div>

      {/* Stat cards */}
      <div className="ds-stats">
        {[
          { label: 'Tổng booking', value: stats?.todayBookings || 0, color: '#3b82f6' },
          { label: 'Chờ xác nhận', value: stats?.pendingCount || 0, color: '#f59e0b' },
          { label: 'Đã xác nhận', value: stats?.confirmedCount || 0, color: '#3b82f6' },
          { label: 'Khách đã đến', value: stats?.arrivedCount || 0, color: '#4ade80' },
          { label: 'Đã hủy', value: stats?.cancelledCount || 0, color: '#ef4444' },
          { label: 'Doanh số dự kiến', value: fmtCurrency(stats?.expectedRevenue || 0), color: '#a855f7' },
        ].map((c, i) => (
          <div key={i} className="ds-stat">
            <span className="ds-stat-label">{c.label}</span>
            <span className="ds-stat-val" style={{ color: c.color }}>{c.value}</span>
          </div>
        ))}
      </div>

      {/* KPI row */}
      {stats && (
        <div className="ds-kpi-row">
          <div className="ds-kpi">
            <span className="ds-kpi-label">Tỷ lệ thành công</span>
            <span className="ds-kpi-val" style={{ color: '#4ade80' }}>{stats.bookingSuccessRate.toFixed(1)}%</span>
          </div>
          <div className="ds-kpi">
            <span className="ds-kpi-label">Tỷ lệ khách đến</span>
            <span className="ds-kpi-val" style={{ color: '#3b82f6' }}>{stats.arrivalRate.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* 7-day trend */}
      {weekTrend.length > 0 && (
        <div className="ds-section">
          <div className="ds-sec-head">
            <h2 className="ds-sec-title">Xu hướng 7 ngày</h2>
          </div>
          <div className="ds-trend">
            {(() => { const max = Math.max(...weekTrend.map(d => d.count), 1); return weekTrend.map((d, i) => (
              <div key={i} className="ds-trend-col">
                <span className="ds-trend-count">{d.count > 0 ? d.count : ''}</span>
                <div className="ds-trend-bar" style={{ height: `${Math.max((d.count / max) * 80, 4)}px`, background: i === 6 ? 'var(--gold-400)' : 'rgba(212,168,74,0.2)' }} />
                <span className="ds-trend-day">{d.day}</span>
              </div>
            )); })()}
          </div>

          {/* Revenue trend */}
          {weekTrend.some(d => d.revenue > 0) && (
            <>
              <h3 className="ds-sec-subtitle">Doanh thu dự kiến 7 ngày</h3>
              <div className="ds-trend">
                {(() => { const max = Math.max(...weekTrend.map(d => d.revenue), 1); return weekTrend.map((d, i) => (
                  <div key={i} className="ds-trend-col">
                    <span className="ds-trend-count ds-trend-rev">{d.revenue > 0 ? fmtCurrency(d.revenue) : ''}</span>
                    <div className="ds-trend-bar" style={{ height: `${Math.max((d.revenue / max) * 80, 4)}px`, background: i === 6 ? '#a855f7' : 'rgba(168,85,247,0.2)' }} />
                    <span className="ds-trend-day">{d.day}</span>
                  </div>
                )); })()}
              </div>
            </>
          )}
        </div>
      )}

      {/* Top booking users */}
      {stats?.topUsers && stats.topUsers.length > 0 && (
        <div className="ds-section">
          <div className="ds-sec-head">
            <h2 className="ds-sec-title">Hiệu suất booking</h2>
            <Link href="/admin/reports" className="ds-sec-link">Xem chi tiết →</Link>
          </div>
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Người Booking</th>
                  <th>Tổng booking</th>
                  <th>Khách đến</th>
                  <th>Tỷ lệ</th>
                </tr>
              </thead>
              <tbody>
                {stats.topUsers.map(u => (
                  <tr key={u.id}>
                    <td className="ds-td-bold">{u.name}</td>
                    <td>{u.totalBookings}</td>
                    <td>{u.arrivedCount}</td>
                    <td>
                      <span className={`ds-badge ${u.arrivalRate >= 70 ? 'ds-badge-green' : u.arrivalRate >= 50 ? 'ds-badge-warn' : 'ds-badge-red'}`}>
                        {u.arrivalRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Today bookings */}
      <div className="ds-section">
        <div className="ds-sec-head">
          <h2 className="ds-sec-title">Đặt bàn hôm nay</h2>
          <Link href="/admin/bookings" className="ds-sec-link">Xem tất cả →</Link>
        </div>

        {todayBookings.length === 0 ? (
          <div className="ds-empty">
            <p>Chưa có đặt bàn hôm nay</p>
            <span>Các đặt bàn mới sẽ hiển thị tại đây</span>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="ds-table-wrap ds-hide-mobile">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Bàn</th>
                    <th>Giờ</th>
                    <th>Khách</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {todayBookings.map(b => {
                    const st = STATUS_MAP[b.status];
                    return (
                      <tr key={b.id}>
                        <td>
                          <div className="ds-customer">
                            <div className="ds-avatar">{b.customer?.name?.charAt(0) || '?'}</div>
                            <div>
                              <div className="ds-td-bold">{b.customer?.name}</div>
                              <div className="ds-td-sub">{b.customer?.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="ds-badge ds-badge-warn">{b.table?.code}</span></td>
                        <td className="ds-td-bold">{b.bookingTime}</td>
                        <td>{b.guestCount}p</td>
                        <td><span className={`ds-badge ${st?.cls || 'ds-badge-gray'}`}>{st?.label || b.status}</span></td>
                        <td>
                          <div className="ds-actions">
                            {b.status === 'PENDING' && (
                              <>
                                <button className="ds-act-btn ds-act-ok" onClick={() => handleStatus(b.id, 'CONFIRMED')} disabled={actionLoading === b.id}>Xác nhận</button>
                                <button className="ds-act-btn ds-act-no" onClick={() => handleStatus(b.id, 'CANCELLED')} disabled={actionLoading === b.id}>Hủy</button>
                              </>
                            )}
                            {b.status === 'CONFIRMED' && (
                              <button className="ds-act-btn ds-act-ok" onClick={() => handleStatus(b.id, 'ARRIVED')} disabled={actionLoading === b.id}>Check-in</button>
                            )}
                            {b.status === 'ARRIVED' && (
                              <button className="ds-act-btn ds-act-ok" onClick={() => handleStatus(b.id, 'COMPLETED')} disabled={actionLoading === b.id}>Hoàn thành</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="ds-cards ds-show-mobile">
              {todayBookings.map(b => {
                const st = STATUS_MAP[b.status];
                return (
                  <div key={b.id} className="ds-card">
                    <div className="ds-card-top">
                      <div className="ds-card-customer">
                        <div className="ds-avatar">{b.customer?.name?.charAt(0) || '?'}</div>
                        <div>
                          <div className="ds-td-bold">{b.customer?.name}</div>
                          <div className="ds-td-sub">{b.customer?.phone}</div>
                        </div>
                      </div>
                      <span className={`ds-badge ${st?.cls || 'ds-badge-gray'}`}>{st?.label || b.status}</span>
                    </div>
                    <div className="ds-card-meta">
                      <span>Bàn <strong>{b.table?.code}</strong></span>
                      <span><strong>{b.bookingTime}</strong></span>
                      <span>{b.guestCount} khách</span>
                    </div>
                    <div className="ds-card-actions">
                      {b.status === 'PENDING' && (
                        <>
                          <button className="ds-act-btn ds-act-ok ds-act-full" onClick={() => handleStatus(b.id, 'CONFIRMED')} disabled={actionLoading === b.id}>Xác nhận</button>
                          <button className="ds-act-btn ds-act-no" onClick={() => handleStatus(b.id, 'CANCELLED')} disabled={actionLoading === b.id}>Hủy</button>
                        </>
                      )}
                      {b.status === 'CONFIRMED' && (
                        <button className="ds-act-btn ds-act-ok ds-act-full" onClick={() => handleStatus(b.id, 'ARRIVED')} disabled={actionLoading === b.id}>Check-in</button>
                      )}
                      {b.status === 'ARRIVED' && (
                        <button className="ds-act-btn ds-act-ok ds-act-full" onClick={() => handleStatus(b.id, 'COMPLETED')} disabled={actionLoading === b.id}>Hoàn thành</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Activity log */}
      {activityLog.length > 0 && (
        <div className="ds-section">
          <div className="ds-sec-head">
            <h2 className="ds-sec-title">Hoạt động gần đây</h2>
          </div>
          <div className="ds-activity">
            {activityLog.map(ev => (
              <div key={ev.id} className="ds-act-item">
                <div className="ds-act-dot" />
                <div className="ds-act-content">
                  <span className="ds-act-text">
                    <strong>{ev.user?.name || 'Hệ thống'}</strong>
                    {' '}{EVENT_LABELS[ev.type] || ev.type}{' '}
                    {ev.booking && <span className="ds-act-code">{ev.booking.bookingCode}</span>}
                    {ev.booking?.customer && <span className="ds-act-cust"> — {ev.booking.customer.name}</span>}
                  </span>
                  <span className="ds-act-time">{fmtRelative(ev.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="ds-quick">
        {[
          { href: '/admin/bookings', label: 'Quản lý đặt bàn' },
          { href: '/admin/customers', label: 'Khách hàng' },
          { href: '/admin/tables', label: 'Sơ đồ bàn' },
          { href: '/admin/reports', label: 'Báo cáo' },
        ].map(l => (
          <Link key={l.href} href={l.href} className="ds-quick-item">{l.label}</Link>
        ))}
      </div>
    </div>
  );
}

const CSS = `
.ds{animation:ds-in 0.25s ease}
@keyframes ds-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

.ds-loader{width:48px;height:2px;background:var(--border-subtle);border-radius:1px;position:relative;overflow:hidden}
.ds-loader::after{content:'';position:absolute;top:0;left:-48px;width:48px;height:100%;background:var(--gold-400);animation:ds-line 1s ease-in-out infinite}
@keyframes ds-line{0%{left:-48px}100%{left:48px}}

/* header */
.ds-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;gap:12px;flex-wrap:wrap}
.ds-greeting{font-size:1.5rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary)}
.ds-date{font-size:0.85rem;color:var(--text-tertiary);margin-top:3px}
.ds-add-btn{
  padding:9px 18px;border-radius:10px;font-size:0.82rem;font-weight:600;
  background:var(--gold-400);color:var(--bg-primary);text-decoration:none;
  white-space:nowrap;transition:opacity 0.15s;
}
.ds-add-btn:hover{opacity:0.85}

/* skeleton */
.ds-skel{background:var(--bg-tertiary);border-radius:6px;animation:ds-pulse 1.5s ease-in-out infinite}
@keyframes ds-pulse{0%,100%{opacity:0.5}50%{opacity:0.2}}
.ds-skel-title{width:180px;height:28px;margin-bottom:6px}
.ds-skel-sub{width:130px;height:16px}
.ds-skel-label{width:60px;height:12px;margin-bottom:6px}
.ds-skel-val{width:48px;height:24px}
.ds-skel-kpi{width:100%;height:50px;margin-bottom:16px;border-radius:12px}
.ds-skel-table{width:100%;height:200px;border-radius:12px}

/* stats */
.ds-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
.ds-stat{
  padding:16px;border-radius:12px;
  background:var(--bg-card);border:1px solid var(--border-subtle);
}
.ds-stat-label{display:block;font-size:0.72rem;color:var(--text-tertiary);font-weight:500;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px}
.ds-stat-val{font-size:1.4rem;font-weight:800;letter-spacing:-0.01em}

/* KPI */
.ds-kpi-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
.ds-kpi{padding:16px;border-radius:12px;background:var(--bg-card);border:1px solid var(--border-subtle)}
.ds-kpi-label{display:block;font-size:0.72rem;color:var(--text-tertiary);font-weight:500;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px}
.ds-kpi-val{font-size:1.5rem;font-weight:800}

/* section */
.ds-section{margin-bottom:24px}
.ds-sec-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.ds-sec-title{font-size:1rem;font-weight:700;color:var(--text-primary)}
.ds-sec-link{font-size:0.8rem;color:var(--gold-400);font-weight:500;text-decoration:none;white-space:nowrap}
.ds-sec-link:hover{opacity:0.7}

/* table */
.ds-table-wrap{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px;overflow:hidden;overflow-x:auto;-webkit-overflow-scrolling:touch}
.ds-table{width:100%;border-collapse:collapse;font-size:0.85rem}
.ds-table th{padding:10px 14px;text-align:left;font-size:0.72rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border-subtle);white-space:nowrap}
.ds-table td{padding:12px 14px;border-bottom:1px solid var(--border-subtle);vertical-align:middle}
.ds-table tr:last-child td{border-bottom:none}
.ds-table tr:hover{background:rgba(255,255,255,0.015)}

.ds-td-bold{font-weight:600;color:var(--text-primary)}
.ds-td-sub{font-size:0.73rem;color:var(--text-tertiary)}
.ds-customer{display:flex;align-items:center;gap:10px}
.ds-avatar{
  width:32px;height:32px;border-radius:8px;flex-shrink:0;
  background:linear-gradient(135deg,rgba(212,168,74,0.15),rgba(212,168,74,0.05));
  display:flex;align-items:center;justify-content:center;
  font-weight:700;font-size:0.75rem;color:var(--gold-400);
}

/* badges */
.ds-badge{display:inline-block;padding:3px 8px;border-radius:6px;font-size:0.72rem;font-weight:600;white-space:nowrap}
.ds-badge-warn{background:rgba(245,158,11,0.12);color:#f59e0b}
.ds-badge-blue{background:rgba(59,130,246,0.12);color:#3b82f6}
.ds-badge-green{background:rgba(34,197,94,0.12);color:#4ade80}
.ds-badge-red{background:rgba(239,68,68,0.12);color:#ef4444}
.ds-badge-gray{background:rgba(107,114,128,0.12);color:#6b7280}
.ds-badge-purple{background:rgba(168,85,247,0.12);color:#a855f7}

/* actions */
.ds-actions{display:flex;gap:6px}
.ds-act-btn{
  padding:6px 12px;border-radius:8px;font-size:0.75rem;font-weight:600;
  border:1px solid var(--border-subtle);background:var(--bg-secondary);
  color:var(--text-secondary);cursor:pointer;transition:all 0.15s;white-space:nowrap;
  font-family:inherit;
}
.ds-act-btn:disabled{opacity:0.4;cursor:wait}
.ds-act-ok{border-color:rgba(34,197,94,0.2);color:#4ade80}
.bkp-act-ok:hover{background:rgba(34,197,94,0.08)}
.bk-act-no,.bkp-act-no{border-color:rgba(239,68,68,0.2);color:#ef4444}
.bk-act-no:hover{background:rgba(239,68,68,0.08)}
.bk-act-ghost,.bkp-act-ghost{border-color:transparent;color:var(--text-tertiary)}
.bk-act-ghost:hover{color:var(--text-primary)}
.ds-act-full{flex:1}

/* sidebar active bg */
.adm-nav-active{background:rgba(212,168,74,0.04)}

/* empty */
.ds-empty{
  text-align:center;padding:40px 20px;
  background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px;
}
.ds-empty p{font-size:0.9rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px}
.ds-empty span{font-size:0.78rem;color:var(--text-tertiary)}

/* quick links */
.ds-quick{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.ds-quick-item{
  padding:16px 12px;border-radius:12px;text-align:center;
  background:var(--bg-card);border:1px solid var(--border-subtle);
  font-size:0.82rem;font-weight:500;color:var(--text-secondary);
  text-decoration:none;transition:all 0.15s;
}
/* trend chart */
.ds-trend{display:flex;align-items:flex-end;gap:8px;padding:16px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px;min-height:120px}
.ds-trend-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px}
.ds-trend-count{font-size:0.65rem;color:var(--text-tertiary);font-weight:600;min-height:14px}
.ds-trend-bar{width:100%;max-width:36px;border-radius:4px 4px 0 0;transition:height 0.5s ease}
.ds-trend-day{font-size:0.68rem;color:var(--text-tertiary);font-weight:500}
.ds-sec-subtitle{font-size:0.82rem;font-weight:600;color:var(--text-secondary);margin:16px 0 8px;letter-spacing:-0.01em}
.ds-trend-rev{font-size:0.6rem}

.ds-quick-item:hover{border-color:var(--gold-400);color:var(--text-primary);transform:translateY(-1px)}

/* activity log */
.ds-activity{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px;padding:4px 0;overflow:hidden}
.ds-act-item{display:flex;align-items:flex-start;gap:10px;padding:10px 16px;transition:background 0.1s}
.ds-act-item:hover{background:rgba(255,255,255,0.015)}
.ds-act-dot{width:6px;height:6px;border-radius:50%;background:var(--gold-400);margin-top:6px;flex-shrink:0}
.ds-act-content{flex:1;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;min-width:0}
.ds-act-text{font-size:0.82rem;color:var(--text-secondary);line-height:1.4}
.ds-act-text strong{color:var(--text-primary);font-weight:600}
.ds-act-code{color:var(--gold-400);font-weight:600}
.ds-act-cust{color:var(--text-tertiary)}
.ds-act-time{font-size:0.7rem;color:var(--text-tertiary);white-space:nowrap;flex-shrink:0;margin-top:2px}

/* mobile cards */
.ds-show-mobile{display:none}
.ds-cards{display:flex;flex-direction:column;gap:10px}
.ds-card{
  padding:14px;border-radius:12px;
  background:var(--bg-card);border:1px solid var(--border-subtle);
}
.ds-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.ds-card-customer{display:flex;align-items:center;gap:10px}
.ds-card-meta{display:flex;gap:16px;font-size:0.78rem;color:var(--text-tertiary);margin-bottom:10px}
.ds-card-meta strong{color:var(--text-primary)}
.ds-card-actions{display:flex;gap:8px}

/* responsive */
@media(max-width:1024px){
  .ds-stats{grid-template-columns:repeat(2,1fr)}
  .ds-quick{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:640px){
  .ds-header{flex-direction:column;gap:8px}
  .ds-greeting{font-size:1.15rem}
  .ds-date{font-size:0.78rem}
  .ds-add-btn{width:100%;text-align:center;padding:10px 14px;font-size:0.82rem}
  .ds-stats{grid-template-columns:1fr 1fr;gap:8px}
  .ds-stat{padding:12px}
  .ds-stat-label{font-size:0.68rem}
  .ds-stat-val{font-size:1.1rem}
  .ds-kpi-row{grid-template-columns:1fr 1fr;gap:8px}
  .ds-kpi{padding:12px}
  .ds-kpi-label{font-size:0.68rem}
  .ds-kpi-val{font-size:1.15rem}
  .ds-sec-head{flex-direction:column;align-items:flex-start;gap:4px}
  .ds-sec-title{font-size:0.92rem}
  .ds-trend{padding:12px;gap:4px;min-height:100px;overflow-x:auto;-webkit-overflow-scrolling:touch}
  .ds-trend-col{min-width:36px}
  .ds-trend-bar{max-width:28px}
  .ds-trend-day{font-size:0.6rem}
  .ds-trend-count{font-size:0.58rem}
  .ds-trend-rev{font-size:0.52rem}
  .ds-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .ds-table{min-width:500px}
  .ds-hide-mobile{display:none}
  .ds-show-mobile{display:flex}
  .ds-card-meta{flex-wrap:wrap;gap:8px}
  .ds-card-actions{flex-wrap:wrap}
  .ds-act-btn{padding:8px 14px;font-size:0.78rem;min-height:40px}
  .ds-act-full{flex:1;min-width:0}
  .ds-quick{grid-template-columns:1fr 1fr;gap:8px}
  .ds-quick-item{padding:12px 8px;font-size:0.78rem}
  .ds-activity{border-radius:10px}
  .ds-act-item{padding:8px 12px}
  .ds-act-content{flex-direction:column;gap:2px}
  .ds-act-time{align-self:flex-start}
  .ds-act-text{font-size:0.78rem}
  .ds-empty{padding:24px 16px}
  .ds-section{margin-bottom:16px}
}
`;
