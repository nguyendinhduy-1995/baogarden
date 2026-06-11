'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

/* ─── Types ── */
interface RawTable {
  id: string; code: string; name: string; status: string;
  minGuests: number; maxGuests: number;
  depositAmount: string; minSpend: string; note: string;
  isBooked?: boolean; area?: { name: string };
}
interface Table {
  id: string; code: string; area: string;
  status: 'available' | 'booked' | 'vip';
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
  const [mapZoom, setMapZoom] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  /* step: 1=chọn ngày giờ, 2=chọn bàn, 3=điền thông tin */
  const step = showForm ? 3 : sel ? 2 : 1;

  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tables/availability?date=${date || today}&time=${time}`);
      const data = await res.json();
      if (data.success && data.data) {
        setTables(data.data.filter((t: RawTable) => t.status !== 'INACTIVE').map((t: RawTable) => ({
          id: t.id, code: t.code, area: t.area?.name || '',
          status: t.isBooked ? 'booked' as const : t.status === 'VIP' ? 'vip' as const : 'available' as const,
          minGuests: t.minGuests, maxGuests: t.maxGuests,
          deposit: Number(t.depositAmount), minSpend: Number(t.minSpend),
        })));
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [date, time, today]);

  useEffect(() => { fetchTables(); }, [fetchTables]);
  useEffect(() => { setSel(null); }, [date, time]);

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
        <div className="bk-map-stats">
          <span className="bk-stat bk-stat-g">{avail} trống</span>
          <span className="bk-stat-sep">|</span>
          <span className="bk-stat bk-stat-r">{booked} đã đặt</span>
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
                  return (
                    <button key={t.id}
                      className={`bk-cell ${s ? 'bk-cell-sel' : b ? 'bk-cell-bk' : v ? 'bk-cell-vip' : 'bk-cell-ok'}`}
                      onClick={() => pick(t)} disabled={b} id={`table-${t.code}`}>
                      <span className="bk-cell-code">{t.code}</span>
                      {v && !s && <span className="bk-cell-vtag">VIP</span>}
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
  background:#04060a;
  font-family:'Inter',-apple-system,sans-serif;
  color:#e2ddd5; position:relative; overflow-x:hidden;
}

/* ── hero ── */
.bk-hero{
  position:relative; padding:28px 24px 20px;
  text-align:center; overflow:hidden;
}
.bk-hero-glow{
  position:absolute; top:-60px; left:50%; transform:translateX(-50%);
  width:300px; height:180px;
  background:radial-gradient(ellipse, rgba(212,168,74,0.12) 0%, transparent 70%);
  pointer-events:none;
}
.bk-hero-content{position:relative;z-index:1}
.bk-brand{
  font-family:'Playfair Display',serif;
  font-size:28px; font-weight:800; letter-spacing:0.18em;
  background:linear-gradient(135deg, #FFF1C9 0%, #E8C464 25%, #D4A84A 50%, #B8892E 75%, #D4A84A 100%);
  background-size:200% auto;
  -webkit-background-clip:text; background-clip:text;
  -webkit-text-fill-color:transparent;
  animation:bk-shimmer 4s linear infinite;
}
@keyframes bk-shimmer{0%{background-position:0% center}100%{background-position:200% center}}
.bk-brand-line{width:48px;height:1px;margin:8px auto;background:linear-gradient(90deg,transparent,#D4A84A,transparent)}
.bk-brand-sub{font-size:9px;letter-spacing:0.4em;color:#7c6d50;font-weight:600}

/* ── steps ── */
.bk-steps{
  display:flex; align-items:center; justify-content:center;
  gap:0; padding:0 24px 16px;
}
.bk-step{
  display:flex; align-items:center; gap:5px;
  opacity:0.35; transition:opacity 0.3s;
}
.bk-step-active{opacity:1}
.bk-step-done{opacity:0.7}
.bk-step-num{
  width:22px; height:22px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  font-size:10px; font-weight:700;
  background:rgba(212,168,74,0.1); color:#D4A84A;
  border:1px solid rgba(212,168,74,0.2);
  transition:all 0.3s;
}
.bk-step-active .bk-step-num{
  background:rgba(212,168,74,0.2); border-color:rgba(212,168,74,0.5);
}
.bk-step-done .bk-step-num{
  background:rgba(34,197,94,0.15); border-color:rgba(34,197,94,0.3); color:#4ade80;
}
.bk-step-text{font-size:10px;color:#6b7280;font-weight:500}
.bk-step-active .bk-step-text{color:#D4A84A}
.bk-step-line{
  width:24px; height:1px; margin:0 6px;
  background:rgba(212,168,74,0.12);
}

/* ── pickers ── */
.bk-picker-section{padding:0 20px 10px}
.bk-picker-row{display:flex;gap:10px}
.bk-picker{flex:1;display:flex;flex-direction:column;gap:5px}
.bk-picker-label{font-size:9px;font-weight:600;letter-spacing:0.15em;color:#7c6d50;text-transform:uppercase;padding-left:2px}
.bk-picker input{
  width:100%;appearance:none;-webkit-appearance:none;
  background:rgba(212,168,74,0.04);border:1px solid rgba(212,168,74,0.12);
  border-radius:12px;padding:11px 14px;font-size:14px;font-weight:600;
  color:#D4A84A;outline:none;font-family:'Inter',sans-serif;
  transition:border-color 0.2s,box-shadow 0.2s;
}
.bk-picker input:focus{border-color:rgba(212,168,74,0.4);box-shadow:0 0 0 3px rgba(212,168,74,0.06)}
.bk-picker input::-webkit-calendar-picker-indicator{filter:invert(0.7) sepia(1) saturate(3) hue-rotate(10deg);cursor:pointer}

/* ── map ── */
.bk-map-wrap{padding:0 16px;margin-bottom:4px}
.bk-floorplan{
  border-radius:16px;overflow:hidden;
  border:1px solid rgba(212,168,74,0.2);
  background:linear-gradient(180deg,rgba(6,18,64,0.6),rgba(4,8,30,0.9));
  padding:16px;position:relative;
  box-shadow:0 0 40px rgba(212,168,74,0.04),0 4px 20px rgba(0,0,0,0.3);
}
.bk-fp-label{
  text-align:center;font-size:9px;font-weight:600;
  letter-spacing:0.15em;color:rgba(212,168,74,0.4);
  text-transform:uppercase;margin-bottom:12px;
}
.bk-fp-img-wrap{
  border-radius:12px;overflow:hidden;
  border:1px solid rgba(212,168,74,0.1);
}
.bk-fp-img{
  width:100%;height:auto;display:block;
  border-radius:12px;
}
.bk-map-stats{display:flex;justify-content:center;align-items:center;gap:12px;padding:10px 0 2px}
.bk-stat{font-size:12px;font-weight:700;letter-spacing:0.02em}
.bk-stat-g{color:#4ade80}.bk-stat-r{color:#f87171}
.bk-stat-sep{color:#2a2a35;font-size:10px}

/* ── trust ── */
.bk-trust{
  display:flex;justify-content:center;gap:16px;
  padding:6px 16px 10px;font-size:10px;color:#5a6a50;font-weight:500;
}

/* ── filter bar ── */
.bk-filter-bar{padding:0 16px 8px}
.bk-legend{
  display:flex;justify-content:center;gap:20px;
  padding:0 0 10px;font-size:11px;color:#6b7280;
}
.bk-led{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;vertical-align:middle}
.bk-led-g{background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,0.5)}
.bk-led-r{background:#ef4444;box-shadow:0 0 6px rgba(239,68,68,0.5)}
.bk-led-gold{background:#D4A84A;box-shadow:0 0 6px rgba(212,168,74,0.5)}

.bk-area-tabs{
  display:flex;gap:6px;overflow-x:auto;
  scrollbar-width:none;-ms-overflow-style:none;
  padding-bottom:4px;
}
.bk-area-tabs::-webkit-scrollbar{display:none}
.bk-tab{
  flex-shrink:0;padding:6px 14px;border-radius:20px;
  font-size:11px;font-weight:600;cursor:pointer;
  background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);
  color:#6b7280;transition:all 0.2s;white-space:nowrap;
}
.bk-tab:hover{border-color:rgba(212,168,74,0.2);color:#D4A84A}
.bk-tab-on{
  background:rgba(212,168,74,0.1);border-color:rgba(212,168,74,0.3);
  color:#D4A84A;
}

/* ── urgency ── */
.bk-urgency{
  margin:0 16px 8px;padding:8px 14px;border-radius:10px;
  background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.12);
  font-size:12px;color:#f87171;text-align:center;font-weight:500;
}
.bk-urgency strong{font-weight:700}

/* ── empty ── */
.bk-empty{text-align:center;padding:32px 20px;color:#6b7280;font-size:14px}
.bk-empty-btn{
  margin-top:12px;padding:8px 20px;border-radius:10px;
  background:rgba(212,168,74,0.1);border:1px solid rgba(212,168,74,0.2);
  color:#D4A84A;font-size:12px;font-weight:600;cursor:pointer;
}

/* ── sections ── */
.bk-sections{flex:1;overflow-y:auto}
.bk-section{padding:0 16px 8px}
.bk-sec-head{
  display:flex;align-items:baseline;gap:8px;
  padding:10px 4px 8px;border-bottom:1px solid rgba(212,168,74,0.06);margin-bottom:8px;
}
.bk-sec-title{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:#D4A84A;letter-spacing:0.03em}
.bk-sec-desc{font-size:10px;color:#555;font-weight:500}

/* ── grid ── */
.bk-grid{display:grid;grid-template-columns:repeat(auto-fill, minmax(66px, 1fr));gap:8px}
.bk-cell{
  position:relative;border-radius:12px;padding:14px 4px 12px;text-align:center;
  border:1.5px solid transparent;cursor:pointer;
  transition:all 0.2s cubic-bezier(0.4,0,0.2,1);
  -webkit-tap-highlight-color:transparent;
}
.bk-cell:active:not(:disabled){transform:scale(0.93)}
.bk-cell-code{font-size:15px;font-weight:800;letter-spacing:0.02em;display:block}
.bk-cell-vtag{position:absolute;top:3px;right:4px;font-size:6px;font-weight:800;color:#D4A84A;letter-spacing:0.12em;opacity:0.7}

.bk-cell-ok{background:linear-gradient(145deg,rgba(34,197,94,0.08),rgba(34,197,94,0.03));border-color:rgba(34,197,94,0.2)}
.bk-cell-ok .bk-cell-code{color:#4ade80}
.bk-cell-ok:hover{background:linear-gradient(145deg,rgba(34,197,94,0.16),rgba(34,197,94,0.06));border-color:rgba(34,197,94,0.5);box-shadow:0 0 16px rgba(34,197,94,0.12)}

.bk-cell-bk{background:rgba(239,68,68,0.05);border-color:rgba(239,68,68,0.12);cursor:not-allowed;opacity:0.4}
.bk-cell-bk .bk-cell-code{color:#f87171;text-decoration:line-through;text-decoration-thickness:1.5px;text-decoration-color:rgba(239,68,68,0.35)}

.bk-cell-vip{background:linear-gradient(145deg,rgba(212,168,74,0.1),rgba(212,168,74,0.03));border-color:rgba(212,168,74,0.22)}
.bk-cell-vip .bk-cell-code{color:#D4A84A}
.bk-cell-vip:hover{background:linear-gradient(145deg,rgba(212,168,74,0.18),rgba(212,168,74,0.06));border-color:rgba(212,168,74,0.5);box-shadow:0 0 16px rgba(212,168,74,0.12)}

.bk-cell-sel{
  background:linear-gradient(145deg,rgba(248,200,90,0.18),rgba(248,200,90,0.06));
  border-color:#F8C85A;
  box-shadow:0 0 20px rgba(248,200,90,0.2),inset 0 0 10px rgba(248,200,90,0.04);
  animation:bk-pulse 2.2s ease-in-out infinite;
}
.bk-cell-sel .bk-cell-code{color:#FDE68A}
@keyframes bk-pulse{
  0%,100%{box-shadow:0 0 14px rgba(248,200,90,0.15),inset 0 0 8px rgba(248,200,90,0.03)}
  50%{box-shadow:0 0 24px rgba(248,200,90,0.3),inset 0 0 14px rgba(248,200,90,0.08)}
}

/* ── loading ── */
.bk-load{display:flex;justify-content:center;padding:48px 0}
.bk-spin{width:26px;height:26px;border:2px solid rgba(212,168,74,0.12);border-top-color:#D4A84A;border-radius:50%;animation:bk-rot 0.7s linear infinite}
@keyframes bk-rot{to{transform:rotate(360deg)}}

/* ── CTA ── */
.bk-cta-wrap{
  position:fixed;bottom:0;left:50%;transform:translateX(-50%);
  width:100%;max-width:480px;z-index:50;
  padding:20px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  background:linear-gradient(to top,rgba(4,6,10,0.99) 0%,rgba(4,6,10,0.96) 70%,transparent 100%);
  animation:bk-up 0.35s cubic-bezier(0.16,1,0.3,1);
}
.bk-cta{
  background:linear-gradient(160deg,#111a2c,#0c1220);
  border:1px solid rgba(212,168,74,0.12);border-radius:20px;padding:18px 18px 16px;
  box-shadow:0 -4px 40px rgba(0,0,0,0.4),inset 0 1px 0 rgba(212,168,74,0.06);
}
.bk-cta-info{display:flex;align-items:center;gap:8px;margin-bottom:14px}
.bk-cta-code{font-family:'Playfair Display',serif;font-size:22px;font-weight:800;color:#F8C85A}
.bk-cta-area{font-size:12px;color:#6b7280;font-weight:500}
.bk-cta-vip{padding:2px 7px;font-size:8px;font-weight:800;letter-spacing:0.1em;border-radius:4px;background:linear-gradient(135deg,#F8C85A,#D89A32);color:#04060a}

/* ── gold btn ── */
.bk-gold-btn{
  display:inline-flex;align-items:center;justify-content:center;
  padding:14px 32px;border-radius:14px;font-size:14px;font-weight:700;letter-spacing:0.03em;
  background:linear-gradient(135deg,#FDE68A 0%,#F8C85A 30%,#D89A32 100%);
  color:#04060a;border:none;cursor:pointer;
  box-shadow:0 4px 24px rgba(212,168,74,0.2),inset 0 1px 0 rgba(255,255,255,0.25);
  transition:all 0.2s;font-family:'Inter',sans-serif;position:relative;overflow:hidden;
}
.bk-gold-btn::after{
  content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);
  animation:bk-btn-shine 3s ease-in-out infinite;
}
@keyframes bk-btn-shine{0%{left:-100%}50%{left:100%}100%{left:100%}}
.bk-gold-btn:hover{box-shadow:0 6px 32px rgba(212,168,74,0.35)}
.bk-gold-btn:active{transform:scale(0.97)}
.bk-gold-btn:disabled{opacity:0.5;cursor:wait}
.bk-gold-btn-full{width:100%}
.bk-gold-btn-lg{padding:16px 32px;font-size:15px;border-radius:16px}

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
