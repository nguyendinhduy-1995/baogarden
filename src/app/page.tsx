'use client';

import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import Link from 'next/link';
import {
  BRAND_NAME,
  ADDRESS,
  HOTLINE,
  HOTLINE_RAW,
  HOURS,
  GOOGLE_MAPS_URL,
  DAILY_EVENTS,
  WEEKLY_SCHEDULE,
  PARTY_PACKAGES,
  PROMOTIONS,
  SPACES,
  UPCOMING_EVENTS,
} from '@/lib/home-data';

/* ═══════════════════════════════════════════════════════════════
   Báo Garden – Homepage
   ═══════════════════════════════════════════════════════════════ */

const NAV_ITEMS = [
  { label: 'Không gian', href: '#spaces' },
  { label: 'Sự kiện', href: '#events' },
  { label: 'Đặt bàn', href: '#booking' },
  { label: 'Sinh nhật', href: '#birthday' },
  { label: 'Liên hệ', href: '#footer' },
];

const PRESET_BUTTONS = [
  { label: '2–4 người', size: '2-4', type: '' },
  { label: '5–8 người', size: '5-8', type: '' },
  { label: '10–20 người', size: '10-20', type: '' },
  { label: 'Sinh nhật', size: '10', type: 'birthday' },
  { label: 'Tiệc công ty', size: '20', type: 'company' },
  { label: 'Họp mặt', size: '8', type: 'gathering' },
];

const EMOTION_CARDS = [
  {
    title: 'Xả Stress',
    desc: 'Ánh đèn mờ, nhạc vang, bia lạnh trong tay – để đêm cuốn đi mọi muộn phiền.',
    gradient: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.03))',
    border: 'rgba(6,182,212,0.2)',
  },
  {
    title: 'Sinh Nhật Đáng Nhớ',
    desc: 'Bánh kem, MC, DJ, cả sân khấu – tất cả chỉ cho ngày đặc biệt của bạn.',
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.03))',
    border: 'rgba(168,85,247,0.2)',
  },
  {
    title: 'Tiệc Tùng Bùng Nổ',
    desc: 'DJ, dancer, laser – năng lượng cao, kỷ niệm sâu, chơi hết mình.',
    gradient: 'linear-gradient(135deg, rgba(212,168,74,0.15), rgba(212,168,74,0.03))',
    border: 'rgba(212,168,74,0.2)',
  },
];

const EVENT_TYPE_COLORS: Record<string, string> = {
  chill: '#06b6d4',
  ladies: '#ec4899',
  acoustic: '#f59e0b',
  dj: '#a855f7',
  party: '#ef4444',
  birthday: '#D4A84A',
  recovery: '#22c55e',
};

function getTodayIndex(): number {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1; // Mon=0 ... Sun=6
}

export default function HomePage() {
  /* ─── State ─── */
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingMode, setBookingMode] = useState<string | null>(null);
  const [bookingForm, setBookingForm] = useState({
    name: '',
    phone: '',
    date: new Date().toISOString().split('T')[0],
    time: '20:00',
    partySize: '',
    note: '',
    type: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [todayIdx] = useState(getTodayIndex);
  const [activeDay, setActiveDay] = useState(getTodayIndex);

  // Dynamic data from API (falls back to static)
  const [dailyEvents, setDailyEvents] = useState(DAILY_EVENTS);
  const [weeklySchedule, setWeeklySchedule] = useState(WEEKLY_SCHEDULE);
  const [upcomingEvents, setUpcomingEvents] = useState(UPCOMING_EVENTS);

  const heroRef = useRef<HTMLDivElement>(null);
  const observerRefs = useRef<(HTMLElement | null)[]>([]);

  /* ─── Fetch events from API ─── */
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const [dailyRes, weeklyRes, upcomingRes] = await Promise.allSettled([
          fetch('/api/events/daily'),
          fetch('/api/events/weekly'),
          fetch('/api/events/upcoming'),
        ]);
        if (dailyRes.status === 'fulfilled' && dailyRes.value.ok) {
          const data = await dailyRes.value.json();
          if (data.length > 0) setDailyEvents(data);
        }
        if (weeklyRes.status === 'fulfilled' && weeklyRes.value.ok) {
          const data = await weeklyRes.value.json();
          if (data.length > 0) setWeeklySchedule(data);
        }
        if (upcomingRes.status === 'fulfilled' && upcomingRes.value.ok) {
          const data = await upcomingRes.value.json();
          if (data.length > 0) setUpcomingEvents(data);
        }
      } catch {
        // Silently fall back to static data
      }
    };
    fetchEvents();
  }, []);

  /* ─── Scroll listener for header ─── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ─── IntersectionObserver for fade-in ─── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('hp-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    const nodes = document.querySelectorAll('.hp-animate');
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  /* ─── Hero parallax ─── */
  useEffect(() => {
    const onScroll = () => {
      if (heroRef.current) {
        const y = window.scrollY;
        heroRef.current.style.transform = `translateY(${y * 0.3}px)`;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ─── Booking form handlers ─── */
  const handlePreset = useCallback((size: string, type: string) => {
    const firstNum = size.split('-')[0];
    setBookingForm((prev) => ({ ...prev, partySize: firstNum, type }));
    setBookingMode(type || size);
    setBookingSuccess(false);
    setBookingError('');
  }, []);

  const handlePhone = useCallback((val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    setBookingForm((prev) => ({ ...prev, phone: digits }));
  }, []);

  const handleSubmitBooking = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setBookingError('');

      const { name, phone, date, time, partySize, note, type } = bookingForm;
      if (!name.trim()) { setBookingError('Vui lòng nhập họ tên.'); return; }
      if (!phone || !/^0\d{9,10}$/.test(phone)) {
        setBookingError('Số điện thoại không hợp lệ (10–11 số, bắt đầu bằng 0).');
        return;
      }
      if (!date) { setBookingError('Vui lòng chọn ngày.'); return; }
      if (!time) { setBookingError('Vui lòng chọn giờ.'); return; }
      if (!partySize || Number(partySize) < 1) {
        setBookingError('Vui lòng nhập số người.');
        return;
      }

      setSubmitting(true);
      try {
        // Redirect to the booking page with pre-filled info
        // since the API requires tableId which we don't have from the homepage
        const params = new URLSearchParams();
        params.set('name', name.trim());
        params.set('phone', phone);
        params.set('date', date);
        params.set('time', time);
        params.set('guests', partySize);
        if (note.trim()) params.set('note', note.trim());
        if (type) params.set('type', type);
        window.location.href = `/booking?${params.toString()}`;
      } catch {
        setBookingError('Có lỗi xảy ra, vui lòng thử lại.');
        setSubmitting(false);
      }
    },
    [bookingForm]
  );

  /* ─── Smooth scroll ─── */
  const scrollTo = useCallback((id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id.replace('#', ''));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const todayEvent = dailyEvents[activeDay];

  return (
    <div className="hp-root">
      <style>{CSS}</style>

      {/* ═══ HEADER ═══ */}
      <header className={`hp-header ${scrolled ? 'hp-header-solid' : ''}`}>
        <div className="hp-header-inner">
          <Link href="/" className="hp-logo">Báo Garden</Link>
          <nav className="hp-nav-desktop">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollTo(item.href)}
                className="hp-nav-link"
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="hp-header-right">
            <Link href="/booking" className="hp-header-cta">Đặt Bàn</Link>
            <button
              className="hp-hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              <span className={`hp-hamburger-line ${mobileMenuOpen ? 'hp-hamburger-open' : ''}`} />
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="hp-mobile-menu">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollTo(item.href)}
                className="hp-mobile-link"
              >
                {item.label}
              </button>
            ))}
            <Link href="/booking" className="hp-mobile-cta" onClick={() => setMobileMenuOpen(false)}>
              Đặt Bàn Ngay
            </Link>
          </div>
        )}
      </header>

      {/* ═══ 1. HERO ═══ */}
      <section className="hp-hero">
        <div className="hp-hero-bg" ref={heroRef}>
          <img src="/home/hero-real.jpg" alt="Báo Garden" draggable={false} />
          <div className="hp-hero-overlay" />
        </div>
        <div className="hp-hero-sparkle hp-sparkle-1" />
        <div className="hp-hero-sparkle hp-sparkle-2" />
        <div className="hp-hero-sparkle hp-sparkle-3" />
        <div className="hp-hero-aurora" />
        <div className="hp-fireflies">
          <div className="hp-firefly" style={{ left: '10%', animationDelay: '0s' }} />
          <div className="hp-firefly" style={{ left: '25%', animationDelay: '2s' }} />
          <div className="hp-firefly" style={{ left: '40%', animationDelay: '4s' }} />
          <div className="hp-firefly" style={{ left: '55%', animationDelay: '1s' }} />
          <div className="hp-firefly" style={{ left: '70%', animationDelay: '3s' }} />
          <div className="hp-firefly" style={{ left: '85%', animationDelay: '5s' }} />
          <div className="hp-firefly" style={{ left: '15%', animationDelay: '6s' }} />
          <div className="hp-firefly" style={{ left: '60%', animationDelay: '7s' }} />
        </div>
        <div className="hp-hero-content">
          <h1 className="hp-hero-title">
            <span className="hp-hero-line1">Đến Báo Garden</span>
            <span className="hp-hero-line2">Stress Bay Mất</span>
            <span className="hp-hero-line3">Niềm Vui Được Nâng Niu</span>
          </h1>
          <p className="hp-hero-sub">
            Không gian đêm sôi động, âm nhạc cuốn hút, ánh đèn lung linh – bia lạnh – bạn bè đủ đầy.
          </p>
          <div className="hp-hero-badges">
            <span className="hp-hero-badge">Open {HOURS}</span>
            <span className="hp-hero-badge">118–120 Tân Sơn Nhì</span>
          </div>
          <div className="hp-hero-ctas">
            <button onClick={() => scrollTo('#booking')} className="hp-btn-gold">
              Đặt Bàn Ngay
            </button>
            <button onClick={() => scrollTo('#events')} className="hp-btn-outline">
              Xem Sự Kiện
            </button>
          </div>
        </div>
      </section>

      {/* ═══ 2. QUICK INFO BAR ═══ */}
      <section className="hp-quickinfo hp-animate">
        <div className="hp-quickinfo-grid">
          <div className="hp-qi-card">
            <div>
              <div className="hp-qi-label">Mở cửa</div>
              <div className="hp-qi-value">{HOURS}</div>
            </div>
          </div>
          <a href={`tel:${HOTLINE_RAW}`} className="hp-qi-card hp-qi-card-link">
            <div>
              <div className="hp-qi-label">Hotline</div>
              <div className="hp-qi-value">{HOTLINE}</div>
            </div>
          </a>
          <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className="hp-qi-card hp-qi-card-link">
            <div>
              <div className="hp-qi-label">Địa chỉ</div>
              <div className="hp-qi-value">118–120 Tân Sơn Nhì</div>
            </div>
          </a>
          <div className="hp-qi-card hp-qi-card-promo">
            <div>
              <div className="hp-qi-label">Ưu đãi</div>
              <div className="hp-qi-value">Đặt trước 20h nhận ưu đãi</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 3. BOOKING QUICK ACTION ═══ */}
      <section className="hp-booking hp-animate" id="booking">
        <div className="hp-container">
          <h2 className="hp-section-title">Bạn đi mấy người hôm nay?</h2>
          <div className="hp-preset-grid">
            {PRESET_BUTTONS.map((btn) => (
              <button
                key={btn.label}
                className={`hp-preset-btn ${bookingMode === (btn.type || btn.size) ? 'hp-preset-active' : ''}`}
                onClick={() => handlePreset(btn.size, btn.type)}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {bookingMode !== null && !bookingSuccess && (
            <form className="hp-booking-form" onSubmit={handleSubmitBooking}>
              <div className="hp-form-row">
                <div className="hp-form-group">
                  <label className="hp-form-label">Họ tên</label>
                  <input
                    type="text"
                    className="hp-form-input"
                    value={bookingForm.name}
                    onChange={(e) => setBookingForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Tên của bạn"
                    autoComplete="name"
                  />
                </div>
                <div className="hp-form-group">
                  <label className="hp-form-label">Số điện thoại</label>
                  <input
                    type="tel"
                    className="hp-form-input"
                    value={bookingForm.phone}
                    onChange={(e) => handlePhone(e.target.value)}
                    placeholder="0xxx xxx xxx"
                    autoComplete="tel"
                  />
                </div>
              </div>
              <div className="hp-form-row">
                <div className="hp-form-group">
                  <label className="hp-form-label">Ngày</label>
                  <input
                    type="date"
                    className="hp-form-input"
                    value={bookingForm.date}
                    onChange={(e) => setBookingForm((p) => ({ ...p, date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="hp-form-group">
                  <label className="hp-form-label">Giờ đến</label>
                  <input
                    type="time"
                    className="hp-form-input"
                    value={bookingForm.time}
                    onChange={(e) => setBookingForm((p) => ({ ...p, time: e.target.value }))}
                  />
                </div>
              </div>
              <div className="hp-form-row">
                <div className="hp-form-group">
                  <label className="hp-form-label">Số người</label>
                  <input
                    type="number"
                    className="hp-form-input"
                    value={bookingForm.partySize}
                    onChange={(e) => setBookingForm((p) => ({ ...p, partySize: e.target.value }))}
                    min="1"
                    max="100"
                    placeholder="Số người"
                  />
                </div>
                <div className="hp-form-group">
                  <label className="hp-form-label">Loại tiệc</label>
                  <select
                    className="hp-form-input"
                    value={bookingForm.type}
                    onChange={(e) => setBookingForm((p) => ({ ...p, type: e.target.value }))}
                  >
                    <option value="">Đặt bàn thường</option>
                    <option value="birthday">Sinh nhật</option>
                    <option value="company">Tiệc công ty</option>
                    <option value="gathering">Họp mặt</option>
                  </select>
                </div>
              </div>
              <div className="hp-form-group">
                <label className="hp-form-label">Ghi chú</label>
                <textarea
                  className="hp-form-input hp-form-textarea"
                  value={bookingForm.note}
                  onChange={(e) => setBookingForm((p) => ({ ...p, note: e.target.value }))}
                  placeholder="Yêu cầu đặc biệt, trang trí, v.v..."
                  rows={2}
                />
              </div>
              {bookingError && <p className="hp-form-error">{bookingError}</p>}
              <button type="submit" className="hp-btn-gold hp-btn-full" disabled={submitting}>
                {submitting ? 'Đang xử lý...' : 'Chọn Bàn & Xác Nhận'}
              </button>
              <p className="hp-form-note">Bạn sẽ được chuyển đến trang chọn bàn để hoàn tất đặt chỗ.</p>
            </form>
          )}

          {bookingSuccess && (
            <div className="hp-booking-success">
              <div className="hp-success-icon">✓</div>
              <h3>Báo Garden đã nhận thông tin!</h3>
              <p>Nhân viên sẽ liên hệ xác nhận trong vài phút. Cảm ơn bạn!</p>
              <button
                className="hp-btn-outline"
                onClick={() => {
                  setBookingSuccess(false);
                  setBookingMode(null);
                }}
              >
                Đặt thêm bàn khác
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ═══ 4. BRAND EMOTION ═══ */}
      <section className="hp-emotion hp-animate">
        <div className="hp-container">
          <h2 className="hp-section-title">Ở Báo, niềm vui của bạn không bị bỏ quên</h2>
          <p className="hp-emotion-quote">
            &ldquo;Bạn mang tâm trạng đến – Báo giúp bạn mang niềm vui về.&rdquo;
          </p>
          <div className="hp-emotion-grid">
            {EMOTION_CARDS.map((card) => (
              <div
                key={card.title}
                className="hp-emotion-card"
                style={{ background: card.gradient, borderColor: card.border } as React.CSSProperties}
              >
                <h3 className="hp-emotion-card-title">{card.title}</h3>
                <p className="hp-emotion-card-desc">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 5. SPACE GALLERY ═══ */}
      <section className="hp-spaces hp-animate" id="spaces">
        <div className="hp-container">
          <h2 className="hp-section-title">Không Gian Vui Hết Mình – Nhưng Vẫn Thoải Mái</h2>
        </div>
        <div className="hp-spaces-scroll">
          {SPACES.map((space) => (
            <div key={space.name} className="hp-space-card">
              <img src={space.image} alt={space.name} className="hp-space-img" loading="lazy" />
              <div className="hp-space-overlay">
                <h3 className="hp-space-name">{space.name}</h3>
                <p className="hp-space-desc">{space.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="hp-container" style={{ textAlign: 'center', marginTop: 24 }}>
          <Link href="/booking" className="hp-btn-outline">Xem Sơ Đồ Bàn</Link>
        </div>
      </section>

      {/* ═══ 6. TODAY EVENTS – POSTER ═══ */}
      <section className="hp-today hp-animate" id="events">
        <div className="hp-container">
          <h2 className="hp-section-title">Hôm Nay Ở Báo Có Gì?</h2>
          <div className="hp-day-tabs">
            {dailyEvents.map((ev, idx) => (
              <button
                key={ev.day}
                className={`hp-day-tab ${activeDay === idx ? 'hp-day-tab-active' : ''} ${todayIdx === idx ? 'hp-day-tab-today' : ''}`}
                onClick={() => setActiveDay(idx)}
              >
                <span className="hp-day-tab-short">{ev.dayShort}</span>
                {todayIdx === idx && <span className="hp-day-tab-dot" />}
              </button>
            ))}
          </div>
          {todayEvent && (
            <div className="hp-poster-wrap">
              <img
                src={`/home/posters/${todayEvent.dayShort.toLowerCase()}.jpg`}
                alt={todayEvent.name}
                className="hp-poster-img"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="hp-poster-fallback">
                <div className="hp-today-tag" style={{ background: EVENT_TYPE_COLORS[todayEvent.type] || '#D4A84A' }}>
                  {todayEvent.day}
                </div>
                <h3 className="hp-today-title">{todayEvent.name}</h3>
                <p className="hp-today-desc">{todayEvent.description}</p>
                <Link href="/booking" className="hp-btn-gold hp-btn-sm">
                  {todayIdx === activeDay ? 'Đặt Bàn Cho Đêm Nay' : 'Đặt Bàn'}
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══ 7. WEEKLY SCHEDULE ═══ */}
      <section className="hp-schedule hp-animate">
        <div className="hp-container">
          <h2 className="hp-section-title">Lịch DJ – Dancer – Ca Sĩ</h2>

          {/* Desktop table */}
          <div className="hp-schedule-table-wrap">
            <table className="hp-schedule-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Chương trình</th>
                  <th>Nghệ sĩ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                                {weeklySchedule.map((item, i) => (
                  <tr key={i}>
                    <td className="hp-sched-day">{item.day}</td>
                    <td>{item.program}</td>
                    <td className="hp-sched-artist">{item.artist}</td>
                    <td>
                      <Link
                        href={`/booking?note=${encodeURIComponent(item.program + ' - ' + item.day)}`}
                        className="hp-sched-book"
                      >
                        Đặt Bàn
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="hp-schedule-mobile">
                            {weeklySchedule.map((item, i) => (
              <div key={i} className="hp-sched-card">
                <div className="hp-sched-card-top">
                  <span className="hp-sched-card-day">{item.day}</span>
                  <span className="hp-sched-card-type">{item.type}</span>
                </div>
                <div className="hp-sched-card-program">{item.program}</div>
                <div className="hp-sched-card-artist">{item.artist}</div>
                <Link
                  href={`/booking?note=${encodeURIComponent(item.program + ' - ' + item.day)}`}
                  className="hp-sched-card-cta"
                >
                  Đặt Bàn
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 8. UPCOMING EVENTS ═══ */}
      <section className="hp-upcoming hp-animate">
        <div className="hp-container">
          <h2 className="hp-section-title">Sự Kiện Sắp Diễn Ra</h2>
          <div className="hp-upcoming-grid">
            {upcomingEvents.map((ev) => (
              <div key={ev.title} className="hp-upcoming-card">
                <span className="hp-upcoming-tag">{ev.tag}</span>
                <h3 className="hp-upcoming-title">{ev.title}</h3>
                <p className="hp-upcoming-date">{ev.date} · {ev.time}</p>
                <p className="hp-upcoming-desc">{ev.description}</p>
                <Link href="/booking" className="hp-btn-gold hp-btn-sm">
                  Đặt Bàn Trước
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 9. BIRTHDAY & PARTY ═══ */}
      <section className="hp-birthday hp-animate" id="birthday">
        <div className="hp-container">
          <h2 className="hp-section-title">
            Sinh Nhật, Họp Mặt, Tiệc Công Ty – Để Báo Lo Cho Bạn
          </h2>
          <div className="hp-party-grid">
            {PARTY_PACKAGES.map((pkg) => (
              <div key={pkg.title} className="hp-party-card">
                <h3 className="hp-party-title">{pkg.title}</h3>
                <span className="hp-party-guests">{pkg.guests}</span>
                <p className="hp-party-desc">{pkg.description}</p>
                <ul className="hp-party-features">
                  {pkg.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link
                  href={`/booking?type=${encodeURIComponent(pkg.title)}`}
                  className="hp-btn-gold hp-btn-sm hp-btn-full"
                >
                  Đặt Ngay
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 10. PROMOTIONS ═══ */}
      <section className="hp-promos hp-animate">
        <div className="hp-container">
          <h2 className="hp-section-title">Đặt Bàn Trước – Nhận Ưu Đãi Tốt Hơn</h2>
          <div className="hp-promo-grid">
            {PROMOTIONS.map((promo) => (
              <div key={promo.title} className="hp-promo-card">
                <h3 className="hp-promo-title">{promo.title}</h3>
                <p className="hp-promo-desc">{promo.description}</p>
                <p className="hp-promo-cond">{promo.condition}</p>
              </div>
            ))}
          </div>
          <p className="hp-promo-note">
            * Các chương trình ưu đãi có thể thay đổi mà không báo trước. Liên hệ hotline để biết chi tiết.
          </p>
        </div>
      </section>

      {/* ═══ 11. COMMUNITY ═══ */}
      <section className="hp-community hp-animate">
        <div className="hp-container">
          <h2 className="hp-section-title">Không Có Bạn Đi Nhậu? Đến Báo Vẫn Có Hội</h2>
          <p className="hp-community-text">
            Tham gia group giao lưu của Báo Garden – nơi kết nối những người yêu đêm, yêu bia, 
            và muốn tìm hội đi chơi mỗi cuối tuần. Đến một mình cũng về có nhóm!
          </p>
          <div className="hp-community-ctas">
            <a href="#" className="hp-btn-gold">Tham Gia Group Giao Lưu</a>
            <a href="#" className="hp-btn-outline">Nhận Lịch Sự Kiện</a>
          </div>
        </div>
      </section>

      {/* ═══ 11.5. PHOTO ALBUM ═══ */}
      <section className="hp-album hp-animate" id="album">
        <div className="hp-container">
          <h2 className="hp-section-title">Khoảnh Khắc Tại Báo</h2>
          <p className="hp-album-sub">Mỗi đêm là một câu chuyện – Mỗi bức ảnh là một kỷ niệm</p>
        </div>
        <div className="hp-album-grid">
          {[
            { src: '/home/stage-show.jpg', alt: 'DJ & Dancer show' },
            { src: '/home/party-crowd.jpg', alt: 'Birthday party' },
            { src: '/home/hall-overview.jpg', alt: 'Main Hall' },
            { src: '/home/birthday-hbd.jpg', alt: 'Sinh nhật trên sân khấu' },
            { src: '/home/crowd-fun.jpg', alt: 'Năng lượng đêm' },
            { src: '/home/atmosphere.jpg', alt: 'Không khí Báo Garden' },
            { src: '/home/stage-dj.jpg', alt: 'DJ trên sân khấu' },
            { src: '/home/crowd-party.jpg', alt: 'Đám đông cuồng nhiệt' },
            { src: '/home/night-vibe.jpg', alt: 'Night vibe' },
            { src: '/home/vip-area.jpg', alt: 'VIP Area' },
          ].map((photo, i) => (
            <div key={i} className={`hp-album-item ${i === 0 || i === 5 ? 'hp-album-big' : ''}`}>
              <img src={photo.src} alt={photo.alt} loading="lazy" />
              <div className="hp-album-overlay">
                <span className="hp-album-caption">{photo.alt}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 12. QR ORDER ENTRY ═══ */}
      <section className="hp-qr hp-animate">
        <div className="hp-container">
          <h2 className="hp-section-title">Đang Ngồi Tại Báo?</h2>
          <p className="hp-qr-text">
            Quét mã QR trên bàn hoặc nhấn bên dưới để xem menu và gọi món trực tiếp. 
            Không cần gọi nhân viên, không cần chờ đợi – order tới tấp!
          </p>
          <Link href="/order" className="hp-btn-outline">
            Xem Menu
          </Link>
        </div>
      </section>

      {/* ═══ 13. FOOTER ═══ */}
      <footer className="hp-footer" id="footer">
        <div className="hp-container">
          <div className="hp-footer-grid">
            <div className="hp-footer-col">
              <h3 className="hp-footer-brand">{BRAND_NAME}</h3>
              <p className="hp-footer-desc">
                Không gian bar – nightlife – nhạc sống hàng đầu Tân Phú.
              </p>
            </div>
            <div className="hp-footer-col">
              <h4 className="hp-footer-heading">Thông tin</h4>
              <p className="hp-footer-info">{ADDRESS}</p>
              <p className="hp-footer-info">Hotline: {HOTLINE}</p>
              <p className="hp-footer-info">Mở cửa: {HOURS}</p>
            </div>
            <div className="hp-footer-col">
              <h4 className="hp-footer-heading">Liên kết</h4>
              <Link href="/booking" className="hp-footer-link">Đặt Bàn</Link>
              <Link href="/order" className="hp-footer-link">Menu</Link>
              <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className="hp-footer-link">
                Bản Đồ
              </a>
            </div>
            <div className="hp-footer-col">
              <h4 className="hp-footer-heading">Kết nối</h4>
              <a href="https://www.facebook.com/baogardentanphu" target="_blank" rel="noopener noreferrer" className="hp-footer-link">Facebook</a>
              <a href="https://www.instagram.com/baogarden.tanphu" target="_blank" rel="noopener noreferrer" className="hp-footer-link">Instagram</a>
              <a href="https://www.tiktok.com/@baogarden.tanphu" target="_blank" rel="noopener noreferrer" className="hp-footer-link">TikTok</a>
              <a href="https://zalo.me/0877766663" target="_blank" rel="noopener noreferrer" className="hp-footer-link">Zalo</a>
            </div>
          </div>
          <div className="hp-footer-bottom">
            <p>© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ═══ STICKY MOBILE BAR ═══ */}
      <div className="hp-mobile-bar">
        <div className="hp-mbar-glow" />
        <a href={`tel:${HOTLINE_RAW}`} className="hp-mbar-btn hp-mbar-call">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <span>Gọi Ngay</span>
        </a>
        <Link href="/booking" className="hp-mbar-btn hp-mbar-book">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>Đặt Bàn</span>
        </Link>
        <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className="hp-mbar-btn hp-mbar-map">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>Bản Đồ</span>
        </a>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CSS – All classes prefixed with 'hp-'
   ══════════════════════════════════════════════════════════════ */
const CSS = `
/* ─── Root ─── */
.hp-root {
  min-height: 100dvh;
  background: linear-gradient(180deg, #03071a 0%, #06103a 25%, #0a1448 50%, #0d0f2e 75%, #03071a 100%);
  color: #e8e4f0;
  font-family: 'Inter', -apple-system, sans-serif;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  position: relative;
}

/* Star field — denser, multi-layer */
.hp-root::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(1.5px 1.5px at 10% 8%, rgba(212,168,74,0.5) 50%, transparent 100%),
    radial-gradient(1px 1px at 25% 18%, rgba(255,255,255,0.3) 50%, transparent 100%),
    radial-gradient(2px 2px at 42% 12%, rgba(168,130,255,0.4) 50%, transparent 100%),
    radial-gradient(1px 1px at 65% 22%, rgba(212,168,74,0.35) 50%, transparent 100%),
    radial-gradient(1.5px 1.5px at 80% 8%, rgba(255,255,255,0.25) 50%, transparent 100%),
    radial-gradient(1px 1px at 92% 32%, rgba(168,130,255,0.3) 50%, transparent 100%),
    radial-gradient(1.5px 1.5px at 15% 45%, rgba(212,168,74,0.4) 50%, transparent 100%),
    radial-gradient(1px 1px at 35% 55%, rgba(255,255,255,0.2) 50%, transparent 100%),
    radial-gradient(2px 2px at 55% 48%, rgba(168,130,255,0.35) 50%, transparent 100%),
    radial-gradient(1px 1px at 72% 60%, rgba(212,168,74,0.3) 50%, transparent 100%),
    radial-gradient(1.5px 1.5px at 88% 52%, rgba(255,255,255,0.2) 50%, transparent 100%),
    radial-gradient(1px 1px at 5% 72%, rgba(168,130,255,0.25) 50%, transparent 100%),
    radial-gradient(1px 1px at 48% 82%, rgba(212,168,74,0.3) 50%, transparent 100%),
    radial-gradient(1.5px 1.5px at 78% 88%, rgba(255,255,255,0.2) 50%, transparent 100%),
    radial-gradient(1px 1px at 30% 92%, rgba(168,130,255,0.2) 50%, transparent 100%),
    radial-gradient(1px 1px at 95% 15%, rgba(212,168,74,0.25) 50%, transparent 100%);
  animation: hp-stars-drift 60s linear infinite;
  pointer-events: none;
  z-index: 0;
}

/* Floating gold dust particles */
.hp-root::after {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(2px 2px at 20% 30%, rgba(212,168,74,0.15) 50%, transparent 100%),
    radial-gradient(3px 3px at 60% 20%, rgba(212,168,74,0.08) 50%, transparent 100%),
    radial-gradient(2px 2px at 85% 50%, rgba(168,130,255,0.1) 50%, transparent 100%),
    radial-gradient(4px 4px at 40% 70%, rgba(212,168,74,0.06) 50%, transparent 100%),
    radial-gradient(2px 2px at 70% 85%, rgba(168,130,255,0.08) 50%, transparent 100%);
  animation: hp-dust-float 40s ease-in-out infinite alternate;
  pointer-events: none;
  z-index: 0;
  opacity: 0.7;
}

@keyframes hp-stars-drift {
  0% { transform: translateY(0) scale(1); opacity: 0.6; }
  25% { opacity: 0.9; }
  50% { transform: translateY(-20px) scale(1.02); opacity: 1; }
  75% { opacity: 0.8; }
  100% { transform: translateY(-40px) scale(1); opacity: 0.6; }
}

@keyframes hp-dust-float {
  0% { transform: translateY(0) translateX(0); }
  33% { transform: translateY(-15px) translateX(10px); }
  66% { transform: translateY(-25px) translateX(-5px); }
  100% { transform: translateY(-10px) translateX(8px); }
}

/* ─── Animations ─── */
.hp-animate {
  opacity: 0;
  transform: translateY(32px);
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.hp-visible {
  opacity: 1;
  transform: translateY(0);
}


/* ─── Container ─── */
.hp-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ═══════════════════════════════════════════════════════════════
   HEADER
   ═══════════════════════════════════════════════════════════════ */
.hp-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 16px 24px;
  transition: all 0.35s ease;
  background: transparent;
}
.hp-header-solid {
  background: rgba(3, 7, 26, 0.92);
  backdrop-filter: blur(24px) saturate(1.2);
  -webkit-backdrop-filter: blur(24px) saturate(1.2);
  border-bottom: 1px solid rgba(212, 168, 74, 0.08);
  padding: 12px 24px;
  box-shadow: 0 4px 30px rgba(0,0,0,0.4);
}
.hp-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hp-logo {
  font-family: 'Cormorant Garamond', serif;
  font-size: 26px;
  font-weight: 700;
  color: #D4A84A;
  text-decoration: none;
  letter-spacing: 0.06em;
  text-shadow: 0 0 20px rgba(212,168,74,0.3), 0 0 40px rgba(212,168,74,0.1);
}
.hp-nav-desktop {
  display: flex;
  gap: 32px;
}
.hp-nav-link {
  font-size: 14px;
  font-weight: 500;
  color: rgba(226, 221, 213, 0.7);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
  padding: 8px 0;
}
.hp-nav-link:hover { color: #D4A84A; }
.hp-header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.hp-header-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  background: linear-gradient(135deg, #D4A84A, #b8913e);
  color: #061240;
  text-decoration: none;
  min-height: 48px;
  transition: all 0.2s;
}
.hp-header-cta:hover {
  box-shadow: 0 4px 20px rgba(212, 168, 74, 0.3);
  transform: translateY(-1px);
}

/* Hamburger */
.hp-hamburger {
  display: none;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: none;
  border: none;
  position: relative;
}
.hp-hamburger-line,
.hp-hamburger-line::before,
.hp-hamburger-line::after {
  display: block;
  width: 22px;
  height: 2px;
  background: #e2ddd5;
  border-radius: 1px;
  transition: all 0.3s;
  position: absolute;
}
.hp-hamburger-line::before { content: ''; top: -7px; }
.hp-hamburger-line::after { content: ''; top: 7px; }
.hp-hamburger-open { background: transparent; }
.hp-hamburger-open::before { top: 0; transform: rotate(45deg); }
.hp-hamburger-open::after { top: 0; transform: rotate(-45deg); }

/* Mobile menu */
.hp-mobile-menu {
  display: none;
  flex-direction: column;
  gap: 4px;
  padding: 16px 0 8px;
  animation: hp-slideDown 0.3s ease;
}
.hp-mobile-link {
  font-size: 16px;
  font-weight: 500;
  color: rgba(226, 221, 213, 0.8);
  padding: 14px 8px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.15s;
}
.hp-mobile-link:hover { background: rgba(255,255,255,0.04); color: #D4A84A; }
.hp-mobile-cta {
  display: block;
  text-align: center;
  padding: 14px;
  margin-top: 8px;
  border-radius: 12px;
  font-weight: 700;
  background: linear-gradient(135deg, #D4A84A, #b8913e);
  color: #061240;
  text-decoration: none;
  min-height: 48px;
  line-height: 20px;
}

@keyframes hp-slideDown {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ═══════════════════════════════════════════════════════════════
   1. HERO
   ═══════════════════════════════════════════════════════════════ */
.hp-hero {
  position: relative;
  height: 100vh;
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.hp-hero-bg {
  position: absolute;
  inset: 0;
  will-change: transform;
}
.hp-hero-bg img {
  width: 100%;
  height: 120%;
  object-fit: cover;
  object-position: center;
}
.hp-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(3, 7, 26, 0.35) 0%,
    rgba(6, 12, 42, 0.55) 30%,
    rgba(13, 10, 46, 0.75) 60%,
    rgba(3, 7, 26, 0.96) 100%
  );
}
.hp-hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 0 24px;
  max-width: 720px;
}
.hp-hero-title {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 20px;
}
.hp-hero-line1 {
  display: block;
  font-size: 48px;
  color: #e2ddd5;
}
.hp-hero-line2 {
  display: block;
  font-size: 52px;
  background: linear-gradient(135deg, #FFF1C9, #E8C464, #D4A84A, #b8913e);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: hp-gold-shimmer 5s ease-in-out infinite;
  filter: drop-shadow(0 0 20px rgba(212,168,74,0.25));
}
@keyframes hp-gold-shimmer {
  0%, 100% { background-position: 0% center; }
  50% { background-position: 200% center; }
}
.hp-hero-line3 {
  display: block;
  font-size: 36px;
  color: rgba(226, 221, 213, 0.7);
  font-weight: 600;
}
.hp-hero-sub {
  font-size: 16px;
  line-height: 1.7;
  color: rgba(226, 221, 213, 0.6);
  margin-bottom: 24px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}
.hp-hero-badges {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}
.hp-hero-badge {
  padding: 6px 16px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(212, 168, 74, 0.1);
  border: 1px solid rgba(212, 168, 74, 0.2);
  color: #D4A84A;
}
.hp-hero-ctas {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

/* Sparkles */
.hp-hero-sparkle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;
}
.hp-sparkle-1 {
  width: 400px; height: 400px;
  top: 10%; left: -8%;
  background: radial-gradient(circle, rgba(120,80,220,0.15) 0%, transparent 70%);
  animation: hp-float 10s ease-in-out infinite;
}
.hp-sparkle-2 {
  width: 300px; height: 300px;
  top: 25%; right: -5%;
  background: radial-gradient(circle, rgba(212,168,74,0.12) 0%, transparent 70%);
  animation: hp-float 12s ease-in-out infinite reverse;
}
.hp-sparkle-3 {
  width: 250px; height: 250px;
  bottom: 15%; left: 15%;
  background: radial-gradient(circle, rgba(100,60,200,0.1) 0%, transparent 70%);
  animation: hp-float 8s ease-in-out infinite 3s;
}
@keyframes hp-float {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
  50% { transform: translate(30px, -40px) scale(1.15); opacity: 0.9; }
}

/* Aurora gradient behind hero */
.hp-hero-aurora {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(120,80,220,0.06) 0%,
    rgba(212,168,74,0.04) 25%,
    transparent 50%,
    rgba(6,182,212,0.04) 75%,
    rgba(120,80,220,0.06) 100%
  );
  background-size: 400% 400%;
  animation: hp-aurora 15s ease-in-out infinite;
  z-index: 3;
  pointer-events: none;
}
@keyframes hp-aurora {
  0% { background-position: 0% 50%; }
  25% { background-position: 100% 0%; }
  50% { background-position: 100% 100%; }
  75% { background-position: 0% 100%; }
  100% { background-position: 0% 50%; }
}

/* Fireflies */
.hp-fireflies {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  overflow: hidden;
}
.hp-firefly {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #D4A84A;
  box-shadow: 0 0 8px 2px rgba(212,168,74,0.6), 0 0 20px 4px rgba(212,168,74,0.2);
  bottom: 20%;
  animation: hp-firefly-float 8s ease-in-out infinite;
}
.hp-firefly:nth-child(odd) {
  width: 3px;
  height: 3px;
  background: rgba(168,130,255,0.8);
  box-shadow: 0 0 6px 2px rgba(168,130,255,0.5), 0 0 16px 4px rgba(168,130,255,0.15);
  animation-duration: 10s;
}
@keyframes hp-firefly-float {
  0% { transform: translateY(0) translateX(0); opacity: 0; }
  10% { opacity: 1; }
  30% { transform: translateY(-120px) translateX(30px); opacity: 0.8; }
  50% { transform: translateY(-200px) translateX(-20px); opacity: 1; }
  70% { transform: translateY(-300px) translateX(15px); opacity: 0.6; }
  90% { opacity: 0.2; }
  100% { transform: translateY(-400px) translateX(-10px); opacity: 0; }
}

/* Glow pulse on gold buttons */
.hp-btn-gold::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(212,168,74,0.4), rgba(168,130,255,0.2), rgba(212,168,74,0.4));
  background-size: 200% 200%;
  animation: hp-btn-glow 3s ease-in-out infinite;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s;
}
.hp-btn-gold:hover::before { opacity: 1; }
@keyframes hp-btn-glow {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* Card hover glow effect */
.hp-emotion-card:hover,
.hp-upcoming-card:hover {
  box-shadow: 0 0 30px rgba(120,80,220,0.08), 0 0 60px rgba(212,168,74,0.04);
  border-color: rgba(212,168,74,0.15);
}

/* Section separator glow line */
.hp-today::after,
.hp-emotion::after,
.hp-schedule::after,
.hp-album::after {
  content: '';
  display: block;
  width: 120px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212,168,74,0.3), rgba(168,130,255,0.2), transparent);
  margin: 0 auto;
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
}
.hp-schedule, .hp-album {
  position: relative;
}

/* ─── Buttons ─── */
.hp-btn-gold {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  background: linear-gradient(135deg, #E8C464, #D4A84A, #b8913e);
  color: #03071a;
  border: none;
  cursor: pointer;
  min-height: 48px;
  transition: all 0.3s;
  text-decoration: none;
  letter-spacing: 0.02em;
  box-shadow: 0 0 15px rgba(212,168,74,0.15), 0 2px 8px rgba(0,0,0,0.3);
  position: relative;
}
.hp-btn-gold:hover {
  box-shadow: 0 0 30px rgba(212,168,74,0.35), 0 4px 20px rgba(0,0,0,0.4);
  transform: translateY(-2px);
}
.hp-btn-gold:active { transform: translateY(0); }
.hp-btn-gold:disabled { opacity: 0.5; cursor: wait; }
.hp-btn-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  background: rgba(212,168,74,0.04);
  color: #D4A84A;
  border: 1px solid rgba(212, 168, 74, 0.2);
  cursor: pointer;
  min-height: 48px;
  transition: all 0.3s;
  text-decoration: none;
  text-shadow: 0 0 12px rgba(212,168,74,0.15);
}
.hp-btn-outline:hover {
  background: rgba(212, 168, 74, 0.1);
  border-color: rgba(212, 168, 74, 0.5);
  box-shadow: 0 0 20px rgba(212,168,74,0.12);
}
.hp-btn-sm {
  padding: 10px 20px;
  font-size: 13px;
  min-height: 40px;
}
.hp-btn-full { width: 100%; }

/* ─── Section Title ─── */
.hp-section-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  margin-bottom: 36px;
  position: relative;
  z-index: 1;
  background-image: linear-gradient(90deg, #e8e4f0 0%, #D4A84A 30%, #e8e4f0 50%, #a882ff 70%, #e8e4f0 100%);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: hp-shimmer-title 8s ease-in-out infinite;
  text-shadow: none;
}
@keyframes hp-shimmer-title {
  0% { background-position: 100% 50%; }
  50% { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
}

/* ═══════════════════════════════════════════════════════════════
   2. QUICK INFO
   ═══════════════════════════════════════════════════════════════ */
.hp-quickinfo {
  padding: 0 24px 40px;
  margin-top: -40px;
  position: relative;
  z-index: 3;
}
.hp-quickinfo-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.hp-qi-card {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(16px) saturate(1.1);
  -webkit-backdrop-filter: blur(16px) saturate(1.1);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s;
  text-decoration: none;
  color: inherit;
  text-align: center;
}
.hp-qi-card-link:hover {
  border-color: rgba(212, 168, 74, 0.3);
  background: rgba(212, 168, 74, 0.06);
}
.hp-qi-card-promo {
  border-color: rgba(212, 168, 74, 0.15);
  background: rgba(212, 168, 74, 0.04);
}

.hp-qi-label {
  font-size: 11px;
  color: rgba(226, 221, 213, 0.5);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 2px;
}
.hp-qi-value {
  font-size: 14px;
  font-weight: 600;
  color: #e2ddd5;
}

/* ═══════════════════════════════════════════════════════════════
   3. BOOKING
   ═══════════════════════════════════════════════════════════════ */
.hp-booking {
  padding: 80px 0;
  background: linear-gradient(180deg, rgba(13,10,46,0.3), rgba(3,7,26,0.5));
  position: relative;
  z-index: 1;
}
.hp-preset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-width: 600px;
  margin: 0 auto 32px;
}
.hp-preset-btn {
  padding: 16px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e2ddd5;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 48px;
}
.hp-preset-btn:hover {
  border-color: rgba(212, 168, 74, 0.3);
  background: rgba(212, 168, 74, 0.06);
}
.hp-preset-active {
  border-color: #D4A84A;
  background: rgba(212, 168, 74, 0.12);
  color: #D4A84A;
  box-shadow: 0 0 20px rgba(212, 168, 74, 0.1);
}

/* Booking form */
.hp-booking-form {
  max-width: 600px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: hp-slideDown 0.4s ease;
}
.hp-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.hp-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.hp-form-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(226, 221, 213, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.hp-form-input {
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e2ddd5;
  outline: none;
  font-family: 'Inter', sans-serif;
  transition: border-color 0.2s;
  min-height: 48px;
  width: 100%;
}
.hp-form-input:focus {
  border-color: rgba(212, 168, 74, 0.4);
  box-shadow: 0 0 0 3px rgba(212, 168, 74, 0.06);
}
.hp-form-input::placeholder { color: rgba(226, 221, 213, 0.25); }
.hp-form-input::-webkit-calendar-picker-indicator {
  filter: invert(0.7) sepia(1) saturate(3) hue-rotate(10deg);
  cursor: pointer;
}
.hp-form-textarea { resize: none; min-height: 64px; }
.hp-form-error {
  font-size: 13px;
  color: #ef4444;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.15);
}
.hp-form-note {
  text-align: center;
  font-size: 12px;
  color: rgba(226, 221, 213, 0.35);
  margin-top: 4px;
}

/* Booking success */
.hp-booking-success {
  max-width: 500px;
  margin: 0 auto;
  text-align: center;
  padding: 40px 24px;
  animation: hp-slideDown 0.4s ease;
}
.hp-success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4ade80, #16a34a);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 28px;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 0 40px rgba(74, 222, 128, 0.2);
}
.hp-booking-success h3 {
  font-family: 'Cormorant Garamond', serif;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 12px;
}
.hp-booking-success p {
  font-size: 14px;
  color: rgba(226, 221, 213, 0.6);
  margin-bottom: 24px;
  line-height: 1.6;
}

/* ═══════════════════════════════════════════════════════════════
   4. EMOTION
   ═══════════════════════════════════════════════════════════════ */
.hp-emotion {
  padding: 80px 0;
  position: relative;
  overflow: hidden;
}
.hp-emotion::before {
  content: '';
  position: absolute;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(120,80,220,0.08) 0%, transparent 70%);
  top: -100px;
  right: -100px;
  pointer-events: none;
  animation: hp-orb-pulse 6s ease-in-out infinite alternate;
}
@keyframes hp-orb-pulse {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.3); opacity: 0.8; }
}
.hp-emotion-quote {
  text-align: center;
  font-size: 18px;
  font-style: italic;
  color: rgba(212, 168, 74, 0.7);
  margin-bottom: 40px;
  font-family: 'Cormorant Garamond', serif;
  line-height: 1.5;
}
.hp-emotion-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.hp-emotion-card {
  padding: 32px 24px;
  border-radius: 20px;
  border: 1px solid;
  text-align: center;
  transition: all 0.3s;
}
.hp-emotion-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}

.hp-emotion-card-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #e2ddd5;
}
.hp-emotion-card-desc {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(226, 221, 213, 0.6);
}

/* ═══════════════════════════════════════════════════════════════
   5. SPACES
   ═══════════════════════════════════════════════════════════════ */
.hp-spaces {
  padding: 80px 0;
  background: linear-gradient(180deg, rgba(8,12,40,0.3), rgba(13,10,46,0.4));
  position: relative;
  z-index: 1;
}
.hp-spaces-scroll {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding: 0 24px 16px;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.hp-spaces-scroll::-webkit-scrollbar { display: none; }
.hp-space-card {
  flex: 0 0 320px;
  height: 240px;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  scroll-snap-align: start;
}
.hp-space-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s;
}
.hp-space-card:hover .hp-space-img { transform: scale(1.05); }
.hp-space-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(3,7,26,0.94) 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 20px;
}
.hp-space-name {
  font-family: 'Cormorant Garamond', serif;
  font-size: 18px;
  font-weight: 700;
  color: #e2ddd5;
  margin-bottom: 4px;
}
.hp-space-desc {
  font-size: 13px;
  color: rgba(226, 221, 213, 0.6);
  line-height: 1.4;
}

/* ═══════════════════════════════════════════════════════════════
   6. TODAY EVENTS
   ═══════════════════════════════════════════════════════════════ */
.hp-today {
  padding: 80px 0;
  position: relative;
  z-index: 1;
  overflow: hidden;
}
.hp-today::before {
  content: '';
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(212,168,74,0.06) 0%, transparent 70%);
  bottom: -150px;
  left: -150px;
  pointer-events: none;
  animation: hp-orb-gold 8s ease-in-out infinite alternate;
}
@keyframes hp-orb-gold {
  0% { transform: scale(1) rotate(0deg); opacity: 0.4; }
  100% { transform: scale(1.2) rotate(10deg); opacity: 0.7; }
}
.hp-day-tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 40px;
  flex-wrap: wrap;
}
.hp-day-tab {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: all 0.25s;
  color: rgba(226, 221, 213, 0.45);
  font-weight: 600;
}
.hp-day-tab:hover {
  border-color: rgba(212, 168, 74, 0.4);
  color: #D4A84A;
  background: rgba(212, 168, 74, 0.06);
}
.hp-day-tab-active {
  background: rgba(212, 168, 74, 0.15);
  border-color: #D4A84A;
  color: #D4A84A;
  box-shadow: 0 0 20px rgba(212, 168, 74, 0.12);
}
.hp-day-tab-today { position: relative; }
.hp-day-tab-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #4ade80;
  position: absolute;
  bottom: 6px;
}
.hp-day-tab-short { font-size: 14px; letter-spacing: 0.02em; }

/* Poster wrapper */
.hp-poster-wrap {
  max-width: 640px;
  margin: 0 auto;
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(212, 168, 74, 0.12);
  box-shadow: 0 0 60px rgba(120, 80, 220, 0.06), 0 0 30px rgba(212, 168, 74, 0.04);
  animation: hp-slideDown 0.35s ease;
}
.hp-poster-img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 24px;
}
.hp-poster-fallback {
  padding: 48px 40px;
  text-align: center;
}

.hp-today-tag {
  display: inline-block;
  padding: 5px 16px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
  color: #03071a;
  margin-bottom: 20px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.hp-today-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 16px;
  color: #e8e4f0;
  text-shadow: 0 0 30px rgba(212,168,74,0.1);
  line-height: 1.2;
}
.hp-today-desc {
  font-size: 16px;
  line-height: 1.7;
  color: rgba(226, 221, 213, 0.6);
  margin-bottom: 28px;
  max-width: 440px;
  margin-left: auto;
  margin-right: auto;
}

/* ═══════════════════════════════════════════════════════════════
   7. WEEKLY SCHEDULE
   ═══════════════════════════════════════════════════════════════ */
.hp-schedule {
  padding: 80px 0;
  background: linear-gradient(180deg, rgba(8,12,40,0.3), rgba(13,10,46,0.4));
  position: relative;
  z-index: 1;
}
.hp-schedule-table-wrap {
  overflow-x: auto;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.hp-schedule-table {
  width: 100%;
  border-collapse: collapse;
}
.hp-schedule-table th {
  text-align: left;
  padding: 14px 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(226, 221, 213, 0.4);
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.hp-schedule-table td {
  padding: 16px 20px;
  font-size: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: rgba(226, 221, 213, 0.7);
}
.hp-schedule-table tbody tr:hover {
  background: rgba(212, 168, 74, 0.03);
}
.hp-schedule-table tbody tr:last-child td {
  border-bottom: none;
}
.hp-sched-day {
  font-weight: 600;
  color: #D4A84A;
}
.hp-sched-time {
  font-weight: 500;
  color: rgba(226, 221, 213, 0.5);
  font-size: 13px;
}
.hp-sched-artist {
  font-weight: 600;
  color: #e2ddd5;
}
.hp-sched-book {
  font-size: 12px;
  font-weight: 600;
  color: #D4A84A;
  text-decoration: none;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(212, 168, 74, 0.2);
  transition: all 0.15s;
  white-space: nowrap;
}
.hp-sched-book:hover {
  background: rgba(212, 168, 74, 0.1);
  border-color: rgba(212, 168, 74, 0.4);
}

/* Mobile schedule cards */
.hp-schedule-mobile { display: none; }
.hp-sched-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 12px;
}
.hp-sched-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.hp-sched-card-day {
  font-weight: 700;
  color: #D4A84A;
  font-size: 13px;
}
.hp-sched-card-type {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 100px;
  background: rgba(168, 85, 247, 0.12);
  color: #a855f7;
}
.hp-sched-card-program {
  font-size: 16px;
  font-weight: 700;
  color: #e2ddd5;
  margin-bottom: 4px;
}
.hp-sched-card-artist {
  font-size: 13px;
  color: rgba(226, 221, 213, 0.5);
  margin-bottom: 4px;
}
.hp-sched-card-time {
  font-size: 12px;
  color: rgba(226, 221, 213, 0.35);
  margin-bottom: 12px;
}
.hp-sched-card-cta {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  color: #D4A84A;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid rgba(212, 168, 74, 0.2);
  transition: all 0.15s;
}
.hp-sched-card-cta:hover {
  background: rgba(212, 168, 74, 0.1);
}

/* ═══════════════════════════════════════════════════════════════
   8. UPCOMING EVENTS
   ═══════════════════════════════════════════════════════════════ */
.hp-upcoming {
  padding: 80px 0;
}
.hp-upcoming-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
.hp-upcoming-card {
  padding: 28px;
  border-radius: 20px;
  background: linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.3s;
}
.hp-upcoming-card:hover {
  transform: translateY(-4px);
  border-color: rgba(212, 168, 74, 0.2);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}
.hp-upcoming-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(212, 168, 74, 0.12);
  color: #D4A84A;
  margin-bottom: 12px;
}
.hp-upcoming-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #e2ddd5;
}
.hp-upcoming-date {
  font-size: 13px;
  color: rgba(226, 221, 213, 0.4);
  font-weight: 500;
  margin-bottom: 12px;
}
.hp-upcoming-desc {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(226, 221, 213, 0.6);
  margin-bottom: 20px;
}

/* ═══════════════════════════════════════════════════════════════
   9. BIRTHDAY / PARTY
   ═══════════════════════════════════════════════════════════════ */
.hp-birthday {
  padding: 80px 0;
  background: linear-gradient(180deg, rgba(8,12,40,0.3), rgba(13,10,46,0.4));
  position: relative;
  z-index: 1;
}
.hp-party-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.hp-party-card {
  padding: 28px 24px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
}
.hp-party-card:hover {
  border-color: rgba(212, 168, 74, 0.2);
  transform: translateY(-4px);
}
.hp-party-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 18px;
  font-weight: 700;
  color: #D4A84A;
  margin-bottom: 6px;
}
.hp-party-guests {
  font-size: 12px;
  font-weight: 600;
  color: rgba(226, 221, 213, 0.4);
  margin-bottom: 12px;
}
.hp-party-desc {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(226, 221, 213, 0.6);
  margin-bottom: 16px;
}
.hp-party-features {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
  flex: 1;
}
.hp-party-features li {
  font-size: 13px;
  color: rgba(226, 221, 213, 0.55);
  padding: 5px 0;
  padding-left: 16px;
  position: relative;
}
.hp-party-features li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #4ade80;
  font-size: 12px;
  font-weight: 700;
}

/* ═══════════════════════════════════════════════════════════════
   10. PROMOTIONS
   ═══════════════════════════════════════════════════════════════ */
.hp-promos {
  padding: 80px 0;
}
.hp-promo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
.hp-promo-card {
  padding: 28px;
  border-radius: 20px;
  background: linear-gradient(145deg, rgba(212,168,74,0.05), rgba(212,168,74,0.01));
  border: 1px solid rgba(212, 168, 74, 0.1);
  transition: all 0.3s;
}
.hp-promo-card:hover {
  border-color: rgba(212, 168, 74, 0.25);
  transform: translateY(-2px);
}
.hp-promo-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 17px;
  font-weight: 700;
  color: #D4A84A;
  margin-bottom: 10px;
}
.hp-promo-desc {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(226, 221, 213, 0.65);
  margin-bottom: 12px;
}
.hp-promo-cond {
  font-size: 12px;
  color: rgba(226, 221, 213, 0.35);
  font-style: italic;
}
.hp-promo-note {
  text-align: center;
  font-size: 12px;
  color: rgba(226, 221, 213, 0.3);
  margin-top: 24px;
}

/* ═══════════════════════════════════════════════════════════════
   11. COMMUNITY
   ═══════════════════════════════════════════════════════════════ */
.hp-community {
  padding: 80px 0;
  background: linear-gradient(180deg, rgba(8,12,40,0.3), rgba(13,10,46,0.4));
  position: relative;
  z-index: 1;
  text-align: center;
}
.hp-community-text {
  font-size: 16px;
  line-height: 1.7;
  color: rgba(226, 221, 213, 0.6);
  max-width: 600px;
  margin: 0 auto 32px;
}
.hp-community-ctas {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

/* ═══════════════════════════════════════════════════════════════
   11.5. PHOTO ALBUM
   ═══════════════════════════════════════════════════════════════ */
.hp-album {
  padding: 80px 0;
  position: relative;
  z-index: 1;
}
.hp-album-sub {
  text-align: center;
  font-size: 16px;
  font-style: italic;
  color: rgba(212, 168, 74, 0.5);
  margin-bottom: 40px;
  font-family: 'Cormorant Garamond', serif;
  line-height: 1.5;
}
.hp-album-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 0 24px;
  max-width: 1200px;
  margin: 0 auto;
}
.hp-album-item {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  aspect-ratio: 1;
  cursor: pointer;
}
.hp-album-big {
  grid-column: span 2;
  grid-row: span 2;
}
.hp-album-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease, filter 0.3s;
}
.hp-album-item:hover img {
  transform: scale(1.08);
  filter: brightness(1.1);
}
.hp-album-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 50%, rgba(3,7,26,0.85) 100%);
  display: flex;
  align-items: flex-end;
  padding: 16px;
  opacity: 0;
  transition: opacity 0.3s;
}
.hp-album-item:hover .hp-album-overlay {
  opacity: 1;
}
.hp-album-caption {
  font-size: 13px;
  font-weight: 600;
  color: #D4A84A;
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
}

/* ═══════════════════════════════════════════════════════════════
   12. QR ORDER
   ═══════════════════════════════════════════════════════════════ */
.hp-qr {
  padding: 80px 0;
  text-align: center;
}
.hp-qr-text {
  font-size: 16px;
  line-height: 1.7;
  color: rgba(226, 221, 213, 0.6);
  max-width: 500px;
  margin: 0 auto 28px;
}

/* ═══════════════════════════════════════════════════════════════
   13. FOOTER
   ═══════════════════════════════════════════════════════════════ */
.hp-footer {
  padding: 64px 0 120px;
  border-top: 1px solid rgba(212,168,74,0.06);
  background: rgba(2, 4, 15, 0.7);
  position: relative;
  z-index: 1;
}
.hp-footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 40px;
  margin-bottom: 40px;
}
.hp-footer-brand {
  font-family: 'Cormorant Garamond', serif;
  font-size: 24px;
  font-weight: 800;
  color: #D4A84A;
  margin-bottom: 12px;
}
.hp-footer-desc {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(226, 221, 213, 0.5);
}
.hp-footer-heading {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(226, 221, 213, 0.6);
  margin-bottom: 16px;
}
.hp-footer-info {
  font-size: 14px;
  color: rgba(226, 221, 213, 0.45);
  margin-bottom: 8px;
  line-height: 1.5;
}
.hp-footer-link {
  display: block;
  font-size: 14px;
  color: rgba(226, 221, 213, 0.45);
  text-decoration: none;
  margin-bottom: 10px;
  transition: color 0.15s;
}
.hp-footer-link:hover { color: #D4A84A; }
.hp-footer-bottom {
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  text-align: center;
}
.hp-footer-bottom p {
  font-size: 12px;
  color: rgba(226, 221, 213, 0.25);
}

/* ═══════════════════════════════════════════════════════════════
   STICKY MOBILE BAR
   ═══════════════════════════════════════════════════════════════ */
.hp-mobile-bar {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: linear-gradient(180deg, rgba(6,16,58,0.97) 0%, rgba(3,7,26,0.99) 100%);
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px) saturate(1.3);
  border-top: 1px solid rgba(212,168,74,0.15);
  z-index: 99;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  box-shadow: 0 -4px 30px rgba(0,0,0,0.5), 0 -1px 20px rgba(212,168,74,0.05);
}
.hp-mbar-glow {
  position: absolute;
  top: -1px;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212,168,74,0.5), rgba(168,130,255,0.3), rgba(212,168,74,0.5), transparent);
  animation: hp-mbar-glow-anim 4s ease-in-out infinite;
}
@keyframes hp-mbar-glow-anim {
  0%, 100% { opacity: 0.4; transform: scaleX(0.8); }
  50% { opacity: 1; transform: scaleX(1); }
}
.hp-mbar-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-decoration: none;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: all 0.25s;
  min-height: 56px;
  position: relative;
}
.hp-mbar-btn svg {
  transition: transform 0.25s, filter 0.25s;
}
.hp-mbar-call {
  color: #4ade80;
}
.hp-mbar-book {
  color: #D4A84A;
  position: relative;
}
.hp-mbar-book::before {
  content: '';
  position: absolute;
  inset: 6px 12px;
  border-radius: 12px;
  background: rgba(212,168,74,0.08);
  border: 1px solid rgba(212,168,74,0.12);
  transition: all 0.25s;
}
.hp-mbar-book:hover::before,
.hp-mbar-book:active::before {
  background: rgba(212,168,74,0.15);
  border-color: rgba(212,168,74,0.3);
  box-shadow: 0 0 20px rgba(212,168,74,0.1);
}
.hp-mbar-map {
  color: #67b8f9;
}
.hp-mbar-call:hover,
.hp-mbar-call:active { color: #86efac; }
.hp-mbar-call:hover svg { transform: scale(1.15); filter: drop-shadow(0 0 6px rgba(74,222,128,0.4)); }
.hp-mbar-book:hover,
.hp-mbar-book:active { color: #FDE68A; }
.hp-mbar-book:hover svg { transform: scale(1.15); filter: drop-shadow(0 0 6px rgba(212,168,74,0.5)); }
.hp-mbar-map:hover,
.hp-mbar-map:active { color: #93cffd; }
.hp-mbar-map:hover svg { transform: scale(1.15); filter: drop-shadow(0 0 6px rgba(103,184,249,0.4)); }

/* ═══════════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  /* Header */
  .hp-nav-desktop { display: none; }
  .hp-header-cta { display: none; }
  .hp-hamburger { display: flex; }
  .hp-mobile-menu { display: flex; }

  /* Hero */
  .hp-hero-line1 { font-size: 32px; }
  .hp-hero-line2 { font-size: 36px; }
  .hp-hero-line3 { font-size: 24px; }
  .hp-hero-sub { font-size: 14px; }
  .hp-hero-ctas { flex-direction: column; align-items: center; }
  .hp-hero-ctas .hp-btn-gold,
  .hp-hero-ctas .hp-btn-outline { width: 100%; max-width: 280px; }

  /* Quick info */
  .hp-quickinfo { margin-top: -20px; padding: 0 16px 24px; }
  .hp-quickinfo-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
  .hp-qi-card { padding: 14px; }
  .hp-qi-value { font-size: 12px; }

  /* Section titles */
  .hp-section-title { font-size: 24px; margin-bottom: 24px; }

  /* Sections */
  .hp-booking,
  .hp-emotion,
  .hp-spaces,
  .hp-today,
  .hp-schedule,
  .hp-upcoming,
  .hp-birthday,
  .hp-promos,
  .hp-community,
  .hp-album,
  .hp-qr { padding: 48px 0; }

  .hp-container { padding: 0 16px; }

  /* Presets */
  .hp-preset-grid { grid-template-columns: repeat(2, 1fr); }

  /* Form */
  .hp-form-row { grid-template-columns: 1fr; }
  .hp-booking-form { padding: 20px; }

  /* Emotion */
  .hp-emotion-grid { grid-template-columns: 1fr; }
  .hp-emotion-quote { font-size: 16px; }

  /* Spaces */
  .hp-space-card { flex: 0 0 260px; height: 200px; }

  /* Schedule */
  .hp-schedule-table-wrap { display: none; }
  .hp-schedule-mobile { display: block; }

  /* Upcoming */
  .hp-upcoming-grid { grid-template-columns: 1fr; }

  /* Party */
  .hp-party-grid { grid-template-columns: 1fr; }

  /* Promos */
  .hp-promo-grid { grid-template-columns: 1fr; }

  /* Footer */
  .hp-footer { padding: 48px 0 calc(80px + env(safe-area-inset-bottom, 0px)); }
  .hp-footer-grid { grid-template-columns: 1fr; gap: 28px; }

  /* Mobile bar */
  .hp-mobile-bar { display: flex; }

  /* Community */
  .hp-community-text { font-size: 14px; }
  .hp-community-ctas { flex-direction: column; align-items: center; }

  /* QR */
  .hp-qr-text { font-size: 14px; }

  /* Album */
  .hp-album-grid { grid-template-columns: repeat(2, 1fr); gap: 4px; padding: 0 16px; }
  .hp-album-big { grid-column: span 2; grid-row: span 2; }
  .hp-album-sub { font-size: 14px; margin-bottom: 24px; }

  /* Day tabs */
  .hp-day-tab { width: 42px; height: 42px; }
}

@media (max-width: 480px) {
  .hp-hero-line1 { font-size: 28px; }
  .hp-hero-line2 { font-size: 32px; }
  .hp-hero-line3 { font-size: 20px; }
  .hp-quickinfo-grid { grid-template-columns: 1fr; }
  .hp-preset-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .hp-preset-btn { padding: 12px 8px; font-size: 13px; }
}
`;
