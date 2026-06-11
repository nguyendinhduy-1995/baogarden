'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

/* ─── Types ─── */
interface AuthUser { id: string; name: string; role: string }
interface BillSummary {
  id: string; status: string; openedAt: string; subtotal: number;
  discountAmount: number; serviceCharge: number; totalAmount: number;
  orderCount: number; itemCount: number;
  table: { id: string; code: string; name: string; area: { name: string } };
}
interface BillDetail {
  id: string; status: string; openedAt: string; subtotal: number;
  discountAmount: number; serviceCharge: number; totalAmount: number;
  table: { id: string; code: string; name: string; area: { name: string } };
  openedBy: { name: string } | null;
  orders: Array<{
    id: string; orderCode: string; status: string; createdAt: string;
    createdBy: { name: string } | null;
    items: Array<{
      id: string; itemNameSnapshot: string; priceSnapshot: number;
      quantity: number; totalPrice: number; status: string; note: string | null;
    }>;
  }>;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
  { value: 'CARD', label: 'Thẻ' },
  { value: 'E_WALLET', label: 'Ví điện tử' },
];

function fmtMoney(n: number) { return new Intl.NumberFormat('vi-VN').format(n) + 'đ'; }
function fmtTime(d: string) { return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }

export default function CashierPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [bills, setBills] = useState<BillSummary[]>([]);
  const [selectedBill, setSelectedBill] = useState<BillDetail | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountInput, setDiscountInput] = useState('');
  const [serviceChargeInput, setServiceChargeInput] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [clock, setClock] = useState('');
  const [paySuccess, setPaySuccess] = useState(false);
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
        if (!['CASHIER', 'MANAGER', 'ADMIN'].includes(u.role)) { router.replace('/login'); return; }
        setUser(u);
        setAuthChecked(true);
      } catch { router.replace('/login'); }
    })();
  }, [router]);

  // Load bills
  const loadBills = useCallback(async () => {
    try {
      const res = await fetch('/api/cashier/bills');
      if (res.ok) { const d = await res.json(); if (d.success) setBills(d.data); }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    setLoading(true);
    loadBills().finally(() => setLoading(false));
    const iv = setInterval(loadBills, 5000);
    return () => clearInterval(iv);
  }, [authChecked, loadBills]);

  // Open bill detail
  const openBill = async (billId: string) => {
    try {
      const res = await fetch(`/api/cashier/bills/${billId}`);
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setSelectedBill(d.data);
          setShowModal(true);
          setDiscountInput('');
          setServiceChargeInput('');
          setDiscountType('amount');
          setPaymentMethod('CASH');
        }
      }
    } catch { showToast('Lỗi tải hóa đơn', 'error'); }
  };

  // Calculate totals
  const calcDiscount = () => {
    if (!selectedBill) return 0;
    const v = Number(discountInput) || 0;
    if (discountType === 'percent') return Math.round(selectedBill.subtotal * v / 100);
    return v;
  };
  const calcServiceCharge = () => Number(serviceChargeInput) || 0;
  const calcTotal = () => {
    if (!selectedBill) return 0;
    return selectedBill.subtotal - calcDiscount() + calcServiceCharge();
  };

  // Pay
  const handlePay = async () => {
    if (!selectedBill) return;
    setPaying(true);
    try {
      const res = await fetch(`/api/cashier/bills/${selectedBill.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          discountAmount: calcDiscount(),
          serviceCharge: calcServiceCharge(),
        }),
      });
      if (res.ok) {
        const d = await res.json();
        // Success animation
        setPaySuccess(true);
        setTimeout(() => {
          setPaySuccess(false);
          showToast('Thanh toán thành công!');
          setShowModal(false);
          setSelectedBill(null);
          loadBills();
        }, 1200);
        // Open print window
        printBill(d.data);
      } else {
        const d = await res.json();
        showToast(d.error || 'Lỗi thanh toán', 'error');
      }
    } catch { showToast('Lỗi kết nối', 'error'); }
    setPaying(false);
  };

  // Print
  const printBill = (paymentData: { subtotal: number; discountAmount: number; serviceCharge: number; totalAmount: number }) => {
    if (!selectedBill) return;
    const items = selectedBill.orders.flatMap(o => o.items);
    const methodLabel = PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label || paymentMethod;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hóa đơn - ${selectedBill.table.code}</title>
<style>body{font-family:'Courier New',monospace;max-width:300px;margin:0 auto;padding:20px;font-size:12px;color:#000}
h1{text-align:center;font-size:16px;margin:0 0 4px}p.sub{text-align:center;font-size:10px;color:#666;margin:0 0 12px}
hr{border:none;border-top:1px dashed #000;margin:8px 0}
.row{display:flex;justify-content:space-between;padding:2px 0}.row.bold{font-weight:bold}
.items .item{display:flex;justify-content:space-between;padding:2px 0}
.total{font-size:14px;font-weight:bold;margin-top:4px}
.center{text-align:center}
@media print{body{margin:0;padding:10px}}
</style></head><body>
<h1>BÁO GARDEN</h1><p class="sub">Hóa đơn thanh toán</p><hr>
<div class="row"><span>Bàn:</span><span>${selectedBill.table.code} - ${selectedBill.table.name}</span></div>
<div class="row"><span>Khu vực:</span><span>${selectedBill.table.area.name}</span></div>
<div class="row"><span>Ngày:</span><span>${fmtDate(selectedBill.openedAt)}</span></div>
<div class="row"><span>Thu ngân:</span><span>${user?.name || ''}</span></div>
<hr><div class="items">
${items.map(i => `<div class="item"><span>${i.quantity}x ${i.itemNameSnapshot}</span><span>${fmtMoney(Number(i.totalPrice))}</span></div>`).join('')}
</div><hr>
<div class="row"><span>Tạm tính:</span><span>${fmtMoney(paymentData.subtotal)}</span></div>
${paymentData.discountAmount > 0 ? `<div class="row"><span>Giảm giá:</span><span>-${fmtMoney(paymentData.discountAmount)}</span></div>` : ''}
${paymentData.serviceCharge > 0 ? `<div class="row"><span>Phí dịch vụ:</span><span>+${fmtMoney(paymentData.serviceCharge)}</span></div>` : ''}
<div class="row bold total"><span>TỔNG CỘNG:</span><span>${fmtMoney(paymentData.totalAmount)}</span></div>
<div class="row"><span>Thanh toán:</span><span>${methodLabel}</span></div>
<hr><p class="center">Cảm ơn quý khách!</p><p class="center" style="font-size:10px">Báo Garden · 08 777 6666 3</p>
<script>window.onload=function(){window.print()}</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    router.replace('/login');
  };

  if (!authChecked || loading) return (
    <div className="c-loading-screen">
      <style>{CSS}</style>
      <div className="c-loader" />
    </div>
  );

  const paymentRequestedBills = bills.filter(b => b.status === 'PAYMENT_REQUESTED');
  const openBills = bills.filter(b => b.status === 'OPEN');

  return (
    <div className="c-root">
      <style>{CSS}</style>

      {/* Toast */}
      {toast && (
        <div className={`c-toast ${toast.type === 'error' ? 'c-toast--error' : 'c-toast--success'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="c-header">
        <div className="c-header__left">
          <h1 className="c-header__title">THU NGÂN</h1>
        </div>
        <div className="c-header__center">
          <span className="c-clock">{clock}</span>
        </div>
        <div className="c-header__right">
          {paymentRequestedBills.length > 0 && (
            <span className="c-header__pending">
              {paymentRequestedBills.length} chờ
            </span>
          )}
          <span className="c-header__user">{user?.name}</span>
          <button className="c-header__logout" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </header>

      {/* Stats */}
      <div className="c-stats">
        <div className="c-stat">
          <span className="c-stat__label">Chờ thanh toán</span>
          <span className="c-stat__value c-stat__value--purple">{paymentRequestedBills.length}</span>
        </div>
        <div className="c-stat">
          <span className="c-stat__label">Bàn đang mở</span>
          <span className="c-stat__value c-stat__value--blue">{openBills.length}</span>
        </div>
        <div className="c-stat">
          <span className="c-stat__label">Tổng bill</span>
          <span className="c-stat__value c-stat__value--gold">{bills.length}</span>
        </div>
      </div>

      {/* Bills */}
      <main className="c-body">
        {paymentRequestedBills.length > 0 && (
          <section className="c-section">
            <h3 className="c-section__title">Yêu cầu thanh toán</h3>
            <div className="c-grid">
              {paymentRequestedBills.map(b => (
                <button key={b.id} className="c-bill c-bill--urgent" onClick={() => openBill(b.id)}>
                  <div className="c-bill__top">
                    <span className="c-bill__code">{b.table.code}</span>
                    <span className="c-bill__badge c-bill__badge--purple">Chờ TT</span>
                  </div>
                  <span className="c-bill__area">{b.table.area.name}</span>
                  <div className="c-bill__bottom">
                    <span className="c-bill__info">{b.orderCount} đơn · {b.itemCount} món</span>
                    <span className="c-bill__total">{fmtMoney(b.subtotal)}</span>
                  </div>
                  <span className="c-bill__time">Mở lúc {fmtTime(b.openedAt)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {openBills.length > 0 && (
          <section className="c-section">
            <h3 className="c-section__title">Bàn đang mở</h3>
            <div className="c-grid">
              {openBills.map(b => (
                <button key={b.id} className="c-bill" onClick={() => openBill(b.id)}>
                  <div className="c-bill__top">
                    <span className="c-bill__code">{b.table.code}</span>
                    <span className="c-bill__badge c-bill__badge--blue">Đang phục vụ</span>
                  </div>
                  <span className="c-bill__area">{b.table.area.name}</span>
                  <div className="c-bill__bottom">
                    <span className="c-bill__info">{b.orderCount} đơn · {b.itemCount} món</span>
                    <span className="c-bill__total">{fmtMoney(b.subtotal)}</span>
                  </div>
                  <span className="c-bill__time">Mở lúc {fmtTime(b.openedAt)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {bills.length === 0 && (
          <div className="c-empty">
            <p className="c-empty__title">Chưa có hóa đơn</p>
            <span className="c-empty__sub">Các bàn có đơn hàng sẽ hiển thị tại đây</span>
          </div>
        )}
      </main>

      {/* Bill detail modal */}
      {showModal && selectedBill && (
        <div className="c-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className={`c-modal ${paySuccess ? 'c-modal--success' : ''}`}>
            {/* Success animation overlay */}
            {paySuccess && (
              <div className="c-success-overlay">
                <div className="c-success-check">✓</div>
                <span className="c-success-text">Thanh toán thành công</span>
              </div>
            )}

            {/* Modal header */}
            <div className="c-modal__header">
              <div className="c-modal__header-info">
                <h2 className="c-modal__title">
                  Hóa đơn — {selectedBill.table.code}
                </h2>
                <p className="c-modal__sub">{selectedBill.table.name} · {selectedBill.table.area.name}</p>
              </div>
              <div className="c-modal__header-actions">
                <button className="c-modal__close" onClick={() => setShowModal(false)}>✕</button>
              </div>
            </div>

            {/* Modal body */}
            <div className="c-modal__body">
              {/* Orders */}
              {selectedBill.orders.map(order => (
                <div key={order.id} className="c-order-group">
                  <div className="c-order-group__head">
                    <span className="c-order-group__code">{order.orderCode}</span>
                    <span className="c-order-group__time">{fmtTime(order.createdAt)}</span>
                    {order.createdBy && <span className="c-order-group__by">{order.createdBy.name}</span>}
                  </div>
                  {order.items.map(item => (
                    <div key={item.id} className="c-item-row">
                      <span className="c-item-row__name">{item.quantity}x {item.itemNameSnapshot}</span>
                      <span className="c-item-row__price">{fmtMoney(Number(item.totalPrice))}</span>
                    </div>
                  ))}
                </div>
              ))}

              {/* Totals */}
              <div className="c-totals">
                <div className="c-totals__row">
                  <span>Tạm tính</span>
                  <span className="c-totals__val">{fmtMoney(selectedBill.subtotal)}</span>
                </div>

                {/* Discount */}
                <div className="c-input-row">
                  <span className="c-input-row__label">Giảm giá</span>
                  <div className="c-input-row__group">
                    <div className="c-toggle-group">
                      <button
                        className={`c-toggle ${discountType === 'amount' ? 'c-toggle--active' : ''}`}
                        onClick={() => setDiscountType('amount')}>VNĐ</button>
                      <button
                        className={`c-toggle ${discountType === 'percent' ? 'c-toggle--active' : ''}`}
                        onClick={() => setDiscountType('percent')}>%</button>
                    </div>
                    <input className="c-input" type="number" placeholder="0" value={discountInput}
                      onChange={e => setDiscountInput(e.target.value)} min="0" />
                  </div>
                </div>
                {calcDiscount() > 0 && (
                  <div className="c-totals__row c-totals__row--discount">
                    <span>Giảm</span>
                    <span>-{fmtMoney(calcDiscount())}</span>
                  </div>
                )}

                {/* Service charge */}
                <div className="c-input-row">
                  <span className="c-input-row__label">Phí dịch vụ</span>
                  <input className="c-input" type="number" placeholder="0" value={serviceChargeInput}
                    onChange={e => setServiceChargeInput(e.target.value)} min="0" />
                </div>
                {calcServiceCharge() > 0 && (
                  <div className="c-totals__row">
                    <span>Phí DV</span>
                    <span>+{fmtMoney(calcServiceCharge())}</span>
                  </div>
                )}

                <div className="c-totals__row c-totals__row--final">
                  <span>Tổng cộng</span>
                  <span>{fmtMoney(calcTotal())}</span>
                </div>
              </div>

              {/* Payment method */}
              <div className="c-pay-method">
                <label className="c-pay-method__label">Phương thức thanh toán</label>
                <div className="c-pay-method__grid">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.value}
                      className={`c-pay-method__btn ${paymentMethod === m.value ? 'c-pay-method__btn--active' : ''}`}
                      onClick={() => setPaymentMethod(m.value)}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="c-modal__footer">
              <button className="c-modal__cancel" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="c-modal__pay" onClick={handlePay} disabled={paying || calcTotal() <= 0}>
                {paying ? 'Đang xử lý...' : `Thanh toán ${fmtMoney(calcTotal())}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
/* ═══════════════════════════════════════
   CASHIER PAGE — Premium Dark Luxury
   ═══════════════════════════════════════ */

/* ─── Loading ─── */
.c-loading-screen {
  min-height: 100dvh;
  background: #08080d;
  display: flex;
  align-items: center;
  justify-content: center;
}
.c-loader {
  width: 56px;
  height: 2px;
  background: rgba(255,255,255,0.04);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}
.c-loader::after {
  content: '';
  position: absolute;
  top: 0;
  left: -56px;
  width: 56px;
  height: 100%;
  background: linear-gradient(90deg, transparent, #22c55e, transparent);
  animation: c-slide 1.2s ease-in-out infinite;
}
@keyframes c-slide { 0% { left: -56px } 100% { left: 56px } }

/* ─── Root ─── */
.c-root {
  min-height: 100dvh;
  background: #08080d;
  color: #f5f5f7;
  font-family: 'Inter', -apple-system, sans-serif;
  display: flex;
  flex-direction: column;
}

/* ─── Toast ─── */
.c-toast {
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
  animation: c-toast-in 0.35s cubic-bezier(0.16,1,0.3,1);
  box-shadow: 0 12px 40px rgba(0,0,0,0.6);
  max-width: 90vw;
  text-align: center;
  backdrop-filter: blur(12px);
}
.c-toast--success { background: rgba(20,83,45,0.92); color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
.c-toast--error { background: rgba(69,10,10,0.92); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
@keyframes c-toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-16px) scale(0.95); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

/* ═══ Header ═══ */
.c-header {
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
.c-header__left { display: flex; align-items: center; }
.c-header__title {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: #22c55e;
}
.c-header__center { display: flex; align-items: center; }
.c-clock {
  font-size: 0.78rem;
  font-weight: 500;
  color: rgba(255,255,255,0.35);
  letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums;
}
.c-header__right { display: flex; align-items: center; gap: 10px; }
.c-header__pending {
  font-size: 0.7rem;
  font-weight: 700;
  color: #a855f7;
  background: rgba(168,85,247,0.08);
  padding: 4px 10px;
  border-radius: 40px;
  border: 1px solid rgba(168,85,247,0.12);
  animation: c-pulse-pending 2s ease-in-out infinite;
}
@keyframes c-pulse-pending {
  0%,100% { box-shadow: 0 0 0 0 rgba(168,85,247,0.3); }
  50% { box-shadow: 0 0 0 5px rgba(168,85,247,0); }
}
.c-header__user {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.4);
  font-weight: 500;
  display: none;
}
.c-header__logout {
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
.c-header__logout:hover { background: rgba(239,68,68,0.15); }

/* ═══ Stats ═══ */
.c-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 16px;
}
.c-stat {
  padding: 14px;
  border-radius: 12px;
  background: rgba(20,20,30,0.6);
  border: 1px solid rgba(255,255,255,0.04);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.c-stat__label {
  font-size: 0.62rem;
  color: rgba(255,255,255,0.3);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.c-stat__value { font-size: 1.4rem; font-weight: 800; }
.c-stat__value--purple { color: #a855f7; }
.c-stat__value--blue { color: #3b82f6; }
.c-stat__value--gold { color: #D4A84A; }

/* ═══ Body ═══ */
.c-body { padding: 0 16px 32px; flex: 1; }
.c-section { margin-bottom: 24px; }
.c-section__title {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255,255,255,0.3);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 10px;
}

/* ═══ Bill grid ═══ */
.c-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
.c-bill {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  padding: 16px;
  background: rgba(20,20,30,0.6);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  color: inherit;
  transition: all 0.15s;
}
.c-bill:hover {
  background: rgba(28,28,42,0.7);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}
.c-bill--urgent {
  border-color: rgba(168,85,247,0.15);
  animation: c-bill-pulse 2s ease-in-out infinite;
}
@keyframes c-bill-pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(168,85,247,0.15); }
  50% { box-shadow: 0 0 0 3px rgba(168,85,247,0); }
}
.c-bill__top { display: flex; align-items: center; justify-content: space-between; }
.c-bill__code { font-size: 1.1rem; font-weight: 800; color: #D4A84A; }
.c-bill__badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 40px;
}
.c-bill__badge--purple { background: rgba(168,85,247,0.08); color: #a855f7; }
.c-bill__badge--blue { background: rgba(59,130,246,0.08); color: #3b82f6; }
.c-bill__area { font-size: 0.72rem; color: rgba(255,255,255,0.25); }
.c-bill__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.c-bill__info { font-size: 0.75rem; color: rgba(255,255,255,0.45); }
.c-bill__total { font-size: 1rem; font-weight: 800; color: #f5f5f7; }
.c-bill__time { font-size: 0.68rem; color: rgba(255,255,255,0.2); }

/* ═══ Empty state ═══ */
.c-empty {
  text-align: center;
  padding: 56px 20px;
  background: rgba(20,20,30,0.4);
  border: 1px solid rgba(255,255,255,0.03);
  border-radius: 14px;
}
.c-empty__title { font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
.c-empty__sub { font-size: 0.78rem; color: rgba(255,255,255,0.2); }

/* ═══ Modal overlay ═══ */
.c-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 0;
  animation: c-overlay-in 0.2s ease;
}
@keyframes c-overlay-in { from { opacity: 0; } to { opacity: 1; } }

.c-modal {
  background: #161622;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 600px;
  max-height: 92vh;
  overflow-y: auto;
  animation: c-modal-up 0.35s cubic-bezier(0.16,1,0.3,1);
  position: relative;
}
.c-modal--success { pointer-events: none; }
@keyframes c-modal-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* ─── Success overlay ─── */
.c-success-overlay {
  position: absolute;
  inset: 0;
  background: rgba(22,22,34,0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 20px 20px 0 0;
  animation: c-success-in 0.4s cubic-bezier(0.16,1,0.3,1);
}
@keyframes c-success-in { from { opacity: 0; } to { opacity: 1; } }
.c-success-check {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(34,197,94,0.1);
  border: 2px solid #22c55e;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #22c55e;
  font-weight: 700;
  margin-bottom: 16px;
  animation: c-check-pop 0.5s cubic-bezier(0.16,1,0.3,1);
}
@keyframes c-check-pop {
  from { transform: scale(0); }
  to { transform: scale(1); }
}
.c-success-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: #22c55e;
}

/* ─── Modal header ─── */
.c-modal__header {
  padding: 20px 20px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.c-modal__header-info { flex: 1; }
.c-modal__title { font-size: 1.05rem; font-weight: 800; color: #f5f5f7; }
.c-modal__sub { font-size: 0.75rem; color: rgba(255,255,255,0.3); margin-top: 2px; }
.c-modal__header-actions { display: flex; gap: 8px; }
.c-modal__close {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.35);
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.c-modal__close:hover { color: #f5f5f7; background: rgba(255,255,255,0.06); }

/* ─── Modal body ─── */
.c-modal__body { padding: 16px 20px; }

/* ─── Order groups ─── */
.c-order-group {
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}
.c-order-group:last-of-type { border-bottom: none; }
.c-order-group__head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.c-order-group__code { font-size: 0.72rem; font-weight: 700; color: #D4A84A; }
.c-order-group__time { font-size: 0.68rem; color: rgba(255,255,255,0.25); }
.c-order-group__by { font-size: 0.68rem; color: rgba(255,255,255,0.4); margin-left: auto; }
.c-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}
.c-item-row__name { font-size: 0.82rem; color: #f5f5f7; }
.c-item-row__price { font-size: 0.82rem; font-weight: 700; color: rgba(255,255,255,0.5); }

/* ─── Totals ─── */
.c-totals {
  background: rgba(255,255,255,0.02);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 16px;
  border: 1px solid rgba(255,255,255,0.03);
}
.c-totals__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 0.85rem;
  color: rgba(255,255,255,0.5);
}
.c-totals__val { font-weight: 700; color: #f5f5f7; }
.c-totals__row--discount { color: #ef4444; }
.c-totals__row--final {
  padding-top: 12px;
  margin-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.04);
  font-size: 1.05rem;
  font-weight: 800;
  color: #22c55e;
}

/* ─── Input rows ─── */
.c-input-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  gap: 8px;
}
.c-input-row__label { font-size: 0.78rem; color: rgba(255,255,255,0.45); white-space: nowrap; }
.c-input-row__group { display: flex; gap: 6px; align-items: center; }
.c-input {
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(26,26,36,0.8);
  border: 1px solid rgba(255,255,255,0.06);
  color: #f5f5f7;
  font-size: 0.82rem;
  font-family: inherit;
  outline: none;
  min-height: 44px;
  width: 100px;
  transition: border-color 0.2s;
}
.c-input:focus { border-color: rgba(34,197,94,0.35); }

/* ─── Toggle group (discount type) ─── */
.c-toggle-group {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.06);
}
.c-toggle {
  padding: 8px 12px;
  font-size: 0.72rem;
  font-weight: 600;
  background: rgba(26,26,36,0.8);
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  border: none;
  min-height: 44px;
  transition: all 0.15s;
}
.c-toggle--active {
  background: rgba(34,197,94,0.08);
  color: #22c55e;
}

/* ─── Payment method ─── */
.c-pay-method { margin-bottom: 8px; }
.c-pay-method__label {
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(255,255,255,0.3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 10px;
}
.c-pay-method__grid {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 2px;
}
.c-pay-method__grid::-webkit-scrollbar { display: none; }
.c-pay-method__btn {
  padding: 12px 18px;
  border-radius: 40px;
  font-size: 0.78rem;
  font-weight: 600;
  background: rgba(26,26,36,0.8);
  border: 1px solid rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  transition: all 0.15s;
  min-height: 48px;
  white-space: nowrap;
  flex-shrink: 0;
}
.c-pay-method__btn:hover { border-color: rgba(34,197,94,0.15); color: rgba(255,255,255,0.6); }
.c-pay-method__btn--active {
  background: rgba(34,197,94,0.06);
  border-color: rgba(34,197,94,0.25);
  color: #22c55e;
}

/* ─── Modal footer ─── */
.c-modal__footer {
  padding: 14px 20px 24px;
  border-top: 1px solid rgba(255,255,255,0.04);
  display: flex;
  gap: 10px;
}
.c-modal__cancel {
  flex: 0 0 auto;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 600;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.45);
  cursor: pointer;
  min-height: 52px;
  transition: all 0.15s;
}
.c-modal__cancel:hover { background: rgba(255,255,255,0.06); color: #f5f5f7; }
.c-modal__pay {
  flex: 1;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 700;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #08080d;
  border: none;
  cursor: pointer;
  min-height: 52px;
  transition: opacity 0.15s;
  box-shadow: 0 4px 20px rgba(34,197,94,0.2);
}
.c-modal__pay:disabled { opacity: 0.4; cursor: wait; }
.c-modal__pay:hover:not(:disabled) { opacity: 0.9; }

/* ═══ Responsive ═══ */
@media (min-width: 768px) {
  .c-header { padding: 0 24px; }
  .c-stats { padding: 16px 24px; gap: 12px; }
  .c-body { padding: 0 24px 32px; }
  .c-header__user { display: block; }
  .c-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .c-overlay { align-items: center; padding: 24px; }
  .c-modal { border-radius: 20px; max-height: 85vh; }
  .c-success-overlay { border-radius: 20px; }
}

@media (min-width: 1024px) {
  .c-body { max-width: 960px; margin: 0 auto; width: 100%; }
  .c-stats { max-width: 960px; margin: 0 auto; width: 100%; }
  .c-grid { grid-template-columns: repeat(3, 1fr); }
}
`;
