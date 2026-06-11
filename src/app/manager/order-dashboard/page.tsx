'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/* ─── Types ─── */
interface AuthUser { id: string; name: string; role: string }
interface DashboardData {
  tablesOccupied: number; totalTables: number; kitchenPending: number;
  barPending: number; itemsPreparing: number; itemsReady: number;
  tablesWaitingPayment: number; revenueEstimated: number; revenuePaid: number;
  topItems: Array<{ menuItemId: string; name: string; totalQuantity: number; totalRevenue: number }>;
  recentOrders: Array<{
    id: string; orderCode: string; status: string; source: string;
    subtotal: number; itemCount: number; tableCode: string; tableName: string;
    createdBy: string; createdAt: string;
  }>;
}
interface ServiceReq { id: string; type: string; note: string | null; status: string; createdAt: string; table: { id: string; code: string; name: string } }

const ORDER_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Nháp', cls: 'md-badge-gray' }, SUBMITTED: { label: 'Đã gửi', cls: 'md-badge-blue' },
  PROCESSING: { label: 'Đang xử lý', cls: 'md-badge-purple' }, READY: { label: 'Sẵn sàng', cls: 'md-badge-green' },
  SERVED: { label: 'Đã phục vụ', cls: 'md-badge-gray' }, PAID: { label: 'Đã TT', cls: 'md-badge-green' },
  CANCELLED: { label: 'Đã hủy', cls: 'md-badge-red' }, PAYMENT_REQUESTED: { label: 'Chờ TT', cls: 'md-badge-warn' },
  PARTIALLY_PROCESSING: { label: 'Đang xử lý 1 phần', cls: 'md-badge-purple' },
};
const SERVICE_TYPE_LABELS: Record<string, string> = {
  CALL_WAITER: 'Gọi phục vụ', REQUEST_PAYMENT: 'Yêu cầu TT', ADD_ICE: 'Thêm đá',
  CLEAN_TABLE: 'Dọn bàn', OTHER: 'Khác',
};
const SOURCE_LABELS: Record<string, string> = { CUSTOMER_QR: 'Khách QR', WAITER: 'Phục vụ', MANAGER: 'Quản lý' };

function fmtMoney(n: number) { return new Intl.NumberFormat('vi-VN').format(n) + 'đ'; }
function fmtTime(d: string) { return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); }

export default function ManagerOrderDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [serviceReqs, setServiceReqs] = useState<ServiceReq[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth check
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) { router.replace('/login'); return; }
        const d = await res.json();
        if (!d.success || !d.user) { router.replace('/login'); return; }
        const u = d.user as AuthUser;
        if (!['MANAGER', 'ADMIN'].includes(u.role)) { router.replace('/login'); return; }
        setUser(u);
        setAuthChecked(true);
      } catch { router.replace('/login'); }
    })();
  }, [router]);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [dashRes, reqRes] = await Promise.all([
        fetch('/api/manager/order-dashboard'),
        fetch('/api/service-requests?status=PENDING'),
      ]);
      if (dashRes.ok) { const d = await dashRes.json(); if (d.success) setData(d.data); }
      if (reqRes.ok) { const d = await reqRes.json(); if (d.success) setServiceReqs(d.data); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    loadData();
    const iv = setInterval(loadData, 10000);
    return () => clearInterval(iv);
  }, [authChecked, loadData]);

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    router.replace('/login');
  };

  const resolveReq = async (id: string) => {
    try {
      await fetch('/api/service-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'DONE' }),
      });
      loadData();
    } catch { /* silent */ }
  };

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Chào buổi sáng' : now.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  if (!authChecked || loading) return (
    <div style={{ minHeight: '100dvh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{CSS}</style>
      <div className="md-loader" />
    </div>
  );

  return (
    <div className="md-root">
      <style>{CSS}</style>

      {/* Header */}
      <header className="md-header">
        <div className="md-header-l">
          <span className="md-brand">Báo Garden</span>
          <div className="md-header-info">
            <span className="md-greeting">{greeting}, {user?.name}</span>
            <span className="md-date">Dashboard đơn hàng</span>
          </div>
        </div>
        <button className="md-logout" onClick={handleLogout}>Đăng xuất</button>
      </header>

      <div className="md-body">
        {/* Stat cards */}
        <div className="md-stats">
          {[
            { label: 'Bàn đang phục vụ', value: `${data?.tablesOccupied || 0}/${data?.totalTables || 0}`, color: '#3b82f6' },
            { label: 'Bếp chờ', value: data?.kitchenPending || 0, color: '#f59e0b' },
            { label: 'Bar chờ', value: data?.barPending || 0, color: '#a855f7' },
            { label: 'Đang chuẩn bị', value: data?.itemsPreparing || 0, color: '#3b82f6' },
            { label: 'Sẵn sàng phục vụ', value: data?.itemsReady || 0, color: '#4ade80' },
            { label: 'Chờ thanh toán', value: data?.tablesWaitingPayment || 0, color: '#ef4444' },
            { label: 'Doanh thu dự kiến', value: fmtMoney(data?.revenueEstimated || 0), color: '#D4A84A' },
            { label: 'Doanh thu thực', value: fmtMoney(data?.revenuePaid || 0), color: '#4ade80' },
          ].map((s, i) => (
            <div key={i} className="md-stat">
              <span className="md-stat-label">{s.label}</span>
              <span className="md-stat-val" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>

        <div className="md-grid">
          {/* Left column */}
          <div className="md-col">
            {/* Top selling */}
            {data?.topItems && data.topItems.length > 0 && (
              <div className="md-section">
                <h3 className="md-sec-title">Món bán chạy hôm nay</h3>
                <div className="md-card-list">
                  {data.topItems.map((item, i) => (
                    <div key={item.menuItemId} className="md-top-item">
                      <span className="md-top-rank">#{i + 1}</span>
                      <div className="md-top-info">
                        <span className="md-top-name">{item.name}</span>
                        <span className="md-top-revenue">{fmtMoney(item.totalRevenue)}</span>
                      </div>
                      <span className="md-top-qty">{item.totalQuantity} phần</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent orders */}
            {data?.recentOrders && data.recentOrders.length > 0 && (
              <div className="md-section">
                <h3 className="md-sec-title">Đơn hàng gần đây</h3>
                <div className="md-card-list">
                  {data.recentOrders.map(order => {
                    const st = ORDER_STATUS_LABELS[order.status];
                    return (
                      <div key={order.id} className="md-order-item">
                        <div className="md-order-top">
                          <span className="md-order-code">{order.orderCode}</span>
                          <span className={`md-badge ${st?.cls || 'md-badge-gray'}`}>{st?.label || order.status}</span>
                        </div>
                        <div className="md-order-meta">
                          <span>Bàn {order.tableCode}</span>
                          <span>{order.itemCount} món</span>
                          <span>{fmtMoney(order.subtotal)}</span>
                        </div>
                        <div className="md-order-foot">
                          <span className="md-order-by">{order.createdBy} · {SOURCE_LABELS[order.source] || order.source}</span>
                          <span className="md-order-time">{fmtTime(order.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="md-col">
            {/* Service requests */}
            <div className="md-section">
              <h3 className="md-sec-title">
                Yêu cầu phục vụ
                {serviceReqs.length > 0 && <span className="md-sec-badge">{serviceReqs.length}</span>}
              </h3>
              {serviceReqs.length === 0 ? (
                <div className="md-empty">Không có yêu cầu</div>
              ) : (
                <div className="md-card-list">
                  {serviceReqs.map(r => (
                    <div key={r.id} className="md-req-item">
                      <div className="md-req-top">
                        <span className="md-req-table">{r.table.code}</span>
                        <span className="md-req-type">{SERVICE_TYPE_LABELS[r.type] || r.type}</span>
                        <span className="md-req-time">{fmtTime(r.createdAt)}</span>
                      </div>
                      {r.note && <p className="md-req-note">{r.note}</p>}
                      <button className="md-req-done" onClick={() => resolveReq(r.id)}>Xử lý xong</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
/* ═══ Manager Dashboard ═══ */
.md-root{min-height:100dvh;background:#0a0a0f;color:#f5f5f7;font-family:'Inter',-apple-system,sans-serif}
.md-loader{width:48px;height:2px;background:rgba(255,255,255,0.06);border-radius:1px;overflow:hidden;position:relative}
.md-loader::after{content:'';position:absolute;top:0;left:-48px;width:48px;height:100%;background:#D4A84A;animation:md-slide 1s ease-in-out infinite}
@keyframes md-slide{0%{left:-48px}100%{left:48px}}

/* Header */
.md-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);background:#111118;position:sticky;top:0;z-index:100}
.md-header-l{display:flex;align-items:center;gap:14px}
.md-brand{font-family:'Playfair Display',serif;font-size:1rem;font-weight:700;color:#D4A84A}
.md-header-info{display:flex;flex-direction:column;gap:1px}
.md-greeting{font-size:0.85rem;font-weight:600;color:#f5f5f7}
.md-date{font-size:0.72rem;color:#71717a;text-transform:uppercase;letter-spacing:0.04em}
.md-logout{padding:8px 14px;border-radius:8px;font-size:0.78rem;font-weight:600;background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.15);cursor:pointer;font-family:inherit;min-height:44px}

/* Body */
.md-body{padding:20px;max-width:1200px;margin:0 auto}

/* Stats */
.md-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}
.md-stat{padding:16px;border-radius:12px;background:#14141e;border:1px solid rgba(255,255,255,0.06)}
.md-stat-label{display:block;font-size:0.7rem;color:#71717a;font-weight:500;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px}
.md-stat-val{font-size:1.3rem;font-weight:800;letter-spacing:-0.01em}

/* Grid layout */
.md-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.md-col{display:flex;flex-direction:column;gap:20px}

/* Section */
.md-section{background:#14141e;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:16px}
.md-sec-title{font-size:0.9rem;font-weight:700;color:#f5f5f7;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.md-sec-badge{background:#ef4444;color:#fff;font-size:0.65rem;font-weight:700;padding:2px 7px;border-radius:10px;min-width:18px;text-align:center}

/* Card list */
.md-card-list{display:flex;flex-direction:column;gap:8px}

/* Top items */
.md-top-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.02)}
.md-top-item:hover{background:rgba(255,255,255,0.04)}
.md-top-rank{font-size:0.82rem;font-weight:800;color:#D4A84A;width:28px}
.md-top-info{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.md-top-name{font-size:0.85rem;font-weight:600;color:#f5f5f7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.md-top-revenue{font-size:0.72rem;color:#71717a}
.md-top-qty{font-size:0.78rem;font-weight:700;color:#a1a1aa;flex-shrink:0}

/* Order items */
.md-order-item{padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.02)}
.md-order-item:hover{background:rgba(255,255,255,0.04)}
.md-order-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.md-order-code{font-size:0.82rem;font-weight:700;color:#D4A84A}
.md-badge{display:inline-block;padding:3px 8px;border-radius:6px;font-size:0.68rem;font-weight:600;white-space:nowrap}
.md-badge-gray{background:rgba(107,114,128,0.12);color:#9ca3af}
.md-badge-blue{background:rgba(59,130,246,0.12);color:#3b82f6}
.md-badge-green{background:rgba(74,222,128,0.12);color:#4ade80}
.md-badge-red{background:rgba(239,68,68,0.12);color:#ef4444}
.md-badge-purple{background:rgba(168,85,247,0.12);color:#a855f7}
.md-badge-warn{background:rgba(245,158,11,0.12);color:#f59e0b}
.md-order-meta{display:flex;gap:12px;font-size:0.78rem;color:#a1a1aa;margin-bottom:4px}
.md-order-foot{display:flex;justify-content:space-between;align-items:center}
.md-order-by{font-size:0.72rem;color:#71717a}
.md-order-time{font-size:0.72rem;color:#71717a}

/* Service requests */
.md-req-item{padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.02)}
.md-req-top{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.md-req-table{font-size:0.9rem;font-weight:800;color:#D4A84A}
.md-req-type{font-size:0.75rem;font-weight:600;color:#f5f5f7;background:rgba(59,130,246,0.1);padding:3px 8px;border-radius:6px}
.md-req-time{font-size:0.7rem;color:#71717a;margin-left:auto}
.md-req-note{font-size:0.78rem;color:#a1a1aa;margin-bottom:6px}
.md-req-done{width:100%;padding:8px;border-radius:8px;font-size:0.78rem;font-weight:600;background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.15);cursor:pointer;font-family:inherit;min-height:44px}
.md-req-done:hover{background:rgba(74,222,128,0.2)}

/* Empty */
.md-empty{text-align:center;padding:24px;color:#71717a;font-size:0.85rem}

/* Responsive */
@media(max-width:1024px){
  .md-stats{grid-template-columns:repeat(2,1fr)}
  .md-grid{grid-template-columns:1fr}
}
@media(max-width:640px){
  .md-stats{grid-template-columns:1fr 1fr}
  .md-stat{padding:12px}
  .md-stat-val{font-size:1.1rem}
  .md-body{padding:16px}
  .md-header{padding:12px 16px}
  .md-header-info{display:none}
}
`;
