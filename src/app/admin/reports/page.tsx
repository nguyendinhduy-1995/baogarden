'use client';

import { useState, useEffect, useCallback } from 'react';

interface OverviewData {
  totalBookings: number;
  estimatedRevenue: number;
  arrivalRate: number;
  completionRate: number;
  byStatus: Record<string, number>;
  byHour: Record<string, number>;
  topBookingUsers: Array<{
    user: { id: string; name: string };
    bookingCount: number;
    arrivedCount: number;
    arrivalRate: number;
  }>;
  tablePerformance: Array<{
    table: { id: string; code: string; name: string; area: { name: string } };
    bookingCount: number;
    arrivedCount: number;
    totalDeposit: number;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  ARRIVED: 'Đã đến',
  CANCELLED: 'Đã hủy',
  NO_SHOW: 'Không đến',
  COMPLETED: 'Hoàn tất',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  ARRIVED: '#4ade80',
  CANCELLED: '#ef4444',
  NO_SHOW: '#9ca3af',
  COMPLETED: '#a855f7',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'decimal', maximumFractionDigits: 0 }).format(amount) + 'đ';
}

function getDefaultDateRange(): { from: string; to: string } {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 30);
  return {
    from: from.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0],
  };
}

export default function ReportsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const defaults = getDefaultDateRange();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const res = await fetch(`/api/reports/overview?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setOverview(data.data);
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const quickDateRanges = [
    { label: 'Hôm nay', days: 0 },
    { label: '7 ngày', days: 7 },
    { label: '30 ngày', days: 30 },
    { label: '90 ngày', days: 90 },
  ];

  const handleQuickDate = (days: number) => {
    const today = new Date();
    const from = new Date(today);
    if (days > 0) from.setDate(today.getDate() - days);
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  };

  if (loading) {
    return (
      <div className="rp-loading">
        <style>{CSS}</style>
        <div className="rp-loader" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="empty-state">
        <style>{CSS}</style>
        <h3>Không có dữ liệu</h3>
        <p>Chọn khoảng thời gian khác để xem báo cáo</p>
      </div>
    );
  }

  const statusEntries = Object.entries(overview.byStatus || {}).filter(([, count]) => count > 0);
  const hourEntries = Object.entries(overview.byHour || {}).sort(([a], [b]) => parseInt(a) - parseInt(b));
  const maxHourCount = Math.max(...hourEntries.map(([, count]) => count), 1);

  return (
    <div className="rp">
      <style>{CSS}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Báo cáo &amp; thống kê</h1>
          <p className="page-subtitle">Tổng quan hoạt động đặt bàn</p>
        </div>
      </div>

      {/* Date Filters */}
      <div className="rp-filters">
        <div className="rp-date-inputs">
          <span className="rp-date-label">Từ</span>
          <input
            type="date" value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rp-date-input"
          />
          <span className="rp-date-label">đến</span>
          <input
            type="date" value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rp-date-input"
          />
        </div>
        <div className="rp-quick-btns">
          {quickDateRanges.map(range => (
            <button
              key={range.days}
              className="btn btn-sm btn-ghost"
              onClick={() => handleQuickDate(range.days)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="rp-stats">
        <div className="stat-card">
          <div className="stat-label">Tổng booking</div>
          <div className="stat-value rp-color-blue">{overview.totalBookings}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Doanh số dự kiến</div>
          <div className="stat-value rp-color-green">{formatCurrency(overview.estimatedRevenue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tỷ lệ thành công</div>
          <div className="stat-value rp-color-purple">{overview.completionRate?.toFixed(1) || 0}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tỷ lệ khách đến</div>
          <div className="stat-value rp-color-amber">{overview.arrivalRate?.toFixed(1) || 0}%</div>
        </div>
      </div>

      {/* Booking by Status */}
      <div className="card rp-card">
        <h3 className="rp-section-title">Booking theo trạng thái</h3>
        {statusEntries.length > 0 ? (
          <div className="rp-status-list">
            {statusEntries.map(([status, count]) => {
              const total = overview.totalBookings || 1;
              const pct = ((count / total) * 100).toFixed(1);
              return (
                <div key={status} className="rp-status-item">
                  <div className="rp-status-row">
                    <span className="rp-status-name" style={{ color: STATUS_COLORS[status] || 'var(--text-secondary)' }}>
                      {STATUS_LABELS[status] || status}
                    </span>
                    <span className="rp-status-count">{count} ({pct}%)</span>
                  </div>
                  <div className="rp-bar-track">
                    <div
                      className="rp-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: STATUS_COLORS[status] || 'var(--gold-400)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rp-empty-text">Không có dữ liệu</p>
        )}
      </div>

      {/* Booking by Hour */}
      <div className="card rp-card">
        <h3 className="rp-section-title">Phân bổ theo giờ</h3>
        {hourEntries.length > 0 ? (
          <div className="rp-chart-scroll">
            <div className="rp-chart">
              {hourEntries.map(([hour, count]) => (
                <div key={hour} className="rp-chart-col">
                  <span className="rp-chart-count">
                    {count > 0 ? count : ''}
                  </span>
                  <div
                    className="rp-chart-bar"
                    style={{
                      height: `${Math.max((count / maxHourCount) * 140, 4)}px`,
                      background: count > 0 ? 'var(--gold-gradient)' : 'var(--bg-tertiary)',
                    }}
                  />
                  <span className="rp-chart-label">{hour}h</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="rp-empty-text">Không có dữ liệu</p>
        )}
      </div>

      {/* Staff Performance */}
      {overview.topBookingUsers && overview.topBookingUsers.length > 0 && (
        <div className="card rp-card">
          <h3 className="rp-section-title">Hiệu suất booking</h3>
          <div className="rp-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Người Booking</th>
                  <th>Tổng booking</th>
                  <th>Khách đến</th>
                  <th>Tỷ lệ</th>
                  <th>Đóng góp</th>
                </tr>
              </thead>
              <tbody>
                {overview.topBookingUsers.map((item, i) => {
                  const contribution = overview.totalBookings > 0
                    ? ((item.bookingCount / overview.totalBookings) * 100).toFixed(1)
                    : '0';
                  return (
                    <tr key={item.user?.id || i}>
                      <td className={i < 3 ? 'rp-rank-gold' : 'rp-rank'}>
                        {i + 1}
                      </td>
                      <td className="rp-td-bold">{item.user?.name || 'N/A'}</td>
                      <td>{item.bookingCount}</td>
                      <td>{item.arrivedCount || 0}</td>
                      <td>
                        <span className={`badge ${(item.arrivalRate || 0) >= 70 ? 'badge-green' : (item.arrivalRate || 0) >= 50 ? 'badge-gold' : 'badge-red'}`}>
                          {(item.arrivalRate || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <div className="rp-contrib">
                          <div className="rp-contrib-track">
                            <div className="rp-contrib-fill" style={{ width: `${contribution}%` }} />
                          </div>
                          <span className="rp-contrib-pct">{contribution}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table Performance */}
      {overview.tablePerformance && overview.tablePerformance.length > 0 && (
        <div className="card rp-card rp-card-last">
          <h3 className="rp-section-title">Hiệu suất bàn</h3>
          <div className="rp-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bàn</th>
                  <th>Khu vực</th>
                  <th>Tổng booking</th>
                  <th>Khách đến</th>
                  <th>Tổng cọc</th>
                  <th>Tỷ lệ lấp đầy</th>
                </tr>
              </thead>
              <tbody>
                {overview.tablePerformance.map((item) => {
                  const fillRate = item.bookingCount > 0
                    ? ((item.arrivedCount / item.bookingCount) * 100).toFixed(1)
                    : '0';
                  return (
                    <tr key={item.table?.id}>
                      <td>
                        <span className="rp-table-code">{item.table?.code}</span>
                        <span className="rp-table-name">{item.table?.name}</span>
                      </td>
                      <td className="rp-td-secondary">{item.table?.area?.name}</td>
                      <td className="rp-td-bold">{item.bookingCount}</td>
                      <td>{item.arrivedCount}</td>
                      <td className="rp-td-gold">{formatCurrency(item.totalDeposit || 0)}</td>
                      <td>
                        <div className="rp-contrib">
                          <div className="rp-fill-track">
                            <div
                              className="rp-fill-bar"
                              style={{
                                width: `${fillRate}%`,
                                background: parseFloat(fillRate) >= 70 ? '#4ade80' : parseFloat(fillRate) >= 50 ? '#f59e0b' : '#ef4444',
                              }}
                            />
                          </div>
                          <span className="rp-contrib-pct">{fillRate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
/* animation */
.rp{animation:rp-in 0.25s ease}
@keyframes rp-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* loader */
.rp-loading{display:flex;justify-content:center;padding:var(--space-4xl)}
.rp-loader{width:60px;height:2px;background:var(--border-subtle);border-radius:1px;position:relative;overflow:hidden}
.rp-loader::after{content:'';position:absolute;top:0;left:-60px;width:60px;height:100%;background:var(--gold-400);animation:rp-line 1.2s ease-in-out infinite}
@keyframes rp-line{0%{left:-60px}100%{left:60px}}

/* filters */
.rp-filters{display:flex;align-items:center;gap:var(--space-lg);margin-bottom:var(--space-2xl);flex-wrap:wrap}
.rp-date-inputs{display:flex;align-items:center;gap:8px}
.rp-date-label{font-size:0.8rem;color:var(--text-tertiary);font-weight:600}
.rp-date-input{
  padding:8px 12px;background:var(--bg-tertiary);
  border:1px solid var(--border-subtle);border-radius:var(--radius-md);
  font-size:0.85rem;font-family:inherit;color:var(--text-primary);
  min-height:44px;
}
.rp-quick-btns{display:flex;gap:var(--space-sm)}

/* stat cards */
.rp-stats{
  display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
  gap:var(--space-lg);margin-bottom:var(--space-2xl);
}

/* color utilities */
.rp-color-blue{color:#3b82f6}
.rp-color-green{color:#4ade80}
.rp-color-purple{color:#a855f7}
.rp-color-amber{color:#f59e0b}

/* card */
.rp-card{margin-bottom:var(--space-2xl);padding:var(--space-xl)}
.rp-card-last{margin-bottom:0}
.rp-section-title{font-size:1rem;font-weight:700;margin-bottom:var(--space-xl);color:var(--text-primary)}

/* status bars */
.rp-status-list{display:flex;flex-direction:column;gap:var(--space-md)}
.rp-status-row{display:flex;justify-content:space-between;margin-bottom:6px;font-size:0.85rem}
.rp-status-name{font-weight:600}
.rp-status-count{color:var(--text-tertiary)}
.rp-bar-track{width:100%;height:6px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden}
.rp-bar-fill{height:100%;border-radius:3px;transition:width 0.5s ease}

/* hourly chart */
.rp-chart-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
.rp-chart{display:flex;align-items:flex-end;gap:4px;height:180px;min-width:0}
.rp-chart-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:28px}
.rp-chart-count{font-size:0.65rem;color:var(--text-tertiary);margin-bottom:4px}
.rp-chart-bar{width:100%;max-width:32px;border-radius:4px 4px 0 0;transition:height 0.5s ease}
.rp-chart-label{font-size:0.7rem;color:var(--text-tertiary);margin-top:4px}

/* tables */
.rp-table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 calc(var(--space-xl) * -1);padding:0 var(--space-xl)}
.rp-rank-gold{font-weight:700;color:var(--gold-400)}
.rp-rank{font-weight:700;color:var(--text-tertiary)}
.rp-td-bold{font-weight:600}
.rp-td-secondary{font-size:0.85rem;color:var(--text-secondary)}
.rp-td-gold{color:var(--gold-400);font-weight:600}
.rp-table-code{font-weight:700;color:var(--gold-400)}
.rp-table-name{color:var(--text-secondary);margin-left:8px;font-size:0.85rem}

/* contribution bar */
.rp-contrib{display:flex;align-items:center;gap:8px}
.rp-contrib-track{width:80px;height:4px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden}
.rp-contrib-fill{height:100%;background:var(--gold-400);border-radius:2px}
.rp-contrib-pct{font-size:0.8rem;color:var(--text-tertiary);white-space:nowrap}
.rp-fill-track{width:60px;height:4px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden}
.rp-fill-bar{height:100%;border-radius:2px}

/* empty */
.rp-empty-text{color:var(--text-tertiary);font-size:0.85rem}

/* responsive */
@media(max-width:640px){
  .rp-filters{flex-direction:column;align-items:stretch;gap:var(--space-md)}
  .rp-date-inputs{flex-wrap:wrap;gap:6px}
  .rp-date-input{flex:1;min-width:0}
  .rp-quick-btns{flex-wrap:wrap}
  .rp-stats{grid-template-columns:1fr 1fr}
  .rp-chart-scroll{margin:0 calc(var(--space-xl) * -1);padding:0 var(--space-xl)}
  .rp-chart{min-width:500px}
  .rp-table-scroll{margin:0 calc(var(--space-xl) * -1);padding:0 var(--space-xl)}
  .rp-card{padding:var(--space-lg)}
  .rp-section-title{font-size:0.95rem}
}
`;
