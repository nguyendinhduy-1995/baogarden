'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UserData { id: string; name: string; role: string; }
interface BookingData {
  id: string; bookingCode: string; bookingDate: string; bookingTime: string;
  guestCount: number; status: string; depositAmount: string; minSpend: string; note: string;
  customer: { name: string; phone: string };
  table: { code: string; area?: { name: string } };
}

const STATUS: Record<string, { label: string; icon: string; color: string; glow: string }> = {
  PENDING:   { label: 'Chờ xác nhận', icon: '⏳', color: '#fbbf24', glow: 'rgba(251,191,36,0.15)' },
  CONFIRMED: { label: 'Đã xác nhận', icon: '✓', color: '#60a5fa', glow: 'rgba(96,165,250,0.15)' },
  ARRIVED:   { label: 'Đã đến', icon: '🟢', color: '#4ade80', glow: 'rgba(74,222,128,0.15)' },
  CANCELLED: { label: 'Đã hủy', icon: '✕', color: '#f87171', glow: 'rgba(248,113,113,0.08)' },
  NO_SHOW:   { label: 'Không đến', icon: '⊘', color: '#6b7280', glow: 'rgba(107,114,128,0.08)' },
  COMPLETED: { label: 'Hoàn tất', icon: '★', color: '#a78bfa', glow: 'rgba(167,139,250,0.08)' },
};

type View = 'timeline' | 'status';

export default function ReceptionPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('action');
  const [toast, setToast] = useState('');
  const [toastOk, setToastOk] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<View>('timeline');
  const [expandId, setExpandId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.success || !['RECEPTION', 'ADMIN', 'MANAGER'].includes(d.user.role)) { router.push('/login'); return; }
      setUser(d.user);
    }).catch(() => router.push('/login'));
  }, [router]);

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
  useEffect(() => { const t = setInterval(fetchBookings, 30000); return () => clearInterval(t); }, [fetchBookings]);

  const flash = (msg: string, ok = true) => { setToast(msg); setToastOk(ok); setTimeout(() => setToast(''), 2500); };

  const act = async (id: string, status: string, label: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/bookings/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const data = await res.json();
      data.success ? (flash(label + ' thành công'), fetchBookings()) : flash(data.error || 'Lỗi', false);
    } catch { flash('Lỗi kết nối', false); }
    finally { setBusy(null); }
  };

  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); };

  // Filter logic
  const getFiltered = () => {
    if (filter === 'action') return bookings.filter(b => ['PENDING', 'CONFIRMED', 'ARRIVED'].includes(b.status));
    if (filter === 'all') return bookings;
    return bookings.filter(b => b.status === filter);
  };
  const filtered = getFiltered().sort((a, b) => a.bookingTime.localeCompare(b.bookingTime));

  const pending = bookings.filter(b => b.status === 'PENDING').length;
  const confirmed = bookings.filter(b => b.status === 'CONFIRMED').length;
  const arrived = bookings.filter(b => b.status === 'ARRIVED').length;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });

  if (!user) return (<><style>{CSS}</style><div className="rp-load"><div className="rp-spin" /></div></>);

  return (
    <>
      <style>{CSS}</style>
      <div className="rp">

        {/* ═══ Top Bar ═══ */}
        <div className="rp-top">
          <div className="rp-top-left">
            <div className="rp-logo">BÁO</div>
            <div className="rp-top-info">
              <span className="rp-top-time">{timeStr}</span>
              <span className="rp-top-date">{dateStr}</span>
            </div>
          </div>
          <div className="rp-top-right">
            <button className="rp-top-btn" onClick={fetchBookings}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
            </button>
            <button className="rp-top-btn rp-top-out" onClick={handleLogout}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>

        {/* ═══ Status Counters ═══ */}
        <div className="rp-counters">
          <button className={`rp-counter ${filter === 'action' ? 'rp-counter-on' : ''}`} onClick={() => setFilter('action')}>
            <span className="rp-c-num">{bookings.length}</span>
            <span className="rp-c-lab">Tổng</span>
          </button>
          <button className={`rp-counter rp-counter-pending ${filter === 'PENDING' ? 'rp-counter-on' : ''}`} onClick={() => setFilter('PENDING')}>
            <span className="rp-c-num">{pending}</span>
            <span className="rp-c-lab">Chờ XN</span>
            {pending > 0 && <span className="rp-c-pulse" />}
          </button>
          <button className={`rp-counter rp-counter-confirmed ${filter === 'CONFIRMED' ? 'rp-counter-on' : ''}`} onClick={() => setFilter('CONFIRMED')}>
            <span className="rp-c-num">{confirmed}</span>
            <span className="rp-c-lab">Đã XN</span>
          </button>
          <button className={`rp-counter rp-counter-arrived ${filter === 'ARRIVED' ? 'rp-counter-on' : ''}`} onClick={() => setFilter('ARRIVED')}>
            <span className="rp-c-num">{arrived}</span>
            <span className="rp-c-lab">Đã đến</span>
          </button>
          <button className={`rp-counter ${filter === 'all' ? 'rp-counter-on' : ''}`} onClick={() => setFilter('all')}>
            <span className="rp-c-num">⋯</span>
            <span className="rp-c-lab">Tất cả</span>
          </button>
        </div>

        {/* ═══ Booking List ═══ */}
        <div className="rp-list">
          {loading ? (
            <div className="rp-load"><div className="rp-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="rp-empty">
              <div className="rp-empty-i">☑</div>
              <div className="rp-empty-t">{filter === 'action' ? 'Không có booking cần xử lý' : 'Không có booking nào'}</div>
            </div>
          ) : (
            filtered.map(b => {
              const s = STATUS[b.status] || STATUS.COMPLETED;
              const isExpanded = expandId === b.id;
              const isPending = b.status === 'PENDING';
              const isConfirmed = b.status === 'CONFIRMED';
              const isArrived = b.status === 'ARRIVED';
              const isDone = ['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(b.status);

              return (
                <div key={b.id} className={`rp-card ${isDone ? 'rp-card-done' : ''} ${isPending ? 'rp-card-pending' : ''}`}
                  style={{ '--card-color': s.color, '--card-glow': s.glow } as React.CSSProperties}>

                  {/* Main Row — always visible */}
                  <div className="rp-row" onClick={() => setExpandId(isExpanded ? null : b.id)}>
                    {/* Time */}
                    <div className="rp-time">{b.bookingTime}</div>

                    {/* Center info */}
                    <div className="rp-info">
                      <div className="rp-name">{b.customer.name}</div>
                      <div className="rp-meta">
                        <span className="rp-table">{b.table.code}</span>
                        <span className="rp-guests">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                          {b.guestCount}
                        </span>
                        {b.table.area?.name && <span className="rp-area">{b.table.area.name}</span>}
                      </div>
                    </div>

                    {/* Status + Primary Action */}
                    <div className="rp-right">
                      {isPending && (
                        <button className="rp-action rp-action-confirm" disabled={busy === b.id}
                          onClick={e => { e.stopPropagation(); act(b.id, 'CONFIRMED', 'Xác nhận'); }}>
                          Xác nhận
                        </button>
                      )}
                      {isConfirmed && (
                        <button className="rp-action rp-action-checkin" disabled={busy === b.id}
                          onClick={e => { e.stopPropagation(); act(b.id, 'ARRIVED', 'Check-in'); }}>
                          Check-in
                        </button>
                      )}
                      {isArrived && (
                        <button className="rp-action rp-action-done" disabled={busy === b.id}
                          onClick={e => { e.stopPropagation(); act(b.id, 'COMPLETED', 'Hoàn tất'); }}>
                          Xong
                        </button>
                      )}
                      {isDone && (
                        <div className="rp-badge" style={{ color: s.color, background: s.glow }}>{s.label}</div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="rp-detail">
                      <div className="rp-detail-row">
                        <a href={`tel:${b.customer.phone}`} className="rp-phone-btn">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                          {b.customer.phone}
                        </a>
                        {b.note && <span className="rp-note">📝 {b.note}</span>}
                      </div>
                      {!isDone && (
                        <div className="rp-detail-actions">
                          {isPending && (
                            <button className="rp-sec-btn rp-sec-cancel" disabled={busy === b.id}
                              onClick={() => act(b.id, 'CANCELLED', 'Hủy')}>Hủy booking</button>
                          )}
                          {isConfirmed && (
                            <button className="rp-sec-btn rp-sec-noshow" disabled={busy === b.id}
                              onClick={() => act(b.id, 'NO_SHOW', 'Đánh dấu không đến')}>Không đến</button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Toast */}
        {toast && <div className={`rp-toast ${toastOk ? '' : 'rp-toast-err'}`}>{toast}</div>}
      </div>
    </>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

*{box-sizing:border-box}
.rp{min-height:100dvh;background:#0b0b10;color:#e8e6e3;font-family:'Inter',-apple-system,sans-serif;display:flex;flex-direction:column;-webkit-tap-highlight-color:transparent}

.rp-load{display:flex;align-items:center;justify-content:center;min-height:100dvh;background:#0b0b10}
.rp-spin{width:28px;height:28px;border:2.5px solid rgba(212,168,74,.2);border-top-color:#D4A84A;border-radius:50%;animation:sp .65s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}

/* ═══ Top Bar ═══ */
.rp-top{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:linear-gradient(180deg,rgba(212,168,74,.04),transparent);border-bottom:1px solid rgba(255,255,255,.03)}
.rp-top-left{display:flex;align-items:center;gap:14px}
.rp-logo{font-size:1.1rem;font-weight:800;color:#D4A84A;letter-spacing:.12em;line-height:1}
.rp-top-info{display:flex;flex-direction:column}
.rp-top-time{font-size:.82rem;font-weight:700;color:rgba(255,255,255,.8)}
.rp-top-date{font-size:.62rem;color:rgba(255,255,255,.25);text-transform:capitalize}
.rp-top-right{display:flex;gap:8px}
.rp-top-btn{width:38px;height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);color:rgba(255,255,255,.35);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
.rp-top-btn:active{transform:scale(.92)}
.rp-top-btn:hover{border-color:rgba(212,168,74,.25);color:#D4A84A}
.rp-top-out:hover{border-color:rgba(239,68,68,.25);color:#ef4444}

/* ═══ Counters ═══ */
.rp-counters{display:flex;gap:6px;padding:14px 20px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.rp-counters::-webkit-scrollbar{display:none}
.rp-counter{flex:1;min-width:58px;padding:10px 6px;border-radius:12px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;transition:all .2s;position:relative;font-family:inherit}
.rp-counter:active{transform:scale(.96)}
.rp-counter-on{border-color:rgba(212,168,74,.2);background:rgba(212,168,74,.05)}
.rp-c-num{font-size:1.3rem;font-weight:800;color:rgba(255,255,255,.7);line-height:1.1}
.rp-c-lab{font-size:.55rem;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.25);font-weight:600}
.rp-counter-pending .rp-c-num{color:#fbbf24}
.rp-counter-confirmed .rp-c-num{color:#60a5fa}
.rp-counter-arrived .rp-c-num{color:#4ade80}
.rp-counter-on .rp-c-num{color:#D4A84A}
.rp-counter-on.rp-counter-pending .rp-c-num{color:#fbbf24}
.rp-counter-on.rp-counter-confirmed .rp-c-num{color:#60a5fa}
.rp-counter-on.rp-counter-arrived .rp-c-num{color:#4ade80}

/* Pulse dot for pending */
.rp-c-pulse{position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:50%;background:#fbbf24;animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}

/* ═══ List ═══ */
.rp-list{flex:1;padding:4px 16px 100px;display:flex;flex-direction:column;gap:4px}
.rp-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;gap:8px}
.rp-empty-i{font-size:28px;opacity:.2}
.rp-empty-t{font-size:.82rem;color:rgba(255,255,255,.2)}

/* ═══ Card ═══ */
.rp-card{border-radius:14px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.018);overflow:hidden;transition:all .2s}
.rp-card:active{transform:scale(.995)}
.rp-card-pending{border-color:rgba(251,191,36,.12);background:rgba(251,191,36,.03)}
.rp-card-done{opacity:.5}

.rp-row{display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer;-webkit-user-select:none;user-select:none}

/* Time */
.rp-time{font-size:1.15rem;font-weight:800;color:#fff;min-width:52px;font-variant-numeric:tabular-nums;letter-spacing:-.01em}

/* Info */
.rp-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.rp-name{font-size:.88rem;font-weight:600;color:rgba(255,255,255,.88);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rp-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rp-table{font-size:.72rem;font-weight:700;color:#D4A84A;background:rgba(212,168,74,.1);padding:2px 8px;border-radius:5px}
.rp-guests{display:flex;align-items:center;gap:3px;font-size:.7rem;color:rgba(255,255,255,.3)}
.rp-guests svg{opacity:.5}
.rp-area{font-size:.6rem;color:rgba(255,255,255,.18);font-weight:500}

/* Right side — Primary Action */
.rp-right{flex-shrink:0}
.rp-action{padding:8px 20px;border-radius:10px;font-size:.78rem;font-weight:700;cursor:pointer;border:none;transition:all .15s;font-family:inherit;letter-spacing:.01em}
.rp-action:active{transform:scale(.94)}
.rp-action:disabled{opacity:.4;pointer-events:none}

.rp-action-confirm{background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#000;box-shadow:0 2px 12px rgba(251,191,36,.2)}
.rp-action-confirm:hover{box-shadow:0 4px 20px rgba(251,191,36,.3)}

.rp-action-checkin{background:linear-gradient(135deg,#4ade80,#22c55e);color:#000;box-shadow:0 2px 12px rgba(74,222,128,.2)}
.rp-action-checkin:hover{box-shadow:0 4px 20px rgba(74,222,128,.3)}

.rp-action-done{background:rgba(167,139,250,.15);color:#a78bfa;border:1px solid rgba(167,139,250,.2)}
.rp-action-done:hover{background:rgba(167,139,250,.22)}

.rp-badge{font-size:.65rem;font-weight:600;padding:4px 10px;border-radius:100px;white-space:nowrap}

/* ═══ Expanded Detail ═══ */
.rp-detail{padding:0 16px 14px;border-top:1px solid rgba(255,255,255,.03);animation:slideDown .2s ease}
@keyframes slideDown{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}

.rp-detail-row{display:flex;align-items:center;gap:12px;padding-top:10px;flex-wrap:wrap}
.rp-phone-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;background:rgba(212,168,74,.08);border:1px solid rgba(212,168,74,.15);color:#D4A84A;font-size:.78rem;font-weight:600;text-decoration:none;transition:all .15s}
.rp-phone-btn:active{transform:scale(.95)}
.rp-phone-btn:hover{background:rgba(212,168,74,.14)}

.rp-note{font-size:.72rem;color:rgba(255,255,255,.3);font-style:italic}

.rp-detail-actions{display:flex;gap:8px;margin-top:10px}
.rp-sec-btn{padding:7px 16px;border-radius:8px;font-size:.72rem;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,.06);background:transparent;color:rgba(255,255,255,.3);transition:all .15s;font-family:inherit}
.rp-sec-btn:active{transform:scale(.95)}
.rp-sec-btn:disabled{opacity:.3;pointer-events:none}
.rp-sec-cancel:hover{border-color:rgba(248,113,113,.25);color:#f87171;background:rgba(248,113,113,.06)}
.rp-sec-noshow:hover{border-color:rgba(107,114,128,.3);color:rgba(255,255,255,.5)}

/* ═══ Toast ═══ */
.rp-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);padding:12px 28px;border-radius:12px;background:rgba(17,17,24,.92);border:1px solid rgba(74,222,128,.2);color:#4ade80;font-size:.82rem;font-weight:600;z-index:200;animation:tIn .25s ease;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 8px 32px rgba(0,0,0,.4)}
.rp-toast-err{border-color:rgba(248,113,113,.2);color:#f87171}
@keyframes tIn{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* ═══ Responsive ═══ */
@media(max-width:480px){
  .rp-top{padding:12px 16px}
  .rp-counters{padding:10px 16px;gap:4px}
  .rp-counter{padding:8px 4px;border-radius:10px;min-width:50px}
  .rp-c-num{font-size:1.1rem}
  .rp-list{padding:4px 12px 100px;gap:3px}
  .rp-row{padding:12px 14px;gap:10px}
  .rp-time{font-size:1rem;min-width:46px}
  .rp-name{font-size:.82rem}
  .rp-action{padding:8px 14px;font-size:.72rem}
}

@media(min-width:768px){
  .rp-list{max-width:640px;margin:0 auto;width:100%}
  .rp-counters{max-width:640px;margin:0 auto;justify-content:center;gap:8px}
  .rp-counter{flex:0 0 auto;min-width:80px}
}
`;
