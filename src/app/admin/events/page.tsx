'use client';

import { useState, useEffect, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */
interface DailyEvent {
  id: string;
  dayIndex: number;
  dayName: string;
  dayShort: string;
  name: string;
  description: string;
  type: string;
  posterUrl: string | null;
  isActive: boolean;
}

interface WeeklyScheduleItem {
  id: string;
  day: string;
  program: string;
  artist: string;
  type: string;
  sortOrder: number;
  isActive: boolean;
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  tag: string;
  sortOrder: number;
  isActive: boolean;
}

type Tab = 'daily' | 'weekly' | 'upcoming';

const EVENT_TYPES = ['chill', 'ladies', 'acoustic', 'dj', 'party', 'recovery'];
const DAYS = [
  { index: 0, name: 'Thứ Hai', short: 'T2' },
  { index: 1, name: 'Thứ Ba', short: 'T3' },
  { index: 2, name: 'Thứ Tư', short: 'T4' },
  { index: 3, name: 'Thứ Năm', short: 'T5' },
  { index: 4, name: 'Thứ Sáu', short: 'T6' },
  { index: 5, name: 'Thứ Bảy', short: 'T7' },
  { index: 6, name: 'Chủ Nhật', short: 'CN' },
];

/* ═══════════════════════════════════════════════════════════════
   Admin Events Page
   ═══════════════════════════════════════════════════════════════ */
export default function AdminEventsPage() {
  const [tab, setTab] = useState<Tab>('daily');
  const [dailyEvents, setDailyEvents] = useState<DailyEvent[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Form states
  const [form, setForm] = useState<Record<string, string>>({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [d, w, u] = await Promise.all([
        fetch('/api/events/daily').then(r => r.json()),
        fetch('/api/events/weekly').then(r => r.json()),
        fetch('/api/events/upcoming').then(r => r.json()),
      ]);
      setDailyEvents(d);
      setWeeklySchedule(w);
      setUpcomingEvents(u);
    } catch (e) {
      console.error('Failed to fetch events:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async (endpoint: string, id: string | null, body: Record<string, unknown>) => {
    const url = id ? `${endpoint}/${id}` : endpoint;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setEditId(null);
      setShowAdd(false);
      setForm({});
      await fetchAll();
    } else {
      const data = await res.json();
      alert(data.error || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (endpoint: string, id: string) => {
    if (!confirm('Bạn có chắc muốn xóa?')) return;
    const res = await fetch(`${endpoint}/${id}`, { method: 'DELETE' });
    if (res.ok) await fetchAll();
  };

  const handleToggle = async (endpoint: string, id: string, isActive: boolean) => {
    await fetch(`${endpoint}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    await fetchAll();
  };

  /* ─── Render ─── */
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <style>{CSS}</style>

      <div className="ev-header">
        <h1 className="ev-title">Quản Lý Sự Kiện</h1>
        <p className="ev-sub">Quản lý nội dung hiển thị trên trang chủ</p>
      </div>

      {/* Tabs */}
      <div className="ev-tabs">
        {[
          { key: 'daily' as Tab, label: 'Sự Kiện Hàng Ngày', count: dailyEvents.length },
          { key: 'weekly' as Tab, label: 'Lịch DJ / Dancer', count: weeklySchedule.length },
          { key: 'upcoming' as Tab, label: 'Sự Kiện Sắp Tới', count: upcomingEvents.length },
        ].map(t => (
          <button
            key={t.key}
            className={`ev-tab ${tab === t.key ? 'ev-tab-active' : ''}`}
            onClick={() => { setTab(t.key); setEditId(null); setShowAdd(false); setForm({}); }}
          >
            {t.label}
            <span className="ev-tab-count">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Add button */}
      <div className="ev-toolbar">
        <button className="ev-btn-add" onClick={() => { setShowAdd(!showAdd); setEditId(null); setForm({}); }}>
          {showAdd ? '✕ Đóng' : '+ Thêm mới'}
        </button>
      </div>

      {loading ? (
        <div className="ev-loading">Đang tải...</div>
      ) : (
        <>
          {/* ═══ DAILY EVENTS ═══ */}
          {tab === 'daily' && (
            <div className="ev-list">
              {showAdd && (
                <div className="ev-card ev-card-add">
                  <h3 className="ev-card-title">Thêm Sự Kiện Hàng Ngày</h3>
                  <div className="ev-form-grid">
                    <select value={form.dayIndex || ''} onChange={e => setForm({...form, dayIndex: e.target.value})} className="ev-input">
                      <option value="">Chọn ngày</option>
                      {DAYS.map(d => <option key={d.index} value={d.index}>{d.name}</option>)}
                    </select>
                    <input className="ev-input" placeholder="Tên sự kiện" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
                    <select value={form.type || ''} onChange={e => setForm({...form, type: e.target.value})} className="ev-input">
                      <option value="">Loại</option>
                      {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input className="ev-input" placeholder="Poster URL (tùy chọn)" value={form.posterUrl || ''} onChange={e => setForm({...form, posterUrl: e.target.value})} />
                  </div>
                  <textarea className="ev-textarea" placeholder="Mô tả" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
                  <button className="ev-btn-save" onClick={() => {
                    const day = DAYS[Number(form.dayIndex)];
                    if (!day || !form.name || !form.type || !form.description) { alert('Vui lòng điền đầy đủ thông tin'); return; }
                    handleSave('/api/events/daily', null, {
                      dayIndex: day.index, dayName: day.name, dayShort: day.short,
                      name: form.name, description: form.description, type: form.type,
                      posterUrl: form.posterUrl || null,
                    });
                  }}>Lưu</button>
                </div>
              )}
              {dailyEvents.map(ev => (
                <div key={ev.id} className={`ev-card ${!ev.isActive ? 'ev-card-inactive' : ''}`}>
                  {editId === ev.id ? (
                    <>
                      <div className="ev-form-grid">
                        <input className="ev-input" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} placeholder="Tên" />
                        <select value={form.type || ''} onChange={e => setForm({...form, type: e.target.value})} className="ev-input">
                          {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input className="ev-input" placeholder="Poster URL" value={form.posterUrl || ''} onChange={e => setForm({...form, posterUrl: e.target.value})} />
                      </div>
                      <textarea className="ev-textarea" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
                      <div className="ev-actions">
                        <button className="ev-btn-save" onClick={() => handleSave('/api/events/daily', ev.id, {
                          name: form.name, description: form.description, type: form.type, posterUrl: form.posterUrl || null,
                        })}>Lưu</button>
                        <button className="ev-btn-cancel" onClick={() => { setEditId(null); setForm({}); }}>Hủy</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="ev-card-header">
                        <div>
                          <span className="ev-day-badge">{ev.dayShort}</span>
                          <span className="ev-type-badge" style={{ background: `var(--ev-${ev.type})` }}>{ev.type}</span>
                        </div>
                        <div className="ev-card-controls">
                          <button className="ev-btn-toggle" onClick={() => handleToggle('/api/events/daily', ev.id, ev.isActive)} title={ev.isActive ? 'Tắt' : 'Bật'}>
                            {ev.isActive ? '🟢' : '⚫'}
                          </button>
                          <button className="ev-btn-edit" onClick={() => { setEditId(ev.id); setForm({ name: ev.name, description: ev.description, type: ev.type, posterUrl: ev.posterUrl || '' }); }}>Sửa</button>
                          <button className="ev-btn-delete" onClick={() => handleDelete('/api/events/daily', ev.id)}>Xóa</button>
                        </div>
                      </div>
                      <h3 className="ev-card-name">{ev.name}</h3>
                      <p className="ev-card-desc">{ev.description}</p>
                      {ev.posterUrl && <p className="ev-card-meta">Poster: {ev.posterUrl}</p>}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ═══ WEEKLY SCHEDULE ═══ */}
          {tab === 'weekly' && (
            <div className="ev-list">
              {showAdd && (
                <div className="ev-card ev-card-add">
                  <h3 className="ev-card-title">Thêm Lịch Biểu Diễn</h3>
                  <div className="ev-form-grid">
                    <select value={form.day || ''} onChange={e => setForm({...form, day: e.target.value})} className="ev-input">
                      <option value="">Chọn ngày</option>
                      {DAYS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                    </select>
                    <input className="ev-input" placeholder="Chương trình" value={form.program || ''} onChange={e => setForm({...form, program: e.target.value})} />
                    <input className="ev-input" placeholder="Nghệ sĩ" value={form.artist || ''} onChange={e => setForm({...form, artist: e.target.value})} />
                    <input className="ev-input" placeholder="Loại (DJ, Live, Acoustic)" value={form.type || ''} onChange={e => setForm({...form, type: e.target.value})} />
                    <input className="ev-input" placeholder="Thứ tự (0, 1, 2...)" type="number" value={form.sortOrder || ''} onChange={e => setForm({...form, sortOrder: e.target.value})} />
                  </div>
                  <button className="ev-btn-save" onClick={() => {
                    if (!form.day || !form.program || !form.artist || !form.type) { alert('Vui lòng điền đầy đủ'); return; }
                    handleSave('/api/events/weekly', null, {
                      day: form.day, program: form.program, artist: form.artist, type: form.type, sortOrder: Number(form.sortOrder || 0),
                    });
                  }}>Lưu</button>
                </div>
              )}
              {weeklySchedule.map(item => (
                <div key={item.id} className={`ev-card ${!item.isActive ? 'ev-card-inactive' : ''}`}>
                  {editId === item.id ? (
                    <>
                      <div className="ev-form-grid">
                        <select value={form.day || ''} onChange={e => setForm({...form, day: e.target.value})} className="ev-input">
                          {DAYS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                        </select>
                        <input className="ev-input" value={form.program || ''} onChange={e => setForm({...form, program: e.target.value})} placeholder="Chương trình" />
                        <input className="ev-input" value={form.artist || ''} onChange={e => setForm({...form, artist: e.target.value})} placeholder="Nghệ sĩ" />
                        <input className="ev-input" value={form.type || ''} onChange={e => setForm({...form, type: e.target.value})} placeholder="Loại" />
                        <input className="ev-input" value={form.sortOrder || ''} onChange={e => setForm({...form, sortOrder: e.target.value})} placeholder="Thứ tự" type="number" />
                      </div>
                      <div className="ev-actions">
                        <button className="ev-btn-save" onClick={() => handleSave('/api/events/weekly', item.id, {
                          day: form.day, program: form.program, artist: form.artist, type: form.type, sortOrder: Number(form.sortOrder || 0),
                        })}>Lưu</button>
                        <button className="ev-btn-cancel" onClick={() => { setEditId(null); setForm({}); }}>Hủy</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="ev-card-header">
                        <div>
                          <span className="ev-day-badge">{item.day}</span>
                          <span className="ev-type-badge">{item.type}</span>
                        </div>
                        <div className="ev-card-controls">
                          <button className="ev-btn-toggle" onClick={() => handleToggle('/api/events/weekly', item.id, item.isActive)}>
                            {item.isActive ? '🟢' : '⚫'}
                          </button>
                          <button className="ev-btn-edit" onClick={() => { setEditId(item.id); setForm({ day: item.day, program: item.program, artist: item.artist, type: item.type, sortOrder: String(item.sortOrder) }); }}>Sửa</button>
                          <button className="ev-btn-delete" onClick={() => handleDelete('/api/events/weekly', item.id)}>Xóa</button>
                        </div>
                      </div>
                      <h3 className="ev-card-name">{item.program}</h3>
                      <p className="ev-card-desc">{item.artist}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ═══ UPCOMING EVENTS ═══ */}
          {tab === 'upcoming' && (
            <div className="ev-list">
              {showAdd && (
                <div className="ev-card ev-card-add">
                  <h3 className="ev-card-title">Thêm Sự Kiện Sắp Tới</h3>
                  <div className="ev-form-grid">
                    <input className="ev-input" placeholder="Tiêu đề" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} />
                    <input className="ev-input" placeholder="Ngày (VD: Thứ Sáu tuần này)" value={form.date || ''} onChange={e => setForm({...form, date: e.target.value})} />
                    <input className="ev-input" placeholder="Giờ (VD: 20h00 – 03h00)" value={form.time || ''} onChange={e => setForm({...form, time: e.target.value})} />
                    <input className="ev-input" placeholder="Tag (Hot, Bí ẩn...)" value={form.tag || ''} onChange={e => setForm({...form, tag: e.target.value})} />
                    <input className="ev-input" placeholder="Thứ tự" type="number" value={form.sortOrder || ''} onChange={e => setForm({...form, sortOrder: e.target.value})} />
                  </div>
                  <textarea className="ev-textarea" placeholder="Mô tả" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
                  <button className="ev-btn-save" onClick={() => {
                    if (!form.title || !form.date || !form.time || !form.tag || !form.description) { alert('Vui lòng điền đầy đủ'); return; }
                    handleSave('/api/events/upcoming', null, {
                      title: form.title, date: form.date, time: form.time, tag: form.tag,
                      description: form.description, sortOrder: Number(form.sortOrder || 0),
                    });
                  }}>Lưu</button>
                </div>
              )}
              {upcomingEvents.map(ev => (
                <div key={ev.id} className={`ev-card ${!ev.isActive ? 'ev-card-inactive' : ''}`}>
                  {editId === ev.id ? (
                    <>
                      <div className="ev-form-grid">
                        <input className="ev-input" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} placeholder="Tiêu đề" />
                        <input className="ev-input" value={form.date || ''} onChange={e => setForm({...form, date: e.target.value})} placeholder="Ngày" />
                        <input className="ev-input" value={form.time || ''} onChange={e => setForm({...form, time: e.target.value})} placeholder="Giờ" />
                        <input className="ev-input" value={form.tag || ''} onChange={e => setForm({...form, tag: e.target.value})} placeholder="Tag" />
                        <input className="ev-input" value={form.sortOrder || ''} onChange={e => setForm({...form, sortOrder: e.target.value})} placeholder="Thứ tự" type="number" />
                      </div>
                      <textarea className="ev-textarea" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
                      <div className="ev-actions">
                        <button className="ev-btn-save" onClick={() => handleSave('/api/events/upcoming', ev.id, {
                          title: form.title, date: form.date, time: form.time, tag: form.tag,
                          description: form.description, sortOrder: Number(form.sortOrder || 0),
                        })}>Lưu</button>
                        <button className="ev-btn-cancel" onClick={() => { setEditId(null); setForm({}); }}>Hủy</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="ev-card-header">
                        <div>
                          <span className="ev-day-badge">{ev.tag}</span>
                          <span className="ev-card-meta">{ev.date} · {ev.time}</span>
                        </div>
                        <div className="ev-card-controls">
                          <button className="ev-btn-toggle" onClick={() => handleToggle('/api/events/upcoming', ev.id, ev.isActive)}>
                            {ev.isActive ? '🟢' : '⚫'}
                          </button>
                          <button className="ev-btn-edit" onClick={() => { setEditId(ev.id); setForm({ title: ev.title, date: ev.date, time: ev.time, tag: ev.tag, description: ev.description, sortOrder: String(ev.sortOrder) }); }}>Sửa</button>
                          <button className="ev-btn-delete" onClick={() => handleDelete('/api/events/upcoming', ev.id)}>Xóa</button>
                        </div>
                      </div>
                      <h3 className="ev-card-name">{ev.title}</h3>
                      <p className="ev-card-desc">{ev.description}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CSS
   ═══════════════════════════════════════════════════════════════ */
const CSS = `
  :root {
    --ev-chill: #06b6d4;
    --ev-ladies: #ec4899;
    --ev-acoustic: #f59e0b;
    --ev-dj: #a855f7;
    --ev-party: #ef4444;
    --ev-recovery: #22c55e;
  }

  .ev-header {
    margin-bottom: 32px;
  }
  .ev-title {
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 6px;
  }
  .ev-sub {
    font-size: 14px;
    opacity: 0.5;
    margin: 0;
  }

  .ev-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }
  .ev-tab {
    padding: 10px 20px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    color: inherit;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ev-tab:hover { border-color: rgba(212,168,74,0.3); }
  .ev-tab-active {
    background: rgba(212,168,74,0.12);
    border-color: #D4A84A;
    color: #D4A84A;
  }
  .ev-tab-count {
    background: rgba(255,255,255,0.08);
    padding: 2px 8px;
    border-radius: 100px;
    font-size: 12px;
  }
  .ev-tab-active .ev-tab-count {
    background: rgba(212,168,74,0.2);
  }

  .ev-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 16px;
  }
  .ev-btn-add {
    padding: 8px 20px;
    border-radius: 8px;
    border: 1px solid #D4A84A;
    background: rgba(212,168,74,0.1);
    color: #D4A84A;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    transition: all 0.2s;
  }
  .ev-btn-add:hover { background: rgba(212,168,74,0.2); }

  .ev-loading {
    text-align: center;
    padding: 60px;
    opacity: 0.4;
  }

  .ev-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ev-card {
    padding: 20px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.03);
    transition: all 0.2s;
  }
  .ev-card:hover { border-color: rgba(255,255,255,0.1); }
  .ev-card-inactive { opacity: 0.4; }
  .ev-card-add {
    border-color: rgba(212,168,74,0.2);
    background: rgba(212,168,74,0.03);
  }

  .ev-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .ev-card-controls {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .ev-card-title {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 16px;
    color: #D4A84A;
  }
  .ev-card-name {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 4px;
  }
  .ev-card-desc {
    font-size: 13px;
    opacity: 0.6;
    margin: 0;
    line-height: 1.5;
  }
  .ev-card-meta {
    font-size: 12px;
    opacity: 0.4;
    margin-top: 6px;
  }

  .ev-day-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    background: rgba(212,168,74,0.15);
    color: #D4A84A;
    margin-right: 6px;
  }
  .ev-type-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    color: white;
    text-transform: uppercase;
    background: rgba(168,130,255,0.3);
  }

  .ev-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  }
  .ev-input {
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    color: inherit;
    font-size: 13px;
    width: 100%;
    outline: none;
    transition: border 0.2s;
  }
  .ev-input:focus { border-color: #D4A84A; }
  .ev-textarea {
    width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    color: inherit;
    font-size: 13px;
    resize: vertical;
    min-height: 60px;
    margin-bottom: 12px;
    outline: none;
  }
  .ev-textarea:focus { border-color: #D4A84A; }

  .ev-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  .ev-btn-save {
    padding: 8px 20px;
    border-radius: 8px;
    border: none;
    background: #D4A84A;
    color: #03071a;
    font-weight: 700;
    cursor: pointer;
    font-size: 13px;
    transition: opacity 0.2s;
  }
  .ev-btn-save:hover { opacity: 0.85; }
  .ev-btn-cancel {
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 13px;
  }
  .ev-btn-edit, .ev-btn-delete {
    padding: 4px 12px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.08);
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }
  .ev-btn-edit:hover { border-color: #D4A84A; color: #D4A84A; }
  .ev-btn-delete:hover { border-color: #ef4444; color: #ef4444; }
  .ev-btn-toggle {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    padding: 2px;
  }
`;
