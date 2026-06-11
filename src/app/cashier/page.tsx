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
        showToast('Thanh toán thành công!');
        setShowModal(false);
        setSelectedBill(null);
        loadBills();
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
    <div style={{ minHeight: '100dvh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{CSS}</style>
      <div className="cs-loader" />
    </div>
  );

  const paymentRequestedBills = bills.filter(b => b.status === 'PAYMENT_REQUESTED');
  const openBills = bills.filter(b => b.status === 'OPEN');

  return (
    <div className="cs-root">
      <style>{CSS}</style>

      {toast && <div className={`cs-toast cs-toast-${toast.type}`}>{toast.msg}</div>}

      {/* Header */}
      <header className="cs-header">
        <div className="cs-header-l">
          <span className="cs-brand">Báo Garden</span>
          <span className="cs-title">Thu ngân</span>
        </div>
        <div className="cs-header-r">
          <span className="cs-user-name">{user?.name}</span>
          <button className="cs-logout" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </header>

      {/* Stats */}
      <div className="cs-stats">
        <div className="cs-stat">
          <span className="cs-stat-label">Chờ thanh toán</span>
          <span className="cs-stat-val" style={{ color: '#a855f7' }}>{paymentRequestedBills.length}</span>
        </div>
        <div className="cs-stat">
          <span className="cs-stat-label">Bàn đang mở</span>
          <span className="cs-stat-val" style={{ color: '#3b82f6' }}>{openBills.length}</span>
        </div>
        <div className="cs-stat">
          <span className="cs-stat-label">Tổng bill</span>
          <span className="cs-stat-val" style={{ color: '#D4A84A' }}>{bills.length}</span>
        </div>
      </div>

      {/* Bills list */}
      <div className="cs-body">
        {paymentRequestedBills.length > 0 && (
          <div className="cs-section">
            <h3 className="cs-sec-title">Yêu cầu thanh toán</h3>
            <div className="cs-bill-list">
              {paymentRequestedBills.map(b => (
                <button key={b.id} className="cs-bill-card cs-bill-urgent" onClick={() => openBill(b.id)}>
                  <div className="cs-bill-top">
                    <span className="cs-bill-code">{b.table.code}</span>
                    <span className="cs-bill-area">{b.table.area.name}</span>
                    <span className="cs-bill-badge cs-bill-badge-purple">Chờ TT</span>
                  </div>
                  <div className="cs-bill-bottom">
                    <span className="cs-bill-info">{b.orderCount} đơn · {b.itemCount} món</span>
                    <span className="cs-bill-total">{fmtMoney(b.subtotal)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {openBills.length > 0 && (
          <div className="cs-section">
            <h3 className="cs-sec-title">Bàn đang mở</h3>
            <div className="cs-bill-list">
              {openBills.map(b => (
                <button key={b.id} className="cs-bill-card" onClick={() => openBill(b.id)}>
                  <div className="cs-bill-top">
                    <span className="cs-bill-code">{b.table.code}</span>
                    <span className="cs-bill-area">{b.table.area.name}</span>
                    <span className="cs-bill-badge cs-bill-badge-blue">Đang phục vụ</span>
                  </div>
                  <div className="cs-bill-bottom">
                    <span className="cs-bill-info">{b.orderCount} đơn · {b.itemCount} món</span>
                    <span className="cs-bill-total">{fmtMoney(b.subtotal)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {bills.length === 0 && (
          <div className="cs-empty">
            <p>Chưa có hóa đơn</p>
            <span>Các bàn có đơn hàng sẽ hiển thị tại đây</span>
          </div>
        )}
      </div>

      {/* Bill detail modal */}
      {showModal && selectedBill && (
        <div className="cs-modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="cs-modal">
            <div className="cs-modal-header">
              <div>
                <h2 className="cs-modal-title">
                  Hóa đơn — {selectedBill.table.code}
                </h2>
                <p className="cs-modal-sub">{selectedBill.table.name} · {selectedBill.table.area.name}</p>
              </div>
              <button className="cs-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="cs-modal-body">
              {/* Orders */}
              {selectedBill.orders.map(order => (
                <div key={order.id} className="cs-order-group">
                  <div className="cs-order-head">
                    <span className="cs-order-code">{order.orderCode}</span>
                    <span className="cs-order-time">{fmtTime(order.createdAt)}</span>
                    {order.createdBy && <span className="cs-order-by">{order.createdBy.name}</span>}
                  </div>
                  {order.items.map(item => (
                    <div key={item.id} className="cs-item-row">
                      <span className="cs-item-name">{item.quantity}x {item.itemNameSnapshot}</span>
                      <span className="cs-item-price">{fmtMoney(Number(item.totalPrice))}</span>
                    </div>
                  ))}
                </div>
              ))}

              {/* Totals */}
              <div className="cs-totals">
                <div className="cs-total-row">
                  <span>Tạm tính</span>
                  <span className="cs-total-val">{fmtMoney(selectedBill.subtotal)}</span>
                </div>

                {/* Discount */}
                <div className="cs-discount-row">
                  <span className="cs-discount-label">Giảm giá</span>
                  <div className="cs-discount-input-group">
                    <select className="cs-select" value={discountType} onChange={e => setDiscountType(e.target.value as 'amount' | 'percent')}>
                      <option value="amount">VNĐ</option>
                      <option value="percent">%</option>
                    </select>
                    <input className="cs-input cs-input-sm" type="number" placeholder="0" value={discountInput}
                      onChange={e => setDiscountInput(e.target.value)} min="0" />
                  </div>
                </div>
                {calcDiscount() > 0 && (
                  <div className="cs-total-row cs-total-discount">
                    <span>Giảm</span>
                    <span>-{fmtMoney(calcDiscount())}</span>
                  </div>
                )}

                {/* Service charge */}
                <div className="cs-discount-row">
                  <span className="cs-discount-label">Phí dịch vụ</span>
                  <input className="cs-input cs-input-sm" type="number" placeholder="0" value={serviceChargeInput}
                    onChange={e => setServiceChargeInput(e.target.value)} min="0" />
                </div>
                {calcServiceCharge() > 0 && (
                  <div className="cs-total-row">
                    <span>Phí DV</span>
                    <span>+{fmtMoney(calcServiceCharge())}</span>
                  </div>
                )}

                <div className="cs-total-row cs-total-final">
                  <span>Tổng cộng</span>
                  <span>{fmtMoney(calcTotal())}</span>
                </div>
              </div>

              {/* Payment method */}
              <div className="cs-payment-method">
                <label className="cs-pm-label">Phương thức thanh toán</label>
                <div className="cs-pm-grid">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.value} className={`cs-pm-btn ${paymentMethod === m.value ? 'cs-pm-active' : ''}`}
                      onClick={() => setPaymentMethod(m.value)}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="cs-modal-footer">
              <button className="cs-cancel-btn" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="cs-pay-btn" onClick={handlePay} disabled={paying || calcTotal() <= 0}>
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
/* ═══ Cashier ═══ */
.cs-root{min-height:100dvh;background:#0a0a0f;color:#f5f5f7;font-family:'Inter',-apple-system,sans-serif}
.cs-loader{width:48px;height:2px;background:rgba(255,255,255,0.06);border-radius:1px;overflow:hidden;position:relative}
.cs-loader::after{content:'';position:absolute;top:0;left:-48px;width:48px;height:100%;background:#D4A84A;animation:cs-slide 1s ease-in-out infinite}
@keyframes cs-slide{0%{left:-48px}100%{left:48px}}

/* Toast */
.cs-toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2000;padding:12px 24px;border-radius:12px;font-size:0.85rem;font-weight:600;animation:cs-toastin 0.3s ease;box-shadow:0 8px 30px rgba(0,0,0,0.5);max-width:90vw;text-align:center}
.cs-toast-success{background:#14532d;color:#4ade80;border:1px solid rgba(74,222,128,0.2)}
.cs-toast-error{background:#450a0a;color:#f87171;border:1px solid rgba(239,68,68,0.2)}
@keyframes cs-toastin{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* Header */
.cs-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);background:#111118;position:sticky;top:0;z-index:100}
.cs-header-l{display:flex;align-items:center;gap:12px}
.cs-brand{font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:#D4A84A}
.cs-title{font-size:0.78rem;color:#71717a;font-weight:500;text-transform:uppercase;letter-spacing:0.04em}
.cs-header-r{display:flex;align-items:center;gap:10px}
.cs-user-name{font-size:0.78rem;color:#a1a1aa;font-weight:600}
.cs-logout{padding:8px 14px;border-radius:8px;font-size:0.78rem;font-weight:600;background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.15);cursor:pointer;font-family:inherit;min-height:44px}

/* Stats */
.cs-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:16px}
.cs-stat{padding:14px;border-radius:12px;background:#14141e;border:1px solid rgba(255,255,255,0.06)}
.cs-stat-label{display:block;font-size:0.7rem;color:#71717a;font-weight:500;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px}
.cs-stat-val{font-size:1.3rem;font-weight:800}

/* Body */
.cs-body{padding:0 16px 24px}
.cs-section{margin-bottom:20px}
.cs-sec-title{font-size:0.82rem;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px}

/* Bill list */
.cs-bill-list{display:flex;flex-direction:column;gap:8px}
.cs-bill-card{display:block;width:100%;padding:14px;background:#14141e;border:1px solid rgba(255,255,255,0.06);border-radius:12px;cursor:pointer;text-align:left;color:inherit;font-family:inherit;transition:all 0.15s}
.cs-bill-card:hover{background:#1c1c2a;border-color:rgba(255,255,255,0.1)}
.cs-bill-urgent{border-color:rgba(168,85,247,0.2);border-left:3px solid #a855f7}
.cs-bill-top{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.cs-bill-code{font-size:1rem;font-weight:800;color:#D4A84A}
.cs-bill-area{font-size:0.75rem;color:#71717a}
.cs-bill-badge{font-size:0.68rem;font-weight:700;padding:3px 8px;border-radius:6px;margin-left:auto}
.cs-bill-badge-purple{background:rgba(168,85,247,0.12);color:#a855f7}
.cs-bill-badge-blue{background:rgba(59,130,246,0.12);color:#3b82f6}
.cs-bill-bottom{display:flex;justify-content:space-between;align-items:center}
.cs-bill-info{font-size:0.78rem;color:#a1a1aa}
.cs-bill-total{font-size:0.95rem;font-weight:800;color:#f5f5f7}

/* Empty */
.cs-empty{text-align:center;padding:48px 20px;background:#14141e;border:1px solid rgba(255,255,255,0.06);border-radius:12px}
.cs-empty p{font-size:0.9rem;font-weight:600;color:#a1a1aa;margin-bottom:4px}
.cs-empty span{font-size:0.78rem;color:#71717a}

/* Modal */
.cs-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;z-index:1000;padding:0;animation:cs-fadein 0.2s}
@keyframes cs-fadein{from{opacity:0}to{opacity:1}}
.cs-modal{background:#1e1e2e;border:1px solid rgba(255,255,255,0.1);border-radius:20px 20px 0 0;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;animation:cs-slideup 0.3s cubic-bezier(0.16,1,0.3,1)}
@keyframes cs-slideup{from{transform:translateY(100%)}to{transform:translateY(0)}}
.cs-modal-header{padding:20px 20px 14px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:flex-start}
.cs-modal-title{font-size:1.1rem;font-weight:800;color:#f5f5f7}
.cs-modal-sub{font-size:0.78rem;color:#71717a;margin-top:2px}
.cs-modal-close{width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,0.04);border:none;color:#71717a;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;min-width:44px;min-height:44px}
.cs-modal-body{padding:16px 20px}

/* Order groups */
.cs-order-group{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.04)}
.cs-order-group:last-of-type{border-bottom:none}
.cs-order-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.cs-order-code{font-size:0.75rem;font-weight:700;color:#D4A84A}
.cs-order-time{font-size:0.7rem;color:#71717a}
.cs-order-by{font-size:0.7rem;color:#a1a1aa;margin-left:auto}
.cs-item-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0}
.cs-item-name{font-size:0.82rem;color:#f5f5f7}
.cs-item-price{font-size:0.82rem;font-weight:700;color:#a1a1aa}

/* Totals */
.cs-totals{background:rgba(255,255,255,0.02);border-radius:12px;padding:14px;margin-bottom:16px}
.cs-total-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:0.85rem;color:#a1a1aa}
.cs-total-val{font-weight:700;color:#f5f5f7}
.cs-total-discount{color:#ef4444}
.cs-total-final{padding-top:10px;margin-top:8px;border-top:1px solid rgba(255,255,255,0.06);font-size:1rem;font-weight:800;color:#D4A84A}

/* Discount */
.cs-discount-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;gap:8px}
.cs-discount-label{font-size:0.78rem;color:#a1a1aa;white-space:nowrap}
.cs-discount-input-group{display:flex;gap:4px;align-items:center}
.cs-input{padding:8px 12px;border-radius:8px;background:#1a1a24;border:1px solid rgba(255,255,255,0.08);color:#f5f5f7;font-size:0.82rem;font-family:inherit;outline:none;min-height:40px}
.cs-input:focus{border-color:rgba(212,168,74,0.4)}
.cs-input-sm{width:100px}
.cs-select{padding:8px 10px;border-radius:8px;background:#1a1a24;border:1px solid rgba(255,255,255,0.08);color:#f5f5f7;font-size:0.78rem;font-family:inherit;outline:none;appearance:none;cursor:pointer;min-height:40px}

/* Payment method */
.cs-payment-method{margin-bottom:16px}
.cs-pm-label{display:block;font-size:0.78rem;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px}
.cs-pm-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cs-pm-btn{padding:12px;border-radius:10px;font-size:0.82rem;font-weight:600;background:#1a1a24;border:1px solid rgba(255,255,255,0.06);color:#a1a1aa;cursor:pointer;font-family:inherit;transition:all 0.15s;min-height:48px}
.cs-pm-btn:hover{border-color:rgba(212,168,74,0.2);color:#f5f5f7}
.cs-pm-active{background:rgba(212,168,74,0.08);border-color:rgba(212,168,74,0.3);color:#fbbf24}

/* Modal footer */
.cs-modal-footer{padding:14px 20px 20px;border-top:1px solid rgba(255,255,255,0.06);display:flex;gap:10px}
.cs-cancel-btn{flex:0 0 auto;padding:12px 20px;border-radius:10px;font-size:0.85rem;font-weight:600;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#a1a1aa;cursor:pointer;font-family:inherit;min-height:48px}
.cs-pay-btn{flex:1;padding:12px 20px;border-radius:10px;font-size:0.85rem;font-weight:700;background:linear-gradient(135deg,#fbbf24,#d97706);color:#0a0a0f;border:none;cursor:pointer;font-family:inherit;min-height:48px}
.cs-pay-btn:disabled{opacity:0.5;cursor:wait}
.cs-pay-btn:hover:not(:disabled){opacity:0.9}

/* Desktop */
@media(min-width:768px){
  .cs-modal-overlay{align-items:center;padding:24px}
  .cs-modal{border-radius:20px;max-height:85vh}
  .cs-body{padding:0 24px 24px}
  .cs-stats{padding:16px 24px}
  .cs-header{padding:12px 24px}
  .cs-bill-list{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
}
@media(min-width:1024px){
  .cs-body{max-width:900px;margin:0 auto;width:100%}
  .cs-stats{max-width:900px;margin:0 auto;width:100%}
}
`;
