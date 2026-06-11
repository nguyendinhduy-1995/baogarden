'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

/* ─── Types ─── */
interface AuthUser { id: string; name: string; role: string }
interface TableData { id: string; code: string; name: string; status: string; area: { id: string; name: string }; sessionId: string | null; sessionStatus: string | null; activeOrderCount: number }
interface MenuItem { id: string; name: string; price: number; categoryId: string; department: string; isAvailable: boolean; isFeatured: boolean; category: { id: string; name: string } }
interface OrderItemData { id: string; itemNameSnapshot: string; priceSnapshot: number; quantity: number; totalPrice: number; status: string; note: string | null; menuItem: { id: string; name: string; imageUrl?: string | null } }
interface OrderData { id: string; orderCode: string; status: string; items: OrderItemData[]; createdAt: string }
interface SessionData { id: string; status: string; orders: OrderData[] }
interface ServiceReq { id: string; type: string; note: string | null; status: string; createdAt: string; table: { id: string; code: string; name: string } }
interface CartItem { menuItemId: string; name: string; price: number; quantity: number; note: string; department: string }

const NOTE_CHIPS = ['Ít cay', 'Không hành', 'Thêm đá', 'Không đá', 'Làm trước', 'Mang ra sau'];
const STATUS_COLORS: Record<string, string> = { AVAILABLE: '#22c55e', OCCUPIED: '#ef4444', RESERVED: '#f59e0b', CLEANING: '#6b7280' };
const ITEM_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ', color: '#f59e0b' }, ACCEPTED: { label: 'Đã nhận', color: '#3b82f6' },
  PREPARING: { label: 'Đang làm', color: '#a855f7' }, READY: { label: 'Sẵn sàng', color: '#4ade80' },
  SERVED: { label: 'Đã phục vụ', color: '#6b7280' }, CANCELLED: { label: 'Hủy', color: '#ef4444' },
};
const SERVICE_TYPE_LABELS: Record<string, string> = {
  CALL_WAITER: 'Gọi phục vụ', REQUEST_PAYMENT: 'Yêu cầu thanh toán', ADD_ICE: 'Thêm đá',
  CLEAN_TABLE: 'Dọn bàn', OTHER: 'Khác',
};

function fmtMoney(n: number) { return new Intl.NumberFormat('vi-VN').format(n) + 'đ'; }
function fmtTime(d: string) { return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); }

export default function WaiterPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<'tables' | 'orders' | 'requests'>('tables');
  const [tables, setTables] = useState<TableData[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCat, setMenuCat] = useState('all');
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [serviceReqs, setServiceReqs] = useState<ServiceReq[]>([]);
  const [clock, setClock] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Live clock
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  // Auth check
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) { router.replace('/login'); return; }
        const d = await res.json();
        if (!d.success || !d.user) { router.replace('/login'); return; }
        const u = d.user as AuthUser;
        if (!['WAITER', 'MANAGER', 'ADMIN'].includes(u.role)) { router.replace('/login'); return; }
        setUser(u);
        setAuthChecked(true);
      } catch { router.replace('/login'); }
    })();
  }, [router]);

  // Load tables
  const loadTables = useCallback(async () => {
    try {
      const res = await fetch('/api/waiter/tables');
      if (res.ok) { const d = await res.json(); if (d.success) setTables(d.data); }
    } catch { /* silent */ }
  }, []);

  // Load menu
  const loadMenu = useCallback(async () => {
    try {
      const res = await fetch('/api/menu/items');
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          const items = (d.data as MenuItem[]).filter(i => i.isAvailable);
          setMenuItems(items);
          const cats = Array.from(new Map(items.map(i => [i.category.id, i.category])).values());
          setCategories(cats);
        }
      }
    } catch { /* silent */ }
  }, []);

  // Load service requests
  const loadServiceReqs = useCallback(async () => {
    try {
      const res = await fetch('/api/service-requests?status=PENDING');
      if (res.ok) { const d = await res.json(); if (d.success) setServiceReqs(d.data); }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    setLoading(true);
    Promise.all([loadTables(), loadMenu(), loadServiceReqs()]).finally(() => setLoading(false));
    const iv = setInterval(() => { loadTables(); loadServiceReqs(); }, 5000);
    return () => clearInterval(iv);
  }, [authChecked, loadTables, loadMenu, loadServiceReqs]);

  // Open table
  const openTable = async (table: TableData) => {
    setSelectedTable(table);
    setSessionLoading(true);
    setShowMenu(false);
    setCart([]);
    try {
      const res = await fetch(`/api/waiter/tables/${table.id}/session`);
      if (res.ok) { const d = await res.json(); if (d.success) setSession(d.data.session); }
    } catch { showToast('Lỗi tải phiên bàn', 'error'); }
    setSessionLoading(false);
  };

  // Refresh session
  const refreshSession = async () => {
    if (!selectedTable) return;
    try {
      const res = await fetch(`/api/waiter/tables/${selectedTable.id}/session`);
      if (res.ok) { const d = await res.json(); if (d.success) setSession(d.data.session); }
    } catch { /* silent */ }
  };

  // Cart management
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.id, name: item.name, price: Number(item.price), quantity: 1, note: '', department: item.department }];
    });
  };

  const updateCartQty = (menuItemId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.menuItemId !== menuItemId) return c;
      const qty = c.quantity + delta;
      return qty <= 0 ? c : { ...c, quantity: qty };
    }).filter(c => c.quantity > 0));
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(prev => prev.filter(c => c.menuItemId !== menuItemId));
  };

  const toggleNote = (menuItemId: string, chip: string) => {
    setCart(prev => prev.map(c => {
      if (c.menuItemId !== menuItemId) return c;
      const notes = c.note ? c.note.split(', ').filter(Boolean) : [];
      const idx = notes.indexOf(chip);
      if (idx >= 0) notes.splice(idx, 1); else notes.push(chip);
      return { ...c, note: notes.join(', ') };
    }));
  };

  // Submit order
  const submitOrder = async () => {
    if (!session || cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/waiter/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableSessionId: session.id,
          items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity, note: c.note || undefined })),
        }),
      });
      if (res.ok) {
        showToast('Đã gửi đơn thành công');
        setCart([]);
        setShowMenu(false);
        await refreshSession();
        await loadTables();
      } else {
        const d = await res.json();
        showToast(d.error || 'Lỗi gửi đơn', 'error');
      }
    } catch { showToast('Lỗi kết nối', 'error'); }
    setSubmitting(false);
  };

  // Mark served
  const markServed = async (itemId: string) => {
    try {
      const res = await fetch(`/api/waiter/order-items/${itemId}/served`, { method: 'PATCH' });
      if (res.ok) { showToast('Đã phục vụ'); await refreshSession(); }
    } catch { showToast('Lỗi', 'error'); }
  };

  // Request payment
  const requestPayment = async () => {
    if (!selectedTable) return;
    try {
      const res = await fetch(`/api/waiter/tables/${selectedTable.id}/request-payment`, { method: 'POST' });
      if (res.ok) { showToast('Đã yêu cầu thanh toán'); await refreshSession(); await loadTables(); }
      else showToast('Lỗi', 'error');
    } catch { showToast('Lỗi', 'error'); }
  };

  // Resolve service request
  const resolveServiceReq = async (id: string) => {
    try {
      const res = await fetch('/api/service-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'DONE' }),
      });
      if (res.ok) { showToast('Đã xử lý'); loadServiceReqs(); }
    } catch { showToast('Lỗi', 'error'); }
  };

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    router.replace('/login');
  };

  // Filtered menu
  const filteredMenu = menuItems.filter(i => {
    if (menuCat !== 'all' && i.categoryId !== menuCat) return false;
    if (menuSearch && !i.name.toLowerCase().includes(menuSearch.toLowerCase())) return false;
    return true;
  });

  // Groups tables by area
  const areas = Array.from(new Map(tables.map(t => [t.area.id, t.area])).values());

  // Cart total
  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  // Session total
  const sessionTotal = session?.orders?.reduce((s, o) => s + o.items.reduce((is, i) => is + Number(i.totalPrice), 0), 0) || 0;

  if (!authChecked || loading) return (
    <div className="w-loading-screen">
      <style>{CSS}</style>
      <div className="w-loader" />
    </div>
  );

  return (
    <div className="w-root">
      <style>{CSS}</style>

      {/* Toast */}
      {toast && (
        <div className={`w-toast ${toast.type === 'error' ? 'w-toast--error' : 'w-toast--success'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="w-header">
        <div className="w-header__left">
          <h1 className="w-header__title">PHỤC VỤ</h1>
        </div>
        <div className="w-header__center">
          <span className="w-clock">{clock}</span>
        </div>
        <div className="w-header__right">
          {serviceReqs.length > 0 && (
            <button className="w-header__badge" onClick={() => setTab('requests')}>
              {serviceReqs.length}
            </button>
          )}
          <span className="w-header__user">{user?.name}</span>
          <button className="w-header__logout" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="w-tabbar">
        <div className="w-tabbar__inner">
          {(['tables', 'orders', 'requests'] as const).map(t => (
            <button
              key={t}
              className={`w-tabbar__tab ${tab === t ? 'w-tabbar__tab--active' : ''}`}
              onClick={() => { setTab(t); if (t !== 'tables') { setSelectedTable(null); setSession(null); } }}
            >
              {t === 'tables' ? 'Sơ đồ bàn' : t === 'orders' ? 'Đơn hàng' : 'Yêu cầu'}
              {t === 'requests' && serviceReqs.length > 0 && (
                <span className="w-tabbar__count">{serviceReqs.length}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop layout: main + panel */}
      <div className="w-layout">
        {/* Main content area */}
        <main className={`w-main ${selectedTable ? 'w-main--with-panel' : ''}`}>
          {/* ── TAB: Tables ── */}
          {tab === 'tables' && !selectedTable && (
            <div className="w-tables">
              {areas.map(area => (
                <section key={area.id} className="w-area">
                  <h3 className="w-area__title">{area.name}</h3>
                  <div className="w-grid">
                    {tables.filter(t => t.area.id === area.id).map(t => {
                      const isPR = t.sessionStatus === 'PAYMENT_REQUESTED';
                      const color = isPR ? '#a855f7' : STATUS_COLORS[t.status] || '#6b7280';
                      return (
                        <button key={t.id} className={`w-table ${isPR ? 'w-table--pulse' : ''}`} onClick={() => openTable(t)}
                          style={{ borderLeftColor: color }}>
                          <div className="w-table__top">
                            <span className="w-table__code">{t.code}</span>
                            <span className="w-table__dot" style={{ background: color }} />
                          </div>
                          <span className="w-table__name">{t.name}</span>
                          <div className="w-table__meta">
                            {isPR && <span className="w-table__tag w-table__tag--purple">Chờ TT</span>}
                            {t.activeOrderCount > 0 && !isPR && (
                              <span className="w-table__tag w-table__tag--blue">{t.activeOrderCount} đơn</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* ── Selected Table (mobile: full-screen) ── */}
          {tab === 'tables' && selectedTable && (
            <div className="w-panel-mobile">
              {renderOrderPanel()}
            </div>
          )}

          {/* ── TAB: Active orders ── */}
          {tab === 'orders' && (
            <div className="w-orders-list">
              {tables.filter(t => t.activeOrderCount > 0 || t.sessionStatus).map(t => (
                <button key={t.id} className="w-order-card" onClick={() => { setTab('tables'); openTable(t); }}>
                  <div className="w-order-card__left">
                    <span className="w-order-card__code">{t.code}</span>
                    <span className="w-order-card__name">{t.name}</span>
                  </div>
                  <div className="w-order-card__right">
                    <span className="w-order-card__count">{t.activeOrderCount} đơn</span>
                    {t.sessionStatus === 'PAYMENT_REQUESTED' && (
                      <span className="w-order-card__badge">Chờ TT</span>
                    )}
                  </div>
                </button>
              ))}
              {tables.filter(t => t.activeOrderCount > 0 || t.sessionStatus).length === 0 && (
                <div className="w-empty">Không có đơn hoạt động</div>
              )}
            </div>
          )}

          {/* ── TAB: Service requests ── */}
          {tab === 'requests' && (
            <div className="w-reqs">
              {serviceReqs.length === 0 ? (
                <div className="w-empty">Không có yêu cầu</div>
              ) : (
                serviceReqs.map(r => (
                  <div key={r.id} className="w-req">
                    <div className="w-req__header">
                      <span className="w-req__table">{r.table.code}</span>
                      <span className="w-req__type">{SERVICE_TYPE_LABELS[r.type] || r.type}</span>
                      <span className="w-req__time">{fmtTime(r.createdAt)}</span>
                    </div>
                    {r.note && <p className="w-req__note">{r.note}</p>}
                    <button className="w-req__resolve" onClick={() => resolveServiceReq(r.id)}>Đã xử lý</button>
                  </div>
                ))
              )}
            </div>
          )}
        </main>

        {/* Desktop slide-in panel */}
        {tab === 'tables' && selectedTable && (
          <aside className="w-panel-desktop">
            {renderOrderPanel()}
          </aside>
        )}
      </div>
    </div>
  );

  /* ─── Shared order panel renderer ─── */
  function renderOrderPanel() {
    return (
      <div className="w-panel">
        {/* Panel header */}
        <div className="w-panel__header">
          <button className="w-panel__back" onClick={() => { setSelectedTable(null); setSession(null); setShowMenu(false); setCart([]); }}>
            ← Quay lại
          </button>
          <div className="w-panel__info">
            <span className="w-panel__code">{selectedTable!.code}</span>
            <span className="w-panel__name">{selectedTable!.name}</span>
          </div>
        </div>

        {sessionLoading ? (
          <div className="w-panel__loading">Đang tải...</div>
        ) : session ? (
          <>
            {/* Action buttons */}
            <div className="w-actions">
              <button className="w-actions__add" onClick={() => setShowMenu(!showMenu)}>
                {showMenu ? '✕ Đóng menu' : '+ Thêm món'}
              </button>
              {session.status === 'OPEN' && session.orders.length > 0 && (
                <button className="w-actions__pay" onClick={requestPayment}>
                  Yêu cầu thanh toán
                </button>
              )}
            </div>

            {/* Menu overlay */}
            {showMenu && (
              <div className="w-menu">
                <input className="w-menu__search" type="text" placeholder="Tìm món..."
                  value={menuSearch} onChange={e => setMenuSearch(e.target.value)} />
                <div className="w-menu__cats">
                  <button className={`w-menu__cat ${menuCat === 'all' ? 'w-menu__cat--active' : ''}`}
                    onClick={() => setMenuCat('all')}>Tất cả</button>
                  {categories.map(c => (
                    <button key={c.id} className={`w-menu__cat ${menuCat === c.id ? 'w-menu__cat--active' : ''}`}
                      onClick={() => setMenuCat(c.id)}>{c.name}</button>
                  ))}
                </div>
                <div className="w-menu__list">
                  {filteredMenu.map(item => {
                    const inCart = cart.find(c => c.menuItemId === item.id);
                    return (
                      <div key={item.id} className="w-menu__item">
                        <div className="w-menu__item-info">
                          <span className="w-menu__item-name">{item.name}</span>
                          <span className="w-menu__item-price">{fmtMoney(Number(item.price))}</span>
                        </div>
                        {inCart ? (
                          <div className="w-qty">
                            <button className="w-qty__btn" onClick={() => updateCartQty(item.id, -1)}>−</button>
                            <span className="w-qty__val">{inCart.quantity}</span>
                            <button className="w-qty__btn" onClick={() => updateCartQty(item.id, 1)}>+</button>
                          </div>
                        ) : (
                          <button className="w-menu__add" onClick={() => addToCart(item)}>+</button>
                        )}
                      </div>
                    );
                  })}
                  {filteredMenu.length === 0 && <div className="w-empty w-empty--sm">Không tìm thấy món</div>}
                </div>
              </div>
            )}

            {/* Cart */}
            {cart.length > 0 && (
              <div className="w-cart">
                <h4 className="w-cart__title">Giỏ hàng ({cart.length} món)</h4>
                {cart.map(c => (
                  <div key={c.menuItemId} className="w-cart__item">
                    <div className="w-cart__item-top">
                      <span className="w-cart__item-name">{c.name}</span>
                      <span className="w-cart__item-total">{fmtMoney(c.price * c.quantity)}</span>
                    </div>
                    <div className="w-cart__item-controls">
                      <div className="w-qty">
                        <button className="w-qty__btn" onClick={() => updateCartQty(c.menuItemId, -1)}>−</button>
                        <span className="w-qty__val">{c.quantity}</span>
                        <button className="w-qty__btn" onClick={() => updateCartQty(c.menuItemId, 1)}>+</button>
                      </div>
                      <button className="w-cart__remove" onClick={() => removeFromCart(c.menuItemId)}>Xóa</button>
                    </div>
                    <div className="w-chips">
                      {NOTE_CHIPS.map(chip => (
                        <button key={chip} className={`w-chip ${c.note?.includes(chip) ? 'w-chip--active' : ''}`}
                          onClick={() => toggleNote(c.menuItemId, chip)}>{chip}</button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="w-cart__footer">
                  <span className="w-cart__total">Tổng: {fmtMoney(cartTotal)}</span>
                  <button className="w-cart__submit" onClick={submitOrder} disabled={submitting}>
                    {submitting ? 'Đang gửi...' : 'Gửi đơn'}
                  </button>
                </div>
              </div>
            )}

            {/* Current orders */}
            <div className="w-session">
              <h4 className="w-session__title">
                Đơn hàng hiện tại
                <span className="w-session__total">— Tổng: {fmtMoney(sessionTotal)}</span>
              </h4>
              {session.orders.length === 0 ? (
                <div className="w-empty w-empty--sm">Chưa có đơn hàng</div>
              ) : (
                session.orders.map(order => (
                  <div key={order.id} className="w-session__order">
                    <div className="w-session__order-head">
                      <span className="w-session__order-code">{order.orderCode}</span>
                      <span className="w-session__order-time">{fmtTime(order.createdAt)}</span>
                    </div>
                    {order.items.map(item => {
                      const st = ITEM_STATUS_LABELS[item.status];
                      return (
                        <div key={item.id} className="w-session__item">
                          <div className="w-session__item-left">
                            <span className="w-session__item-name">
                              {item.quantity}x {item.itemNameSnapshot}
                            </span>
                            {item.note && <span className="w-session__item-note">{item.note}</span>}
                          </div>
                          <div className="w-session__item-right">
                            <span className="w-session__item-status" style={{ color: st?.color }}>
                              {st?.label || item.status}
                            </span>
                            {item.status === 'READY' && (
                              <button className="w-serve-btn" onClick={() => markServed(item.id)}>Phục vụ</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}
      </div>
    );
  }
}

const CSS = `
/* ═══════════════════════════════════════
   WAITER PAGE — Premium Dark Luxury
   ═══════════════════════════════════════ */

/* ─── Loading screen ─── */
.w-loading-screen {
  min-height: 100dvh;
  background: #08080d;
  display: flex;
  align-items: center;
  justify-content: center;
}
.w-loader {
  width: 56px;
  height: 2px;
  background: rgba(255,255,255,0.04);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}
.w-loader::after {
  content: '';
  position: absolute;
  top: 0;
  left: -56px;
  width: 56px;
  height: 100%;
  background: linear-gradient(90deg, transparent, #D4A84A, transparent);
  animation: w-slide 1.2s ease-in-out infinite;
}
@keyframes w-slide { 0% { left: -56px } 100% { left: 56px } }

/* ─── Root ─── */
.w-root {
  min-height: 100dvh;
  background: #08080d;
  color: #f5f5f7;
  font-family: 'Inter', -apple-system, sans-serif;
  display: flex;
  flex-direction: column;
}

/* ─── Toast ─── */
.w-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  padding: 12px 28px;
  border-radius: 40px;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  animation: w-toast-in 0.35s cubic-bezier(0.16,1,0.3,1);
  box-shadow: 0 12px 40px rgba(0,0,0,0.6);
  max-width: 90vw;
  text-align: center;
  backdrop-filter: blur(12px);
}
.w-toast--success { background: rgba(20,83,45,0.92); color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
.w-toast--error { background: rgba(69,10,10,0.92); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
@keyframes w-toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-16px) scale(0.95); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

/* ═══ Header ═══ */
.w-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 56px;
  background: rgba(17,17,24,0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255,255,255,0.04);
  position: sticky;
  top: 0;
  z-index: 200;
}
.w-header__left { display: flex; align-items: center; gap: 10px; }
.w-header__title {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: #D4A84A;
}
.w-header__center { display: flex; align-items: center; }
.w-clock {
  font-size: 0.78rem;
  font-weight: 500;
  color: rgba(255,255,255,0.35);
  letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums;
}
.w-header__right { display: flex; align-items: center; gap: 10px; }
.w-header__badge {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #ef4444;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  animation: w-pulse-badge 2s ease-in-out infinite;
  min-width: 26px;
}
@keyframes w-pulse-badge {
  0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
  50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
}
.w-header__user {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.4);
  font-weight: 500;
  display: none;
}
.w-header__logout {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(239,68,68,0.08);
  color: #f87171;
  border: 1px solid rgba(239,68,68,0.12);
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  transition: background 0.15s;
}
.w-header__logout:hover { background: rgba(239,68,68,0.15); }

/* ═══ Tab bar ═══ */
.w-tabbar {
  background: rgba(17,17,24,0.6);
  border-bottom: 1px solid rgba(255,255,255,0.04);
  padding: 8px 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.w-tabbar::-webkit-scrollbar { display: none; }
.w-tabbar__inner { display: flex; gap: 4px; }
.w-tabbar__tab {
  padding: 10px 20px;
  border-radius: 40px;
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(255,255,255,0.35);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.w-tabbar__tab:hover { color: rgba(255,255,255,0.6); }
.w-tabbar__tab--active {
  background: rgba(212,168,74,0.08);
  border-color: rgba(212,168,74,0.15);
  color: #D4A84A;
  font-weight: 600;
}
.w-tabbar__count {
  background: #ef4444;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  line-height: 1.4;
}

/* ═══ Layout ═══ */
.w-layout { display: flex; flex: 1; overflow: hidden; }
.w-main { flex: 1; overflow-y: auto; padding: 16px; }

/* ═══ Table grid ═══ */
.w-tables { animation: w-fadein 0.25s ease; }
@keyframes w-fadein {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.w-area { margin-bottom: 24px; }
.w-area__title {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255,255,255,0.3);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 10px;
}
.w-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
  gap: 8px;
}
.w-table {
  display: flex;
  flex-direction: column;
  padding: 14px 12px;
  border-radius: 12px;
  background: rgba(20,20,30,0.6);
  border: 1px solid rgba(255,255,255,0.04);
  border-left: 3px solid rgba(255,255,255,0.06);
  cursor: pointer;
  transition: all 0.15s;
  min-height: 80px;
  gap: 4px;
}
.w-table:hover {
  background: rgba(28,28,42,0.7);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}
.w-table--pulse { animation: w-table-pulse 2s ease-in-out infinite; }
@keyframes w-table-pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(168,85,247,0.2); }
  50% { box-shadow: 0 0 0 4px rgba(168,85,247,0); }
}
.w-table__top { display: flex; align-items: center; justify-content: space-between; }
.w-table__code { font-size: 1rem; font-weight: 800; color: #f5f5f7; }
.w-table__dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.w-table__name {
  font-size: 0.68rem;
  color: rgba(255,255,255,0.3);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.w-table__meta { display: flex; gap: 4px; margin-top: 2px; }
.w-table__tag {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}
.w-table__tag--purple { color: #a855f7; background: rgba(168,85,247,0.1); }
.w-table__tag--blue { color: #3b82f6; background: rgba(59,130,246,0.08); }

/* ═══ Order panel (shared) ═══ */
.w-panel { padding: 0; }
.w-panel__header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  background: rgba(17,17,24,0.5);
}
.w-panel__back {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255,255,255,0.5);
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  cursor: pointer;
  white-space: nowrap;
  min-height: 44px;
  transition: color 0.15s;
}
.w-panel__back:hover { color: #f5f5f7; }
.w-panel__info { display: flex; flex-direction: column; gap: 1px; }
.w-panel__code { font-size: 1.1rem; font-weight: 800; color: #D4A84A; }
.w-panel__name { font-size: 0.75rem; color: rgba(255,255,255,0.35); }
.w-panel__loading { text-align: center; padding: 32px; color: rgba(255,255,255,0.3); font-size: 0.85rem; }

/* Panel body sections get padding */
.w-actions,
.w-menu,
.w-cart,
.w-session { margin: 0 16px; }

/* ─── Actions row ─── */
.w-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.w-actions__add {
  padding: 10px 20px;
  border-radius: 40px;
  font-size: 0.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, #fbbf24, #d97706);
  color: #08080d;
  border: none;
  cursor: pointer;
  min-height: 48px;
  transition: opacity 0.15s;
}
.w-actions__add:hover { opacity: 0.9; }
.w-actions__pay {
  padding: 10px 20px;
  border-radius: 40px;
  font-size: 0.8rem;
  font-weight: 600;
  background: rgba(168,85,247,0.08);
  color: #a855f7;
  border: 1px solid rgba(168,85,247,0.15);
  cursor: pointer;
  min-height: 48px;
  transition: background 0.15s;
}
.w-actions__pay:hover { background: rgba(168,85,247,0.15); }

/* ─── Menu panel ─── */
.w-menu {
  background: rgba(20,20,30,0.5);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 14px;
  animation: w-fadein 0.2s;
}
.w-menu__search {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(26,26,36,0.8);
  border: 1px solid rgba(255,255,255,0.06);
  color: #f5f5f7;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
  margin-bottom: 10px;
  transition: border-color 0.2s;
}
.w-menu__search:focus { border-color: rgba(212,168,74,0.35); }
.w-menu__search::placeholder { color: rgba(255,255,255,0.25); }
.w-menu__cats {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 10px;
  -webkit-overflow-scrolling: touch;
}
.w-menu__cats::-webkit-scrollbar { display: none; }
.w-menu__cat {
  padding: 7px 14px;
  border-radius: 40px;
  font-size: 0.72rem;
  font-weight: 600;
  background: rgba(26,26,36,0.8);
  border: 1px solid rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  white-space: nowrap;
  min-height: 36px;
  transition: all 0.15s;
}
.w-menu__cat:hover { color: rgba(255,255,255,0.6); border-color: rgba(212,168,74,0.15); }
.w-menu__cat--active {
  background: rgba(212,168,74,0.08);
  border-color: rgba(212,168,74,0.25);
  color: #D4A84A;
}
.w-menu__list { max-height: 300px; overflow-y: auto; }
.w-menu__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 4px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}
.w-menu__item:last-child { border-bottom: none; }
.w-menu__item-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; margin-right: 10px; }
.w-menu__item-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: #f5f5f7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.w-menu__item-price { font-size: 0.72rem; color: #D4A84A; font-weight: 600; }
.w-menu__add {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(34,197,94,0.08);
  color: #22c55e;
  font-size: 1.3rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid rgba(34,197,94,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
}
.w-menu__add:hover { background: rgba(34,197,94,0.15); }

/* ─── Qty control ─── */
.w-qty {
  display: flex;
  align-items: center;
  background: rgba(26,26,36,0.8);
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.04);
}
.w-qty__btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  border: none;
  background: transparent;
  transition: color 0.15s;
}
.w-qty__btn:hover { color: #f5f5f7; }
.w-qty__val {
  font-size: 0.85rem;
  font-weight: 700;
  color: #f5f5f7;
  min-width: 24px;
  text-align: center;
}

/* ─── Cart ─── */
.w-cart {
  background: rgba(20,20,30,0.5);
  border: 1px solid rgba(212,168,74,0.1);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 14px;
}
.w-cart__title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #D4A84A;
  margin-bottom: 12px;
}
.w-cart__item {
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}
.w-cart__item:last-child { border-bottom: none; }
.w-cart__item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.w-cart__item-name { font-size: 0.82rem; font-weight: 600; color: #f5f5f7; }
.w-cart__item-total { font-size: 0.8rem; font-weight: 700; color: #D4A84A; }
.w-cart__item-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.w-cart__remove {
  font-size: 0.72rem;
  color: #ef4444;
  cursor: pointer;
  background: none;
  border: none;
  padding: 6px 8px;
  min-height: 36px;
  min-width: 36px;
  border-radius: 6px;
  transition: background 0.15s;
}
.w-cart__remove:hover { background: rgba(239,68,68,0.08); }

/* ─── Note chips ─── */
.w-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.w-chip {
  padding: 5px 12px;
  border-radius: 40px;
  font-size: 0.68rem;
  font-weight: 500;
  background: rgba(26,26,36,0.8);
  border: 1px solid rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  min-height: 30px;
  transition: all 0.15s;
}
.w-chip:hover { border-color: rgba(212,168,74,0.15); color: rgba(255,255,255,0.6); }
.w-chip--active {
  background: rgba(212,168,74,0.08);
  border-color: rgba(212,168,74,0.25);
  color: #D4A84A;
}

/* ─── Cart footer ─── */
.w-cart__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.04);
}
.w-cart__total { font-size: 0.95rem; font-weight: 800; color: #f5f5f7; }
.w-cart__submit {
  padding: 10px 28px;
  border-radius: 40px;
  font-size: 0.82rem;
  font-weight: 700;
  background: linear-gradient(135deg, #fbbf24, #d97706);
  color: #08080d;
  cursor: pointer;
  border: none;
  min-height: 48px;
  transition: opacity 0.15s;
}
.w-cart__submit:disabled { opacity: 0.4; cursor: wait; }
.w-cart__submit:hover:not(:disabled) { opacity: 0.9; }

/* ─── Session orders ─── */
.w-session { margin-top: 8px; padding-bottom: 24px; }
.w-session__title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #f5f5f7;
  margin-bottom: 12px;
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.w-session__total { font-weight: 600; color: #D4A84A; font-size: 0.8rem; }
.w-session__order {
  background: rgba(20,20,30,0.5);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 8px;
}
.w-session__order-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}
.w-session__order-code { font-size: 0.75rem; font-weight: 700; color: #D4A84A; }
.w-session__order-time { font-size: 0.7rem; color: rgba(255,255,255,0.25); }
.w-session__item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 5px 0;
  gap: 8px;
}
.w-session__item-left { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.w-session__item-name { font-size: 0.8rem; font-weight: 600; color: #f5f5f7; }
.w-session__item-note { font-size: 0.68rem; color: rgba(255,255,255,0.3); font-style: italic; }
.w-session__item-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.w-session__item-status { font-size: 0.7rem; font-weight: 600; }
.w-serve-btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  background: rgba(34,197,94,0.08);
  color: #22c55e;
  border: 1px solid rgba(34,197,94,0.12);
  cursor: pointer;
  min-height: 34px;
  transition: background 0.15s;
}
.w-serve-btn:hover { background: rgba(34,197,94,0.15); }

/* ═══ Active orders tab ═══ */
.w-orders-list { display: flex; flex-direction: column; gap: 8px; animation: w-fadein 0.25s; }
.w-order-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(20,20,30,0.6);
  border: 1px solid rgba(255,255,255,0.04);
  border-left: 3px solid #D4A84A;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  min-height: 56px;
  transition: all 0.15s;
}
.w-order-card:hover { background: rgba(28,28,42,0.7); }
.w-order-card__left { display: flex; align-items: center; gap: 12px; }
.w-order-card__code { font-size: 0.95rem; font-weight: 800; color: #D4A84A; }
.w-order-card__name { font-size: 0.75rem; color: rgba(255,255,255,0.35); }
.w-order-card__right { display: flex; align-items: center; gap: 8px; }
.w-order-card__count { font-size: 0.75rem; color: rgba(255,255,255,0.5); font-weight: 600; }
.w-order-card__badge {
  font-size: 0.65rem;
  font-weight: 700;
  color: #a855f7;
  background: rgba(168,85,247,0.1);
  padding: 3px 10px;
  border-radius: 40px;
}

/* ═══ Service requests tab ═══ */
.w-reqs { display: flex; flex-direction: column; gap: 8px; animation: w-fadein 0.25s; }
.w-req {
  background: rgba(20,20,30,0.6);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 12px;
  padding: 14px 16px;
}
.w-req__header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.w-req__table { font-size: 0.9rem; font-weight: 800; color: #D4A84A; }
.w-req__type {
  font-size: 0.75rem;
  font-weight: 600;
  color: #f5f5f7;
  background: rgba(59,130,246,0.08);
  padding: 3px 10px;
  border-radius: 40px;
}
.w-req__time { font-size: 0.68rem; color: rgba(255,255,255,0.25); margin-left: auto; }
.w-req__note { font-size: 0.78rem; color: rgba(255,255,255,0.5); margin-bottom: 10px; }
.w-req__resolve {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 600;
  background: rgba(34,197,94,0.08);
  color: #22c55e;
  border: 1px solid rgba(34,197,94,0.1);
  cursor: pointer;
  min-height: 48px;
  width: 100%;
  transition: background 0.15s;
}
.w-req__resolve:hover { background: rgba(34,197,94,0.15); }

/* ═══ Empty state ═══ */
.w-empty {
  text-align: center;
  padding: 40px 16px;
  color: rgba(255,255,255,0.25);
  font-size: 0.85rem;
}
.w-empty--sm { padding: 20px 16px; }

/* ═══ Mobile: hide desktop panel, show inline ═══ */
.w-panel-desktop { display: none; }
.w-panel-mobile { display: block; animation: w-fadein 0.25s; }

/* ═══ Responsive ═══ */
@media (min-width: 768px) {
  .w-header { padding: 0 24px; }
  .w-tabbar { padding: 8px 24px; }
  .w-main { padding: 24px; }
  .w-header__user { display: block; }
  .w-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
}

@media (min-width: 1024px) {
  .w-panel-mobile { display: none; }
  .w-panel-desktop {
    display: flex;
    flex-direction: column;
    width: 440px;
    min-width: 440px;
    border-left: 1px solid rgba(255,255,255,0.04);
    background: rgba(14,14,20,0.6);
    overflow-y: auto;
    animation: w-panel-slide 0.3s cubic-bezier(0.16,1,0.3,1);
  }
  @keyframes w-panel-slide {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .w-main--with-panel {
    flex: 1;
    min-width: 0;
  }
  .w-main { max-width: none; }
}

@media (min-width: 1280px) {
  .w-panel-desktop { width: 500px; min-width: 500px; }
}
`;
