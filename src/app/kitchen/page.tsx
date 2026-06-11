'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ==================== TYPES ====================
interface OrderItemData {
  id: string;
  itemNameSnapshot: string;
  quantity: number;
  note: string | null;
  status: string;
  createdAt: string;
  department: string;
  order: {
    id: string;
    orderCode: string;
    source: string;
    session: {
      table: {
        code: string;
        name: string;
        area: { id: string; name: string };
      };
    };
  };
  menuItem: {
    preparationTimeMinutes: number;
  };
}

interface AreaData {
  id: string;
  name: string;
}

// ==================== HELPERS ====================
function timeSince(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin}p`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return `${h}h${m > 0 ? m + 'p' : ''}`;
}

function isOverdue(dateStr: string, prepMinutes: number): boolean {
  const elapsed = (Date.now() - new Date(dateStr).getTime()) / 60000;
  return elapsed > prepMinutes;
}

// Simple beep using AudioContext
function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
  } catch { /* silent fail */ }
}

// ==================== LIVE CLOCK ====================
function LiveClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="kt-clock">{time}</span>;
}

// ==================== COMPONENT ====================
export default function KitchenPage() {
  const [items, setItems] = useState<OrderItemData[]>([]);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [areaFilter, setAreaFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const prevPendingCount = useRef(0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    try {
      const url = areaFilter ? `/api/kitchen/orders?area=${encodeURIComponent(areaFilter)}` : '/api/kitchen/orders';
      const res = await fetch(url);
      const data = await res.json();

      if (res.status === 403) {
        setAuthError(true);
        return;
      }

      if (data.success) {
        const newItems = data.data.items as OrderItemData[];
        const newPending = newItems.filter(i => i.status === 'PENDING').length;

        if (newPending > prevPendingCount.current && prevPendingCount.current >= 0) {
          playBeep();
        }
        prevPendingCount.current = newPending;

        setItems(newItems);
        setAreas(data.data.areas || []);
      }
    } catch { /* retry next interval */ }
    finally { setLoading(false); }
  }, [areaFilter]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (authError) {
      window.location.href = '/login';
    }
  }, [authError]);

  const updateStatus = async (itemId: string, newStatus: string) => {
    if (updatingId) return;
    setUpdatingId(itemId);
    try {
      const res = await fetch(`/api/kitchen/order-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      } else {
        alert(data.error || 'Cập nhật thất bại');
      }
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setUpdatingId('');
    }
  };

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const pending = items.filter(i => i.status === 'PENDING' || i.status === 'ACCEPTED');
  const preparing = items.filter(i => i.status === 'PREPARING');
  const ready = items.filter(i => i.status === 'READY');

  if (loading) {
    return (
      <>
        <style>{KT_CSS}</style>
        <div className="kt-page">
          <div className="kt-loading">
            <div className="kt-spinner" />
            <p>Đang tải dữ liệu bếp...</p>
          </div>
        </div>
      </>
    );
  }

  const columns: { key: string; label: string; items: OrderItemData[]; colorClass: string; actionLabel: string; actionClass: string; nextStatus: string; emptyText: string }[] = [
    { key: 'pending', label: 'Chờ', items: pending, colorClass: 'kt-dot-pending', actionLabel: 'Nhận làm', actionClass: 'kt-btn-accept', nextStatus: 'PREPARING', emptyText: 'Không có món chờ' },
    { key: 'preparing', label: 'Đang làm', items: preparing, colorClass: 'kt-dot-preparing', actionLabel: 'Hoàn thành', actionClass: 'kt-btn-done', nextStatus: 'READY', emptyText: 'Không có món đang làm' },
    { key: 'ready', label: 'Xong', items: ready, colorClass: 'kt-dot-ready', actionLabel: 'Đã phục vụ', actionClass: 'kt-btn-served', nextStatus: 'SERVED', emptyText: 'Chưa có món hoàn thành' },
  ];

  return (
    <>
      <style>{KT_CSS}</style>
      <div className="kt-page">
        {/* Header */}
        <header className="kt-header">
          <div className="kt-header-left">
            <h1 className="kt-title">BẾP</h1>
            {pending.length > 0 && (
              <span className="kt-badge">{pending.length}</span>
            )}
          </div>
          <div className="kt-header-center">
            <LiveClock />
          </div>
          <div className="kt-header-right">
            <select
              className="kt-area-filter"
              value={areaFilter}
              onChange={e => setAreaFilter(e.target.value)}
            >
              <option value="">Tất cả khu vực</option>
              {areas.map(a => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </select>
          </div>
        </header>

        {/* Kanban Columns */}
        <div className="kt-kanban">
          {columns.map(col => (
            <div className="kt-column" key={col.key}>
              <button
                className="kt-col-header"
                onClick={() => toggleCollapse(col.key)}
                type="button"
              >
                <div className="kt-col-header-left">
                  <span className={`kt-dot ${col.colorClass}`} />
                  <span className="kt-col-label">{col.label}</span>
                </div>
                <span className="kt-col-count">{col.items.length}</span>
              </button>
              {!collapsed[col.key] && (
                <div className="kt-col-body">
                  {col.items.map(item => (
                    <KitchenCard
                      key={item.id}
                      item={item}
                      onAction={() => updateStatus(item.id, col.nextStatus)}
                      actionLabel={col.actionLabel}
                      actionClass={col.actionClass}
                      isUpdating={updatingId === item.id}
                    />
                  ))}
                  {col.items.length === 0 && <div className="kt-col-empty">{col.emptyText}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ==================== CARD COMPONENT ====================
function KitchenCard({ item, onAction, actionLabel, actionClass, isUpdating }: {
  item: OrderItemData;
  onAction: () => void;
  actionLabel: string;
  actionClass: string;
  isUpdating: boolean;
}) {
  const overdue = isOverdue(item.createdAt, item.menuItem.preparationTimeMinutes);

  return (
    <div className={`kt-card ${overdue ? 'kt-card-overdue' : ''}`}>
      <div className="kt-card-top">
        <span className="kt-card-table">{item.order.session.table.code}</span>
        <span className={`kt-card-time ${overdue ? 'kt-time-overdue' : ''}`}>{timeSince(item.createdAt)}</span>
      </div>
      <div className="kt-card-name">
        <span className="kt-card-qty">{item.quantity}×</span>
        {item.itemNameSnapshot}
      </div>
      {item.note && <div className="kt-card-note">{item.note}</div>}
      <button
        className={`kt-action-btn ${actionClass}`}
        onClick={onAction}
        disabled={isUpdating}
      >
        {isUpdating ? '...' : actionLabel}
      </button>
    </div>
  );
}

// ==================== CSS ====================
const KT_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

@keyframes kt-fadeIn{
  from{opacity:0;transform:translateY(8px)}
  to{opacity:1;transform:translateY(0)}
}
@keyframes kt-spin{to{transform:rotate(360deg)}}
@keyframes kt-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
@keyframes kt-glow{
  0%,100%{box-shadow:0 0 8px 0 rgba(249,115,22,0.15)}
  50%{box-shadow:0 0 20px 2px rgba(249,115,22,0.3)}
}

.kt-page{
  min-height:100vh;background:#08080d;color:#e8e8ec;
  font-family:'Inter',system-ui,-apple-system,sans-serif;
  display:flex;flex-direction:column;
}

.kt-loading{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:100vh;gap:20px;color:#555;
}
.kt-spinner{
  width:40px;height:40px;border:3px solid #1a1a22;
  border-top-color:#F97316;border-radius:50%;
  animation:kt-spin .8s linear infinite;
}

/* ===== Header ===== */
.kt-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 24px;border-bottom:1px solid rgba(255,255,255,0.06);
  background:rgba(8,8,13,0.95);backdrop-filter:blur(12px);
  position:sticky;top:0;z-index:20;
}
.kt-header-left{display:flex;align-items:center;gap:14px}
.kt-header-center{position:absolute;left:50%;transform:translateX(-50%)}
.kt-header-right{display:flex;align-items:center;gap:10px}

.kt-title{
  font-size:28px;font-weight:900;color:#F97316;
  letter-spacing:3px;text-transform:uppercase;
}
.kt-badge{
  background:#dc2626;color:#fff;font-size:13px;font-weight:700;
  min-width:28px;height:28px;border-radius:14px;
  display:flex;align-items:center;justify-content:center;
  padding:0 8px;animation:kt-pulse 2s ease-in-out infinite;
}
.kt-clock{
  font-size:18px;font-weight:600;color:#D4A84A;
  letter-spacing:2px;font-variant-numeric:tabular-nums;
}
.kt-area-filter{
  padding:10px 16px;border-radius:10px;
  background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
  color:#bbb;font-size:14px;outline:none;cursor:pointer;
  min-height:44px;min-width:140px;
  transition:border-color .2s;
  -webkit-appearance:none;appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23888' viewBox='0 0 16 16'%3E%3Cpath d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 12px center;
  padding-right:32px;
}
.kt-area-filter:focus{border-color:rgba(249,115,22,0.4)}

/* ===== Kanban ===== */
.kt-kanban{
  flex:1;display:flex;gap:0;overflow-x:auto;
  -webkit-overflow-scrolling:touch;
}
.kt-column{
  flex:1;min-width:300px;display:flex;flex-direction:column;
  border-right:1px solid rgba(255,255,255,0.04);
}
.kt-column:last-child{border-right:none}

.kt-col-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 20px;font-size:14px;font-weight:600;
  background:rgba(255,255,255,0.02);
  border-bottom:1px solid rgba(255,255,255,0.04);
  text-transform:uppercase;letter-spacing:1.5px;color:#888;
  border:none;cursor:pointer;width:100%;text-align:left;
  transition:background .15s;
}
.kt-col-header:hover{background:rgba(255,255,255,0.04)}
.kt-col-header-left{display:flex;align-items:center;gap:10px}

.kt-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.kt-dot-pending{background:#F97316;box-shadow:0 0 8px rgba(249,115,22,0.5)}
.kt-dot-preparing{background:#FBBF24;box-shadow:0 0 8px rgba(251,191,36,0.5)}
.kt-dot-ready{background:#4ade80;box-shadow:0 0 8px rgba(74,222,128,0.5)}

.kt-col-label{font-size:14px;font-weight:600;color:#999;letter-spacing:1.5px}
.kt-col-count{
  font-size:13px;font-weight:700;min-width:28px;height:28px;
  border-radius:8px;display:flex;align-items:center;justify-content:center;
  background:rgba(255,255,255,0.05);color:#777;
}
.kt-col-body{flex:1;padding:10px 12px;overflow-y:auto}
.kt-col-empty{
  text-align:center;padding:60px 16px;color:#333;
  font-size:14px;font-style:italic;letter-spacing:0.5px;
}

/* ===== Card ===== */
.kt-card{
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.06);
  border-radius:14px;padding:18px 20px;margin-bottom:10px;
  transition:border-color .3s,box-shadow .3s,background .3s;
  animation:kt-fadeIn .35s ease-out both;
}
.kt-card:hover{
  border-color:rgba(255,255,255,0.1);
  background:rgba(255,255,255,0.045);
}
.kt-card-overdue{
  border-color:rgba(220,38,38,0.35);
  box-shadow:0 0 16px -4px rgba(220,38,38,0.2);
  background:rgba(220,38,38,0.04);
}
.kt-card-top{
  display:flex;justify-content:space-between;align-items:center;
  margin-bottom:12px;
}
.kt-card-table{
  font-size:18px;font-weight:800;color:#F97316;
  padding:4px 12px;border-radius:8px;
  background:rgba(249,115,22,0.1);letter-spacing:1px;
}
.kt-card-time{
  font-size:14px;color:#555;font-weight:500;
  font-variant-numeric:tabular-nums;
}
.kt-time-overdue{color:#ef4444;font-weight:700}
.kt-card-name{
  font-size:22px;font-weight:700;color:#eee;
  margin-bottom:10px;line-height:1.35;
}
.kt-card-qty{
  color:#F97316;margin-right:8px;font-weight:800;
}
.kt-card-note{
  font-size:14px;color:#FBBF24;
  background:rgba(251,191,36,0.08);
  padding:10px 14px;border-radius:10px;margin-bottom:14px;
  border-left:3px solid #FBBF24;line-height:1.4;
}
.kt-action-btn{
  width:100%;padding:0;border-radius:12px;border:none;
  font-size:15px;font-weight:700;cursor:pointer;
  transition:all .15s ease;min-height:48px;
  display:flex;align-items:center;justify-content:center;
  letter-spacing:0.5px;
}
.kt-action-btn:active{transform:scale(.97)}
.kt-action-btn:disabled{opacity:.5;cursor:default;transform:none}
.kt-btn-accept{background:#F97316;color:#08080d}
.kt-btn-accept:hover:not(:disabled){background:#fb923c}
.kt-btn-done{background:#4ade80;color:#08080d}
.kt-btn-done:hover:not(:disabled){background:#6ee7a0}
.kt-btn-served{background:rgba(255,255,255,0.06);color:#777}
.kt-btn-served:hover:not(:disabled){background:rgba(255,255,255,0.1)}

/* ===== Responsive ===== */
@media(max-width:900px){
  .kt-header{padding:12px 16px}
  .kt-header-center{position:static;transform:none}
  .kt-title{font-size:22px}
  .kt-clock{font-size:15px}
  .kt-kanban{flex-direction:column}
  .kt-column{min-width:100%;border-right:none}
  .kt-col-body{max-height:none}
  .kt-card-name{font-size:20px}
  .kt-card-table{font-size:16px}
}
@media(max-width:480px){
  .kt-header{flex-wrap:wrap;gap:8px}
  .kt-header-left{order:1}
  .kt-header-center{order:3;width:100%;text-align:center}
  .kt-header-right{order:2;margin-left:auto}
  .kt-area-filter{min-width:120px;font-size:13px;padding:8px 12px}
}
`;
