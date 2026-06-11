'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UserData { id: string; name: string; role: string; }
interface BookingData {
  id: string; bookingCode: string; bookingDate: string; bookingTime: string;
  guestCount: number; status: string; depositAmount: string; minSpend: string; note: string;
  customer: { name: string; phone: string };
  table: { code: string; area?: { name: string } };
  createdByUser?: { name: string } | null;
}

const ST: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Chờ xác nhận', color: '#D4A84A', bg: 'rgba(212,168,74,0.1)' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  ARRIVED:   { label: 'Đã đến', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  CANCELLED: { label: 'Đã hủy', color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  NO_SHOW:   { label: 'Không đến', color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
  COMPLETED: { label: 'Hoàn tất', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)' },
};

export default function ReceptionPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.success || !['RECEPTION', 'ADMIN', 'MANAGER'].includes(d.user.role)) { router.push('/login'); return; }
      setUser(d.user);
    }).catch(() => router.push('/login'));
  }, [router]);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings/today');
      const data = await res.json();
      if (data.success) setBookings(data.data);
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  // Auto-refresh every 30s
  useEffect(() => { const t = setInterval(fetchBookings, 30000); return () => clearInterval(t); }, [fetchBookings]);

  const flash = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  const updateStatus = async (id: string, status: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/bookings/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const data = await res.json();
      data.success ? (flash('Cập nhật thành công'), fetchBookings()) : flash(data.error || 'Lỗi', false);
    } catch { flash('Lỗi server', false); }
    finally { setBusy(null); }
  };

  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); };

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
  const pending = bookings.filter(b => b.status === 'PENDING').length;
  const confirmed = bookings.filter(b => b.status === 'CONFIRMED').length;
  const arrived = bookings.filter(b => b.status === 'ARRIVED').length;
  const totalGuests = bookings.filter(b => !['CANCELLED', 'NO_SHOW'].includes(b.status)).reduce((s, b) => s + b.guestCount, 0);

  // Group by time slots
  const slots = [
    { label: 'Chiều tối', range: '18:00 – 19:30', times: ['18:00','18:30','19:00','19:30'] },
    { label: 'Tối', range: '20:00 – 21:30', times: ['20:00','20:30','21:00','21:30'] },
    { label: 'Khuya', range: '22:00 – 23:30', times: ['22:00','22:30','23:00','23:30'] },
    { label: 'Sau nửa đêm', range: '00:00+', times: ['00:00','00:30','01:00','01:30','02:00'] },
  ];

  const currentHour = now.getHours();
  const greeting = currentHour < 18 ? 'Chào buổi chiều' : currentHour < 22 ? 'Chào buổi tối' : 'Chào buổi khuya';

  if (!user) return (<><style>{CSS}</style><div className="rc"><div className="rc-spin" /></div></>);

  return (
    <>
      <style>{CSS}</style>
      <div className="rc">
        {/* ═══ Header ═══ */}
        <header className="rc-head">
          <div className="rc-head-left">
            <div className="rc-brand">BÁO GARDEN</div>
            <div className="rc-greet">{greeting}, {user.name}</div>
          </div>
          <div className="rc-head-right">
            <div className="rc-date">
              {now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="rc-head-btns">
              <button className="rc-icon-btn" onClick={fetchBookings} title="Tải lại">↻</button>
              <button className="rc-icon-btn rc-icon-out" onClick={handleLogout} title="Đăng xuất">⏻</button>
            </div>
          </div>
        </header>

        {/* ═══ Stats Strip ═══ */}
        <div className="rc-strip">
          <div className="rc-strip-item">
            <span className="rc-strip-num">{bookings.length}</span>
            <span className="rc-strip-lab">Tổng</span>
          </div>
          <div className="rc-strip-sep" />
          <div className="rc-strip-item" data-type="pending">
            <span className="rc-strip-num">{pending}</span>
            <span className="rc-strip-lab">Chờ XN</span>
          </div>
          <div className="rc-strip-sep" />
          <div className="rc-strip-item" data-type="confirmed">
            <span className="rc-strip-num">{confirmed}</span>
            <span className="rc-strip-lab">Đã XN</span>
          </div>
          <div className="rc-strip-sep" />
          <div className="rc-strip-item" data-type="arrived">
            <span className="rc-strip-num">{arrived}</span>
            <span className="rc-strip-lab">Đã đến</span>
          </div>
          <div className="rc-strip-sep" />
          <div className="rc-strip-item">
            <span className="rc-strip-num">{totalGuests}</span>
            <span className="rc-strip-lab">Khách</span>
          </div>
        </div>

        {/* ═══ Filter Tabs ═══ */}
        <div className="rc-filters">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'PENDING', label: 'Chờ XN' },
            { key: 'CONFIRMED', label: 'Đã XN' },
            { key: 'ARRIVED', label: 'Đã đến' },
            { key: 'COMPLETED', label: 'Hoàn tất' },
            { key: 'CANCELLED', label: 'Đã hủy' },
          ].map(f => (
            <button key={f.key} className={`rc-ftab ${filter === f.key ? 'rc-ftab-on' : ''}`}
              onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        {/* ═══ Booking List ═══ */}
        <div className="rc-body">
          {loading ? (
            <div className="rc-center"><div className="rc-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="rc-empty">
              <div className="rc-empty-icon">✦</div>
              <p>Không có booking nào</p>
            </div>
          ) : (
            slots.map(slot => {
              const items = filtered.filter(b => slot.times.includes(b.bookingTime))
                .sort((a, b) => a.bookingTime.localeCompare(b.bookingTime));
              if (items.length === 0) return null;
              return (
                <div key={slot.label} className="rc-slot">
                  <div className="rc-slot-head">
                    <span className="rc-slot-label">{slot.label}</span>
                    <span className="rc-slot-range">{slot.range}</span>
                    <span className="rc-slot-count">{items.length}</span>
                  </div>
                  <div className="rc-slot-list">
                    {items.map(b => {
                      const s = ST[b.status] || ST.COMPLETED;
                      const isAction = !['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(b.status);
                      return (
                        <div key={b.id} className="rc-card">
                          <div className="rc-card-top">
                            <div className="rc-card-time">{b.bookingTime}</div>
                            <div className="rc-card-table">{b.table.code}</div>
                            <div className="rc-card-badge" style={{ color: s.color, background: s.bg }}>{s.label}</div>
                          </div>

                          <div className="rc-card-mid">
                            <div className="rc-card-name">{b.customer.name}</div>
                            <a href={`tel:${b.customer.phone}`} className="rc-card-phone">{b.customer.phone}</a>
                          </div>

                          <div className="rc-card-bot">
                            <span className="rc-card-guests">{b.guestCount} khách</span>
                            {b.table.area?.name && <span className="rc-card-area">{b.table.area.name}</span>}
                            {b.note && <span className="rc-card-note">{b.note}</span>}
                          </div>

                          {isAction && (
                            <div className="rc-card-actions">
                              {b.status === 'PENDING' && (
                                <>
                                  <button className="rc-act rc-act-confirm" disabled={busy === b.id} onClick={() => updateStatus(b.id, 'CONFIRMED')}>Xác nhận</button>
                                  <button className="rc-act rc-act-cancel" disabled={busy === b.id} onClick={() => updateStatus(b.id, 'CANCELLED')}>Hủy</button>
                                </>
                              )}
                              {b.status === 'CONFIRMED' && (
                                <>
                                  <button className="rc-act rc-act-checkin" disabled={busy === b.id} onClick={() => updateStatus(b.id, 'ARRIVED')}>Check-in</button>
                                  <button className="rc-act rc-act-ghost" disabled={busy === b.id} onClick={() => updateStatus(b.id, 'NO_SHOW')}>Không đến</button>
                                </>
                              )}
                              {b.status === 'ARRIVED' && (
                                <button className="rc-act rc-act-done" disabled={busy === b.id} onClick={() => updateStatus(b.id, 'COMPLETED')}>Hoàn tất</button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className={`rc-toast ${toast.ok ? '' : 'rc-toast-err'}`}>
            <span>{toast.ok ? '✓' : '✕'}</span> {toast.msg}
          </div>
        )}
      </div>
    </>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');

.rc{min-height:100dvh;background:#08080c;color:#e8e6e3;font-family:'Inter',-apple-system,sans-serif;display:flex;flex-direction:column}

/* Spinner */
.rc-spin{width:24px;height:24px;border:2px solid rgba(212,168,74,0.3);border-top-color:#D4A84A;border-radius:50%;animation:rspin .7s linear infinite;margin:auto}
@keyframes rspin{to{transform:rotate(360deg)}}
.rc-center{display:flex;justify-content:center;padding:80px 0}

/* ═══ Header ═══ */
.rc-head{display:flex;justify-content:space-between;align-items:center;padding:20px 28px;border-bottom:1px solid rgba(255,255,255,0.04)}
.rc-head-left{display:flex;flex-direction:column;gap:2px}
.rc-brand{font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:#D4A84A;letter-spacing:0.04em}
.rc-greet{font-size:.72rem;color:rgba(255,255,255,0.35);font-weight:400}
.rc-head-right{display:flex;align-items:center;gap:14px}
.rc-date{font-size:.72rem;color:rgba(255,255,255,0.3);text-align:right}
.rc-head-btns{display:flex;gap:6px}
.rc-icon-btn{width:34px;height:34px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:rgba(255,255,255,0.4);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
.rc-icon-btn:hover{border-color:rgba(212,168,74,0.3);color:#D4A84A}
.rc-icon-out:hover{border-color:rgba(239,68,68,0.3);color:#ef4444}

/* ═══ Stats Strip ═══ */
.rc-strip{display:flex;align-items:center;justify-content:center;gap:0;padding:16px 28px;border-bottom:1px solid rgba(255,255,255,0.04);background:rgba(255,255,255,0.01)}
.rc-strip-item{display:flex;flex-direction:column;align-items:center;gap:1px;padding:0 20px}
.rc-strip-num{font-size:1.4rem;font-weight:700;color:#fff;line-height:1.1}
.rc-strip-lab{font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,0.3);font-weight:500}
.rc-strip-item[data-type="pending"] .rc-strip-num{color:#D4A84A}
.rc-strip-item[data-type="confirmed"] .rc-strip-num{color:#60a5fa}
.rc-strip-item[data-type="arrived"] .rc-strip-num{color:#4ade80}
.rc-strip-sep{width:1px;height:28px;background:rgba(255,255,255,0.06)}

/* ═══ Filter Tabs ═══ */
.rc-filters{display:flex;gap:4px;padding:14px 28px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.rc-filters::-webkit-scrollbar{display:none}
.rc-ftab{padding:7px 16px;border-radius:100px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:rgba(255,255,255,0.35);font-size:.72rem;font-weight:500;cursor:pointer;transition:all .2s;white-space:nowrap;font-family:inherit}
.rc-ftab:hover{border-color:rgba(255,255,255,0.12);color:rgba(255,255,255,0.6)}
.rc-ftab-on{background:rgba(212,168,74,0.08);border-color:rgba(212,168,74,0.25);color:#D4A84A}

/* ═══ Body ═══ */
.rc-body{flex:1;padding:20px 28px;max-width:720px;margin:0 auto;width:100%}
.rc-empty{text-align:center;padding:60px 20px;color:rgba(255,255,255,0.2)}
.rc-empty-icon{font-size:24px;margin-bottom:8px;color:rgba(212,168,74,0.3)}
.rc-empty p{margin:0;font-size:.82rem}

/* ═══ Time Slot ═══ */
.rc-slot{margin-bottom:28px}
.rc-slot-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.rc-slot-label{font-size:.78rem;font-weight:600;color:rgba(255,255,255,0.5)}
.rc-slot-range{font-size:.65rem;color:rgba(255,255,255,0.2)}
.rc-slot-count{margin-left:auto;font-size:.6rem;font-weight:600;color:rgba(212,168,74,0.5);background:rgba(212,168,74,0.06);padding:2px 8px;border-radius:100px}
.rc-slot-list{display:flex;flex-direction:column;gap:6px}

/* ═══ Card ═══ */
.rc-card{padding:16px 18px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);background:rgba(255,255,255,0.018);transition:all .2s}
.rc-card:hover{border-color:rgba(255,255,255,0.08);background:rgba(255,255,255,0.025)}

.rc-card-top{display:flex;align-items:center;gap:10px}
.rc-card-time{font-size:1.1rem;font-weight:700;color:#fff;min-width:50px;font-variant-numeric:tabular-nums}
.rc-card-table{font-size:.82rem;font-weight:700;color:#D4A84A;background:rgba(212,168,74,0.08);padding:2px 10px;border-radius:6px}
.rc-card-badge{font-size:.65rem;font-weight:600;padding:3px 10px;border-radius:100px;margin-left:auto}

.rc-card-mid{display:flex;align-items:center;gap:12px;margin-top:8px}
.rc-card-name{font-size:.88rem;font-weight:500;color:rgba(255,255,255,0.85)}
.rc-card-phone{font-size:.78rem;color:rgba(255,255,255,0.3);text-decoration:none;transition:color .2s}
.rc-card-phone:hover{color:#D4A84A}

.rc-card-bot{display:flex;align-items:center;gap:10px;margin-top:6px;flex-wrap:wrap}
.rc-card-guests{font-size:.72rem;color:rgba(255,255,255,0.3)}
.rc-card-area{font-size:.65rem;color:rgba(255,255,255,0.2);padding:1px 8px;border:1px solid rgba(255,255,255,0.06);border-radius:4px}
.rc-card-note{font-size:.68rem;color:rgba(212,168,74,0.4);font-style:italic;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* ═══ Actions ═══ */
.rc-card-actions{display:flex;gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.04)}
.rc-act{padding:7px 18px;border-radius:8px;font-size:.75rem;font-weight:600;cursor:pointer;transition:all .15s;border:1px solid transparent;font-family:inherit}
.rc-act:disabled{opacity:.4;cursor:not-allowed}

.rc-act-confirm{background:rgba(96,165,250,0.1);color:#60a5fa;border-color:rgba(96,165,250,0.15)}
.rc-act-confirm:hover:not(:disabled){background:rgba(96,165,250,0.18)}

.rc-act-checkin{background:rgba(74,222,128,0.1);color:#4ade80;border-color:rgba(74,222,128,0.15)}
.rc-act-checkin:hover:not(:disabled){background:rgba(74,222,128,0.18)}

.rc-act-done{background:rgba(167,139,250,0.1);color:#a78bfa;border-color:rgba(167,139,250,0.15)}
.rc-act-done:hover:not(:disabled){background:rgba(167,139,250,0.18)}

.rc-act-cancel{background:transparent;color:rgba(255,255,255,0.25);border-color:rgba(255,255,255,0.06)}
.rc-act-cancel:hover:not(:disabled){color:#f87171;border-color:rgba(248,113,113,0.2)}

.rc-act-ghost{background:transparent;color:rgba(255,255,255,0.25);border-color:rgba(255,255,255,0.06)}
.rc-act-ghost:hover:not(:disabled){color:rgba(255,255,255,0.5);border-color:rgba(255,255,255,0.1)}

/* ═══ Toast ═══ */
.rc-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 24px;border-radius:10px;background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.2);color:#4ade80;font-size:.78rem;font-weight:600;z-index:100;animation:rtoast .3s ease;backdrop-filter:blur(12px)}
.rc-toast-err{background:rgba(248,113,113,0.12);border-color:rgba(248,113,113,0.2);color:#f87171}
@keyframes rtoast{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* ═══ Responsive ═══ */
@media(max-width:640px){
  .rc-head{padding:14px 18px;flex-wrap:wrap;gap:8px}
  .rc-date{display:none}
  .rc-strip{padding:12px 18px;gap:0}
  .rc-strip-item{padding:0 12px}
  .rc-strip-num{font-size:1.1rem}
  .rc-filters{padding:10px 18px}
  .rc-body{padding:16px 18px}
  .rc-card{padding:14px 16px}
  .rc-card-time{font-size:1rem;min-width:44px}
  .rc-card-name{font-size:.82rem}
  .rc-card-actions{flex-wrap:wrap}
  .rc-act{padding:8px 14px;flex:1;min-width:70px;text-align:center;min-height:38px}
}

@media(max-width:375px){
  .rc-strip-item{padding:0 8px}
  .rc-strip-num{font-size:.95rem}
  .rc-strip-lab{font-size:.55rem}
}
`;
