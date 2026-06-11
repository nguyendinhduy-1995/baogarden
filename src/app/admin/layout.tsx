'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Tổng quan', short: 'TQ', roles: ['ADMIN', 'MANAGER'] },
  { href: '/admin/bookings', label: 'Đặt bàn', short: 'ĐB', roles: ['ADMIN', 'MANAGER', 'BOOKING'] },
  { href: '/admin/customers', label: 'Khách hàng', short: 'KH', roles: ['ADMIN', 'MANAGER'] },
  { href: '/admin/tables', label: 'Sơ đồ bàn', short: 'SĐ', roles: ['ADMIN', 'MANAGER'] },
  { href: '/admin/users', label: 'Nhân viên', short: 'NV', roles: ['ADMIN'] },
  { href: '/admin/reports', label: 'Báo cáo', short: 'BC', roles: ['ADMIN', 'MANAGER'] },
  { href: '/admin/settings', label: 'Cài đặt', short: 'CĐ', roles: ['ADMIN'] },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  BOOKING: 'Nhân viên booking',
  RECEPTION: 'Lễ tân',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ type: string; label: string; sub: string; href: string }>>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('bao-theme') as 'dark' | 'light' | null;
    if (saved) { setTheme(saved); document.documentElement.setAttribute('data-theme', saved); }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K = global search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault(); setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 100);
      }
      // Escape = close search/modal
      if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) { router.replace('/login'); return; }
      const data = await res.json();
      if (!data.success || !data.user) { router.replace('/login'); return; }
      const u = data.user as AuthUser;
      if (u.role === 'BOOKING') { router.replace('/booking-staff'); return; }
      if (u.role === 'RECEPTION') { router.replace('/reception'); return; }
      setUser(u);
      setAuthChecked(true);
    } catch {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Fetch pending count
  useEffect(() => {
    if (!authChecked) return;
    const fetchPending = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/bookings?status=PENDING&date=${today}&limit=1`);
        if (res.ok) { const d = await res.json(); if (d.success) setPendingCount(d.pagination?.total || 0); }
      } catch { /* silent */ }
    };
    fetchPending();
    const iv = setInterval(fetchPending, 30000);
    return () => clearInterval(iv);
  }, [authChecked]);

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    router.replace('/login');
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  if (!authChecked) {
    return (
      <div className="adm-loading">
        <style>{CSS}</style>
        <div className="adm-loading-bar" />
      </div>
    );
  }

  return (
    <div className="adm">
      <style>{CSS}</style>

      {/* Mobile overlay */}
      {mobileOpen && <div className="adm-overlay" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`adm-side ${mobileOpen ? 'adm-side-open' : ''}`}>
        <div className="adm-side-top">
          <Link href="/" className="adm-side-logo">Báo Garden</Link>
          <button className="adm-side-close" onClick={() => setMobileOpen(false)}>✕</button>
        </div>

        <nav className="adm-nav">
          {NAV_ITEMS.filter(item => !user || item.roles.includes(user.role)).map(item => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`adm-nav-item ${active ? 'adm-nav-active' : ''}`}
                id={`nav-${item.href.split('/').pop() || 'dashboard'}`}>
                <span className="adm-nav-dot">{active ? '●' : ''}</span>
                <span>{item.label}</span>
                {item.href === '/admin/bookings' && pendingCount > 0 && (
                  <span className="adm-nav-badge">{pendingCount > 99 ? '99+' : pendingCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="adm-side-foot">
          <button className="adm-theme-toggle" onClick={() => {
            const next = theme === 'dark' ? 'light' : 'dark';
            setTheme(next);
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('bao-theme', next);
          }} id="theme-toggle">
            {theme === 'dark' ? '☀ Giao diện sáng' : '🌙 Giao diện tối'}
          </button>
          {user && (
            <>
              <div className="adm-user">
                <span className="adm-user-name">{user.name}</span>
                <span className="adm-user-role">{ROLE_LABELS[user.role] || user.role}</span>
              </div>
              <button onClick={handleLogout} className="adm-logout" id="logout-btn">Đăng xuất</button>
            </>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="adm-main">
        <header className="adm-topbar">
          <div className="adm-topbar-l">
            <button className="adm-hamburger" onClick={() => setMobileOpen(true)} id="mobile-menu">☰</button>
            <span className="adm-page-title">
              {pathname === '/admin' ? 'Tổng quan' : NAV_ITEMS.find(n => isActive(n.href))?.label || ''}
            </span>
          </div>
          <div className="adm-topbar-r">
            <button className="adm-search-btn" onClick={() => { setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 100); }} title="Tìm kiếm (Ctrl+K)">
              Tìm kiếm
              <span className="adm-search-hint">Ctrl+K</span>
            </button>
            <span className="adm-topbar-brand">Báo Garden</span>
            {user && (
              <div className="adm-topbar-user">
                <div className="adm-topbar-avatar">{user.name.charAt(0).toUpperCase()}</div>
                <div className="adm-topbar-uinfo">
                  <span className="adm-topbar-uname">{user.name}</span>
                  <span className="adm-topbar-urole">{ROLE_LABELS[user.role] || user.role}</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Global search modal */}
        {showSearch && (
          <div className="adm-search-overlay" onClick={e => e.target === e.currentTarget && (setShowSearch(false), setSearchQuery(''), setSearchResults([]))}>
            <div className="adm-search-modal">
              <input ref={searchRef} type="text" placeholder="Tìm booking, khách hàng, bàn..." value={searchQuery} onChange={async e => {
                const q = e.target.value; setSearchQuery(q);
                if (q.length < 2) { setSearchResults([]); return; }
                const results: Array<{ type: string; label: string; sub: string; href: string }> = [];
                try {
                  const [bRes, cRes] = await Promise.all([
                    fetch(`/api/bookings?search=${encodeURIComponent(q)}&limit=5`),
                    fetch(`/api/customers?search=${encodeURIComponent(q)}&limit=5`),
                  ]);
                  if (bRes.ok) { const d = await bRes.json(); (d.data || []).forEach((b: { id: string; bookingCode: string; customer?: { name: string } }) => results.push({ type: 'Booking', label: b.bookingCode, sub: b.customer?.name || '', href: `/admin/bookings` })); }
                  if (cRes.ok) { const d = await cRes.json(); (d.data || []).forEach((c: { id: string; name: string; phone: string }) => results.push({ type: 'Khách', label: c.name, sub: c.phone, href: `/admin/customers` })); }
                } catch { /* silent */ }
                // Add nav items matching
                NAV_ITEMS.filter(n => n.label.toLowerCase().includes(q.toLowerCase())).forEach(n => results.push({ type: 'Trang', label: n.label, sub: '', href: n.href }));
                setSearchResults(results);
              }} className="adm-search-input" />
              {searchResults.length > 0 && (
                <div className="adm-search-results">
                  {searchResults.map((r, i) => (
                    <Link key={i} href={r.href} className="adm-search-item" onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}>
                      <span className="adm-search-type">{r.type}</span>
                      <span className="adm-search-label">{r.label}</span>
                      {r.sub && <span className="adm-search-sub">{r.sub}</span>}
                    </Link>
                  ))}
                </div>
              )}
              {searchQuery.length >= 2 && searchResults.length === 0 && <div className="adm-search-empty">Không tìm thấy kết quả</div>}
            </div>
          </div>
        )}

        <main className="adm-content">{children}</main>
      </div>
    </div>
  );
}

const CSS = `
/* ══ Admin Layout ══ */
.adm{display:flex;min-height:100vh;background:var(--bg-primary);font-family:'Inter',-apple-system,sans-serif}

/* loading */
.adm-loading{display:flex;align-items:center;justify-content:center;min-height:100vh;background:var(--bg-primary)}
.adm-loading-bar{width:48px;height:2px;background:var(--border-subtle);border-radius:1px;position:relative;overflow:hidden}
.adm-loading-bar::after{content:'';position:absolute;top:0;left:-48px;width:48px;height:100%;background:var(--gold-400);animation:adm-slide 1s ease-in-out infinite}
@keyframes adm-slide{0%{left:-48px}100%{left:48px}}

/* overlay */
.adm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:299;animation:adm-fade 0.2s}
@keyframes adm-fade{from{opacity:0}to{opacity:1}}

/* sidebar */
.adm-side{
  width:220px;position:fixed;top:0;left:0;bottom:0;z-index:300;
  background:var(--bg-secondary);border-right:1px solid var(--border-subtle);
  display:flex;flex-direction:column;
  transition:transform 0.25s cubic-bezier(0.4,0,0.2,1);
}
.adm-side-top{
  padding:20px 20px 16px;display:flex;align-items:center;justify-content:space-between;
  border-bottom:1px solid var(--border-subtle);
}
.adm-side-logo{
  font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;
  color:var(--gold-400);text-decoration:none;letter-spacing:0.02em;
}
.adm-side-close{display:none;background:none;border:none;color:var(--text-tertiary);font-size:1rem;cursor:pointer;width:32px;height:32px}

/* nav */
.adm-nav{flex:1;padding:12px 0;overflow-y:auto}
.adm-nav-item{
  display:flex;align-items:center;gap:8px;padding:10px 20px;
  font-size:0.88rem;color:var(--text-tertiary);text-decoration:none;
  font-weight:400;transition:all 0.15s;position:relative;
}
.adm-nav-item:hover{color:var(--text-primary);background:rgba(255,255,255,0.02)}
.adm-nav-active{color:var(--text-primary);font-weight:600;background:rgba(212,168,74,0.04)}
.adm-nav-active::before{
  content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--gold-400);
}
.adm-nav-dot{width:8px;font-size:5px;color:var(--gold-400)}
.adm-nav-badge{margin-left:auto;background:rgba(239,68,68,0.15);color:#f87171;font-size:0.65rem;font-weight:700;padding:2px 6px;border-radius:10px;min-width:18px;text-align:center}

/* sidebar footer */
.adm-side-foot{padding:16px 20px;border-top:1px solid var(--border-subtle)}
.adm-theme-toggle{width:100%;padding:8px 12px;border-radius:8px;font-size:0.78rem;font-weight:500;background:var(--bg-tertiary);border:1px solid var(--border-subtle);color:var(--text-secondary);cursor:pointer;margin-bottom:12px;transition:all 0.15s;font-family:inherit;text-align:left}
.adm-theme-toggle:hover{border-color:var(--gold-400);color:var(--text-primary)}
.adm-user{display:flex;flex-direction:column;gap:2px;margin-bottom:10px}
.adm-user-name{font-size:0.85rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.adm-user-role{font-size:0.7rem;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em;font-weight:500}
.adm-logout{
  background:none;border:none;font-size:0.78rem;color:var(--text-tertiary);
  cursor:pointer;padding:4px 0;transition:color 0.15s;font-family:inherit;
}
.adm-logout:hover{color:#ef4444}

/* main area */
.adm-main{flex:1;margin-left:220px;display:flex;flex-direction:column;min-height:100vh;transition:margin-left 0.25s}

/* topbar */
.adm-topbar{
  height:52px;padding:0 24px;display:flex;align-items:center;justify-content:space-between;
  border-bottom:1px solid var(--border-subtle);background:var(--bg-primary);
  position:sticky;top:0;z-index:100;
}
.adm-topbar-l{display:flex;align-items:center;gap:12px}
.adm-hamburger{display:none;background:none;border:none;color:var(--text-secondary);font-size:1.2rem;cursor:pointer;width:36px;height:36px;border-radius:8px}
.adm-hamburger:active{background:rgba(255,255,255,0.04)}
.adm-page-title{font-size:0.82rem;color:var(--text-tertiary);font-weight:500;letter-spacing:0.03em;text-transform:uppercase}

/* search button */
.adm-search-btn{display:flex;align-items:center;gap:8px;padding:6px 14px;border-radius:8px;font-size:0.78rem;font-weight:500;background:var(--bg-tertiary);border:1px solid var(--border-subtle);color:var(--text-tertiary);cursor:pointer;font-family:inherit;transition:all 0.15s}
.adm-search-btn:hover{border-color:var(--gold-400);color:var(--text-secondary)}
.adm-search-hint{font-size:0.65rem;padding:2px 5px;border-radius:4px;background:rgba(255,255,255,0.04);border:1px solid var(--border-subtle);color:var(--text-tertiary);font-weight:600}

/* search modal */
.adm-search-overlay{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.6);display:flex;align-items:flex-start;justify-content:center;padding-top:min(20vh,120px);animation:adm-fade 0.15s}
.adm-search-modal{width:100%;max-width:520px;background:var(--bg-secondary);border:1px solid var(--border-subtle);border-radius:16px;overflow:hidden;animation:adm-search-in 0.2s cubic-bezier(0.16,1,0.3,1);margin:0 16px}
@keyframes adm-search-in{from{opacity:0;transform:scale(0.96) translateY(-8px)}to{opacity:1;transform:scale(1) translateY(0)}}
.adm-search-input{width:100%;padding:14px 18px;font-size:0.95rem;font-family:inherit;background:transparent;border:none;color:var(--text-primary);outline:none;border-bottom:1px solid var(--border-subtle)}
.adm-search-input::placeholder{color:var(--text-tertiary)}
.adm-search-results{max-height:300px;overflow-y:auto;padding:6px}
.adm-search-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;text-decoration:none;color:var(--text-primary);transition:background 0.1s}
.adm-search-item:hover{background:rgba(255,255,255,0.04)}
.adm-search-type{font-size:0.65rem;font-weight:700;text-transform:uppercase;color:var(--gold-400);padding:2px 6px;border-radius:4px;background:rgba(212,168,74,0.1);flex-shrink:0;letter-spacing:0.04em}
.adm-search-label{font-size:0.85rem;font-weight:600}
.adm-search-sub{font-size:0.78rem;color:var(--text-tertiary);margin-left:auto}
.adm-search-empty{padding:20px;text-align:center;font-size:0.85rem;color:var(--text-tertiary)}
.adm-topbar-r{display:flex;align-items:center;gap:12px}
.adm-topbar-brand{font-family:'Playfair Display',serif;font-size:0.8rem;color:var(--gold-400);font-weight:600;opacity:0.5;display:none}
.adm-topbar-user{display:flex;align-items:center;gap:8px}
.adm-topbar-avatar{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,rgba(212,168,74,0.2),rgba(212,168,74,0.08));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.72rem;color:var(--gold-400);flex-shrink:0}
.adm-topbar-uinfo{display:flex;flex-direction:column;gap:1px}
.adm-topbar-uname{font-size:0.78rem;font-weight:600;color:var(--text-primary);white-space:nowrap}
.adm-topbar-urole{font-size:0.62rem;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em;font-weight:500}

/* content */
.adm-content{flex:1;padding:24px}

/* ══ Responsive ══ */
@media(max-width:1024px){
  .adm-side{transform:translateX(-100%);width:260px}
  .adm-side-open{transform:translateX(0)}
  .adm-side-close{display:flex;align-items:center;justify-content:center}
  .adm-main{margin-left:0}
  .adm-hamburger{display:flex;align-items:center;justify-content:center}
  .adm-topbar-brand{display:block}
  .adm-content{padding:20px}
}

@media(max-width:640px){
  .adm-topbar{height:48px;padding:0 16px}
  .adm-content{padding:16px}
  .adm-side{width:280px}
  .adm-topbar-uinfo{display:none}
  .adm-search-hint{display:none}
  .adm-search-modal{margin:0 8px;border-radius:12px}
}
`;
