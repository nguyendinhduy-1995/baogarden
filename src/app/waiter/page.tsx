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
const STATUS_COLORS: Record<string, string> = { AVAILABLE: '#4ade80', OCCUPIED: '#ef4444', RESERVED: '#f59e0b', CLEANING: '#6b7280' };
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
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
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
    <div style={{ minHeight: '100dvh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{CSS}</style>
      <div className="wt-loader" />
    </div>
  );

  return (
    <div className="wt-root">
      <style>{CSS}</style>

      {/* Toast */}
      {toast && <div className={`wt-toast wt-toast-${toast.type}`}>{toast.msg}</div>}

      {/* Header */}
      <header className="wt-header">
        <div className="wt-header-l">
          <span className="wt-brand">Báo Garden</span>
          <span className="wt-role">{user?.name}</span>
        </div>
        <div className="wt-header-r">
          <button className="wt-logout" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </header>

      {/* Tabs */}
      <div className="wt-tabs">
        <button className={`wt-tab ${tab === 'tables' ? 'wt-tab-active' : ''}`} onClick={() => { setTab('tables'); setSelectedTable(null); setSession(null); }}>
          Sơ đồ bàn
        </button>
        <button className={`wt-tab ${tab === 'orders' ? 'wt-tab-active' : ''}`} onClick={() => setTab('orders')}>
          Đơn hoạt động
        </button>
        <button className={`wt-tab ${tab === 'requests' ? 'wt-tab-active' : ''}`} onClick={() => setTab('requests')}>
          Yêu cầu
          {serviceReqs.length > 0 && <span className="wt-badge">{serviceReqs.length}</span>}
        </button>
      </div>

      {/* Content */}
      <div className="wt-body">
        {/* ── TAB: Tables ── */}
        {tab === 'tables' && !selectedTable && (
          <div className="wt-tables-view">
            {areas.map(area => (
              <div key={area.id} className="wt-area">
                <h3 className="wt-area-title">{area.name}</h3>
                <div className="wt-grid">
                  {tables.filter(t => t.area.id === area.id).map(t => {
                    const color = t.sessionStatus === 'PAYMENT_REQUESTED' ? '#a855f7' : STATUS_COLORS[t.status] || '#6b7280';
                    return (
                      <button key={t.id} className="wt-table-btn" onClick={() => openTable(t)}
                        style={{ borderColor: color }}>
                        <span className="wt-table-dot" style={{ background: color }} />
                        <span className="wt-table-code">{t.code}</span>
                        <span className="wt-table-name">{t.name}</span>
                        {t.sessionStatus === 'PAYMENT_REQUESTED' && <span className="wt-table-tag">Chờ TT</span>}
                        {t.activeOrderCount > 0 && t.sessionStatus !== 'PAYMENT_REQUESTED' && (
                          <span className="wt-table-orders">{t.activeOrderCount} đơn</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Selected Table ── */}
        {tab === 'tables' && selectedTable && (
          <div className="wt-order-view">
            <div className="wt-order-header">
              <button className="wt-back" onClick={() => { setSelectedTable(null); setSession(null); setShowMenu(false); setCart([]); }}>
                ← Quay lại
              </button>
              <div className="wt-order-table-info">
                <span className="wt-order-table-code">{selectedTable.code}</span>
                <span className="wt-order-table-name">{selectedTable.name}</span>
              </div>
            </div>

            {sessionLoading ? (
              <div className="wt-loading-msg">Đang tải...</div>
            ) : session ? (
              <>
                {/* Action buttons */}
                <div className="wt-actions-row">
                  <button className="wt-action-btn wt-action-add" onClick={() => setShowMenu(!showMenu)}>
                    {showMenu ? '✕ Đóng menu' : '+ Thêm món'}
                  </button>
                  {session.status === 'OPEN' && session.orders.length > 0 && (
                    <button className="wt-action-btn wt-action-pay" onClick={requestPayment}>
                      Yêu cầu thanh toán
                    </button>
                  )}
                </div>

                {/* Menu overlay */}
                {showMenu && (
                  <div className="wt-menu-panel">
                    <input className="wt-menu-search" type="text" placeholder="Tìm món..." value={menuSearch}
                      onChange={e => setMenuSearch(e.target.value)} />
                    <div className="wt-menu-cats">
                      <button className={`wt-cat-btn ${menuCat === 'all' ? 'wt-cat-active' : ''}`} onClick={() => setMenuCat('all')}>Tất cả</button>
                      {categories.map(c => (
                        <button key={c.id} className={`wt-cat-btn ${menuCat === c.id ? 'wt-cat-active' : ''}`}
                          onClick={() => setMenuCat(c.id)}>{c.name}</button>
                      ))}
                    </div>
                    <div className="wt-menu-list">
                      {filteredMenu.map(item => {
                        const inCart = cart.find(c => c.menuItemId === item.id);
                        return (
                          <div key={item.id} className="wt-menu-item">
                            <div className="wt-menu-item-info">
                              <span className="wt-menu-item-name">{item.name}</span>
                              <span className="wt-menu-item-price">{fmtMoney(Number(item.price))}</span>
                            </div>
                            {inCart ? (
                              <div className="wt-qty-ctrl">
                                <button className="wt-qty-btn" onClick={() => updateCartQty(item.id, -1)}>−</button>
                                <span className="wt-qty-val">{inCart.quantity}</span>
                                <button className="wt-qty-btn" onClick={() => updateCartQty(item.id, 1)}>+</button>
                              </div>
                            ) : (
                              <button className="wt-add-item-btn" onClick={() => addToCart(item)}>+</button>
                            )}
                          </div>
                        );
                      })}
                      {filteredMenu.length === 0 && <div className="wt-empty-msg">Không tìm thấy món</div>}
                    </div>
                  </div>
                )}

                {/* Cart */}
                {cart.length > 0 && (
                  <div className="wt-cart">
                    <h4 className="wt-cart-title">Giỏ hàng ({cart.length} món)</h4>
                    {cart.map(c => (
                      <div key={c.menuItemId} className="wt-cart-item">
                        <div className="wt-cart-item-top">
                          <span className="wt-cart-item-name">{c.name}</span>
                          <span className="wt-cart-item-total">{fmtMoney(c.price * c.quantity)}</span>
                        </div>
                        <div className="wt-cart-item-mid">
                          <div className="wt-qty-ctrl">
                            <button className="wt-qty-btn" onClick={() => updateCartQty(c.menuItemId, -1)}>−</button>
                            <span className="wt-qty-val">{c.quantity}</span>
                            <button className="wt-qty-btn" onClick={() => updateCartQty(c.menuItemId, 1)}>+</button>
                          </div>
                          <button className="wt-cart-remove" onClick={() => removeFromCart(c.menuItemId)}>Xóa</button>
                        </div>
                        <div className="wt-note-chips">
                          {NOTE_CHIPS.map(chip => (
                            <button key={chip} className={`wt-chip ${c.note?.includes(chip) ? 'wt-chip-active' : ''}`}
                              onClick={() => toggleNote(c.menuItemId, chip)}>{chip}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="wt-cart-footer">
                      <span className="wt-cart-total">Tổng: {fmtMoney(cartTotal)}</span>
                      <button className="wt-submit-btn" onClick={submitOrder} disabled={submitting}>
                        {submitting ? 'Đang gửi...' : 'Gửi đơn'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Current orders */}
                <div className="wt-session-orders">
                  <h4 className="wt-section-title">
                    Đơn hàng hiện tại
                    <span className="wt-section-sub"> — Tổng: {fmtMoney(sessionTotal)}</span>
                  </h4>
                  {session.orders.length === 0 ? (
                    <div className="wt-empty-msg">Chưa có đơn hàng</div>
                  ) : (
                    session.orders.map(order => (
                      <div key={order.id} className="wt-order-card">
                        <div className="wt-order-card-head">
                          <span className="wt-order-code">{order.orderCode}</span>
                          <span className="wt-order-time">{fmtTime(order.createdAt)}</span>
                        </div>
                        {order.items.map(item => {
                          const st = ITEM_STATUS_LABELS[item.status];
                          return (
                            <div key={item.id} className="wt-order-item">
                              <div className="wt-order-item-l">
                                <span className="wt-order-item-name">
                                  {item.quantity}x {item.itemNameSnapshot}
                                </span>
                                {item.note && <span className="wt-order-item-note">{item.note}</span>}
                              </div>
                              <div className="wt-order-item-r">
                                <span className="wt-order-item-status" style={{ color: st?.color }}>
                                  {st?.label || item.status}
                                </span>
                                {item.status === 'READY' && (
                                  <button className="wt-serve-btn" onClick={() => markServed(item.id)}>Phục vụ</button>
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
        )}

        {/* ── TAB: Active orders ── */}
        {tab === 'orders' && (
          <div className="wt-active-orders">
            {tables.filter(t => t.activeOrderCount > 0 || t.sessionStatus).map(t => (
              <button key={t.id} className="wt-active-order-card" onClick={() => { setTab('tables'); openTable(t); }}>
                <div className="wt-active-order-l">
                  <span className="wt-active-code">{t.code}</span>
                  <span className="wt-active-name">{t.name}</span>
                </div>
                <div className="wt-active-order-r">
                  <span className="wt-active-count">{t.activeOrderCount} đơn</span>
                  {t.sessionStatus === 'PAYMENT_REQUESTED' && <span className="wt-active-pay">Chờ TT</span>}
                </div>
              </button>
            ))}
            {tables.filter(t => t.activeOrderCount > 0 || t.sessionStatus).length === 0 && (
              <div className="wt-empty-msg">Không có đơn hoạt động</div>
            )}
          </div>
        )}

        {/* ── TAB: Service requests ── */}
        {tab === 'requests' && (
          <div className="wt-requests">
            {serviceReqs.length === 0 ? (
              <div className="wt-empty-msg">Không có yêu cầu</div>
            ) : (
              serviceReqs.map(r => (
                <div key={r.id} className="wt-req-card">
                  <div className="wt-req-top">
                    <span className="wt-req-table">{r.table.code}</span>
                    <span className="wt-req-type">{SERVICE_TYPE_LABELS[r.type] || r.type}</span>
                    <span className="wt-req-time">{fmtTime(r.createdAt)}</span>
                  </div>
                  {r.note && <p className="wt-req-note">{r.note}</p>}
                  <button className="wt-req-done" onClick={() => resolveServiceReq(r.id)}>Đã xử lý</button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
/* ═══ Waiter ═══ */
.wt-root{min-height:100dvh;background:#0a0a0f;color:#f5f5f7;font-family:'Inter',-apple-system,sans-serif;display:flex;flex-direction:column}
.wt-loader{width:48px;height:2px;background:rgba(255,255,255,0.06);border-radius:1px;overflow:hidden;position:relative}
.wt-loader::after{content:'';position:absolute;top:0;left:-48px;width:48px;height:100%;background:#D4A84A;animation:wt-slide 1s ease-in-out infinite}
@keyframes wt-slide{0%{left:-48px}100%{left:48px}}

/* Toast */
.wt-toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2000;padding:12px 24px;border-radius:12px;font-size:0.85rem;font-weight:600;animation:wt-toastin 0.3s ease;box-shadow:0 8px 30px rgba(0,0,0,0.5);max-width:90vw;text-align:center}
.wt-toast-success{background:#14532d;color:#4ade80;border:1px solid rgba(74,222,128,0.2)}
.wt-toast-error{background:#450a0a;color:#f87171;border:1px solid rgba(239,68,68,0.2)}
@keyframes wt-toastin{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* Header */
.wt-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);background:#111118;position:sticky;top:0;z-index:100}
.wt-header-l{display:flex;align-items:center;gap:12px}
.wt-brand{font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:#D4A84A}
.wt-role{font-size:0.75rem;color:#71717a;font-weight:500}
.wt-header-r{display:flex;gap:8px}
.wt-logout{padding:8px 14px;border-radius:8px;font-size:0.78rem;font-weight:600;background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.15);cursor:pointer;font-family:inherit;min-height:44px}
.wt-logout:hover{background:rgba(239,68,68,0.2)}

/* Tabs */
.wt-tabs{display:flex;gap:2px;padding:8px 16px;background:#111118;border-bottom:1px solid rgba(255,255,255,0.06);overflow-x:auto}
.wt-tab{padding:10px 18px;border-radius:8px;font-size:0.82rem;font-weight:500;color:#71717a;background:transparent;cursor:pointer;font-family:inherit;white-space:nowrap;min-height:44px;display:flex;align-items:center;gap:6px;border:none}
.wt-tab:hover{color:#a1a1aa}
.wt-tab-active{background:rgba(212,168,74,0.08);color:#fbbf24;font-weight:600}
.wt-badge{background:#ef4444;color:#fff;font-size:0.65rem;font-weight:700;padding:2px 6px;border-radius:10px;min-width:18px;text-align:center}

/* Body */
.wt-body{flex:1;padding:16px;overflow-y:auto}

/* Tables grid */
.wt-area{margin-bottom:20px}
.wt-area-title{font-size:0.78rem;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px}
.wt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px}
.wt-table-btn{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 8px;border-radius:12px;background:#14141e;border:1.5px solid rgba(255,255,255,0.06);cursor:pointer;transition:all 0.15s;font-family:inherit;min-height:80px;justify-content:center;position:relative}
.wt-table-btn:hover{background:#1c1c2a;transform:translateY(-1px)}
.wt-table-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.wt-table-code{font-size:0.95rem;font-weight:700;color:#f5f5f7}
.wt-table-name{font-size:0.68rem;color:#71717a;text-align:center;line-height:1.2}
.wt-table-tag{position:absolute;top:6px;right:6px;font-size:0.6rem;font-weight:700;color:#a855f7;background:rgba(168,85,247,0.12);padding:2px 5px;border-radius:4px}
.wt-table-orders{font-size:0.65rem;color:#3b82f6}

/* Order view */
.wt-order-view{animation:wt-fadein 0.2s}
@keyframes wt-fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.wt-order-header{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.wt-back{padding:8px 14px;border-radius:8px;font-size:0.82rem;font-weight:600;color:#a1a1aa;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);cursor:pointer;font-family:inherit;white-space:nowrap;min-height:44px}
.wt-back:hover{color:#f5f5f7}
.wt-order-table-info{display:flex;flex-direction:column;gap:2px}
.wt-order-table-code{font-size:1.1rem;font-weight:800;color:#D4A84A}
.wt-order-table-name{font-size:0.78rem;color:#71717a}
.wt-loading-msg{text-align:center;padding:24px;color:#71717a;font-size:0.85rem}

/* Actions row */
.wt-actions-row{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.wt-action-btn{padding:10px 18px;border-radius:10px;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit;border:none;min-height:44px}
.wt-action-add{background:linear-gradient(135deg,#fbbf24,#d97706);color:#0a0a0f}
.wt-action-add:hover{opacity:0.9}
.wt-action-pay{background:rgba(168,85,247,0.12);color:#a855f7;border:1px solid rgba(168,85,247,0.2)}
.wt-action-pay:hover{background:rgba(168,85,247,0.2)}

/* Menu panel */
.wt-menu-panel{background:#14141e;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:14px;margin-bottom:16px;animation:wt-fadein 0.2s}
.wt-menu-search{width:100%;padding:10px 14px;border-radius:10px;background:#1a1a24;border:1px solid rgba(255,255,255,0.08);color:#f5f5f7;font-size:0.85rem;font-family:inherit;outline:none;margin-bottom:10px}
.wt-menu-search:focus{border-color:rgba(212,168,74,0.4)}
.wt-menu-search::placeholder{color:#71717a}
.wt-menu-cats{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:10px}
.wt-cat-btn{padding:6px 14px;border-radius:20px;font-size:0.75rem;font-weight:600;background:#1a1a24;border:1px solid rgba(255,255,255,0.06);color:#a1a1aa;cursor:pointer;white-space:nowrap;font-family:inherit;min-height:36px}
.wt-cat-btn:hover{border-color:rgba(212,168,74,0.3);color:#f5f5f7}
.wt-cat-active{background:rgba(212,168,74,0.1);border-color:rgba(212,168,74,0.3);color:#fbbf24}
.wt-menu-list{max-height:300px;overflow-y:auto}
.wt-menu-item{display:flex;align-items:center;justify-content:space-between;padding:10px 8px;border-bottom:1px solid rgba(255,255,255,0.04)}
.wt-menu-item:last-child{border-bottom:none}
.wt-menu-item-info{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;margin-right:10px}
.wt-menu-item-name{font-size:0.85rem;font-weight:600;color:#f5f5f7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wt-menu-item-price{font-size:0.75rem;color:#D4A84A;font-weight:600}
.wt-add-item-btn{width:36px;height:36px;border-radius:8px;background:rgba(74,222,128,0.1);color:#4ade80;font-size:1.2rem;font-weight:700;cursor:pointer;border:1px solid rgba(74,222,128,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:inherit;min-width:44px;min-height:44px}
.wt-add-item-btn:hover{background:rgba(74,222,128,0.2)}

/* Qty control */
.wt-qty-ctrl{display:flex;align-items:center;gap:2px;background:#1a1a24;border-radius:8px;border:1px solid rgba(255,255,255,0.06)}
.wt-qty-btn{width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:#a1a1aa;cursor:pointer;border:none;background:transparent;font-family:inherit;min-width:44px;min-height:44px}
.wt-qty-btn:hover{color:#f5f5f7}
.wt-qty-val{font-size:0.85rem;font-weight:700;color:#f5f5f7;min-width:24px;text-align:center}

/* Cart */
.wt-cart{background:#14141e;border:1px solid rgba(212,168,74,0.15);border-radius:14px;padding:14px;margin-bottom:16px}
.wt-cart-title{font-size:0.85rem;font-weight:700;color:#D4A84A;margin-bottom:12px}
.wt-cart-item{padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
.wt-cart-item:last-child{border-bottom:none}
.wt-cart-item-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.wt-cart-item-name{font-size:0.85rem;font-weight:600;color:#f5f5f7}
.wt-cart-item-total{font-size:0.82rem;font-weight:700;color:#D4A84A}
.wt-cart-item-mid{display:flex;align-items:center;gap:10px;margin-bottom:6px}
.wt-cart-remove{font-size:0.72rem;color:#ef4444;cursor:pointer;background:none;border:none;font-family:inherit;padding:4px;min-height:32px;min-width:32px}

/* Note chips */
.wt-note-chips{display:flex;flex-wrap:wrap;gap:4px}
.wt-chip{padding:4px 10px;border-radius:16px;font-size:0.7rem;font-weight:500;background:#1a1a24;border:1px solid rgba(255,255,255,0.06);color:#a1a1aa;cursor:pointer;font-family:inherit;min-height:28px}
.wt-chip:hover{border-color:rgba(212,168,74,0.2);color:#f5f5f7}
.wt-chip-active{background:rgba(212,168,74,0.1);border-color:rgba(212,168,74,0.3);color:#fbbf24}

/* Cart footer */
.wt-cart-footer{display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06)}
.wt-cart-total{font-size:0.95rem;font-weight:800;color:#f5f5f7}
.wt-submit-btn{padding:10px 24px;border-radius:10px;font-size:0.85rem;font-weight:700;background:linear-gradient(135deg,#fbbf24,#d97706);color:#0a0a0f;cursor:pointer;border:none;font-family:inherit;min-height:44px}
.wt-submit-btn:disabled{opacity:0.5;cursor:wait}
.wt-submit-btn:hover:not(:disabled){opacity:0.9}

/* Session orders */
.wt-session-orders{margin-top:8px}
.wt-section-title{font-size:0.9rem;font-weight:700;color:#f5f5f7;margin-bottom:12px}
.wt-section-sub{font-weight:600;color:#D4A84A;font-size:0.82rem}
.wt-order-card{background:#14141e;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px;margin-bottom:10px}
.wt-order-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.04)}
.wt-order-code{font-size:0.78rem;font-weight:700;color:#D4A84A}
.wt-order-time{font-size:0.72rem;color:#71717a}
.wt-order-item{display:flex;align-items:flex-start;justify-content:space-between;padding:6px 0;gap:8px}
.wt-order-item-l{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.wt-order-item-name{font-size:0.82rem;font-weight:600;color:#f5f5f7}
.wt-order-item-note{font-size:0.7rem;color:#71717a;font-style:italic}
.wt-order-item-r{display:flex;align-items:center;gap:6px;flex-shrink:0}
.wt-order-item-status{font-size:0.72rem;font-weight:600}
.wt-serve-btn{padding:5px 12px;border-radius:6px;font-size:0.72rem;font-weight:700;background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.15);cursor:pointer;font-family:inherit;min-height:32px}
.wt-serve-btn:hover{background:rgba(74,222,128,0.2)}

/* Active orders tab */
.wt-active-orders{display:flex;flex-direction:column;gap:8px}
.wt-active-order-card{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#14141e;border:1px solid rgba(255,255,255,0.06);border-radius:12px;cursor:pointer;font-family:inherit;color:inherit;border-left:3px solid;text-align:left;min-height:56px}
.wt-active-order-card:hover{background:#1c1c2a}
.wt-active-order-l{display:flex;align-items:center;gap:10px}
.wt-active-code{font-size:0.95rem;font-weight:800;color:#D4A84A}
.wt-active-name{font-size:0.78rem;color:#71717a}
.wt-active-order-r{display:flex;align-items:center;gap:8px}
.wt-active-count{font-size:0.78rem;color:#a1a1aa;font-weight:600}
.wt-active-pay{font-size:0.68rem;font-weight:700;color:#a855f7;background:rgba(168,85,247,0.12);padding:3px 8px;border-radius:6px}

/* Service requests */
.wt-requests{display:flex;flex-direction:column;gap:8px}
.wt-req-card{background:#14141e;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:14px}
.wt-req-top{display:flex;align-items:center;gap:10px;margin-bottom:6px}
.wt-req-table{font-size:0.9rem;font-weight:800;color:#D4A84A}
.wt-req-type{font-size:0.78rem;font-weight:600;color:#f5f5f7;background:rgba(59,130,246,0.1);padding:3px 8px;border-radius:6px}
.wt-req-time{font-size:0.7rem;color:#71717a;margin-left:auto}
.wt-req-note{font-size:0.78rem;color:#a1a1aa;margin-bottom:8px}
.wt-req-done{padding:8px 18px;border-radius:8px;font-size:0.78rem;font-weight:600;background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.15);cursor:pointer;font-family:inherit;min-height:44px;width:100%}
.wt-req-done:hover{background:rgba(74,222,128,0.2)}

/* Empty */
.wt-empty-msg{text-align:center;padding:32px 16px;color:#71717a;font-size:0.85rem}

/* Responsive */
@media(min-width:768px){
  .wt-grid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr))}
  .wt-body{padding:24px}
  .wt-header{padding:12px 24px}
  .wt-tabs{padding:8px 24px}
}
@media(min-width:1024px){
  .wt-body{max-width:900px;margin:0 auto;width:100%}
}
`;
