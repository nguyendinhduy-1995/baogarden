'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface UserData { id: string; name: string; role: string; }
interface BookingData {
  id: string; bookingCode: string; bookingDate: string; bookingTime: string;
  guestCount: number; status: string; depositAmount: string; minSpend: string; note: string;
  customer: { name: string; phone: string };
  table: { code: string; area?: { name: string } };
}

export default function ReceptionPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('action');
  const [toast, setToast] = useState('');
  const [toastOk, setToastOk] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.success || !['RECEPTION', 'ADMIN', 'MANAGER'].includes(d.user.role)) { router.push('/login'); return; }
      setUser(d.user);
    }).catch(() => router.push('/login'));
  }, [router]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch('/api/bookings/today'); const d = await r.json(); if (d.success) setBookings(d.data); }
    catch { /* */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { const t = setInterval(fetchBookings, 30000); return () => clearInterval(t); }, [fetchBookings]);

  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const flash = (msg: string, ok = true) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg); setToastOk(ok);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const act = async (id: string, status: string, label: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/bookings/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const data = await res.json();
      data.success ? (flash(label), fetchBookings()) : flash(data.error || 'Lỗi', false);
    } catch { flash('Lỗi kết nối', false); } finally { setBusy(null); }
  };

  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); };

  const pending = bookings.filter(b => b.status === 'PENDING').length;
  const confirmed = bookings.filter(b => b.status === 'CONFIRMED').length;
  const arrived = bookings.filter(b => b.status === 'ARRIVED').length;
  const done = bookings.filter(b => ['COMPLETED','CANCELLED','NO_SHOW'].includes(b.status)).length;

  const getFiltered = () => {
    if (filter === 'action') return bookings.filter(b => ['PENDING','CONFIRMED','ARRIVED'].includes(b.status));
    if (filter === 'done') return bookings.filter(b => ['COMPLETED','CANCELLED','NO_SHOW'].includes(b.status));
    return bookings.filter(b => b.status === filter);
  };
  const filtered = getFiltered().sort((a, b) => a.bookingTime.localeCompare(b.bookingTime));

  const now = new Date();
  const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });

  if (!user) return (<><style>{CSS}</style><div className="R-load"><div className="R-spin" /></div></>);

  return (
    <>
      <style>{CSS}</style>
      <div className="R">

        {/* ═══ HEADER ═══ */}
        <header className="R-hd">
          <div className="R-hd-l">
            <h1 className="R-title">Lễ Tân</h1>
            <p className="R-date">{dateStr}</p>
          </div>
          <div className="R-hd-r">
            <button className="R-hd-btn" onClick={fetchBookings} title="Tải lại">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
            </button>
            <button className="R-hd-btn R-hd-out" onClick={handleLogout} title="Đăng xuất">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </header>

        {/* ═══ FILTER TABS ═══ */}
        <div className="R-tabs">
          {[
            { key: 'action', label: 'Cần xử lý', count: pending + confirmed + arrived, accent: true },
            { key: 'PENDING', label: 'Chờ XN', count: pending, color: '#fbbf24' },
            { key: 'CONFIRMED', label: 'Sắp đến', count: confirmed, color: '#60a5fa' },
            { key: 'ARRIVED', label: 'Đã đến', count: arrived, color: '#4ade80' },
            { key: 'done', label: 'Xong', count: done, color: '#888' },
          ].map(t => (
            <button key={t.key}
              className={`R-tab ${filter === t.key ? 'R-tab-on' : ''} ${t.accent ? 'R-tab-accent' : ''}`}
              onClick={() => setFilter(t.key)}>
              <span className="R-tab-count" style={t.color ? { color: t.color } : undefined}>{t.count}</span>
              <span className="R-tab-label">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ═══ LIST ═══ */}
        <div className="R-list">
          {loading ? (
            <div className="R-load"><div className="R-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="R-empty">
              <p className="R-empty-icon">✓</p>
              <p className="R-empty-text">{filter === 'action' ? 'Tất cả đã xử lý xong' : 'Không có booking'}</p>
            </div>
          ) : (
            filtered.map(b => {
              const isPending = b.status === 'PENDING';
              const isConfirmed = b.status === 'CONFIRMED';
              const isArrived = b.status === 'ARRIVED';
              const isDone = ['CANCELLED','NO_SHOW','COMPLETED'].includes(b.status);
              const statusLabel = isPending ? 'Chờ XN' : isConfirmed ? 'Sắp đến' : isArrived ? 'Có mặt' : b.status === 'COMPLETED' ? 'Xong' : b.status === 'CANCELLED' ? 'Đã hủy' : 'Vắng';
              const statusColor = isPending ? '#fbbf24' : isConfirmed ? '#60a5fa' : isArrived ? '#4ade80' : b.status === 'COMPLETED' ? '#a78bfa' : '#666';

              return (
                <div key={b.id} className={`R-card ${isPending ? 'R-card-hot' : ''} ${isDone ? 'R-card-dim' : ''}`}>

                  {/* Row 1: Time + Customer + Status */}
                  <div className="R-r1">
                    <div className="R-time-box">
                      <span className="R-time">{b.bookingTime}</span>
                    </div>
                    <div className="R-customer">
                      <span className="R-cname">{b.customer.name}</span>
                      <a href={`tel:${b.customer.phone}`} className="R-cphone">{b.customer.phone}</a>
                    </div>
                    <div className="R-status" style={{ color: statusColor, borderColor: statusColor, background: statusColor + '12' }}>
                      {statusLabel}
                    </div>
                  </div>

                  {/* Row 2: Table + Guests + Area + Note */}
                  <div className="R-r2">
                    <span className="R-tbl">{b.table.code}</span>
                    <span className="R-gst">{b.guestCount} khách</span>
                    {b.table.area?.name && <span className="R-area">{b.table.area.name}</span>}
                    {b.note && <span className="R-note">{b.note}</span>}
                  </div>

                  {/* Row 3: ACTION BUTTONS */}
                  {!isDone && (
                    <div className="R-r3">
                      {isPending && (
                        <>
                          <button className="R-btn R-btn-gold" disabled={busy === b.id}
                            onClick={() => act(b.id, 'CONFIRMED', '✓ Đã xác nhận')}>
                            ✓ XÁC NHẬN
                          </button>
                          <button className="R-btn R-btn-ghost" disabled={busy === b.id}
                            onClick={() => act(b.id, 'CANCELLED', 'Đã hủy booking')}>
                            HỦY
                          </button>
                        </>
                      )}
                      {isConfirmed && (
                        <>
                          <button className="R-btn R-btn-green" disabled={busy === b.id}
                            onClick={() => act(b.id, 'ARRIVED', '✓ Khách đã đến')}>
                            ✓ CHECK-IN
                          </button>
                          <button className="R-btn R-btn-ghost" disabled={busy === b.id}
                            onClick={() => act(b.id, 'NO_SHOW', 'Đánh dấu vắng')}>
                            VẮNG
                          </button>
                        </>
                      )}
                      {isArrived && (
                        <button className="R-btn R-btn-purple" disabled={busy === b.id}
                          onClick={() => act(b.id, 'COMPLETED', '✓ Hoàn tất')}>
                          ✓ HOÀN TẤT
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Toast */}
        {toast && <div className={`R-toast ${toastOk ? '' : 'R-toast-err'}`}>{toast}</div>}
      </div>
    </>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

*{box-sizing:border-box;margin:0;padding:0}
.R{min-height:100dvh;background:#09090e;color:#fff;font-family:'Inter',-apple-system,sans-serif;-webkit-tap-highlight-color:transparent}

.R-load{display:flex;align-items:center;justify-content:center;min-height:100dvh;background:#09090e}
.R-spin{width:32px;height:32px;border:3px solid rgba(212,168,74,.15);border-top-color:#D4A84A;border-radius:50%;animation:sp .6s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}

/* ═══ HEADER ═══ */
.R-hd{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.04)}
.R-title{font-size:1.4rem;font-weight:900;color:#D4A84A;letter-spacing:.02em}
.R-date{font-size:.78rem;color:rgba(255,255,255,.3);margin-top:2px;text-transform:capitalize}
.R-hd-r{display:flex;gap:8px}
.R-hd-btn{width:42px;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);color:rgba(255,255,255,.4);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
.R-hd-btn:active{transform:scale(.9)}
.R-hd-btn:hover{border-color:rgba(212,168,74,.3);color:#D4A84A;background:rgba(212,168,74,.05)}
.R-hd-out:hover{border-color:rgba(239,68,68,.3);color:#ef4444;background:rgba(239,68,68,.05)}

/* ═══ TABS ═══ */
.R-tabs{display:flex;gap:6px;padding:16px 20px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.R-tabs::-webkit-scrollbar{display:none}
.R-tab{flex:1;min-width:60px;padding:12px 8px;border-radius:14px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;transition:all .15s;font-family:inherit}
.R-tab:active{transform:scale(.95)}
.R-tab-on{border-color:rgba(212,168,74,.25);background:rgba(212,168,74,.06)}
.R-tab-accent .R-tab-count{color:#D4A84A !important}
.R-tab-count{font-size:1.6rem;font-weight:900;line-height:1;color:rgba(255,255,255,.6)}
.R-tab-label{font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:rgba(255,255,255,.25)}
.R-tab-on .R-tab-label{color:rgba(255,255,255,.45)}

/* ═══ LIST ═══ */
.R-list{padding:8px 16px 120px;display:flex;flex-direction:column;gap:8px}
.R-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;gap:4px}
.R-empty-icon{font-size:32px;color:rgba(74,222,128,.25)}
.R-empty-text{font-size:.9rem;color:rgba(255,255,255,.2)}

/* ═══ CARD ═══ */
.R-card{border-radius:16px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);padding:16px 18px;transition:all .15s}
.R-card-hot{border-color:rgba(251,191,36,.15);background:rgba(251,191,36,.025);animation:hotPulse 3s ease-in-out infinite}
@keyframes hotPulse{0%,100%{border-color:rgba(251,191,36,.15)}50%{border-color:rgba(251,191,36,.3)}}
.R-card-dim{opacity:.45}

/* Row 1: Time + Customer + Status */
.R-r1{display:flex;align-items:center;gap:14px}

.R-time-box{flex-shrink:0}
.R-time{font-size:1.5rem;font-weight:900;color:#fff;font-variant-numeric:tabular-nums;letter-spacing:-.02em}

.R-customer{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.R-cname{font-size:1.05rem;font-weight:700;color:rgba(255,255,255,.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.R-cphone{font-size:.82rem;color:rgba(212,168,74,.6);text-decoration:none;font-weight:500}
.R-cphone:hover{color:#D4A84A}

.R-status{flex-shrink:0;font-size:.7rem;font-weight:700;padding:5px 12px;border-radius:8px;border:1px solid;text-transform:uppercase;letter-spacing:.04em}

/* Row 2: Details */
.R-r2{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap}
.R-tbl{font-size:.9rem;font-weight:800;color:#D4A84A;background:rgba(212,168,74,.1);padding:4px 12px;border-radius:8px}
.R-gst{font-size:.82rem;font-weight:600;color:rgba(255,255,255,.4)}
.R-area{font-size:.72rem;color:rgba(255,255,255,.2);padding:3px 8px;border:1px solid rgba(255,255,255,.06);border-radius:6px}
.R-note{font-size:.72rem;color:rgba(255,255,255,.25);font-style:italic;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* Row 3: ACTIONS */
.R-r3{display:flex;gap:8px;margin-top:14px}
.R-btn{flex:1;padding:14px 16px;border-radius:12px;font-size:.88rem;font-weight:800;letter-spacing:.04em;cursor:pointer;border:none;transition:all .12s;font-family:inherit;text-transform:uppercase}
.R-btn:active{transform:scale(.96)}
.R-btn:disabled{opacity:.35;pointer-events:none}

.R-btn-gold{background:linear-gradient(135deg,#D4A84A,#c49a3a);color:#000;box-shadow:0 4px 20px rgba(212,168,74,.25)}
.R-btn-gold:hover{box-shadow:0 6px 28px rgba(212,168,74,.35)}

.R-btn-green{background:linear-gradient(135deg,#4ade80,#22c55e);color:#000;box-shadow:0 4px 20px rgba(74,222,128,.2)}
.R-btn-green:hover{box-shadow:0 6px 28px rgba(74,222,128,.3)}

.R-btn-purple{background:rgba(167,139,250,.12);color:#a78bfa;border:1px solid rgba(167,139,250,.2)}
.R-btn-purple:hover{background:rgba(167,139,250,.2)}

.R-btn-ghost{flex:0 0 auto;padding:14px 20px;background:transparent;color:rgba(255,255,255,.25);border:1px solid rgba(255,255,255,.06)}
.R-btn-ghost:hover{color:#f87171;border-color:rgba(248,113,113,.2);background:rgba(248,113,113,.04)}

/* ═══ TOAST ═══ */
.R-toast{position:fixed;bottom:32px;left:50%;transform:translateX(-50%);padding:14px 32px;border-radius:14px;background:rgba(10,10,16,.95);border:1px solid rgba(74,222,128,.25);color:#4ade80;font-size:.9rem;font-weight:700;z-index:200;animation:tIn .2s ease;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 12px 40px rgba(0,0,0,.5);white-space:nowrap}
.R-toast-err{border-color:rgba(248,113,113,.25);color:#f87171}
@keyframes tIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* ═══ RESPONSIVE ═══ */
@media(max-width:480px){
  .R-hd{padding:14px 16px}
  .R-title{font-size:1.2rem}
  .R-tabs{padding:12px 16px;gap:5px}
  .R-tab{padding:10px 6px;border-radius:12px;min-width:54px}
  .R-tab-count{font-size:1.3rem}
  .R-list{padding:6px 12px 120px;gap:6px}
  .R-card{padding:14px 14px}
  .R-time{font-size:1.3rem}
  .R-cname{font-size:.95rem}
  .R-cphone{font-size:.78rem}
  .R-btn{padding:13px 14px;font-size:.82rem}
}

@media(min-width:768px){
  .R-list{max-width:680px;margin:0 auto;width:100%}
  .R-tabs{max-width:680px;margin:0 auto;gap:8px}
  .R-tab{flex:0 1 120px}
  .R-tab-count{font-size:1.8rem}
  .R-card{padding:20px 24px}
  .R-time{font-size:1.7rem}
  .R-cname{font-size:1.15rem}
  .R-tbl{font-size:1rem;padding:5px 14px}
  .R-btn{padding:16px 20px;font-size:.95rem;border-radius:14px}
}
`;
