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
  department: string;
  isFeatured: boolean;
  preparationTimeMinutes: number;
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
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note: string;
}

type PageView = 'menu' | 'cart' | 'success';

// ==================== HELPERS ====================
function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

// Pairing suggestions to increase avg bill
const PAIRING_MAP: Record<string, string[]> = {
  'KITCHEN': ['Heineken Bạc', 'Tiger', 'Bia Sài Gòn Special', 'Cocktail Signature Báo Garden'],
  'BAR': ['Mẹt khô tổng hợp', 'Khô gà lá chanh', 'Hàu nướng phô mai', 'Mực nướng sa tế'],
};

// ==================== COMPONENT ====================
export default function OrderPage() {
  const [view, setView] = useState<PageView>('menu');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [table, setTable] = useState<TableInfo | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('featured');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [showCart, setShowCart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [serviceLoading, setServiceLoading] = useState('');
  const [serviceDone, setServiceDone] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState('');

  const tableCodeRef = useRef('');
  const tokenRef = useRef('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // Load menu
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
        if (!data.success) { setError(data.error || 'Không thể tải menu'); return; }
        setTable(data.data.table);
        const cats = (data.data.menu || data.data.categories || []).filter((c: MenuCategory) => c.items.length > 0);
        setCategories(cats);
        const items = cats.flatMap((c: MenuCategory) => c.items);
        setAllItems(items);
      })
      .catch(() => setError('Không thể kết nối server'))
      .finally(() => setLoading(false));
  }, []);

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      next.set(item.id, { menuItem: item, quantity: (existing?.quantity || 0) + 1, note: existing?.note || '' });
      return next;
    });
    showToast(`Đã thêm ${item.name}`);
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
      if (existing) next.set(itemId, { ...existing, note });
      return next;
    });
  }, []);

  const totalItems = Array.from(cart.values()).reduce((s, c) => s + c.quantity, 0);
  const totalPrice = Array.from(cart.values()).reduce((s, c) => s + Number(c.menuItem.price) * c.quantity, 0);

  // Suggest pairings based on what's in cart
  const getSuggestions = useCallback((): MenuItem[] => {
    if (cart.size === 0) return [];
    const cartItems = Array.from(cart.values());
    const cartDepts = new Set(cartItems.map(c => c.menuItem.department));
    const cartIds = new Set(cartItems.map(c => c.menuItem.id));
    const suggestions: MenuItem[] = [];

    // If only has food, suggest drinks
    if (cartDepts.has('KITCHEN') && !cartDepts.has('BAR')) {
      const drinkNames = PAIRING_MAP['KITCHEN'];
      for (const name of drinkNames) {
        const item = allItems.find(i => i.name === name && !cartIds.has(i.id));
        if (item) suggestions.push(item);
      }
    }
    // If only has drinks, suggest food
    if (cartDepts.has('BAR') && !cartDepts.has('KITCHEN')) {
      const foodNames = PAIRING_MAP['BAR'];
      for (const name of foodNames) {
        const item = allItems.find(i => i.name === name && !cartIds.has(i.id));
        if (item) suggestions.push(item);
      }
    }
    // Always suggest featured items not in cart
    if (suggestions.length < 3) {
      const featured = allItems.filter(i => i.isFeatured && !cartIds.has(i.id) && !suggestions.find(s => s.id === i.id));
      suggestions.push(...featured.slice(0, 3 - suggestions.length));
    }
    return suggestions.slice(0, 4);
  }, [cart, allItems]);

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
        body: JSON.stringify({ tableCode: tableCodeRef.current, token: tokenRef.current, items }),
      });
      const data = await res.json();
      if (!data.success) { showToast(data.error || 'Gửi order thất bại'); return; }
      setOrderCode(data.data.orderCode);
      setCart(new Map());
      setShowCart(false);
      setView('success');
    } catch {
      showToast('Lỗi kết nối, vui lòng thử lại');
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
        body: JSON.stringify({ tableCode: tableCodeRef.current, token: tokenRef.current, type }),
      });
      const data = await res.json();
      if (data.success) { setServiceDone(prev => new Set(prev).add(type)); }
      else { showToast(data.error || 'Gửi yêu cầu thất bại'); }
    } catch { showToast('Lỗi kết nối'); }
    finally { setServiceLoading(''); }
  };

  // Featured items
  const featuredItems = allItems.filter(i => i.isFeatured);

  // Filter by category/search
  const getDisplayItems = (): MenuItem[] => {
    if (search) {
      const s = search.toLowerCase();
      return allItems.filter(i => i.name.toLowerCase().includes(s) || (i.description || '').toLowerCase().includes(s));
    }
    if (activeCategory === 'featured') return featuredItems;
    const cat = categories.find(c => c.id === activeCategory);
    return cat?.items || [];
  };
  const displayItems = getDisplayItems();
  const suggestions = getSuggestions();

  // ==================== RENDER ====================
  if (loading) return (<><style>{CSS}</style><div className="qr-page"><div className="qr-loading"><div className="qr-spinner" /><p>Đang tải thực đơn...</p></div></div></>);

  if (error) return (<><style>{CSS}</style><div className="qr-page"><div className="qr-error-screen"><div className="qr-err-icon">!</div><h2>Không thể truy cập</h2><p>{error}</p></div></div></>);

  if (view === 'success') {
    return (
      <><style>{CSS}</style>
      <div className="qr-page">
        <div className="qr-success">
          <div className="qr-success-check">✓</div>
          <h2>Order đã được gửi thành công</h2>
          <p className="qr-code-label">Mã đơn: <strong>{orderCode}</strong></p>
          <p className="qr-sub">Bếp & Bar đang chuẩn bị món cho bạn.<br />Nhân viên sẽ phục vụ trong ít phút.</p>

          <div className="qr-svc-grid">
            <h3>Bạn cần hỗ trợ gì thêm?</h3>
            <div className="qr-svc-btns">
              {[
                { type: 'CALL_WAITER', label: 'Gọi phục vụ', emoji: '🙋' },
                { type: 'REQUEST_PAYMENT', label: 'Thanh toán', emoji: '💳' },
                { type: 'ADD_ICE', label: 'Thêm đá', emoji: '🧊' },
                { type: 'CLEAN_TABLE', label: 'Dọn bàn', emoji: '🧹' },
              ].map(s => (
                <button key={s.type}
                  className={`qr-svc-btn ${serviceDone.has(s.type) ? 'done' : ''}`}
                  onClick={() => handleServiceRequest(s.type)}
                  disabled={!!serviceLoading || serviceDone.has(s.type)}>
                  <span className="qr-svc-emoji">{s.emoji}</span>
                  <span>{serviceDone.has(s.type) ? 'Đã gửi' : s.label}</span>
                  {serviceLoading === s.type && <span className="qr-mini-spin" />}
                </button>
              ))}
            </div>
          </div>

          <button className="qr-more-btn" onClick={() => { setView('menu'); setServiceDone(new Set()); }}>
            Gọi thêm món
          </button>
        </div>
      </div></>
    );
  }

  return (
    <><style>{CSS}</style>
    <div className="qr-page">
      {/* Toast */}
      {toast && <div className="qr-toast">{toast}</div>}

      {/* Header */}
      <header className="qr-header">
        <div className="qr-brand">Báo Garden</div>
        <div className="qr-table-tag">Bàn {table?.code}</div>
      </header>

      {/* Search */}
      <div className="qr-search-bar">
        <input type="text" placeholder="Tìm món ăn, thức uống..." value={search}
          onChange={e => setSearch(e.target.value)} className="qr-search-input" />
        {search && <button className="qr-search-x" onClick={() => setSearch('')}>✕</button>}
      </div>

      {/* Category Tabs */}
      {!search && (
        <div className="qr-tabs">
          <button className={`qr-tab ${activeCategory === 'featured' ? 'active' : ''}`}
            onClick={() => setActiveCategory('featured')}>
            ★ Nổi bật
          </button>
          {categories.map(cat => (
            <button key={cat.id} className={`qr-tab ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}>
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Hero Banner for Featured */}
      {activeCategory === 'featured' && !search && featuredItems.length > 0 && (
        <div className="qr-hero">
          <div className="qr-hero-img" style={{ backgroundImage: `url(${featuredItems[0].imageUrl || '/menu/grilled-seafood.png'})` }}>
            <div className="qr-hero-overlay">
              <span className="qr-hero-tag">Đặc biệt hôm nay</span>
              <h2>{featuredItems[0].name}</h2>
              <p>{featuredItems[0].description}</p>
              <div className="qr-hero-bottom">
                <span className="qr-hero-price">{formatVND(Number(featuredItems[0].price))}</span>
                <button className="qr-hero-add" onClick={() => addToCart(featuredItems[0])}>
                  {cart.has(featuredItems[0].id) ? `${cart.get(featuredItems[0].id)!.quantity} trong giỏ` : 'Thêm vào đơn'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="qr-items" style={{ paddingBottom: totalItems > 0 ? 100 : 24 }}>
        {search && displayItems.length === 0 && <div className="qr-empty">Không tìm thấy món phù hợp</div>}

        {displayItems.map((item, idx) => {
          // Skip first featured item if showing hero
          if (activeCategory === 'featured' && !search && idx === 0) return null;
          const inCart = cart.get(item.id);
          return (
            <div key={item.id} className="qr-card" onClick={() => !inCart && addToCart(item)}>
              {item.imageUrl && (
                <div className="qr-card-img" style={{ backgroundImage: `url(${item.imageUrl})` }}>
                  {item.isFeatured && <span className="qr-badge-hot">Bán chạy</span>}
                </div>
              )}
              <div className="qr-card-body">
                <div className="qr-card-name">{item.name}</div>
                {item.description && <div className="qr-card-desc">{item.description}</div>}
                <div className="qr-card-row">
                  <span className="qr-card-price">{formatVND(Number(item.price))}</span>
                  <div className="qr-card-actions" onClick={e => e.stopPropagation()}>
                    {inCart ? (
                      <div className="qr-qty">
                        <button className="qr-qty-btn" onClick={() => removeFromCart(item.id)}>−</button>
                        <span className="qr-qty-num">{inCart.quantity}</span>
                        <button className="qr-qty-btn" onClick={() => addToCart(item)}>+</button>
                      </div>
                    ) : (
                      <button className="qr-add" onClick={() => addToCart(item)}>Thêm</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Inline Upsell - Suggest drinks with food or vice versa */}
        {!search && activeCategory !== 'featured' && suggestions.length > 0 && (
          <div className="qr-upsell">
            <h3 className="qr-upsell-title">Gọi kèm cho hợp vị</h3>
            <div className="qr-upsell-scroll">
              {suggestions.map(item => (
                <div key={item.id} className="qr-upsell-card" onClick={() => addToCart(item)}>
                  {item.imageUrl && <div className="qr-upsell-img" style={{ backgroundImage: `url(${item.imageUrl})` }} />}
                  <div className="qr-upsell-name">{item.name}</div>
                  <div className="qr-upsell-price">{formatVND(Number(item.price))}</div>
                  <button className="qr-upsell-add">+</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Cart Bar */}
      {totalItems > 0 && (
        <div className="qr-cart-float" onClick={() => setShowCart(true)}>
          <div className="qr-cart-badge">{totalItems}</div>
          <div className="qr-cart-label">Xem đơn</div>
          <div className="qr-cart-total">{formatVND(totalPrice)}</div>
        </div>
      )}

      {/* Cart Sheet */}
      {showCart && (
        <div className="qr-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCart(false); }}>
          <div className="qr-sheet">
            <div className="qr-sheet-head">
              <h3>Đơn của bạn · Bàn {table?.code}</h3>
              <button className="qr-close" onClick={() => setShowCart(false)}>✕</button>
            </div>

            <div className="qr-sheet-body">
              {Array.from(cart.values()).map(ci => (
                <div key={ci.menuItem.id} className="qr-sheet-item">
                  <div className="qr-sheet-item-row">
                    {ci.menuItem.imageUrl && <div className="qr-sheet-thumb" style={{ backgroundImage: `url(${ci.menuItem.imageUrl})` }} />}
                    <div className="qr-sheet-info">
                      <div className="qr-sheet-name">{ci.menuItem.name}</div>
                      <div className="qr-sheet-price">{formatVND(Number(ci.menuItem.price) * ci.quantity)}</div>
                    </div>
                    <div className="qr-qty">
                      <button className="qr-qty-btn" onClick={() => removeFromCart(ci.menuItem.id)}>−</button>
                      <span className="qr-qty-num">{ci.quantity}</span>
                      <button className="qr-qty-btn" onClick={() => addToCart(ci.menuItem)}>+</button>
                    </div>
                  </div>
                  <input className="qr-note-input" type="text" placeholder="Ghi chú: ít cay, không hành..."
                    value={ci.note} onChange={e => updateNote(ci.menuItem.id, e.target.value)} />
                </div>
              ))}

              {/* Cart Upsell */}
              {suggestions.length > 0 && (
                <div className="qr-cart-suggest">
                  <h4>Thêm gì không?</h4>
                  <div className="qr-suggest-list">
                    {suggestions.slice(0, 3).map(item => (
                      <button key={item.id} className="qr-suggest-chip" onClick={() => addToCart(item)}>
                        + {item.name} · {formatVND(Number(item.price))}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="qr-sheet-footer">
              <div className="qr-sheet-total">
                <span>Tổng ({totalItems} món)</span>
                <span className="qr-total-amount">{formatVND(totalPrice)}</span>
              </div>
              <button className="qr-submit" onClick={handleSubmitOrder} disabled={submitting}>
                {submitting ? 'Đang gửi...' : 'Gửi order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div></>
  );
}

// ==================== CSS ====================
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

.qr-page{
  min-height:100vh;min-height:100dvh;
  background:#08080d;color:#e8e8e8;
  font-family:'Inter',system-ui,sans-serif;
  max-width:480px;margin:0 auto;position:relative;
  overflow-x:hidden;
}

/* Toast */
.qr-toast{
  position:fixed;top:16px;left:50%;transform:translateX(-50%);
  padding:10px 24px;border-radius:24px;
  background:#1a3a1aee;border:1px solid #2a5a2a;color:#4ade80;
  font-size:13px;font-weight:500;z-index:200;
  animation:qr-fadeIn .3s ease;pointer-events:none;
  backdrop-filter:blur(8px);max-width:90%;
}
@keyframes qr-fadeIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* Loading/Error */
.qr-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;height:100dvh;gap:16px;color:#888}
.qr-spinner{width:32px;height:32px;border:2px solid #222;border-top-color:#D4A84A;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.qr-error-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;padding:24px;text-align:center}
.qr-err-icon{width:56px;height:56px;border-radius:50%;background:#2a1515;color:#f87171;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;margin-bottom:16px}
.qr-error-screen h2{font-size:18px;margin-bottom:8px;color:#f87171}
.qr-error-screen p{color:#888;font-size:13px;line-height:1.6}

/* Success */
.qr-success{display:flex;flex-direction:column;align-items:center;padding:60px 24px 40px;text-align:center}
.qr-success-check{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#143a14,#1a5a2a);color:#4ade80;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;margin-bottom:20px;animation:qr-pop .4s ease}
@keyframes qr-pop{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}}
.qr-success h2{font-size:20px;color:#e8e8e8;margin-bottom:8px;font-family:'Playfair Display',serif}
.qr-code-label{color:#D4A84A;font-size:15px;margin-bottom:4px}
.qr-sub{color:#777;font-size:13px;line-height:1.6;margin-bottom:32px}
.qr-svc-grid{width:100%;max-width:340px}
.qr-svc-grid h3{font-size:14px;color:#aaa;margin-bottom:14px;font-weight:500}
.qr-svc-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.qr-svc-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 10px;border-radius:12px;border:1px solid #1a1a22;background:#0f0f14;color:#bbb;font-size:12px;cursor:pointer;transition:all .2s;position:relative}
.qr-svc-btn:active{transform:scale(.96)}
.qr-svc-btn:disabled{opacity:.5;cursor:default}
.qr-svc-btn.done{border-color:#1a4a1a;background:#0a1f0a;color:#4ade80}
.qr-svc-emoji{font-size:22px}
.qr-mini-spin{width:12px;height:12px;border:2px solid #444;border-top-color:#D4A84A;border-radius:50%;animation:spin .7s linear infinite;position:absolute;top:6px;right:6px}
.qr-more-btn{margin-top:28px;padding:12px 36px;border-radius:10px;background:linear-gradient(135deg,#D4A84A,#b8913e);color:#08080d;font-size:14px;font-weight:600;border:none;cursor:pointer}
.qr-more-btn:active{transform:scale(.97)}

/* Header */
.qr-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 18px;border-bottom:1px solid #151520;
  position:sticky;top:0;z-index:50;background:#08080dee;
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
}
.qr-brand{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:#D4A84A;letter-spacing:.3px}
.qr-table-tag{padding:5px 14px;border-radius:20px;background:#15121e;border:1px solid #D4A84A30;color:#D4A84A;font-size:12px;font-weight:600}

/* Search */
.qr-search-bar{padding:10px 16px 0;position:relative}
.qr-search-input{width:100%;padding:11px 36px 11px 14px;border-radius:10px;background:#111116;border:1px solid #1a1a22;color:#e8e8e8;font-size:14px;outline:none}
.qr-search-input::placeholder{color:#555}
.qr-search-input:focus{border-color:#D4A84A44}
.qr-search-x{position:absolute;right:28px;top:50%;transform:translateY(-50%);margin-top:5px;background:none;border:none;color:#666;font-size:14px;cursor:pointer;width:28px;height:28px;display:flex;align-items:center;justify-content:center}

/* Category Tabs */
.qr-tabs{display:flex;gap:6px;padding:10px 16px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.qr-tabs::-webkit-scrollbar{display:none}
.qr-tab{flex-shrink:0;padding:7px 16px;border-radius:20px;background:#111116;border:1px solid #1a1a22;color:#888;font-size:12px;cursor:pointer;white-space:nowrap;transition:all .2s}
.qr-tab.active{background:#1a1320;border-color:#D4A84A;color:#D4A84A;font-weight:600}

/* Hero Banner */
.qr-hero{padding:10px 16px 0}
.qr-hero-img{height:200px;border-radius:16px;background-size:cover;background-position:center;position:relative;overflow:hidden}
.qr-hero-overlay{position:absolute;inset:0;background:linear-gradient(0deg,#08080dee 0%,#08080d88 40%,transparent 100%);display:flex;flex-direction:column;justify-content:flex-end;padding:18px}
.qr-hero-tag{display:inline-block;align-self:flex-start;padding:4px 12px;border-radius:16px;background:#D4A84A22;border:1px solid #D4A84A44;color:#D4A84A;font-size:11px;font-weight:600;margin-bottom:8px}
.qr-hero-overlay h2{font-family:'Playfair Display',serif;font-size:20px;color:#fff;margin-bottom:4px}
.qr-hero-overlay p{font-size:12px;color:#aaa;margin-bottom:10px;line-height:1.4}
.qr-hero-bottom{display:flex;align-items:center;justify-content:space-between}
.qr-hero-price{font-size:18px;font-weight:700;color:#D4A84A}
.qr-hero-add{padding:8px 18px;border-radius:8px;background:linear-gradient(135deg,#D4A84A,#b8913e);color:#08080d;font-size:13px;font-weight:600;border:none;cursor:pointer}
.qr-hero-add:active{transform:scale(.95)}

/* Menu Cards */
.qr-items{padding:6px 16px}
.qr-empty{text-align:center;padding:40px 0;color:#555;font-size:13px}
.qr-card{
  display:flex;gap:12px;padding:12px;margin-bottom:8px;
  border-radius:14px;background:#0e0e14;border:1px solid #151520;
  cursor:pointer;transition:border-color .2s;
}
.qr-card:active{border-color:#252530}
.qr-card-img{
  width:80px;height:80px;flex-shrink:0;border-radius:10px;
  background-size:cover;background-position:center;
  position:relative;
}
.qr-badge-hot{
  position:absolute;top:4px;left:4px;padding:2px 8px;
  border-radius:8px;background:#D4A84Acc;color:#08080d;
  font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;
}
.qr-card-body{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}
.qr-card-name{font-size:14px;font-weight:500;color:#e8e8e8;margin-bottom:2px}
.qr-card-desc{font-size:11px;color:#666;margin-bottom:6px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.qr-card-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.qr-card-price{font-size:14px;font-weight:600;color:#D4A84A}
.qr-card-actions{flex-shrink:0}
.qr-add{padding:6px 14px;border-radius:8px;background:#15121e;border:1px solid #D4A84A33;color:#D4A84A;font-size:12px;font-weight:600;cursor:pointer}
.qr-add:active{background:#1a1828}
.qr-qty{display:flex;align-items:center;gap:2px;background:#15121e;border-radius:8px;border:1px solid #D4A84A33}
.qr-qty-btn{width:32px;height:32px;background:none;border:none;color:#D4A84A;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.qr-qty-btn:active{opacity:.5}
.qr-qty-num{min-width:20px;text-align:center;font-size:13px;font-weight:600;color:#e8e8e8}

/* Upsell Section */
.qr-upsell{margin-top:16px;padding-top:16px;border-top:1px solid #151520}
.qr-upsell-title{font-size:14px;font-weight:600;color:#D4A84A;margin-bottom:12px}
.qr-upsell-scroll{display:flex;gap:10px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:4px}
.qr-upsell-scroll::-webkit-scrollbar{display:none}
.qr-upsell-card{flex-shrink:0;width:120px;border-radius:12px;background:#111116;border:1px solid #1a1a22;cursor:pointer;overflow:hidden;transition:border-color .2s;position:relative}
.qr-upsell-card:active{border-color:#333}
.qr-upsell-img{width:120px;height:80px;background-size:cover;background-position:center}
.qr-upsell-name{padding:8px 8px 2px;font-size:11px;font-weight:500;color:#ccc;line-height:1.3}
.qr-upsell-price{padding:2px 8px 8px;font-size:12px;font-weight:600;color:#D4A84A}
.qr-upsell-add{position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:50%;background:#D4A84Acc;border:none;color:#08080d;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center}

/* Floating Cart Bar */
.qr-cart-float{
  position:fixed;bottom:16px;left:50%;transform:translateX(-50%);
  width:calc(100% - 32px);max-width:448px;
  display:flex;align-items:center;gap:12px;
  padding:12px 16px;border-radius:16px;
  background:linear-gradient(135deg,#D4A84A,#b8913e);
  box-shadow:0 8px 32px #D4A84A33;
  z-index:40;cursor:pointer;
  animation:qr-slideUp .3s ease;
}
@keyframes qr-slideUp{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
.qr-cart-badge{width:28px;height:28px;border-radius:50%;background:#08080d33;color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center}
.qr-cart-label{flex:1;font-size:14px;font-weight:600;color:#08080d}
.qr-cart-total{font-size:16px;font-weight:700;color:#08080d}

/* Cart Overlay */
.qr-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:100;display:flex;align-items:flex-end;justify-content:center}
.qr-sheet{width:100%;max-width:480px;max-height:88vh;max-height:88dvh;background:#0e0e14;border-radius:20px 20px 0 0;display:flex;flex-direction:column;animation:qr-sheetUp .25s ease-out}
@keyframes qr-sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.qr-sheet-head{display:flex;align-items:center;justify-content:space-between;padding:18px 18px 14px;border-bottom:1px solid #151520}
.qr-sheet-head h3{font-size:16px;font-weight:600;color:#e8e8e8}
.qr-close{width:32px;height:32px;border-radius:50%;background:#151520;border:none;color:#888;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}

/* Sheet Body */
.qr-sheet-body{flex:1;overflow-y:auto;padding:12px 18px;-webkit-overflow-scrolling:touch}
.qr-sheet-item{padding:12px 0;border-bottom:1px solid #151520}
.qr-sheet-item:last-of-type{border-bottom:none}
.qr-sheet-item-row{display:flex;align-items:center;gap:10px}
.qr-sheet-thumb{width:48px;height:48px;border-radius:8px;background-size:cover;background-position:center;flex-shrink:0}
.qr-sheet-info{flex:1;min-width:0}
.qr-sheet-name{font-size:13px;font-weight:500;color:#e8e8e8}
.qr-sheet-price{font-size:13px;font-weight:600;color:#D4A84A}
.qr-note-input{width:100%;margin-top:8px;padding:7px 10px;border-radius:8px;background:#08080d;border:1px solid #1a1a22;color:#bbb;font-size:12px;outline:none}
.qr-note-input::placeholder{color:#444}
.qr-note-input:focus{border-color:#D4A84A33}

/* Cart Suggest */
.qr-cart-suggest{margin-top:16px;padding-top:14px;border-top:1px solid #1a1a22}
.qr-cart-suggest h4{font-size:13px;color:#D4A84A;margin-bottom:10px;font-weight:600}
.qr-suggest-list{display:flex;flex-direction:column;gap:6px}
.qr-suggest-chip{padding:10px 12px;border-radius:10px;background:#111118;border:1px dashed #D4A84A33;color:#ccc;font-size:12px;cursor:pointer;text-align:left;transition:all .2s}
.qr-suggest-chip:active{background:#1a1520;border-style:solid}

/* Sheet Footer */
.qr-sheet-footer{padding:14px 18px;border-top:1px solid #1a1a22;padding-bottom:max(14px,env(safe-area-inset-bottom))}
.qr-sheet-total{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px;color:#888}
.qr-total-amount{font-size:20px;font-weight:700;color:#D4A84A}
.qr-submit{width:100%;padding:14px;border-radius:12px;background:linear-gradient(135deg,#D4A84A,#b8913e);color:#08080d;font-size:15px;font-weight:700;border:none;cursor:pointer;transition:all .15s}
.qr-submit:active{transform:scale(.98)}
.qr-submit:disabled{opacity:.5;cursor:default;transform:none}
`;
