'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ==================== TYPES ====================
interface MenuItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  categoryId: string;
  department: string;
  isAvailable: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
}

interface TableInfo {
  id: string;
  code: string;
  name: string;
  area: string;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note: string;
}

type PageView = 'menu' | 'cart' | 'success' | 'error';

// ==================== HELPERS ====================
function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'decimal', maximumFractionDigits: 0 }).format(amount) + 'đ';
}

// ==================== COMPONENT ====================
export default function OrderPage() {
  const [view, setView] = useState<PageView>('menu');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [table, setTable] = useState<TableInfo | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [showCart, setShowCart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [serviceLoading, setServiceLoading] = useState('');
  const [serviceDone, setServiceDone] = useState<Set<string>>(new Set());

  const tableCodeRef = useRef('');
  const tokenRef = useRef('');
  const categoryTabsRef = useRef<HTMLDivElement>(null);

  // Load menu data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tc = params.get('table') || '';
    const tk = params.get('token') || '';
    tableCodeRef.current = tc;
    tokenRef.current = tk;

    if (!tc || !tk) {
      setError('Link không hợp lệ. Vui lòng quét lại mã QR trên bàn.');
      setLoading(false);
      return;
    }

    fetch(`/api/public/menu?tableCode=${encodeURIComponent(tc)}&token=${encodeURIComponent(tk)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) {
          setError(data.error || 'Không thể tải menu');
          return;
        }
        setTable(data.data.table);
        const cats = data.data.categories.filter((c: MenuCategory) => c.items.length > 0);
        setCategories(cats);
        if (cats.length > 0) setActiveCategory(cats[0].id);
      })
      .catch(() => setError('Không thể kết nối server'))
      .finally(() => setLoading(false));
  }, []);

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      if (existing) {
        next.set(item.id, { ...existing, quantity: existing.quantity + 1 });
      } else {
        next.set(item.id, { menuItem: item, quantity: 1, note: '' });
      }
      return next;
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (existing && existing.quantity > 1) {
        next.set(itemId, { ...existing, quantity: existing.quantity - 1 });
      } else {
        next.delete(itemId);
      }
      return next;
    });
  }, []);

  const updateNote = useCallback((itemId: string, note: string) => {
    setCart(prev => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (existing) {
        next.set(itemId, { ...existing, note });
      }
      return next;
    });
  }, []);

  const totalItems = Array.from(cart.values()).reduce((s, c) => s + c.quantity, 0);
  const totalPrice = Array.from(cart.values()).reduce((s, c) => s + Number(c.menuItem.price) * c.quantity, 0);

  const handleSubmitOrder = async () => {
    if (submitting || cart.size === 0) return;
    setSubmitting(true);

    try {
      const items = Array.from(cart.values()).map(c => ({
        menuItemId: c.menuItem.id,
        quantity: c.quantity,
        note: c.note || undefined,
      }));

      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableCode: tableCodeRef.current,
          token: tokenRef.current,
          items,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Gửi order thất bại');
        return;
      }

      setOrderCode(data.data.orderCode);
      setCart(new Map());
      setShowCart(false);
      setView('success');
    } catch {
      alert('Lỗi kết nối, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleServiceRequest = async (type: string) => {
    if (serviceLoading) return;
    setServiceLoading(type);

    try {
      const res = await fetch('/api/public/service-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableCode: tableCodeRef.current,
          token: tokenRef.current,
          type,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setServiceDone(prev => new Set(prev).add(type));
      } else {
        alert(data.error || 'Gửi yêu cầu thất bại');
      }
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setServiceLoading('');
    }
  };

  // Filter items
  const filteredCategories = categories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => {
      if (!search) return true;
      const s = search.toLowerCase();
      return item.name.toLowerCase().includes(s) || (item.description || '').toLowerCase().includes(s);
    }),
  })).filter(cat => cat.items.length > 0);

  const displayItems = search
    ? filteredCategories.flatMap(c => c.items)
    : (filteredCategories.find(c => c.id === activeCategory)?.items || []);

  // ==================== RENDER ====================
  if (loading) {
    return (
      <>
        <style>{QR_CSS}</style>
        <div className="qr-page">
          <div className="qr-loading">
            <div className="qr-spinner" />
            <p>Đang tải menu...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || view === 'error') {
    return (
      <>
        <style>{QR_CSS}</style>
        <div className="qr-page">
          <div className="qr-error-screen">
            <div className="qr-error-icon">!</div>
            <h2>Không thể truy cập</h2>
            <p>{error || 'Đã xảy ra lỗi'}</p>
          </div>
        </div>
      </>
    );
  }

  if (view === 'success') {
    return (
      <>
        <style>{QR_CSS}</style>
        <div className="qr-page">
          <div className="qr-success-screen">
            <div className="qr-success-icon">✓</div>
            <h2>Order đã được gửi thành công</h2>
            <p className="qr-order-code">Mã đơn: {orderCode}</p>
            <p className="qr-success-sub">Nhân viên sẽ phục vụ bạn trong ít phút</p>

            <div className="qr-service-section">
              <h3>Bạn cần hỗ trợ gì thêm?</h3>
              <div className="qr-service-grid">
                {[
                  { type: 'CALL_WAITER', label: 'Gọi phục vụ', icon: '🙋' },
                  { type: 'REQUEST_PAYMENT', label: 'Gọi thanh toán', icon: '💳' },
                  { type: 'ADD_ICE', label: 'Thêm đá', icon: '🧊' },
                  { type: 'CLEAN_TABLE', label: 'Dọn bàn', icon: '🧹' },
                ].map(svc => (
                  <button
                    key={svc.type}
                    className={`qr-service-btn ${serviceDone.has(svc.type) ? 'qr-service-done' : ''}`}
                    onClick={() => handleServiceRequest(svc.type)}
                    disabled={!!serviceLoading || serviceDone.has(svc.type)}
                  >
                    <span className="qr-service-emoji">{svc.icon}</span>
                    <span>{serviceDone.has(svc.type) ? 'Đã gửi' : svc.label}</span>
                    {serviceLoading === svc.type && <span className="qr-btn-spinner" />}
                  </button>
                ))}
              </div>
            </div>

            <button className="qr-order-more-btn" onClick={() => { setView('menu'); setServiceDone(new Set()); }}>
              Gọi thêm món
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{QR_CSS}</style>
      <div className="qr-page">
        {/* Header */}
        <header className="qr-header">
          <div className="qr-brand">Báo Garden</div>
          <div className="qr-table-badge">Bàn {table?.code}</div>
        </header>

        {/* Search */}
        <div className="qr-search-wrap">
          <input
            className="qr-search"
            type="text"
            placeholder="Tìm món..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="qr-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        {/* Category Tabs */}
        {!search && (
          <div className="qr-category-tabs" ref={categoryTabsRef}>
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`qr-cat-tab ${activeCategory === cat.id ? 'qr-cat-active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Menu Items */}
        <div className="qr-menu-list" style={{ paddingBottom: totalItems > 0 ? 90 : 20 }}>
          {search && filteredCategories.length === 0 && (
            <div className="qr-empty">Không tìm thấy món phù hợp</div>
          )}
          {displayItems.map(item => {
            const inCart = cart.get(item.id);
            return (
              <div key={item.id} className="qr-menu-card">
                <div className="qr-menu-info">
                  <div className="qr-menu-name">
                    {item.isFeatured && <span className="qr-featured-badge">★</span>}
                    {item.name}
                  </div>
                  {item.description && <div className="qr-menu-desc">{item.description}</div>}
                  <div className="qr-menu-price">{formatVND(Number(item.price))}</div>
                </div>
                <div className="qr-menu-actions">
                  {inCart ? (
                    <div className="qr-qty-control">
                      <button className="qr-qty-btn" onClick={() => removeFromCart(item.id)}>−</button>
                      <span className="qr-qty-num">{inCart.quantity}</span>
                      <button className="qr-qty-btn" onClick={() => addToCart(item)}>+</button>
                    </div>
                  ) : (
                    <button className="qr-add-btn" onClick={() => addToCart(item)}>+</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Cart Bar */}
        {totalItems > 0 && (
          <div className="qr-cart-bar" onClick={() => setShowCart(true)}>
            <div className="qr-cart-count">{totalItems} món</div>
            <div className="qr-cart-total">{formatVND(totalPrice)}</div>
            <button className="qr-cart-submit-btn">Gửi order</button>
          </div>
        )}

        {/* Cart Detail Overlay */}
        {showCart && (
          <div className="qr-cart-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCart(false); }}>
            <div className="qr-cart-sheet">
              <div className="qr-cart-header">
                <h3>Đơn của bạn</h3>
                <button className="qr-cart-close" onClick={() => setShowCart(false)}>✕</button>
              </div>

              <div className="qr-cart-items">
                {Array.from(cart.values()).map(ci => (
                  <div key={ci.menuItem.id} className="qr-cart-item">
                    <div className="qr-cart-item-top">
                      <div className="qr-cart-item-name">{ci.menuItem.name}</div>
                      <div className="qr-cart-item-price">{formatVND(Number(ci.menuItem.price) * ci.quantity)}</div>
                    </div>
                    <div className="qr-cart-item-controls">
                      <div className="qr-qty-control">
                        <button className="qr-qty-btn" onClick={() => removeFromCart(ci.menuItem.id)}>−</button>
                        <span className="qr-qty-num">{ci.quantity}</span>
                        <button className="qr-qty-btn" onClick={() => addToCart(ci.menuItem)}>+</button>
                      </div>
                      <input
                        className="qr-item-note"
                        type="text"
                        placeholder="Ghi chú (ít đá, không đường...)"
                        value={ci.note}
                        onChange={e => updateNote(ci.menuItem.id, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="qr-cart-footer">
                <div className="qr-cart-summary">
                  <span>Tổng cộng ({totalItems} món)</span>
                  <span className="qr-cart-total-price">{formatVND(totalPrice)}</span>
                </div>
                <button
                  className="qr-submit-btn"
                  onClick={handleSubmitOrder}
                  disabled={submitting}
                >
                  {submitting ? 'Đang gửi...' : 'Gửi order'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ==================== CSS ====================
const QR_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

.qr-page{
  min-height:100vh;min-height:100dvh;
  background:#0a0a0f;color:#e8e8e8;
  font-family:'Inter',system-ui,-apple-system,sans-serif;
  max-width:480px;margin:0 auto;position:relative;
  overflow-x:hidden;
}

/* Loading */
.qr-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;height:100dvh;gap:16px;color:#999}
.qr-spinner{width:36px;height:36px;border:3px solid #333;border-top-color:#D4A84A;border-radius:50%;animation:qr-spin .8s linear infinite}
@keyframes qr-spin{to{transform:rotate(360deg)}}

/* Error */
.qr-error-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;height:100dvh;padding:24px;text-align:center}
.qr-error-icon{width:64px;height:64px;border-radius:50%;background:#3a1a1a;color:#ff6b6b;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;margin-bottom:20px}
.qr-error-screen h2{font-size:20px;margin-bottom:8px;color:#ff6b6b}
.qr-error-screen p{color:#999;font-size:14px;line-height:1.6}

/* Success */
.qr-success-screen{display:flex;flex-direction:column;align-items:center;padding:60px 24px 40px;text-align:center}
.qr-success-icon{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#1a3a1a,#2a5a2a);color:#4ade80;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;margin-bottom:24px}
.qr-success-screen h2{font-size:22px;color:#e8e8e8;margin-bottom:8px;font-family:'Playfair Display',serif}
.qr-order-code{color:#D4A84A;font-size:16px;font-weight:600;margin-bottom:4px}
.qr-success-sub{color:#888;font-size:13px;margin-bottom:36px}
.qr-service-section{width:100%;max-width:360px}
.qr-service-section h3{font-size:15px;color:#ccc;margin-bottom:16px;font-weight:500}
.qr-service-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.qr-service-btn{
  display:flex;flex-direction:column;align-items:center;gap:8px;
  padding:16px 12px;border-radius:12px;border:1px solid #222;
  background:#111;color:#ccc;font-size:13px;cursor:pointer;
  transition:all .2s;min-height:80px;justify-content:center;position:relative;
}
.qr-service-btn:active{transform:scale(.96)}
.qr-service-btn:disabled{opacity:.6;cursor:default}
.qr-service-done{border-color:#2a5a2a;background:#0f1f0f;color:#4ade80}
.qr-service-emoji{font-size:24px}
.qr-btn-spinner{width:14px;height:14px;border:2px solid #555;border-top-color:#D4A84A;border-radius:50%;animation:qr-spin .8s linear infinite;position:absolute;top:8px;right:8px}
.qr-order-more-btn{
  margin-top:32px;padding:14px 40px;border-radius:10px;
  background:linear-gradient(135deg,#D4A84A,#b8913e);color:#0a0a0f;
  font-size:15px;font-weight:600;border:none;cursor:pointer;
}
.qr-order-more-btn:active{transform:scale(.97)}

/* Header */
.qr-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 20px;border-bottom:1px solid #1a1a22;
  position:sticky;top:0;z-index:10;background:#0a0a0f;
}
.qr-brand{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:#D4A84A}
.qr-table-badge{
  padding:6px 14px;border-radius:20px;background:#1a1520;
  border:1px solid #D4A84A33;color:#D4A84A;font-size:13px;font-weight:600;
}

/* Search */
.qr-search-wrap{padding:12px 16px 0;position:relative}
.qr-search{
  width:100%;padding:12px 40px 12px 16px;border-radius:10px;
  background:#141418;border:1px solid #222;color:#e8e8e8;
  font-size:15px;outline:none;
}
.qr-search::placeholder{color:#555}
.qr-search:focus{border-color:#D4A84A55}
.qr-search-clear{
  position:absolute;right:28px;top:50%;transform:translateY(-50%);
  background:none;border:none;color:#666;font-size:16px;cursor:pointer;
  width:30px;height:30px;display:flex;align-items:center;justify-content:center;
  margin-top:6px;
}

/* Category Tabs */
.qr-category-tabs{
  display:flex;gap:8px;padding:12px 16px;overflow-x:auto;
  -webkit-overflow-scrolling:touch;scrollbar-width:none;
}
.qr-category-tabs::-webkit-scrollbar{display:none}
.qr-cat-tab{
  flex-shrink:0;padding:8px 18px;border-radius:20px;
  background:#141418;border:1px solid #222;color:#999;
  font-size:13px;cursor:pointer;white-space:nowrap;transition:all .2s;
}
.qr-cat-active{background:#1a1520;border-color:#D4A84A;color:#D4A84A;font-weight:600}

/* Menu List */
.qr-menu-list{padding:8px 16px}
.qr-empty{text-align:center;padding:40px 0;color:#666;font-size:14px}
.qr-menu-card{
  display:flex;justify-content:space-between;align-items:center;
  padding:16px;margin-bottom:8px;border-radius:12px;
  background:#111116;border:1px solid #1a1a22;
  transition:border-color .2s;
}
.qr-menu-card:active{border-color:#333}
.qr-menu-info{flex:1;min-width:0;padding-right:12px}
.qr-menu-name{font-size:15px;font-weight:500;color:#e8e8e8;margin-bottom:4px;display:flex;align-items:center;gap:6px}
.qr-featured-badge{color:#D4A84A;font-size:12px}
.qr-menu-desc{font-size:12px;color:#777;margin-bottom:6px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.qr-menu-price{font-size:15px;font-weight:600;color:#D4A84A}
.qr-menu-actions{flex-shrink:0}
.qr-add-btn{
  width:44px;height:44px;border-radius:12px;
  background:#1a1520;border:1px solid #D4A84A44;
  color:#D4A84A;font-size:22px;font-weight:300;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:all .15s;
}
.qr-add-btn:active{background:#2a2530;transform:scale(.93)}
.qr-qty-control{display:flex;align-items:center;gap:2px;background:#1a1520;border-radius:12px;border:1px solid #D4A84A33}
.qr-qty-btn{
  width:38px;height:38px;background:none;border:none;
  color:#D4A84A;font-size:20px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
}
.qr-qty-btn:active{opacity:.6}
.qr-qty-num{min-width:24px;text-align:center;font-size:15px;font-weight:600;color:#e8e8e8}

/* Cart Bar */
.qr-cart-bar{
  position:fixed;bottom:0;left:50%;transform:translateX(-50%);
  width:100%;max-width:480px;
  display:flex;align-items:center;gap:12px;
  padding:14px 16px;
  background:linear-gradient(180deg,#1a1520ee,#1a1520);
  border-top:1px solid #D4A84A33;
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  z-index:20;cursor:pointer;
}
.qr-cart-count{
  padding:4px 12px;border-radius:16px;
  background:#D4A84A22;color:#D4A84A;font-size:13px;font-weight:600;
}
.qr-cart-total{flex:1;font-size:16px;font-weight:700;color:#e8e8e8}
.qr-cart-submit-btn{
  padding:10px 22px;border-radius:10px;
  background:linear-gradient(135deg,#D4A84A,#b8913e);
  color:#0a0a0f;font-size:14px;font-weight:700;
  border:none;cursor:pointer;
}
.qr-cart-submit-btn:active{transform:scale(.96)}

/* Cart Overlay */
.qr-cart-overlay{
  position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;
  display:flex;align-items:flex-end;justify-content:center;
}
.qr-cart-sheet{
  width:100%;max-width:480px;max-height:85vh;max-height:85dvh;
  background:#111116;border-radius:20px 20px 0 0;
  display:flex;flex-direction:column;
  animation:qr-slideUp .25s ease-out;
}
@keyframes qr-slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.qr-cart-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:20px 20px 16px;border-bottom:1px solid #1a1a22;
}
.qr-cart-header h3{font-size:18px;font-weight:600;color:#e8e8e8}
.qr-cart-close{
  width:36px;height:36px;border-radius:50%;background:#1a1a22;
  border:none;color:#999;font-size:16px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
}
.qr-cart-items{flex:1;overflow-y:auto;padding:12px 20px;-webkit-overflow-scrolling:touch}
.qr-cart-item{padding:14px 0;border-bottom:1px solid #1a1a22}
.qr-cart-item:last-child{border-bottom:none}
.qr-cart-item-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.qr-cart-item-name{font-size:15px;font-weight:500;color:#e8e8e8}
.qr-cart-item-price{font-size:14px;font-weight:600;color:#D4A84A}
.qr-cart-item-controls{display:flex;align-items:center;gap:12px}
.qr-item-note{
  flex:1;padding:8px 12px;border-radius:8px;
  background:#0a0a0f;border:1px solid #222;
  color:#ccc;font-size:13px;outline:none;
}
.qr-item-note::placeholder{color:#555}
.qr-item-note:focus{border-color:#D4A84A44}
.qr-cart-footer{padding:16px 20px;border-top:1px solid #1a1a22;
  padding-bottom:max(16px,env(safe-area-inset-bottom));
}
.qr-cart-summary{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;font-size:14px;color:#999}
.qr-cart-total-price{font-size:20px;font-weight:700;color:#D4A84A}
.qr-submit-btn{
  width:100%;padding:16px;border-radius:12px;
  background:linear-gradient(135deg,#D4A84A,#b8913e);
  color:#0a0a0f;font-size:16px;font-weight:700;
  border:none;cursor:pointer;transition:all .15s;
}
.qr-submit-btn:active{transform:scale(.98)}
.qr-submit-btn:disabled{opacity:.6;cursor:default;transform:none}
`;
