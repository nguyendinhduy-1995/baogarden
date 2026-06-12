'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/* ═══ Types ═══ */
interface Analytics {
  today: { bookings: number; guests: number; byStatus: Record<string, number>; bySource: Record<string, number>; conversionRate: number };
  week: { bookings: number; guests: number; bySource: Record<string, number>; conversionRate: number };
  month: { bookings: number; guests: number; bySource: Record<string, number>; conversionRate: number; growthRate: number };
  dailyTrend: Array<{ date: string; count: number; guests: number }>;
  customerDistribution: Record<string, number>;
  popularTables: Array<{ code: string; area: string; bookings: number }>;
  peakHours: Record<string, number>;
  recentBookings: Array<{
    code: string; customer: string; phone: string; customerType: string;
    table: string; date: string; time: string; guests: number; status: string; source: string; createdAt: string;
  }>;
}

interface DailyEvent {
  id: string; dayIndex: number; dayName: string; dayShort: string;
  name: string; description: string; type: string; posterUrl: string | null; isActive: boolean;
}
interface WeeklyItem {
  id: string; day: string; program: string; artist: string; type: string; sortOrder: number; isActive: boolean;
}
interface UpcomingEvent {
  id: string; title: string; date: string; time: string; description: string; tag: string; sortOrder: number; isActive: boolean;
}

type Tab = 'analytics' | 'daily' | 'weekly' | 'upcoming';

const EVENT_TYPES = ['chill', 'ladies', 'acoustic', 'dj', 'party', 'recovery'];
const DAYS = [
  { index: 0, name: 'Thứ Hai', short: 'T2' }, { index: 1, name: 'Thứ Ba', short: 'T3' },
  { index: 2, name: 'Thứ Tư', short: 'T4' }, { index: 3, name: 'Thứ Năm', short: 'T5' },
  { index: 4, name: 'Thứ Sáu', short: 'T6' }, { index: 5, name: 'Thứ Bảy', short: 'T7' },
  { index: 6, name: 'Chủ Nhật', short: 'CN' },
];

const SOURCE_LABELS: Record<string, string> = { PUBLIC: 'Website', STAFF: 'Nhân viên', PHONE: 'Điện thoại', FACEBOOK: 'Facebook', ZALO: 'Zalo', WALK_IN: 'Walk-in' };
const STATUS_LABELS: Record<string, string> = { PENDING: 'Đợi xác nhận', CONFIRMED: 'Đã xác nhận', ARRIVED: 'Đã đến', CANCELLED: 'Đã hủy', NO_SHOW: 'Không đến', COMPLETED: 'Hoàn thành' };
const STATUS_COLORS: Record<string, string> = { PENDING: '#fbbf24', CONFIRMED: '#22c55e', ARRIVED: '#3b82f6', CANCELLED: '#ef4444', NO_SHOW: '#6b7280', COMPLETED: '#8b5cf6' };
const CTYPE_LABELS: Record<string, string> = { VIP: '⭐ VIP', RETURNING: '🔄 Quay lại', NEW: '🆕 Mới', BLACKLIST: '🚫 Blacklist' };

export default function MarketingPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [tab, setTab] = useState<Tab>('analytics');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [daily, setDaily] = useState<DailyEvent[]>([]);
  const [weekly, setWeekly] = useState<WeeklyItem[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [mkToast, setMkToast] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ endpoint: string; id: string } | null>(null);

  const showMkToast = (msg: string) => {
    setMkToast(msg);
    setTimeout(() => setMkToast(''), 3000);
  };

  // Auth check
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.success || !d.user || !['MARKETING', 'ADMIN', 'MANAGER'].includes(d.user.role)) {
        router.replace('/login'); return;
      }
      setUser(d.user);
    }).catch(() => router.replace('/login'));
  }, [router]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [a, d, w, u] = await Promise.all([
        fetch('/api/marketing/analytics').then(r => r.json()),
        fetch('/api/events/daily?admin=1').then(r => r.json()),
        fetch('/api/events/weekly?admin=1').then(r => r.json()),
        fetch('/api/events/upcoming?admin=1').then(r => r.json()),
      ]);
      if (a.success) setAnalytics(a.data);
      setDaily(d.data || []);
      setWeekly(w.data || []);
      setUpcoming(u.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { if (user) fetchAll(); }, [user, fetchAll]);

  const handleSave = async (endpoint: string, id: string | null, body: Record<string, unknown>) => {
    const url = id ? `${endpoint}/${id}` : endpoint;
    const res = await fetch(url, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { setEditId(null); setShowAdd(false); setForm({}); await fetchAll(); }
    else { const data = await res.json(); showMkToast(data.error || 'Có lỗi xảy ra'); }
  };

  const handleDelete = async (endpoint: string, id: string) => {
    setConfirmDialog({ endpoint, id });
  };

  const confirmDelete = async () => {
    if (!confirmDialog) return;
    const res = await fetch(`${confirmDialog.endpoint}/${confirmDialog.id}`, { method: 'DELETE' });
    if (res.ok) await fetchAll();
    setConfirmDialog(null);
  };

  const handleToggle = async (endpoint: string, id: string, isActive: boolean) => {
    await fetch(`${endpoint}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !isActive }) });
    await fetchAll();
  };

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* */ }
    router.replace('/login');
  };

  if (!user) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0f' }}><div style={{ color: '#D4A84A', fontSize: 14 }}>Đang tải...</div></div>;

  const a = analytics;
  const maxTrend = a ? Math.max(...a.dailyTrend.map(d => d.count), 1) : 1;
  const peakEntries = a ? Object.entries(a.peakHours).sort((x, y) => y[1] - x[1]) : [];
  const maxPeak = peakEntries.length > 0 ? peakEntries[0][1] : 1;

  return (
    <div className="mk">
      <style>{CSS}</style>

      {/* Header */}
      <header className="mk-header">
        <div className="mk-brand">
          <h1 className="mk-logo">BÁO GARDEN</h1>
          <span className="mk-role">Marketing Dashboard</span>
        </div>
        <div className="mk-user">
          <span className="mk-uname">{user.name}</span>
          <button onClick={handleLogout} className="mk-logout">Đăng xuất</button>
        </div>
      </header>

      {/* Tabs */}
      <div className="mk-tabs">
        {([
          { key: 'analytics' as Tab, label: '📊 Analytics', count: '' },
          { key: 'daily' as Tab, label: '🎵 Hôm Nay Có Gì?', count: String(daily.length) },
          { key: 'weekly' as Tab, label: '🎧 DJ · Dancer · Ca Sĩ', count: String(weekly.length) },
          { key: 'upcoming' as Tab, label: '🎉 Sự Kiện Sắp Tới', count: String(upcoming.length) },
        ]).map(t => (
          <button key={t.key} className={`mk-tab ${tab === t.key ? 'mk-tab-active' : ''}`}
            onClick={() => { setTab(t.key); setEditId(null); setShowAdd(false); setForm({}); }}>
            {t.label}
            {t.count && <span className="mk-tab-badge">{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mk-loading">Đang tải dữ liệu...</div>
      ) : (
        <>
          {/* ═══ ANALYTICS TAB ═══ */}
          {tab === 'analytics' && a && (
            <div className="mk-analytics">
              {/* KPI Cards */}
              <div className="mk-kpi-grid">
                <div className="mk-kpi mk-kpi-gold">
                  <div className="mk-kpi-label">Hôm nay</div>
                  <div className="mk-kpi-value">{a.today.bookings}</div>
                  <div className="mk-kpi-sub">{a.today.guests} khách · {a.today.conversionRate}% chuyển đổi</div>
                </div>
                <div className="mk-kpi">
                  <div className="mk-kpi-label">Tuần này</div>
                  <div className="mk-kpi-value">{a.week.bookings}</div>
                  <div className="mk-kpi-sub">{a.week.guests} khách · {a.week.conversionRate}% chuyển đổi</div>
                </div>
                <div className="mk-kpi">
                  <div className="mk-kpi-label">Tháng này</div>
                  <div className="mk-kpi-value">{a.month.bookings}</div>
                  <div className="mk-kpi-sub">{a.month.guests} khách · <span className={a.month.growthRate >= 0 ? 'mk-up' : 'mk-down'}>{a.month.growthRate >= 0 ? '↑' : '↓'}{Math.abs(a.month.growthRate)}%</span> vs tháng trước</div>
                </div>
                <div className="mk-kpi">
                  <div className="mk-kpi-label">Tỷ lệ chuyển đổi</div>
                  <div className="mk-kpi-value">{a.month.conversionRate}%</div>
                  <div className="mk-kpi-sub">Tháng này</div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="mk-charts">
                {/* Daily Trend */}
                <div className="mk-card">
                  <h3 className="mk-card-title">Xu hướng 7 ngày qua</h3>
                  <div className="mk-bars">
                    {a.dailyTrend.map((d, i) => (
                      <div key={i} className="mk-bar-col">
                        <div className="mk-bar-val">{d.count}</div>
                        <div className="mk-bar-track">
                          <div className="mk-bar-fill" style={{ height: `${(d.count / maxTrend) * 100}%` }} />
                        </div>
                        <div className="mk-bar-label">{d.date.split(',')[0]}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Source Breakdown */}
                <div className="mk-card">
                  <h3 className="mk-card-title">Nguồn đặt bàn (tháng)</h3>
                  <div className="mk-source-list">
                    {Object.entries(a.month.bySource).sort((x, y) => y[1] - x[1]).map(([src, cnt]) => (
                      <div key={src} className="mk-source-row">
                        <span className="mk-source-name">{SOURCE_LABELS[src] || src}</span>
                        <div className="mk-source-bar-wrap">
                          <div className="mk-source-bar" style={{ width: `${(cnt / a.month.bookings) * 100}%` }} />
                        </div>
                        <span className="mk-source-cnt">{cnt}</span>
                        <span className="mk-source-pct">{Math.round((cnt / a.month.bookings) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Status + Customers + Peak */}
              <div className="mk-charts mk-charts-3">
                {/* Status */}
                <div className="mk-card">
                  <h3 className="mk-card-title">Trạng thái hôm nay</h3>
                  <div className="mk-status-grid">
                    {Object.entries(a.today.byStatus).map(([status, cnt]) => (
                      <div key={status} className="mk-status-item">
                        <div className="mk-status-dot" style={{ background: STATUS_COLORS[status] || '#666' }} />
                        <span className="mk-status-label">{STATUS_LABELS[status] || status}</span>
                        <span className="mk-status-cnt">{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Distribution */}
                <div className="mk-card">
                  <h3 className="mk-card-title">Phân loại khách hàng</h3>
                  <div className="mk-cust-list">
                    {Object.entries(a.customerDistribution).map(([type, cnt]) => (
                      <div key={type} className="mk-cust-row">
                        <span className="mk-cust-type">{CTYPE_LABELS[type] || type}</span>
                        <span className="mk-cust-cnt">{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Peak Hours */}
                <div className="mk-card">
                  <h3 className="mk-card-title">Giờ cao điểm</h3>
                  <div className="mk-peak-list">
                    {peakEntries.slice(0, 6).map(([hour, cnt]) => (
                      <div key={hour} className="mk-peak-row">
                        <span className="mk-peak-hour">{hour}</span>
                        <div className="mk-peak-bar-wrap">
                          <div className="mk-peak-bar" style={{ width: `${(cnt / maxPeak) * 100}%` }} />
                        </div>
                        <span className="mk-peak-cnt">{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Popular Tables + Recent Bookings */}
              <div className="mk-charts">
                <div className="mk-card">
                  <h3 className="mk-card-title">Bàn phổ biến nhất</h3>
                  <table className="mk-table">
                    <thead><tr><th>Bàn</th><th>Khu vực</th><th>Lượt đặt</th></tr></thead>
                    <tbody>
                      {a.popularTables.slice(0, 8).map((t, i) => (
                        <tr key={i}><td className="mk-td-code">{t.code}</td><td>{t.area}</td><td className="mk-td-num">{t.bookings}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mk-card">
                  <h3 className="mk-card-title">Booking gần đây</h3>
                  <div className="mk-recent-list">
                    {a.recentBookings.slice(0, 6).map((b, i) => (
                      <div key={i} className="mk-recent-row">
                        <div className="mk-recent-main">
                          <span className="mk-recent-name">{b.customer}</span>
                          <span className="mk-recent-meta">{b.table} · {b.time} · {b.guests} khách</span>
                        </div>
                        <div className="mk-recent-right">
                          <span className="mk-recent-status" style={{ color: STATUS_COLORS[b.status] || '#888' }}>{STATUS_LABELS[b.status]}</span>
                          <span className="mk-recent-src">{SOURCE_LABELS[b.source] || b.source}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ DAILY EVENTS TAB ═══ */}
          {tab === 'daily' && (
            <div className="mk-events">
              <div className="mk-ev-toolbar">
                <h2 className="mk-ev-title">Hôm Nay Ở Báo Có Gì?</h2>
                <button className="mk-btn-add" onClick={() => { setShowAdd(!showAdd); setEditId(null); setForm({}); }}>{showAdd ? '✕ Đóng' : '+ Thêm'}</button>
              </div>
              {showAdd && (
                <div className="mk-ev-card mk-ev-card-add">
                  <div className="mk-ev-form-grid">
                    <select value={form.dayIndex || ''} onChange={e => setForm({...form, dayIndex: e.target.value})} className="mk-input">
                      <option value="">Chọn ngày</option>
                      {DAYS.map(d => <option key={d.index} value={d.index}>{d.name}</option>)}
                    </select>
                    <input className="mk-input" placeholder="Tên sự kiện" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
                    <select value={form.type || ''} onChange={e => setForm({...form, type: e.target.value})} className="mk-input">
                      <option value="">Loại</option>
                      {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input className="mk-input" placeholder="Poster URL" value={form.posterUrl || ''} onChange={e => setForm({...form, posterUrl: e.target.value})} />
                  </div>
                  <textarea className="mk-textarea" placeholder="Mô tả" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
                  <button className="mk-btn-save" onClick={() => {
                    const day = DAYS[Number(form.dayIndex)];
                    if (!day || !form.name || !form.type || !form.description) { showMkToast('Vui lòng điền đầy đủ'); return; }
                    handleSave('/api/events/daily', null, { dayIndex: day.index, dayName: day.name, dayShort: day.short, name: form.name, description: form.description, type: form.type, posterUrl: form.posterUrl || null });
                  }}>Lưu</button>
                </div>
              )}
              {daily.map(ev => (
                <div key={ev.id} className={`mk-ev-card ${!ev.isActive ? 'mk-ev-inactive' : ''}`}>
                  {editId === ev.id ? (
                    <>
                      <div className="mk-ev-form-grid">
                        <input className="mk-input" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} placeholder="Tên" />
                        <select value={form.type || ''} onChange={e => setForm({...form, type: e.target.value})} className="mk-input">
                          {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input className="mk-input" placeholder="Poster URL" value={form.posterUrl || ''} onChange={e => setForm({...form, posterUrl: e.target.value})} />
                      </div>
                      <textarea className="mk-textarea" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
                      <div className="mk-ev-actions">
                        <button className="mk-btn-save" onClick={() => handleSave('/api/events/daily', ev.id, { name: form.name, description: form.description, type: form.type, posterUrl: form.posterUrl || null })}>Lưu</button>
                        <button className="mk-btn-cancel" onClick={() => { setEditId(null); setForm({}); }}>Hủy</button>
                      </div>
                    </>
                  ) : (
                    <div className="mk-ev-row">
                      <div className="mk-ev-info">
                        <span className="mk-ev-day">{ev.dayShort}</span>
                        <span className="mk-ev-type" data-type={ev.type}>{ev.type}</span>
                        <span className="mk-ev-name">{ev.name}</span>
                      </div>
                      <p className="mk-ev-desc">{ev.description}</p>
                      <div className="mk-ev-ctrls">
                        <button className="mk-btn-toggle" onClick={() => handleToggle('/api/events/daily', ev.id, ev.isActive)}>{ev.isActive ? '🟢' : '⚫'}</button>
                        <button className="mk-btn-sm" onClick={() => { setEditId(ev.id); setForm({ name: ev.name, description: ev.description, type: ev.type, posterUrl: ev.posterUrl || '' }); }}>Sửa</button>
                        <button className="mk-btn-sm mk-btn-del" onClick={() => handleDelete('/api/events/daily', ev.id)}>Xóa</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {daily.length === 0 && <div className="mk-empty">Chưa có sự kiện nào</div>}
            </div>
          )}

          {/* ═══ WEEKLY SCHEDULE TAB ═══ */}
          {tab === 'weekly' && (
            <div className="mk-events">
              <div className="mk-ev-toolbar">
                <h2 className="mk-ev-title">Lịch DJ – Dancer – Ca Sĩ</h2>
                <button className="mk-btn-add" onClick={() => { setShowAdd(!showAdd); setEditId(null); setForm({}); }}>{showAdd ? '✕ Đóng' : '+ Thêm'}</button>
              </div>
              {showAdd && (
                <div className="mk-ev-card mk-ev-card-add">
                  <div className="mk-ev-form-grid">
                    <select value={form.day || ''} onChange={e => setForm({...form, day: e.target.value})} className="mk-input">
                      <option value="">Chọn ngày</option>
                      {DAYS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                    </select>
                    <input className="mk-input" placeholder="Chương trình" value={form.program || ''} onChange={e => setForm({...form, program: e.target.value})} />
                    <input className="mk-input" placeholder="Nghệ sĩ" value={form.artist || ''} onChange={e => setForm({...form, artist: e.target.value})} />
                    <input className="mk-input" placeholder="Loại (DJ, Live, Acoustic)" value={form.type || ''} onChange={e => setForm({...form, type: e.target.value})} />
                    <input className="mk-input" placeholder="Thứ tự" type="number" value={form.sortOrder || ''} onChange={e => setForm({...form, sortOrder: e.target.value})} />
                  </div>
                  <button className="mk-btn-save" onClick={() => {
                    if (!form.day || !form.program || !form.artist || !form.type) { showMkToast('Vui lòng điền đầy đủ'); return; }
                    handleSave('/api/events/weekly', null, { day: form.day, program: form.program, artist: form.artist, type: form.type, sortOrder: Number(form.sortOrder || 0) });
                  }}>Lưu</button>
                </div>
              )}
              {weekly.map(item => (
                <div key={item.id} className={`mk-ev-card ${!item.isActive ? 'mk-ev-inactive' : ''}`}>
                  {editId === item.id ? (
                    <>
                      <div className="mk-ev-form-grid">
                        <select value={form.day || ''} onChange={e => setForm({...form, day: e.target.value})} className="mk-input">
                          {DAYS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                        </select>
                        <input className="mk-input" value={form.program || ''} onChange={e => setForm({...form, program: e.target.value})} placeholder="Chương trình" />
                        <input className="mk-input" value={form.artist || ''} onChange={e => setForm({...form, artist: e.target.value})} placeholder="Nghệ sĩ" />
                        <input className="mk-input" value={form.type || ''} onChange={e => setForm({...form, type: e.target.value})} placeholder="Loại" />
                      </div>
                      <div className="mk-ev-actions">
                        <button className="mk-btn-save" onClick={() => handleSave('/api/events/weekly', item.id, { day: form.day, program: form.program, artist: form.artist, type: form.type, sortOrder: Number(form.sortOrder || 0) })}>Lưu</button>
                        <button className="mk-btn-cancel" onClick={() => { setEditId(null); setForm({}); }}>Hủy</button>
                      </div>
                    </>
                  ) : (
                    <div className="mk-ev-row">
                      <div className="mk-ev-info">
                        <span className="mk-ev-day">{item.day}</span>
                        <span className="mk-ev-type">{item.type}</span>
                        <span className="mk-ev-name">{item.program}</span>
                      </div>
                      <p className="mk-ev-desc">{item.artist}</p>
                      <div className="mk-ev-ctrls">
                        <button className="mk-btn-toggle" onClick={() => handleToggle('/api/events/weekly', item.id, item.isActive)}>{item.isActive ? '🟢' : '⚫'}</button>
                        <button className="mk-btn-sm" onClick={() => { setEditId(item.id); setForm({ day: item.day, program: item.program, artist: item.artist, type: item.type, sortOrder: String(item.sortOrder) }); }}>Sửa</button>
                        <button className="mk-btn-sm mk-btn-del" onClick={() => handleDelete('/api/events/weekly', item.id)}>Xóa</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {weekly.length === 0 && <div className="mk-empty">Chưa có lịch biểu diễn nào</div>}
            </div>
          )}

          {/* ═══ UPCOMING EVENTS TAB ═══ */}
          {tab === 'upcoming' && (
            <div className="mk-events">
              <div className="mk-ev-toolbar">
                <h2 className="mk-ev-title">Sự Kiện Sắp Diễn Ra</h2>
                <button className="mk-btn-add" onClick={() => { setShowAdd(!showAdd); setEditId(null); setForm({}); }}>{showAdd ? '✕ Đóng' : '+ Thêm'}</button>
              </div>
              {showAdd && (
                <div className="mk-ev-card mk-ev-card-add">
                  <div className="mk-ev-form-grid">
                    <input className="mk-input" placeholder="Tiêu đề" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} />
                    <input className="mk-input" placeholder="Ngày (VD: Thứ Sáu tuần này)" value={form.date || ''} onChange={e => setForm({...form, date: e.target.value})} />
                    <input className="mk-input" placeholder="Giờ (VD: 20h00 – 03h00)" value={form.time || ''} onChange={e => setForm({...form, time: e.target.value})} />
                    <input className="mk-input" placeholder="Tag (Hot, Bí ẩn...)" value={form.tag || ''} onChange={e => setForm({...form, tag: e.target.value})} />
                  </div>
                  <textarea className="mk-textarea" placeholder="Mô tả" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
                  <button className="mk-btn-save" onClick={() => {
                    if (!form.title || !form.date || !form.time || !form.tag || !form.description) { showMkToast('Vui lòng điền đầy đủ'); return; }
                    handleSave('/api/events/upcoming', null, { title: form.title, date: form.date, time: form.time, tag: form.tag, description: form.description, sortOrder: Number(form.sortOrder || 0) });
                  }}>Lưu</button>
                </div>
              )}
              {upcoming.map(ev => (
                <div key={ev.id} className={`mk-ev-card ${!ev.isActive ? 'mk-ev-inactive' : ''}`}>
                  {editId === ev.id ? (
                    <>
                      <div className="mk-ev-form-grid">
                        <input className="mk-input" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} placeholder="Tiêu đề" />
                        <input className="mk-input" value={form.date || ''} onChange={e => setForm({...form, date: e.target.value})} placeholder="Ngày" />
                        <input className="mk-input" value={form.time || ''} onChange={e => setForm({...form, time: e.target.value})} placeholder="Giờ" />
                        <input className="mk-input" value={form.tag || ''} onChange={e => setForm({...form, tag: e.target.value})} placeholder="Tag" />
                      </div>
                      <textarea className="mk-textarea" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
                      <div className="mk-ev-actions">
                        <button className="mk-btn-save" onClick={() => handleSave('/api/events/upcoming', ev.id, { title: form.title, date: form.date, time: form.time, tag: form.tag, description: form.description, sortOrder: Number(form.sortOrder || 0) })}>Lưu</button>
                        <button className="mk-btn-cancel" onClick={() => { setEditId(null); setForm({}); }}>Hủy</button>
                      </div>
                    </>
                  ) : (
                    <div className="mk-ev-row">
                      <div className="mk-ev-info">
                        <span className="mk-ev-day">{ev.tag}</span>
                        <span className="mk-ev-name">{ev.title}</span>
                        <span className="mk-ev-meta">{ev.date} · {ev.time}</span>
                      </div>
                      <p className="mk-ev-desc">{ev.description}</p>
                      <div className="mk-ev-ctrls">
                        <button className="mk-btn-toggle" onClick={() => handleToggle('/api/events/upcoming', ev.id, ev.isActive)}>{ev.isActive ? '🟢' : '⚫'}</button>
                        <button className="mk-btn-sm" onClick={() => { setEditId(ev.id); setForm({ title: ev.title, date: ev.date, time: ev.time, tag: ev.tag, description: ev.description, sortOrder: String(ev.sortOrder) }); }}>Sửa</button>
                        <button className="mk-btn-sm mk-btn-del" onClick={() => handleDelete('/api/events/upcoming', ev.id)}>Xóa</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {upcoming.length === 0 && <div className="mk-empty">Chưa có sự kiện nào</div>}
            </div>
          )}
        </>
      )}

      {/* Toast */}
      {mkToast && (
        <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',zIndex:9999,padding:'12px 28px',borderRadius:12,background:'rgba(220,38,38,0.9)',color:'#fff',fontSize:'0.85rem',fontWeight:600,backdropFilter:'blur(8px)',boxShadow:'0 8px 32px rgba(0,0,0,0.4)',whiteSpace:'nowrap'}} onClick={() => setMkToast('')}>{mkToast}</div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:20}} onClick={() => setConfirmDialog(null)}>
          <div style={{background:'#1a1a2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:24,maxWidth:360,width:'100%',textAlign:'center'}} onClick={e => e.stopPropagation()}>
            <p style={{fontSize:'1rem',fontWeight:600,color:'#e8e6e3',marginBottom:8}}>Xác nhận xóa?</p>
            <p style={{fontSize:'0.85rem',color:'rgba(255,255,255,0.5)',marginBottom:20}}>Hành động này không thể hoàn tác.</p>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={() => setConfirmDialog(null)} style={{padding:'10px 24px',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(255,255,255,0.6)',cursor:'pointer',fontSize:'0.82rem',fontWeight:600}}>Hủy</button>
              <button onClick={confirmDelete} style={{padding:'10px 24px',borderRadius:10,border:'none',background:'#ef4444',color:'#fff',cursor:'pointer',fontSize:'0.82rem',fontWeight:700}}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
.mk{min-height:100vh;background:#0a0a0f;color:#e8e6e3;font-family:'Inter',-apple-system,sans-serif;padding:0 0 40px}

/* Header */
.mk-header{display:flex;justify-content:space-between;align-items:center;padding:20px 32px;border-bottom:1px solid rgba(255,255,255,0.06)}
.mk-brand{display:flex;align-items:center;gap:16px}
.mk-logo{font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;color:#D4A84A;margin:0}
.mk-role{font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;color:rgba(212,168,74,0.6);font-weight:600;padding:4px 10px;border:1px solid rgba(212,168,74,0.2);border-radius:6px}
.mk-user{display:flex;align-items:center;gap:12px}
.mk-uname{font-size:0.85rem;font-weight:600;color:rgba(255,255,255,0.7)}
.mk-logout{background:none;border:1px solid rgba(255,255,255,0.08);padding:6px 14px;border-radius:6px;color:rgba(255,255,255,0.4);font-size:0.75rem;cursor:pointer;transition:all 0.2s;font-family:inherit}
.mk-logout:hover{border-color:#ef4444;color:#ef4444}

/* Tabs */
.mk-tabs{display:flex;gap:6px;padding:16px 32px;overflow-x:auto;border-bottom:1px solid rgba(255,255,255,0.04)}
.mk-tab{padding:10px 18px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.5);font-size:0.82rem;font-weight:600;cursor:pointer;transition:all 0.2s;white-space:nowrap;display:flex;align-items:center;gap:8px;font-family:inherit}
.mk-tab:hover{border-color:rgba(212,168,74,0.3);color:rgba(255,255,255,0.7)}
.mk-tab-active{background:rgba(212,168,74,0.1);border-color:rgba(212,168,74,0.4);color:#D4A84A}
.mk-tab-badge{font-size:0.7rem;padding:2px 7px;border-radius:100px;background:rgba(255,255,255,0.06)}
.mk-tab-active .mk-tab-badge{background:rgba(212,168,74,0.2)}
.mk-loading{text-align:center;padding:80px;color:rgba(255,255,255,0.3);font-size:0.9rem}

/* Analytics */
.mk-analytics{padding:24px 32px;display:flex;flex-direction:column;gap:20px}
.mk-kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.mk-kpi{padding:20px;border-radius:14px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02)}
.mk-kpi-gold{border-color:rgba(212,168,74,0.2);background:linear-gradient(135deg,rgba(212,168,74,0.06),rgba(212,168,74,0.02))}
.mk-kpi-label{font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.4);font-weight:600;margin-bottom:8px}
.mk-kpi-value{font-size:2rem;font-weight:700;color:#fff;line-height:1}
.mk-kpi-sub{font-size:0.72rem;color:rgba(255,255,255,0.35);margin-top:8px}
.mk-up{color:#22c55e} .mk-down{color:#ef4444}

/* Charts */
.mk-charts{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.mk-charts-3{grid-template-columns:1fr 1fr 1fr}
.mk-card{padding:20px;border-radius:14px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02)}
.mk-card-title{font-size:0.82rem;font-weight:700;margin:0 0 16px;color:rgba(255,255,255,0.6)}

/* Bar chart */
.mk-bars{display:flex;gap:4px;align-items:flex-end;height:120px}
.mk-bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
.mk-bar-val{font-size:0.65rem;color:rgba(255,255,255,0.5);font-weight:600}
.mk-bar-track{width:100%;height:80px;background:rgba(255,255,255,0.03);border-radius:4px;display:flex;align-items:flex-end;overflow:hidden}
.mk-bar-fill{width:100%;background:linear-gradient(to top,rgba(212,168,74,0.6),rgba(212,168,74,0.2));border-radius:4px;min-height:2px;transition:height 0.5s}
.mk-bar-label{font-size:0.6rem;color:rgba(255,255,255,0.3);white-space:nowrap}

/* Source bars */
.mk-source-list{display:flex;flex-direction:column;gap:8px}
.mk-source-row{display:flex;align-items:center;gap:8px}
.mk-source-name{font-size:0.75rem;width:80px;color:rgba(255,255,255,0.6);flex-shrink:0}
.mk-source-bar-wrap{flex:1;height:6px;background:rgba(255,255,255,0.04);border-radius:3px;overflow:hidden}
.mk-source-bar{height:100%;background:linear-gradient(90deg,#D4A84A,rgba(212,168,74,0.4));border-radius:3px;transition:width 0.5s}
.mk-source-cnt{font-size:0.72rem;font-weight:700;width:24px;text-align:right;color:rgba(255,255,255,0.7)}
.mk-source-pct{font-size:0.65rem;color:rgba(255,255,255,0.3);width:30px;text-align:right}

/* Status */
.mk-status-grid{display:flex;flex-direction:column;gap:6px}
.mk-status-item{display:flex;align-items:center;gap:8px}
.mk-status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.mk-status-label{font-size:0.75rem;flex:1;color:rgba(255,255,255,0.5)}
.mk-status-cnt{font-size:0.82rem;font-weight:700;color:rgba(255,255,255,0.8)}

/* Customer dist */
.mk-cust-list{display:flex;flex-direction:column;gap:8px}
.mk-cust-row{display:flex;justify-content:space-between;align-items:center}
.mk-cust-type{font-size:0.78rem;color:rgba(255,255,255,0.6)}
.mk-cust-cnt{font-size:0.9rem;font-weight:700;color:rgba(255,255,255,0.8)}

/* Peak hours */
.mk-peak-list{display:flex;flex-direction:column;gap:6px}
.mk-peak-row{display:flex;align-items:center;gap:8px}
.mk-peak-hour{font-size:0.72rem;width:40px;color:#D4A84A;font-weight:600;flex-shrink:0}
.mk-peak-bar-wrap{flex:1;height:6px;background:rgba(255,255,255,0.04);border-radius:3px;overflow:hidden}
.mk-peak-bar{height:100%;background:linear-gradient(90deg,#D4A84A,rgba(212,168,74,0.3));border-radius:3px;transition:width 0.5s}
.mk-peak-cnt{font-size:0.72rem;font-weight:700;color:rgba(255,255,255,0.6)}

/* Table */
.mk-table{width:100%;border-collapse:collapse;font-size:0.78rem}
.mk-table th{text-align:left;padding:8px 0;color:rgba(255,255,255,0.3);font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06);font-size:0.7rem;text-transform:uppercase;letter-spacing:0.04em}
.mk-table td{padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.03);color:rgba(255,255,255,0.6)}
.mk-td-code{color:#D4A84A;font-weight:700}
.mk-td-num{text-align:right;font-weight:700;color:rgba(255,255,255,0.8)}

/* Recent bookings */
.mk-recent-list{display:flex;flex-direction:column;gap:8px}
.mk-recent-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.03)}
.mk-recent-main{display:flex;flex-direction:column;gap:2px}
.mk-recent-name{font-size:0.82rem;font-weight:600;color:rgba(255,255,255,0.8)}
.mk-recent-meta{font-size:0.7rem;color:rgba(255,255,255,0.3)}
.mk-recent-right{display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.mk-recent-status{font-size:0.72rem;font-weight:600}
.mk-recent-src{font-size:0.65rem;color:rgba(255,255,255,0.3)}

/* Events module */
.mk-events{padding:16px 32px}
.mk-ev-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.mk-ev-title{font-size:1.1rem;font-weight:700;margin:0;color:rgba(255,255,255,0.8)}
.mk-btn-add{padding:8px 18px;border-radius:8px;border:1px solid #D4A84A;background:rgba(212,168,74,0.08);color:#D4A84A;cursor:pointer;font-weight:600;font-size:0.78rem;transition:all 0.2s;font-family:inherit}
.mk-btn-add:hover{background:rgba(212,168,74,0.15)}

.mk-ev-card{padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);margin-bottom:8px;transition:all 0.2s}
.mk-ev-card:hover{border-color:rgba(255,255,255,0.1)}
.mk-ev-card-add{border-color:rgba(212,168,74,0.2);background:rgba(212,168,74,0.03)}
.mk-ev-inactive{opacity:0.4}
.mk-ev-row{display:flex;flex-direction:column;gap:6px}
.mk-ev-info{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.mk-ev-day{padding:3px 10px;border-radius:6px;font-size:0.72rem;font-weight:700;background:rgba(212,168,74,0.15);color:#D4A84A}
.mk-ev-type{padding:3px 8px;border-radius:6px;font-size:0.65rem;font-weight:600;color:rgba(255,255,255,0.6);background:rgba(255,255,255,0.06);text-transform:uppercase}
.mk-ev-name{font-size:0.9rem;font-weight:600;color:rgba(255,255,255,0.8)}
.mk-ev-meta{font-size:0.72rem;color:rgba(255,255,255,0.35)}
.mk-ev-desc{font-size:0.78rem;color:rgba(255,255,255,0.4);margin:0;line-height:1.5}
.mk-ev-ctrls{display:flex;gap:6px;margin-top:4px}
.mk-ev-actions{display:flex;gap:8px;margin-top:8px}
.mk-btn-toggle{background:none;border:none;cursor:pointer;font-size:14px;padding:2px}
.mk-btn-sm{padding:4px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:rgba(255,255,255,0.5);cursor:pointer;font-size:0.72rem;transition:all 0.2s;font-family:inherit}
.mk-btn-sm:hover{border-color:#D4A84A;color:#D4A84A}
.mk-btn-del:hover{border-color:#ef4444!important;color:#ef4444!important}
.mk-btn-save{padding:8px 20px;border-radius:8px;border:none;background:#D4A84A;color:#0a0a0f;font-weight:700;cursor:pointer;font-size:0.78rem;transition:opacity 0.2s;font-family:inherit}
.mk-btn-save:hover{opacity:0.85}
.mk-btn-cancel{padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:inherit;cursor:pointer;font-size:0.78rem;font-family:inherit}
.mk-ev-form-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-bottom:10px}
.mk-input{padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:inherit;font-size:0.8rem;width:100%;outline:none;transition:border 0.2s;font-family:inherit}
.mk-input:focus{border-color:#D4A84A}
.mk-textarea{width:100%;padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:inherit;font-size:0.8rem;resize:vertical;min-height:50px;margin-bottom:10px;outline:none;font-family:inherit}
.mk-textarea:focus{border-color:#D4A84A}
.mk-empty{text-align:center;padding:40px;color:rgba(255,255,255,0.2);font-size:0.85rem}

/* Responsive */
@media(max-width:1024px){
  .mk-kpi-grid{grid-template-columns:repeat(2,1fr)}
  .mk-charts{grid-template-columns:1fr}
  .mk-charts-3{grid-template-columns:1fr}
  .mk-header{padding:16px 20px}
  .mk-tabs{padding:12px 20px}
  .mk-analytics{padding:20px}
  .mk-events{padding:16px 20px}
}
@media(max-width:640px){
  .mk-kpi-grid{grid-template-columns:1fr 1fr}
  .mk-kpi-value{font-size:1.5rem}
  .mk-header{flex-direction:column;gap:12px;align-items:flex-start}
  .mk-tabs{gap:4px;padding:10px 16px}
  .mk-tab{padding:8px 12px;font-size:0.75rem}
  .mk-ev-form-grid{grid-template-columns:1fr}
}
`;
