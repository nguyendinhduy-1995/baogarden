'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './order-dashboard.module.css';

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
  DRAFT: { label: 'Nháp', cls: 'badgeGray' }, SUBMITTED: { label: 'Đã gửi', cls: 'badgeBlue' },
  PROCESSING: { label: 'Đang xử lý', cls: 'badgeOrange' }, READY: { label: 'Sẵn sàng', cls: 'badgeGreen' },
  SERVED: { label: 'Đã phục vụ', cls: 'badgeGray' }, PAID: { label: 'Đã TT', cls: 'badgeGreenFilled' },
  CANCELLED: { label: 'Đã hủy', cls: 'badgeRed' }, PAYMENT_REQUESTED: { label: 'Chờ TT', cls: 'badgePurple' },
  PARTIALLY_PROCESSING: { label: 'Đang xử lý 1 phần', cls: 'badgeOrange' },
};
const SERVICE_TYPE_LABELS: Record<string, string> = {
  CALL_WAITER: 'Gọi phục vụ', REQUEST_PAYMENT: 'Thanh toán', ADD_ICE: 'Thêm đá',
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
  const [clock, setClock] = useState('');

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

  // Live clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

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

  if (!authChecked || loading) return (
    <div className={styles.loadingWrap}>
      <div className={styles.loader} />
    </div>
  );

  const statCards = [
    { label: 'Bàn đang phục vụ', value: `${data?.tablesOccupied || 0}/${data?.totalTables || 0}`, color: '#ef4444', borderCls: styles.borderRed },
    { label: 'Bếp chờ xử lý', value: data?.kitchenPending || 0, color: '#f59e0b', borderCls: styles.borderOrange },
    { label: 'Bar chờ xử lý', value: data?.barPending || 0, color: '#3b82f6', borderCls: styles.borderBlue },
    { label: 'Đang chuẩn bị', value: data?.itemsPreparing || 0, color: '#facc15', borderCls: styles.borderYellow },
    { label: 'Sẵn sàng phục vụ', value: data?.itemsReady || 0, color: '#4ade80', borderCls: styles.borderGreen },
    { label: 'Chờ thanh toán', value: data?.tablesWaitingPayment || 0, color: '#a855f7', borderCls: styles.borderPurple },
    { label: 'Doanh thu dự kiến', value: fmtMoney(data?.revenueEstimated || 0), color: '#D4A84A', borderCls: styles.borderGold },
    { label: 'Doanh thu thực thu', value: fmtMoney(data?.revenuePaid || 0), color: '#4ade80', borderCls: styles.borderGreen },
  ];

  return (
    <div className={styles.root}>
      {/* ─── Header ─── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerTitle}>Quản lý Order</span>
        </div>
        <div className={styles.headerCenter}>
          <span className={styles.clock}>{clock}</span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.refreshIndicator}>
            <span className={styles.refreshDot} />
            <span>Auto-refresh</span>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>Đăng xuất</button>
        </div>
      </header>

      {/* ─── Body ─── */}
      <div className={styles.body}>
        {/* ─── Stat Cards ─── */}
        <div className={styles.statsGrid}>
          {statCards.map((s, i) => (
            <div key={i} className={`${styles.statCard} ${s.borderCls}`}>
              <span className={styles.statValue} style={{ color: s.color }}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ─── Gold Separator ─── */}
        <div className={styles.goldSeparator} />

        {/* ─── 3-Column Layout ─── */}
        <div className={styles.columnsGrid}>
          {/* ─ Left: Top Items ─ */}
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Món bán chạy</h3>
            {data?.topItems && data.topItems.length > 0 ? (
              <div className={styles.cardList}>
                {data.topItems.map((item, i) => (
                  <div key={item.menuItemId} className={styles.topItem}>
                    <span className={styles.topRank}>#{i + 1}</span>
                    <div className={styles.topInfo}>
                      <span className={styles.topName}>{item.name}</span>
                      <span className={styles.topRevenue}>{fmtMoney(item.totalRevenue)}</span>
                    </div>
                    <span className={styles.topQty}>{item.totalQuantity} phần</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>Chưa có dữ liệu</div>
            )}
          </div>

          {/* ─ Center: Recent Orders ─ */}
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Đơn hàng gần đây</h3>
            {data?.recentOrders && data.recentOrders.length > 0 ? (
              <div className={styles.cardList}>
                {data.recentOrders.map(order => {
                  const st = ORDER_STATUS_LABELS[order.status];
                  return (
                    <div key={order.id} className={styles.orderItem}>
                      <div className={styles.orderTop}>
                        <span className={styles.orderCode}>{order.orderCode}</span>
                        <span className={`${styles.badge} ${styles[st?.cls || 'badgeGray']}`}>
                          {st?.label || order.status}
                        </span>
                      </div>
                      <div className={styles.orderMeta}>
                        <span>Bàn {order.tableCode}</span>
                        <span>{order.itemCount} món</span>
                        <span>{fmtMoney(order.subtotal)}</span>
                      </div>
                      <div className={styles.orderFoot}>
                        <span className={styles.orderBy}>{order.createdBy} · {SOURCE_LABELS[order.source] || order.source}</span>
                        <span className={styles.orderTime}>{fmtTime(order.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.empty}>Chưa có đơn hàng</div>
            )}
          </div>

          {/* ─ Right: Service Requests ─ */}
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>
              Yêu cầu phục vụ
              {serviceReqs.length > 0 && <span className={styles.panelBadge}>{serviceReqs.length}</span>}
            </h3>
            {serviceReqs.length === 0 ? (
              <div className={styles.empty}>Không có yêu cầu</div>
            ) : (
              <div className={styles.cardList}>
                {serviceReqs.map(r => (
                  <div key={r.id} className={styles.reqItem}>
                    <div className={styles.reqTop}>
                      <span className={styles.reqTable}>{r.table.code}</span>
                      <span className={styles.reqType}>{SERVICE_TYPE_LABELS[r.type] || r.type}</span>
                      <span className={styles.reqTime}>{fmtTime(r.createdAt)}</span>
                    </div>
                    {r.note && <p className={styles.reqNote}>{r.note}</p>}
                    <button className={styles.reqDoneBtn} onClick={() => resolveReq(r.id)}>Xử lý xong</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className={styles.footer}>
        Báo Garden Management System
      </footer>
    </div>
  );
}
