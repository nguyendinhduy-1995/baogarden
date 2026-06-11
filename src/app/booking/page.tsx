'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

/* ─── Types ── */
interface RawTable {
  id: string; code: string; name: string; status: string;
  minGuests: number; maxGuests: number;
  depositAmount: string; minSpend: string; note: string;
  isBooked?: boolean; area?: { name: string };
  bookingStatus?: string | null;
  bookingCode?: string | null;
  bookingCreatedAt?: string | null;
  bookingGuestCount?: number | null;
}
interface Table {
  id: string; code: string; area: string;
  status: 'available' | 'booked' | 'vip';
  bookingStatus: 'PENDING' | 'CONFIRMED' | 'ARRIVED' | null;
  bookingCode: string | null;
  bookingCreatedAt: string | null;
  bookingGuestCount: number | null;
  minGuests: number; maxGuests: number;
  deposit: number; minSpend: number;
}

const AREA_ORDER = ['Khu T','Khu A','Khu B','Khu VIP'];
const AREA_DESC: Record<string,string> = {
  'Khu T': 'Trung tâm · View sân khấu gần nhất',
  'Khu A': 'Bên phải · Năng lượng đỉnh cao',
  'Khu B': 'Bên trái · Lounge & chill',
  'Khu VIP': 'Phòng VIP · Tiệc đặc biệt',
};

const PENDING_TIMEOUT_MS = 10 * 60 * 1000; // 10 phút

export default function PublicBookingPage() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('20:00');
  const [guests, setGuests] = useState(2);
  const [sel, setSel] = useState<Table | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [toast, setToast] = useState<{msg:string; type:'error'|'success'} | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', note: '' });
  const [showNote, setShowNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState<{code:string;table:string;area:string;date:string;time:string;guests:number;name:string}|null>(null);
  const [activeArea, setActiveArea] = useState('all');
  const [now, setNow] = useState(Date.now());
  const ctaRef = useRef<HTMLDivElement>(null);

  /* step: 1=chọn ngày giờ, 2=chọn bàn, 3=điền thông tin */
  const step = showForm ? 3 : sel ? 2 : 1;

  /* realtime clock for pending countdown */
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tables/availability?date=${date || today}&time=${time}`);
      const data = await res.json();
      if (data.success && data.data) {
        setTables(data.data.filter((t: RawTable) => t.status !== 'INACTIVE').map((t: RawTable) => ({
          id: t.id, code: t.code, area: t.area?.name || '',
          status: t.isBooked ? 'booked' as const : t.status === 'VIP' ? 'vip' as const : 'available' as const,
          bookingStatus: t.bookingStatus as Table['bookingStatus'] || null,
          bookingCode: t.bookingCode || null,
          bookingCreatedAt: t.bookingCreatedAt || null,
          bookingGuestCount: t.bookingGuestCount || null,
          minGuests: t.minGuests, maxGuests: t.maxGuests,
          deposit: Number(t.depositAmount), minSpend: Number(t.minSpend),
        })));
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [date, time, today]);

  useEffect(() => { fetchTables(); }, [fetchTables]);
  useEffect(() => { setSel(null); }, [date, time]);

  /* Auto-refresh every 30s to keep booking status fresh */
  useEffect(() => {
    const interval = setInterval(() => { fetchTables(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchTables]);

  const grouped = useMemo(() => {
    const g: Record<string, Table[]> = {};
    for (const t of tables) { (g[t.area || 'Khác'] ??= []).push(t); }
    for (const a of Object.keys(g)) g[a].sort((x, y) =>
      (parseInt(x.code.replace(/\D/g, '')) || 0) - (parseInt(y.code.replace(/\D/g, '')) || 0));
    return g;
  }, [tables]);

  const areas = useMemo(() =>
    Object.keys(grouped).sort((a, b) =>
      (AREA_ORDER.indexOf(a) === -1 ? 99 : AREA_ORDER.indexOf(a)) -
      (AREA_ORDER.indexOf(b) === -1 ? 99 : AREA_ORDER.indexOf(b))), [grouped]);

  const filteredAreas = activeArea === 'all' ? areas : areas.filter(a => a === activeArea);
  const avail = tables.filter(t => t.status !== 'booked').length;
  const booked = tables.filter(t => t.status === 'booked').length;
  const pending = tables.filter(t => t.status === 'booked' && t.bookingStatus === 'PENDING').length;
  const confirmedCount = tables.filter(t => t.status === 'booked' && t.bookingStatus === 'CONFIRMED').length;

  const flash = (msg: string, type: 'error'|'success' = 'error') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 2500);
  };
  const pick = (t: Table) => {
    if (t.status === 'booked') { flash('Bàn này đã được đặt'); return; }
    if (sel?.id === t.id) { setSel(null); return; }
    setSel(t);
    flash(`Đã chọn bàn ${t.code}`, 'success');
    setTimeout(() => ctaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
  };

  /* pending countdown helper */
  const getPendingCountdown = (createdAt: string | null): string => {
    if (!createdAt) return '';
    const created = new Date(createdAt).getTime();
    const remaining = PENDING_TIMEOUT_MS - (now - created);
    if (remaining <= 0) return '';
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPendingProgress = (createdAt: string | null): number => {
    if (!createdAt) return 0;
    const created = new Date(createdAt).getTime();
    const elapsed = now - created;
    return Math.min(100, (elapsed / PENDING_TIMEOUT_MS) * 100);
  };

  /* auto-format phone */
  const handlePhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length > 4) formatted = digits.slice(0,4) + ' ' + digits.slice(4);
    if (digits.length > 7) formatted = digits.slice(0,4) + ' ' + digits.slice(4,7) + ' ' + digits.slice(7);
    setForm(p => ({ ...p, phone: formatted }));
  };

  const submit = async () => {
    if (!sel || !form.name.trim() || !form.phone.trim()) { flash('Vui lòng nhập đầy đủ thông tin'); return; }
    const rawPhone = form.phone.replace(/\s/g, '');
    if (!/^0\d{9}$/.test(rawPhone)) { flash('Số điện thoại không hợp lệ'); return; }
    if (!guests || guests < 1) { flash('Vui lòng nhập số khách'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.name.trim(), customerPhone: rawPhone,
          tableId: sel.id, bookingDate: date, bookingTime: time,
          guestCount: guests, note: form.note.trim(), source: 'PUBLIC',
        }),
      });
      const d = await res.json();
      if (d.success) {
        setConfirmed({
          code: d.data?.bookingCode || '',
          table: sel.code, area: sel.area,
          date, time, guests, name: form.name.trim(),
        });
        setSuccess(true); setShowForm(false);
        setForm({ name: '', phone: '', note: '' }); setShowNote(false);
        setSel(null); fetchTables();
      } else flash(d.error || 'Đặt bàn thất bại');
    } catch { flash('Lỗi kết nối server'); } finally { setSubmitting(false); }
  };

  /* ═══ SUCCESS ═══ */
  if (success) return (
    <div className="bk">
      <style>{CSS}</style>
      <div className="bk-success">
        <div className="bk-success-ring">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="bk-success-title">Đặt bàn thành công</h2>
        {confirmed && (
          <div className="bk-confirm-card">
            {confirmed.code && <div className="bk-confirm-code">Mã: {confirmed.code}</div>}
            <div className="bk-confirm-row">
              <span>Bàn</span><strong>{confirmed.table} · {confirmed.area}</strong>
            </div>
            <div className="bk-confirm-row">
              <span>Ngày</span><strong>{confirmed.date.split('-').reverse().join('/')}</strong>
            </div>
            <div className="bk-confirm-row">
              <span>Giờ</span><strong>{confirmed.time}</strong>
            </div>
            <div className="bk-confirm-row">
              <span>Khách</span><strong>{confirmed.guests} người</strong>
            </div>
            <div className="bk-confirm-row">
              <span>Tên</span><strong>{confirmed.name}</strong>
            </div>
          </div>
        )}
        <p className="bk-success-sub">
          Nhân viên sẽ liên hệ xác nhận trong ít phút.
        </p>
        <button onClick={() => { setSuccess(false); setConfirmed(null); fetchTables(); }} className="bk-gold-btn">Đặt thêm bàn</button>
        <a href="tel:0877766663" className="bk-link-phone">Hotline: 08 777 6666 3</a>
      </div>
    </div>
  );

  /* ═══ MAIN ═══ */
  return (
    <div className="bk">
      <style>{CSS}</style>

      {/* ── Hero ── */}
      <header className="bk-hero">
        <div className="bk-hero-glow" />
        <div className="bk-hero-content">
          <div className="bk-brand">BÁO GARDEN</div>
          <div className="bk-brand-line" />
          <div className="bk-brand-sub">ĐẶT BÀN TRỰC TUYẾN</div>
        </div>
      </header>

      {/* ── Steps ── */}
      <div className="bk-steps">
        <div className={`bk-step ${step >= 1 ? 'bk-step-active' : ''} ${step > 1 ? 'bk-step-done' : ''}`}>
          <span className="bk-step-num">{step > 1 ? '✓' : '1'}</span>
          <span className="bk-step-text">Chọn ngày giờ</span>
        </div>
        <div className="bk-step-line" />
        <div className={`bk-step ${step >= 2 ? 'bk-step-active' : ''} ${step > 2 ? 'bk-step-done' : ''}`}>
          <span className="bk-step-num">{step > 2 ? '✓' : '2'}</span>
          <span className="bk-step-text">Chọn bàn</span>
        </div>
        <div className="bk-step-line" />
        <div className={`bk-step ${step >= 3 ? 'bk-step-active' : ''}`}>
          <span className="bk-step-num">3</span>
          <span className="bk-step-text">Xác nhận</span>
        </div>
      </div>

      {/* ── Pickers ── */}
      <div className="bk-picker-section">
        <div className="bk-picker-row">
          <label className="bk-picker">
            <span className="bk-picker-label">Ngày đến</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} min={today} id="filter-date" />
          </label>
          <label className="bk-picker">
            <span className="bk-picker-label">Giờ đến</span>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} id="filter-time" />
          </label>
        </div>
      </div>

      {/* ── Floor Plan (Visual) ── */}
      <div className="bk-map-wrap">
        <div className="bk-floorplan">
          <div className="bk-fp-label">Sơ đồ tổng quan</div>
          <div className="bk-fp-img-wrap">
            <img src="/home/floorplan.jpg" alt="Sơ đồ bàn Báo Garden" className="bk-fp-img" />
          </div>
        </div>
        {/* ── Stats bar ── */}
        <div className="bk-stats-bar">
          <div className="bk-stat-item bk-stat-avail">
            <span className="bk-stat-dot bk-dot-green" />
            <span className="bk-stat-num">{avail}</span>
            <span className="bk-stat-label">Trống</span>
          </div>
          <div className="bk-stat-divider" />
          <div className="bk-stat-item bk-stat-booked">
            <span className="bk-stat-dot bk-dot-red" />
            <span className="bk-stat-num">{booked}</span>
            <span className="bk-stat-label">Đã đặt</span>
          </div>
          {pending > 0 && (
            <>
              <div className="bk-stat-divider" />
              <div className="bk-stat-item bk-stat-pending">
                <span className="bk-stat-dot bk-dot-orange" />
                <span className="bk-stat-num">{pending}</span>
                <span className="bk-stat-label">Đang đợi</span>
              </div>
            </>
          )}
          {confirmedCount > 0 && (
            <>
              <div className="bk-stat-divider" />
              <div className="bk-stat-item bk-stat-conf">
                <span className="bk-stat-dot bk-dot-blue" />
                <span className="bk-stat-num">{confirmedCount}</span>
                <span className="bk-stat-label">Xác nhận</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Trust ── */}
      <div className="bk-trust">
        <span>✓ Xác nhận tức thì</span>
        <span>✓ Miễn phí đặt bàn</span>
        <span>✓ Hỗ trợ 24/7</span>
      </div>

      {/* ── Legend + Area filter ── */}
      <div className="bk-filter-bar">
        <div className="bk-legend">
          <span><i className="bk-led bk-led-g"/>Trống</span>
          <span><i className="bk-led bk-led-r"/>Đã đặt</span>
          <span><i className="bk-led bk-led-orange"/>Đang đợi</span>
          <span><i className="bk-led bk-led-gold"/>VIP</span>
        </div>
        <div className="bk-area-tabs">
          <button className={`bk-tab ${activeArea === 'all' ? 'bk-tab-on' : ''}`} onClick={() => setActiveArea('all')}>Tất cả</button>
          {areas.map(a => (
            <button key={a} className={`bk-tab ${activeArea === a ? 'bk-tab-on' : ''}`} onClick={() => setActiveArea(a)}>{a}</button>
          ))}
        </div>
      </div>

      {/* ── Urgency ── */}
      {avail > 0 && avail <= 8 && (
        <div className="bk-urgency">
          🔥 Chỉ còn <strong>{avail} bàn trống</strong> cho {time} {date === today ? 'hôm nay' : 'ngày này'}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && avail === 0 && (
        <div className="bk-empty">
          <p>Hết bàn trống cho khung giờ này</p>
          <button onClick={() => { setTime('21:00'); }} className="bk-empty-btn">Thử giờ khác</button>
        </div>
      )}

      {/* ── Table Grid ── */}
      {loading ? (
        <div className="bk-load"><div className="bk-spin"/></div>
      ) : (
        <div className="bk-sections" style={{ paddingBottom: sel ? 200 : 20 }}>
          {filteredAreas.map(area => (
            <section key={area} className="bk-section">
              <div className="bk-sec-head">
                <h3 className="bk-sec-title">{area}</h3>
                <span className="bk-sec-desc">{AREA_DESC[area] || ''}</span>
              </div>
              <div className="bk-grid">
                {grouped[area].map(t => {
                  const s = sel?.id === t.id;
                  const b = t.status === 'booked';
                  const v = t.status === 'vip';
                  const isPending = b && t.bookingStatus === 'PENDING';
                  const isConfirmed = b && t.bookingStatus === 'CONFIRMED';
                  const countdown = isPending ? getPendingCountdown(t.bookingCreatedAt) : '';
                  const progress = isPending ? getPendingProgress(t.bookingCreatedAt) : 0;
                  return (
                    <button key={t.id}
                      className={`bk-cell ${s ? 'bk-cell-sel' : isPending ? 'bk-cell-pending' : b ? 'bk-cell-bk' : v ? 'bk-cell-vip' : 'bk-cell-ok'}`}
                      onClick={() => pick(t)} disabled={b} id={`table-${t.code}`}>
                      <span className="bk-cell-code">{t.code}</span>
                      {v && !s && <span className="bk-cell-vtag">VIP</span>}
                      {isPending && (
                        <>
                          <span className="bk-cell-beacon" />
                          <div className="bk-cell-timer">
                            <div className="bk-cell-timer-bar">
                              <div className="bk-cell-timer-fill" style={{ width: `${100 - progress}%` }} />
                            </div>
                            <span className="bk-cell-timer-text">{countdown}</span>
                          </div>
                        </>
                      )}
                      {isConfirmed && (
                        <span className="bk-cell-status-tag bk-cell-tag-confirmed">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Bottom CTA ── */}
      {sel && !showForm && (
        <div className="bk-cta-wrap" ref={ctaRef}>
          <div className="bk-cta">
            <div className="bk-cta-info">
              <span className="bk-cta-code">{sel.code}</span>
              <span className="bk-cta-area">{sel.area}</span>
              {sel.status === 'vip' && <span className="bk-cta-vip">VIP</span>}
            </div>
            <button onClick={() => setShowForm(true)} className="bk-gold-btn bk-gold-btn-full" id="btn-book-now">
              Đặt bàn {sel.code}
            </button>
          </div>
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && sel && (
        <div className="bk-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="bk-modal">
            <div className="bk-modal-bar"/>
            <div className="bk-modal-top">
              <h3 className="bk-modal-title">Đặt bàn {sel.code}</h3>
              <button onClick={() => setShowForm(false)} className="bk-modal-x" id="close-booking-form">✕</button>
            </div>
            <div className="bk-modal-chip">
              <span>{sel.area}</span>
              <span>{date.split('-').reverse().slice(0,2).join('/')} · {time}</span>
            </div>

            <div className="bk-fields">
              {/* Name */}
              <div className="bk-fgroup">
                <input id="booking-name" type="text" value={form.name}
                  onChange={e => setForm(p => ({...p, name: e.target.value}))}
                  placeholder=" " className="bk-field" autoComplete="name" />
                <label htmlFor="booking-name" className="bk-flabel">Họ tên</label>
              </div>

              {/* Phone */}
              <div className="bk-fgroup">
                <input id="booking-phone" type="tel" value={form.phone}
                  onChange={e => handlePhone(e.target.value)}
                  placeholder=" " className={`bk-field ${form.phone && !/^0\d{3}\s\d{3}\s\d{3}$/.test(form.phone) && form.phone.replace(/\s/g,'').length >= 10 ? 'bk-field-err' : form.phone.replace(/\s/g,'').length === 10 ? 'bk-field-ok' : ''}`}
                  autoComplete="tel" />
                <label htmlFor="booking-phone" className="bk-flabel">Số điện thoại</label>
              </div>

              {/* Guests stepper */}
              <div className="bk-stepper">
                <span className="bk-stepper-label">Số khách</span>
                <div className="bk-stepper-ctrl">
                  <button type="button" className="bk-stepper-btn" onClick={() => setGuests(Math.max(1, guests - 1))} disabled={guests <= 1}>−</button>
                  <span className="bk-stepper-val">{guests}</span>
                  <button type="button" className="bk-stepper-btn" onClick={() => setGuests(Math.min(50, guests + 1))}>+</button>
                </div>
              </div>

              {/* Note toggle */}
              {!showNote ? (
                <button type="button" className="bk-note-toggle" onClick={() => setShowNote(true)}>
                  + Thêm ghi chú
                </button>
              ) : (
                <div className="bk-fgroup">
                  <textarea id="booking-note" value={form.note}
                    onChange={e => setForm(p => ({...p, note: e.target.value}))}
                    placeholder=" " rows={2} className="bk-field bk-field-ta" />
                  <label htmlFor="booking-note" className="bk-flabel">Ghi chú</label>
                </div>
              )}
            </div>

            <button onClick={submit} disabled={submitting} className="bk-gold-btn bk-gold-btn-full bk-gold-btn-lg" id="submit-booking">
              {submitting ? 'Đang xử lý...' : 'Xác nhận đặt bàn'}
            </button>

            <p className="bk-cancel-policy">Miễn phí hủy trước 2 giờ</p>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      {!sel && !loading && (
        <footer className="bk-footer">
          <div className="bk-footer-brand">Báo Garden</div>
          <a href="tel:0877766663" className="bk-footer-phone">Hotline: 08 777 6666 3</a>
          <p className="bk-footer-addr">Mở cửa 17:00 – 03:00 hàng ngày</p>
        </footer>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`bk-toast ${toast.type === 'success' ? 'bk-toast-ok' : 'bk-toast-err'}`}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}

.bk{
  min-height:100dvh; max-width:480px; margin:0 auto;
  display:flex; flex-direction:column;
  background:linear-gradient(180deg, #04060a 0%, #0a0e1a 30%, #0d1225 60%, #08091a 100%);
  font-family:'Inter',-apple-system,sans-serif;
  color:#e2ddd5; position:relative; overflow-x:hidden;
}
.bk::before {
  content:''; position:absolute; inset:0; pointer-events:none; z-index:0;
  background:radial-gradient(ellipse at 50% 20%, rgba(212,168,74,0.03) 0%, transparent 60%),
             radial-gradient(ellipse at 20% 80%, rgba(120,80,220,0.02) 0%, transparent 50%);
}

/* ── hero ── */
.bk-hero{
  position:relative; padding:36px 24px 24px;
  text-align:center; overflow:hidden; z-index:1;
}
.bk-hero::after{
  content:''; position:absolute; bottom:0; left:10%; right:10%;
  height:1px;
  background:linear-gradient(90deg, transparent, rgba(212,168,74,0.2), rgba(168,130,255,0.1), rgba(212,168,74,0.2), transparent);
}
.bk-hero-glow{
  position:absolute; top:-80px; left:50%; transform:translateX(-50%);
  width:400px; height:250px;
  background:radial-gradient(ellipse, rgba(212,168,74,0.1) 0%, rgba(120,80,220,0.03) 40%, transparent 70%);
  pointer-events:none; animation:bk-glow-breathe 5s ease-in-out infinite alternate;
}
@keyframes bk-glow-breathe { 0%{opacity:0.7;transform:translateX(-50%) scale(1)} 100%{opacity:1;transform:translateX(-50%) scale(1.1)} }
.bk-hero-content{position:relative;z-index:1}
.bk-brand{
  font-family:'Playfair Display',serif;
  font-size:30px; font-weight:800; letter-spacing:0.2em;
  background:linear-gradient(135deg, #FFF1C9 0%, #E8C464 25%, #D4A84A 50%, #B8892E 75%, #D4A84A 100%);
  background-size:200% auto;
  -webkit-background-clip:text; background-clip:text;
  -webkit-text-fill-color:transparent;
  animation:bk-shimmer 4s linear infinite;
  text-shadow:none;
}
@keyframes bk-shimmer{0%{background-position:0% center}100%{background-position:200% center}}
.bk-brand-line{
  width:60px;height:1px;margin:10px auto;position:relative;
  background:linear-gradient(90deg,transparent,#D4A84A,transparent);
}
.bk-brand-line::before,.bk-brand-line::after{
  content:'✦'; position:absolute; top:-5px; font-size:6px; color:rgba(212,168,74,0.4);
}
.bk-brand-line::before{left:-12px}
.bk-brand-line::after{right:-12px}
.bk-brand-sub{font-size:10px;letter-spacing:0.35em;color:rgba(212,168,74,0.5);font-weight:600}

/* ── steps ── */
.bk-steps{
  display:flex; align-items:center; justify-content:center;
  gap:0; padding:4px 24px 20px; position:relative; z-index:1;
}
.bk-step{
  display:flex; align-items:center; gap:6px;
  opacity:0.3; transition:all 0.3s;
}
.bk-step-active{opacity:1}
.bk-step-done{opacity:0.75}
.bk-step-num{
  width:26px; height:26px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  font-size:10px; font-weight:700;
  background:rgba(212,168,74,0.06); color:rgba(212,168,74,0.5);
  border:1.5px solid rgba(212,168,74,0.12);
  transition:all 0.3s;
}
.bk-step-active .bk-step-num{
  background:linear-gradient(135deg,rgba(212,168,74,0.2),rgba(212,168,74,0.08));
  border-color:rgba(212,168,74,0.5); color:#D4A84A;
  box-shadow:0 0 12px rgba(212,168,74,0.1);
}
.bk-step-done .bk-step-num{
  background:linear-gradient(135deg,rgba(34,197,94,0.2),rgba(34,197,94,0.08));
  border-color:rgba(34,197,94,0.4); color:#4ade80;
  box-shadow:0 0 10px rgba(34,197,94,0.08);
}
.bk-step-text{font-size:10px;color:#555;font-weight:600;letter-spacing:0.02em}
.bk-step-active .bk-step-text{color:#D4A84A}
.bk-step-done .bk-step-text{color:#4ade80}
.bk-step-line{
  width:28px; height:1px; margin:0 6px;
  background:rgba(212,168,74,0.12);
}

/* ── pickers ── */
.bk-picker-section{padding:0 16px 14px; position:relative; z-index:1}
.bk-picker-row{display:flex;gap:10px}
.bk-picker{
  flex:1;display:flex;flex-direction:column;gap:5px;
}
.bk-picker-label{
  font-size:9px;font-weight:700;color:rgba(212,168,74,0.45);letter-spacing:0.1em;padding-left:4px;text-transform:uppercase;
}
.bk-picker input{
  background:rgba(212,168,74,0.04);border:1.5px solid rgba(212,168,74,0.12);
  border-radius:14px;padding:13px 16px;font-size:15px;font-weight:700;
  color:#E8C464;outline:none;font-family:'Inter',sans-serif;
  transition:all 0.25s;
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.02);
}
.bk-picker input:focus{
  border-color:rgba(212,168,74,0.45);
  box-shadow:0 0 0 3px rgba(212,168,74,0.06), 0 0 20px rgba(212,168,74,0.04);
}
.bk-picker input::-webkit-calendar-picker-indicator{filter:invert(0.7) sepia(1) saturate(3) hue-rotate(10deg);cursor:pointer}

/* ── map ── */
.bk-map-wrap{padding:0 16px;margin-bottom:8px; position:relative; z-index:1}
.bk-floorplan{
  border-radius:18px;overflow:hidden;
  border:1.5px solid rgba(212,168,74,0.18);
  background:linear-gradient(180deg,rgba(6,18,64,0.5),rgba(4,8,30,0.85));
  padding:18px;position:relative;
  box-shadow:0 0 50px rgba(212,168,74,0.04),0 8px 32px rgba(0,0,0,0.35);
}
.bk-floorplan::before{
  content:'';position:absolute;inset:-1px;border-radius:18px;pointer-events:none;z-index:2;
  background:linear-gradient(180deg, rgba(212,168,74,0.06) 0%, transparent 30%, transparent 70%, rgba(120,80,220,0.03) 100%);
}
.bk-fp-label{
  text-align:center;font-size:9px;font-weight:700;
  letter-spacing:0.18em;color:rgba(212,168,74,0.35);
  text-transform:uppercase;margin-bottom:14px;position:relative;z-index:3;
}
.bk-fp-img-wrap{
  border-radius:12px;overflow:hidden;
  border:1px solid rgba(212,168,74,0.1);
}
.bk-fp-img{
  width:100%;height:auto;display:block;
  border-radius:12px;
}

/* ── stats bar ── */
.bk-stats-bar{
  display:flex;justify-content:center;align-items:center;gap:0;
  padding:14px 0 6px;
}
.bk-stat-item{
  display:flex;align-items:center;gap:6px;padding:0 14px;
}
.bk-stat-dot{
  width:8px;height:8px;border-radius:50%;flex-shrink:0;
}
.bk-dot-green{background:#22c55e;box-shadow:0 0 8px rgba(34,197,94,0.5)}
.bk-dot-red{background:#ef4444;box-shadow:0 0 8px rgba(239,68,68,0.5)}
.bk-dot-orange{background:#f59e0b;box-shadow:0 0 8px rgba(245,158,11,0.5);animation:bk-dot-blink 1.5s ease-in-out infinite}
.bk-dot-blue{background:#3b82f6;box-shadow:0 0 8px rgba(59,130,246,0.5)}
@keyframes bk-dot-blink{0%,100%{opacity:1}50%{opacity:0.3}}
.bk-stat-num{font-size:18px;font-weight:800;letter-spacing:-0.02em}
.bk-stat-avail .bk-stat-num{color:#4ade80}
.bk-stat-booked .bk-stat-num{color:#f87171}
.bk-stat-pending .bk-stat-num{color:#fbbf24}
.bk-stat-conf .bk-stat-num{color:#60a5fa}
.bk-stat-label{font-size:10px;color:rgba(226,221,213,0.4);font-weight:600}
.bk-stat-divider{width:1px;height:24px;background:rgba(255,255,255,0.06)}

/* ── trust ── */
.bk-trust{
  display:flex;justify-content:center;gap:18px;
  padding:8px 16px 12px;font-size:10px;color:rgba(212,168,74,0.35);font-weight:600;
  letter-spacing:0.02em; position:relative; z-index:1;
}
.bk-trust span{display:flex;align-items:center;gap:4px}

/* ── filter bar ── */
.bk-filter-bar{padding:0 16px 10px; position:relative; z-index:1}
.bk-legend{
  display:flex;justify-content:center;gap:16px;
  padding:0 0 12px;font-size:11px;color:rgba(226,221,213,0.45);font-weight:600;
}
.bk-led{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:middle}
.bk-led-g{background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,0.5)}
.bk-led-r{background:#ef4444;box-shadow:0 0 6px rgba(239,68,68,0.5)}
.bk-led-orange{background:#f59e0b;box-shadow:0 0 6px rgba(245,158,11,0.5)}
.bk-led-gold{background:#D4A84A;box-shadow:0 0 6px rgba(212,168,74,0.5)}

.bk-area-tabs{
  display:flex;gap:6px;overflow-x:auto;
  scrollbar-width:none;-ms-overflow-style:none;
  padding-bottom:4px;
}
.bk-area-tabs::-webkit-scrollbar{display:none}
.bk-tab{
  flex-shrink:0;padding:8px 18px;border-radius:24px;
  font-size:11px;font-weight:700;cursor:pointer;
  background:rgba(255,255,255,0.02);border:1.5px solid rgba(255,255,255,0.05);
  color:rgba(226,221,213,0.4);transition:all 0.25s;white-space:nowrap;
  letter-spacing:0.02em;
}
.bk-tab:hover{border-color:rgba(212,168,74,0.2);color:#D4A84A;background:rgba(212,168,74,0.04)}
.bk-tab-on{
  background:linear-gradient(135deg,rgba(212,168,74,0.12),rgba(212,168,74,0.05));
  border-color:rgba(212,168,74,0.35);color:#E8C464;
  box-shadow:0 0 16px rgba(212,168,74,0.06);
}

/* ── urgency ── */
.bk-urgency{
  margin:0 16px 10px;padding:10px 16px;border-radius:12px;
  background:linear-gradient(135deg,rgba(239,68,68,0.06),rgba(239,68,68,0.02));
  border:1px solid rgba(239,68,68,0.15);
  font-size:12px;color:#f87171;text-align:center;font-weight:600;
  animation:bk-urgency-pulse 3s ease-in-out infinite;
}
.bk-urgency strong{font-weight:800}
@keyframes bk-urgency-pulse{
  0%,100%{border-color:rgba(239,68,68,0.15)}
  50%{border-color:rgba(239,68,68,0.3);box-shadow:0 0 16px rgba(239,68,68,0.06)}
}

/* ── empty ── */
.bk-empty{text-align:center;padding:40px 20px;color:#6b7280;font-size:14px}
.bk-empty-btn{
  margin-top:14px;padding:10px 24px;border-radius:12px;
  background:rgba(212,168,74,0.08);border:1.5px solid rgba(212,168,74,0.2);
  color:#D4A84A;font-size:12px;font-weight:700;cursor:pointer;
  transition:all 0.2s;
}
.bk-empty-btn:hover{background:rgba(212,168,74,0.15);border-color:rgba(212,168,74,0.4)}

/* ── sections ── */
.bk-sections{flex:1;overflow-y:auto; position:relative; z-index:1}
.bk-section{padding:0 16px 12px}
.bk-sec-head{
  display:flex;align-items:baseline;gap:10px;
  padding:14px 4px 10px;margin-bottom:10px;position:relative;
}
.bk-sec-head::after{
  content:'';position:absolute;bottom:0;left:4px;right:4px;height:1px;
  background:linear-gradient(90deg, rgba(212,168,74,0.15), rgba(212,168,74,0.06), transparent);
}
.bk-sec-title{
  font-family:'Playfair Display',serif;font-size:16px;font-weight:700;
  color:#E8C464;letter-spacing:0.04em;
}
.bk-sec-desc{font-size:10px;color:rgba(212,168,74,0.35);font-weight:600;font-style:italic}

/* ── grid ── */
.bk-grid{display:grid;grid-template-columns:repeat(auto-fill, minmax(78px, 1fr));gap:8px}
.bk-cell{
  position:relative;border-radius:14px;padding:18px 4px 14px;text-align:center;
  border:1.5px solid transparent;cursor:pointer;
  transition:all 0.25s cubic-bezier(0.4,0,0.2,1);
  -webkit-tap-highlight-color:transparent;
  backdrop-filter:blur(4px);
  min-height:56px;
}
.bk-cell:active:not(:disabled){transform:scale(0.92)}
.bk-cell-code{font-size:15px;font-weight:800;letter-spacing:0.03em;display:block}
.bk-cell-vtag{
  position:absolute;top:4px;right:5px;font-size:6px;font-weight:800;
  color:#D4A84A;letter-spacing:0.12em;opacity:0.6;
}

/* ── cell: available ── */
.bk-cell-ok{
  background:linear-gradient(160deg,rgba(34,197,94,0.1),rgba(34,197,94,0.02));
  border-color:rgba(34,197,94,0.18);
  box-shadow:inset 0 1px 0 rgba(34,197,94,0.06);
}
.bk-cell-ok .bk-cell-code{color:#4ade80}
.bk-cell-ok:hover{
  background:linear-gradient(160deg,rgba(34,197,94,0.18),rgba(34,197,94,0.06));
  border-color:rgba(34,197,94,0.5);
  box-shadow:0 0 20px rgba(34,197,94,0.1),inset 0 1px 0 rgba(34,197,94,0.1);
  transform:translateY(-1px);
}

/* ── cell: booked (confirmed) — RED, VISIBLE ── */
.bk-cell-bk{
  background:linear-gradient(160deg,rgba(239,68,68,0.12),rgba(239,68,68,0.04));
  border-color:rgba(239,68,68,0.25);
  cursor:not-allowed;opacity:1;
}
.bk-cell-bk .bk-cell-code{
  color:#f87171;
}

/* ── cell: pending — YELLOW FLASHING beacon ── */
.bk-cell-pending{
  background:linear-gradient(160deg,rgba(251,191,36,0.15),rgba(251,191,36,0.05));
  border-color:rgba(251,191,36,0.5);
  cursor:not-allowed;opacity:1;
  animation:bk-pending-flash 1.5s ease-in-out infinite;
  position:relative;
}
.bk-cell-pending .bk-cell-code{color:#fbbf24}
@keyframes bk-pending-flash{
  0%,100%{
    border-color:rgba(251,191,36,0.3);
    box-shadow:0 0 6px rgba(251,191,36,0.1);
    background:linear-gradient(160deg,rgba(251,191,36,0.08),rgba(251,191,36,0.02));
  }
  50%{
    border-color:rgba(251,191,36,0.7);
    box-shadow:0 0 22px rgba(251,191,36,0.25), 0 0 44px rgba(251,191,36,0.08);
    background:linear-gradient(160deg,rgba(251,191,36,0.22),rgba(251,191,36,0.08));
  }
}

/* ── beacon dot (blinking yellow) ── */
.bk-cell-beacon{
  position:absolute;top:4px;right:5px;
  width:8px;height:8px;border-radius:50%;
  background:#fbbf24;
  box-shadow:0 0 6px #fbbf24, 0 0 12px rgba(251,191,36,0.4);
  animation:bk-beacon-blink 1s ease-in-out infinite;
}
.bk-cell-beacon::after{
  content:'';position:absolute;inset:-4px;border-radius:50%;
  border:2px solid rgba(251,191,36,0.3);
  animation:bk-beacon-ring 1.5s ease-out infinite;
}
@keyframes bk-beacon-blink{
  0%,100%{opacity:1;transform:scale(1)}
  50%{opacity:0.3;transform:scale(0.7)}
}
@keyframes bk-beacon-ring{
  0%{transform:scale(1);opacity:0.6}
  100%{transform:scale(2.2);opacity:0}
}

/* ── cell timer (pending countdown) ── */
.bk-cell-timer{
  position:absolute;bottom:3px;left:6px;right:6px;
}
.bk-cell-timer-bar{
  width:100%;height:2px;border-radius:1px;
  background:rgba(245,158,11,0.1);overflow:hidden;
}
.bk-cell-timer-fill{
  height:100%;border-radius:1px;
  background:linear-gradient(90deg,#f59e0b,#fbbf24);
  transition:width 1s linear;
}
.bk-cell-timer-text{
  font-size:8px;font-weight:700;color:rgba(245,158,11,0.6);
  display:block;margin-top:1px;letter-spacing:0.05em;
}

/* ── cell status tag ── */
.bk-cell-status-tag{
  position:absolute;top:3px;right:4px;
  font-size:8px;font-weight:800;line-height:1;
}
.bk-cell-tag-confirmed{color:rgba(239,68,68,0.6)}

/* ── cell guests count ── */
.bk-cell-guests{
  position:absolute;top:3px;left:4px;
  font-size:7px;font-weight:700;color:rgba(226,221,213,0.3);
  letter-spacing:0.02em;
}

/* ── cell: vip ── */
.bk-cell-vip{
  background:linear-gradient(160deg,rgba(212,168,74,0.12),rgba(212,168,74,0.03));
  border-color:rgba(212,168,74,0.2);
  box-shadow:inset 0 1px 0 rgba(212,168,74,0.08);
}
.bk-cell-vip .bk-cell-code{color:#E8C464}
.bk-cell-vip:hover{
  background:linear-gradient(160deg,rgba(212,168,74,0.2),rgba(212,168,74,0.06));
  border-color:rgba(212,168,74,0.5);
  box-shadow:0 0 20px rgba(212,168,74,0.1),inset 0 1px 0 rgba(212,168,74,0.1);
  transform:translateY(-1px);
}

/* ── cell: selected ── */
.bk-cell-sel{
  background:linear-gradient(160deg,rgba(248,200,90,0.2),rgba(248,200,90,0.06));
  border-color:#E8C464;
  box-shadow:0 0 24px rgba(248,200,90,0.2),inset 0 0 12px rgba(248,200,90,0.04);
  animation:bk-pulse 2s ease-in-out infinite;
  transform:translateY(-2px);
}
.bk-cell-sel .bk-cell-code{color:#FDE68A}
@keyframes bk-pulse{
  0%,100%{box-shadow:0 0 16px rgba(248,200,90,0.15),inset 0 0 8px rgba(248,200,90,0.03)}
  50%{box-shadow:0 0 28px rgba(248,200,90,0.3),inset 0 0 16px rgba(248,200,90,0.08)}
}

/* ── loading ── */
.bk-load{display:flex;justify-content:center;padding:48px 0}
.bk-spin{
  width:28px;height:28px;border:2.5px solid rgba(212,168,74,0.1);
  border-top-color:#D4A84A;border-radius:50%;animation:bk-rot 0.7s linear infinite;
}
@keyframes bk-rot{to{transform:rotate(360deg)}}

/* ── CTA ── */
.bk-cta-wrap{
  position:fixed;bottom:0;left:50%;transform:translateX(-50%);
  width:100%;max-width:480px;z-index:50;
  padding:20px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  background:linear-gradient(to top,rgba(4,6,10,0.99) 0%,rgba(4,6,10,0.95) 70%,transparent 100%);
  animation:bk-up 0.35s cubic-bezier(0.16,1,0.3,1);
}
.bk-cta{
  background:linear-gradient(160deg,rgba(17,26,44,0.95),rgba(12,18,32,0.98));
  border:1.5px solid rgba(212,168,74,0.15);border-radius:22px;padding:20px 20px 18px;
  box-shadow:0 -6px 50px rgba(0,0,0,0.5),0 0 30px rgba(212,168,74,0.03),inset 0 1px 0 rgba(212,168,74,0.08);
  backdrop-filter:blur(12px);
}
.bk-cta-info{display:flex;align-items:center;gap:10px;margin-bottom:16px}
.bk-cta-code{
  font-family:'Playfair Display',serif;font-size:24px;font-weight:800;
  background:linear-gradient(135deg,#FDE68A,#D4A84A);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
}
.bk-cta-area{font-size:12px;color:rgba(226,221,213,0.4);font-weight:600}
.bk-cta-vip{
  padding:3px 8px;font-size:8px;font-weight:800;letter-spacing:0.1em;border-radius:5px;
  background:linear-gradient(135deg,#F8C85A,#D89A32);color:#04060a;
}

/* ── gold btn ── */
.bk-gold-btn{
  display:inline-flex;align-items:center;justify-content:center;
  padding:15px 32px;border-radius:16px;font-size:14px;font-weight:800;letter-spacing:0.04em;
  background:linear-gradient(135deg,#FDE68A 0%,#F8C85A 30%,#D89A32 100%);
  color:#04060a;border:none;cursor:pointer;
  box-shadow:0 4px 28px rgba(212,168,74,0.2),inset 0 1px 0 rgba(255,255,255,0.3);
  transition:all 0.25s;font-family:'Inter',sans-serif;position:relative;overflow:hidden;
  text-transform:uppercase;
}
.bk-gold-btn::after{
  content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);
  animation:bk-btn-shine 3s ease-in-out infinite;
}
@keyframes bk-btn-shine{0%{left:-100%}50%{left:100%}100%{left:100%}}
.bk-gold-btn:hover{box-shadow:0 6px 36px rgba(212,168,74,0.35);transform:translateY(-1px)}
.bk-gold-btn:active{transform:scale(0.97)}
.bk-gold-btn:disabled{opacity:0.5;cursor:wait}
.bk-gold-btn-full{width:100%}
.bk-gold-btn-lg{padding:17px 32px;font-size:15px;border-radius:18px}

/* ── overlay ── */
.bk-overlay{
  position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);
  display:flex;align-items:flex-end;justify-content:center;animation:bk-fade 0.2s;
}
.bk-modal{
  width:100%;max-width:480px;
  background:linear-gradient(180deg,#131c30,#0b1220);
  border-radius:28px 28px 0 0;
  padding:12px 24px calc(32px + env(safe-area-inset-bottom, 0px));
  animation:bk-up 0.4s cubic-bezier(0.16,1,0.3,1);
  border-top:1px solid rgba(212,168,74,0.08);
}
.bk-modal-bar{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.12);margin:0 auto 18px}
.bk-modal-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.bk-modal-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:#F8C85A}
.bk-modal-x{
  width:44px;height:44px;border-radius:50%;
  background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);
  color:#6b7280;font-size:16px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;transition:all 0.15s;
}
.bk-modal-x:hover{background:rgba(255,255,255,0.08);color:#fff}
.bk-modal-chip{
  display:flex;justify-content:space-between;padding:10px 16px;border-radius:12px;
  background:rgba(212,168,74,0.04);border:1px solid rgba(212,168,74,0.08);
  font-size:13px;margin-bottom:18px;
}
.bk-modal-chip span:first-child{color:#D4A84A;font-weight:600}
.bk-modal-chip span:last-child{color:#6b7280}

/* ── fields ── */
.bk-fields{display:flex;flex-direction:column;gap:14px;margin-bottom:18px}
.bk-fgroup{position:relative}
.bk-field{
  width:100%;padding:16px 16px 8px;border-radius:14px;font-size:14px;font-weight:500;
  background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);
  color:#e2ddd5;outline:none;font-family:'Inter',sans-serif;
  transition:border-color 0.2s,box-shadow 0.2s;
}
.bk-field:focus{border-color:rgba(212,168,74,0.35);box-shadow:0 0 0 3px rgba(212,168,74,0.06)}
.bk-field::placeholder{color:transparent}
.bk-field-ta{resize:none;padding-top:20px}
.bk-field-ok{border-color:rgba(34,197,94,0.4)}
.bk-field-err{border-color:rgba(239,68,68,0.4)}

/* floating label */
.bk-flabel{
  position:absolute;left:16px;top:13px;
  font-size:14px;color:#5a5a6a;font-weight:500;
  pointer-events:none;transition:all 0.2s;
}
.bk-field:focus ~ .bk-flabel,
.bk-field:not(:placeholder-shown) ~ .bk-flabel{
  top:5px;font-size:9px;color:#D4A84A;letter-spacing:0.08em;font-weight:600;
}

/* stepper */
.bk-stepper{
  display:flex;align-items:center;justify-content:space-between;
  padding:10px 16px;border-radius:14px;
  background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);
}
.bk-stepper-label{font-size:14px;color:#5a5a6a;font-weight:500}
.bk-stepper-ctrl{display:flex;align-items:center;gap:16px}
.bk-stepper-btn{
  width:36px;height:36px;border-radius:50%;
  background:rgba(212,168,74,0.08);border:1px solid rgba(212,168,74,0.2);
  color:#D4A84A;font-size:18px;font-weight:600;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:all 0.15s;
}
.bk-stepper-btn:hover{background:rgba(212,168,74,0.15);border-color:rgba(212,168,74,0.4)}
.bk-stepper-btn:disabled{opacity:0.3;cursor:not-allowed}
.bk-stepper-val{font-size:18px;font-weight:800;color:#F8C85A;min-width:28px;text-align:center}

/* note toggle */
.bk-note-toggle{
  background:none;border:none;color:#6b7280;font-size:13px;
  cursor:pointer;text-align:left;padding:4px 0;font-weight:500;
  transition:color 0.15s;
}
.bk-note-toggle:hover{color:#D4A84A}

/* cancel policy */
.bk-cancel-policy{
  text-align:center;margin-top:12px;font-size:11px;color:#5a6a50;font-weight:500;
}

/* ── success ── */
.bk-success{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px}
.bk-success-ring{
  width:88px;height:88px;border-radius:50%;
  background:linear-gradient(135deg,#4ade80,#16a34a);
  display:flex;align-items:center;justify-content:center;margin-bottom:28px;
  box-shadow:0 0 50px rgba(74,222,128,0.25);
  animation:bk-pop 0.5s cubic-bezier(0.16,1,0.3,1);
}
@keyframes bk-pop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
.bk-success-title{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;margin-bottom:16px;color:#e2ddd5}
.bk-success-sub{font-size:13px;color:#6b7280;margin-bottom:28px;line-height:1.8}

/* confirm card */
.bk-confirm-card{
  width:100%;max-width:320px;margin-bottom:20px;
  padding:16px 20px;border-radius:16px;
  background:rgba(212,168,74,0.04);border:1px solid rgba(212,168,74,0.1);
  text-align:left;
}
.bk-confirm-code{
  text-align:center;font-size:11px;font-weight:700;color:#D4A84A;
  letter-spacing:0.1em;margin-bottom:12px;padding-bottom:10px;
  border-bottom:1px solid rgba(212,168,74,0.08);
}
.bk-confirm-row{
  display:flex;justify-content:space-between;align-items:center;
  padding:5px 0;font-size:13px;
}
.bk-confirm-row span{color:#6b7280}
.bk-confirm-row strong{color:#e2ddd5;font-weight:600}
.bk-link-phone{
  display:block;margin-top:16px;font-size:12px;color:#6b7280;
  text-decoration:underline;text-underline-offset:3px;
}

/* ── footer ── */
.bk-footer{
  padding:24px 20px 32px;text-align:center;
  border-top:1px solid rgba(212,168,74,0.06);margin-top:8px;
}
.bk-footer-brand{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:#D4A84A;margin-bottom:8px}
.bk-footer-phone{
  display:block;font-size:13px;color:#7c6d50;font-weight:600;
  text-decoration:none;margin-bottom:4px;
}
.bk-footer-phone:hover{color:#D4A84A}
.bk-footer-addr{font-size:11px;color:#444;font-weight:500}

/* ── toast ── */
.bk-toast{
  position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:999;
  padding:11px 22px;border-radius:14px;
  backdrop-filter:blur(12px);font-size:13px;font-weight:600;
  box-shadow:0 8px 32px rgba(0,0,0,0.5);white-space:nowrap;
  animation:bk-down 0.3s cubic-bezier(0.16,1,0.3,1);
}
.bk-toast-err{background:rgba(16,16,24,0.96);border:1px solid rgba(239,68,68,0.2);color:#f87171}
.bk-toast-ok{background:rgba(16,24,16,0.96);border:1px solid rgba(34,197,94,0.2);color:#4ade80}

/* ── anims ── */
@keyframes bk-up{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes bk-down{from{transform:translateX(-50%) translateY(-20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
@keyframes bk-fade{from{opacity:0}to{opacity:1}}
`;
