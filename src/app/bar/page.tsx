'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

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

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 660;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.onended = () => ctx.close();
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

  return <span className="br-clock">{time}</span>;
}

// ==================== COMPONENT ====================
export default function BarPage() {
  const router = useRouter();
  const [items, setItems] = useState<OrderItemData[]>([]);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [areaFilter, setAreaFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [statusError, setStatusError] = useState('');
  const prevPendingCount = useRef(0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    try {
      const url = areaFilter ? `/api/bar/orders?area=${encodeURIComponent(areaFilter)}` : '/api/bar/orders';
      const res = await fetch(url);

      if (res.status === 403) {
        setAuthError(true);
        return;
      }

      const data = await res.json();

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
      router.replace('/login');
    }
  }, [authError, router]);

  const updateStatus = async (itemId: string, newStatus: string) => {
    if (updatingId) return;
    setUpdatingId(itemId);
    try {
      const res = await fetch(`/api/bar/order-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusError('');
        await fetchData();
      } else {
        setStatusError(data.error || 'Cập nhật thất bại');
      }
    } catch {
      setStatusError('Lỗi kết nối');
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
        <style>{BR_CSS}</style>
        <div className="br-page">
          <div className="br-loading">
            <div className="br-spinner" />
            <p>Đang tải dữ liệu bar...</p>
          </div>
        </div>
      </>
    );
  }

  const columns: { key: string; label: string; items: OrderItemData[]; colorClass: string; actionLabel: string; actionClass: string; nextStatus: string; emptyText: string }[] = [
    { key: 'pending', label: 'Chờ', items: pending, colorClass: 'br-dot-pending', actionLabel: 'Bắt đầu pha', actionClass: 'br-btn-accept', nextStatus: 'PREPARING', emptyText: 'Không có đơn chờ' },
    { key: 'preparing', label: 'Đang pha', items: preparing, colorClass: 'br-dot-preparing', actionLabel: 'Hoàn thành', actionClass: 'br-btn-done', nextStatus: 'READY', emptyText: 'Không có đồ đang pha' },
    { key: 'ready', label: 'Xong', items: ready, colorClass: 'br-dot-ready', actionLabel: 'Đã phục vụ', actionClass: 'br-btn-served', nextStatus: 'SERVED', emptyText: 'Chưa có đồ hoàn thành' },
  ];

  return (
    <>
      <style>{BR_CSS}</style>
      <div className="br-page">
        {statusError && <div style={{position:'fixed',top:12,left:'50%',transform:'translateX(-50%)',zIndex:999,padding:'10px 24px',borderRadius:12,background:'#2a1515ee',border:'1px solid rgba(239,68,68,0.3)',color:'#f87171',fontSize:13,fontWeight:600,backdropFilter:'blur(8px)',whiteSpace:'nowrap'}} onClick={() => setStatusError('')}>{statusError}</div>}
        {/* Header */}
        <header className="br-header">
          <div className="br-header-left">
            <h1 className="br-title">BAR</h1>
            {pending.length > 0 && (
              <span className="br-badge">{pending.length}</span>
            )}
          </div>
          <div className="br-header-center">
            <LiveClock />
          </div>
          <div className="br-header-right">
            <select
              className="br-area-filter"
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
        <div className="br-kanban">
          {columns.map(col => (
            <div className="br-column" key={col.key}>
              <button
                className="br-col-header"
                onClick={() => toggleCollapse(col.key)}
                type="button"
              >
                <div className="br-col-header-left">
                  <span className={`br-dot ${col.colorClass}`} />
                  <span className="br-col-label">{col.label}</span>
                </div>
                <span className="br-col-count">{col.items.length}</span>
              </button>
              {!collapsed[col.key] && (
                <div className="br-col-body">
                  {col.items.map(item => (
                    <BarCard
                      key={item.id}
                      item={item}
                      onAction={() => updateStatus(item.id, col.nextStatus)}
                      actionLabel={col.actionLabel}
                      actionClass={col.actionClass}
                      isUpdating={updatingId === item.id}
                    />
                  ))}
                  {col.items.length === 0 && <div className="br-col-empty">{col.emptyText}</div>}
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
function BarCard({ item, onAction, actionLabel, actionClass, isUpdating }: {
  item: OrderItemData;
  onAction: () => void;
  actionLabel: string;
  actionClass: string;
  isUpdating: boolean;
}) {
  const overdue = isOverdue(item.createdAt, item.menuItem.preparationTimeMinutes);

  return (
    <div className={`br-card ${overdue ? 'br-card-overdue' : ''}`}>
      <div className="br-card-top">
        <span className="br-card-table">{item.order.session.table.code}</span>
        <span className={`br-card-time ${overdue ? 'br-time-overdue' : ''}`}>{timeSince(item.createdAt)}</span>
      </div>
      <div className="br-card-name">
        <span className="br-card-qty">{item.quantity}×</span>
        {item.itemNameSnapshot}
      </div>
      {item.note && <div className="br-card-note">{item.note}</div>}
      <button
        className={`br-action-btn ${actionClass}`}
        onClick={onAction}
        disabled={isUpdating}
      >
        {isUpdating ? '...' : actionLabel}
      </button>
    </div>
  );
}

// ==================== CSS ====================
const BR_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

@keyframes br-fadeIn{
  from{opacity:0;transform:translateY(8px)}
  to{opacity:1;transform:translateY(0)}
}
@keyframes br-spin{to{transform:rotate(360deg)}}
@keyframes br-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}

.br-page{
  min-height:100vh;background:#08080d;color:#e8e8ec;
  font-family:'Inter',system-ui,-apple-system,sans-serif;
  display:flex;flex-direction:column;
}

.br-loading{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:100vh;gap:20px;color:#555;
}
.br-spinner{
  width:40px;height:40px;border:3px solid #1a1a22;
  border-top-color:#6366F1;border-radius:50%;
  animation:br-spin .8s linear infinite;
}

/* ===== Header ===== */
.br-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 24px;border-bottom:1px solid rgba(255,255,255,0.06);
  background:rgba(8,8,13,0.95);backdrop-filter:blur(12px);
  position:sticky;top:0;z-index:20;
}
.br-header-left{display:flex;align-items:center;gap:14px}
.br-header-center{position:absolute;left:50%;transform:translateX(-50%)}
.br-header-right{display:flex;align-items:center;gap:10px}

.br-title{
  font-size:28px;font-weight:900;color:#6366F1;
  letter-spacing:3px;text-transform:uppercase;
}
.br-badge{
  background:#dc2626;color:#fff;font-size:13px;font-weight:700;
  min-width:28px;height:28px;border-radius:14px;
  display:flex;align-items:center;justify-content:center;
  padding:0 8px;animation:br-pulse 2s ease-in-out infinite;
}
.br-clock{
  font-size:18px;font-weight:600;color:#D4A84A;
  letter-spacing:2px;font-variant-numeric:tabular-nums;
}
.br-area-filter{
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
.br-area-filter:focus{border-color:rgba(99,102,241,0.4)}

/* ===== Kanban ===== */
.br-kanban{
  flex:1;display:flex;gap:0;overflow-x:auto;
  -webkit-overflow-scrolling:touch;
}
.br-column{
  flex:1;min-width:300px;display:flex;flex-direction:column;
  border-right:1px solid rgba(255,255,255,0.04);
}
.br-column:last-child{border-right:none}

.br-col-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 20px;font-size:14px;font-weight:600;
  background:rgba(255,255,255,0.02);
  border-bottom:1px solid rgba(255,255,255,0.04);
  text-transform:uppercase;letter-spacing:1.5px;color:#888;
  border-top:none;border-left:none;border-right:none;
  cursor:pointer;width:100%;text-align:left;
  transition:background .15s;
}
.br-col-header:hover{background:rgba(255,255,255,0.04)}
.br-col-header-left{display:flex;align-items:center;gap:10px}

.br-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.br-dot-pending{background:#6366F1;box-shadow:0 0 8px rgba(99,102,241,0.5)}
.br-dot-preparing{background:#60a5fa;box-shadow:0 0 8px rgba(96,165,250,0.5)}
.br-dot-ready{background:#4ade80;box-shadow:0 0 8px rgba(74,222,128,0.5)}

.br-col-label{font-size:14px;font-weight:600;color:#999;letter-spacing:1.5px}
.br-col-count{
  font-size:13px;font-weight:700;min-width:28px;height:28px;
  border-radius:8px;display:flex;align-items:center;justify-content:center;
  background:rgba(255,255,255,0.05);color:#777;
}
.br-col-body{flex:1;padding:10px 12px;overflow-y:auto}
.br-col-empty{
  text-align:center;padding:60px 16px;color:#333;
  font-size:14px;font-style:italic;letter-spacing:0.5px;
}

/* ===== Card ===== */
.br-card{
  background:rgba(255,255,255,0.03);
  border:1px solid rgba(255,255,255,0.06);
  border-radius:14px;padding:18px 20px;margin-bottom:10px;
  transition:border-color .3s,box-shadow .3s,background .3s;
  animation:br-fadeIn .35s ease-out both;
}
.br-card:hover{
  border-color:rgba(255,255,255,0.1);
  background:rgba(255,255,255,0.045);
}
.br-card-overdue{
  border-color:rgba(220,38,38,0.35);
  box-shadow:0 0 16px -4px rgba(220,38,38,0.2);
  background:rgba(220,38,38,0.04);
}
.br-card-top{
  display:flex;justify-content:space-between;align-items:center;
  margin-bottom:12px;
}
.br-card-table{
  font-size:18px;font-weight:800;color:#818cf8;
  padding:4px 12px;border-radius:8px;
  background:rgba(99,102,241,0.1);letter-spacing:1px;
}
.br-card-time{
  font-size:14px;color:#555;font-weight:500;
  font-variant-numeric:tabular-nums;
}
.br-time-overdue{color:#ef4444;font-weight:700}
.br-card-name{
  font-size:22px;font-weight:700;color:#eee;
  margin-bottom:10px;line-height:1.35;
}
.br-card-qty{
  color:#818cf8;margin-right:8px;font-weight:800;
}
.br-card-note{
  font-size:14px;color:#FBBF24;
  background:rgba(251,191,36,0.08);
  padding:10px 14px;border-radius:10px;margin-bottom:14px;
  border-left:3px solid #FBBF24;line-height:1.4;
}
.br-action-btn{
  width:100%;padding:0;border-radius:12px;border:none;
  font-size:15px;font-weight:700;cursor:pointer;
  transition:all .15s ease;min-height:48px;
  display:flex;align-items:center;justify-content:center;
  letter-spacing:0.5px;
}
.br-action-btn:active{transform:scale(.97)}
.br-action-btn:disabled{opacity:.5;cursor:default;transform:none}
.br-btn-accept{background:#6366F1;color:#fff}
.br-btn-accept:hover:not(:disabled){background:#818cf8}
.br-btn-done{background:#4ade80;color:#08080d}
.br-btn-done:hover:not(:disabled){background:#6ee7a0}
.br-btn-served{background:rgba(255,255,255,0.06);color:#777}
.br-btn-served:hover:not(:disabled){background:rgba(255,255,255,0.1)}

/* ===== Responsive ===== */
@media(max-width:900px){
  .br-header{padding:12px 16px}
  .br-header-center{position:static;transform:none}
  .br-title{font-size:22px}
  .br-clock{font-size:15px}
  .br-kanban{flex-direction:column}
  .br-column{min-width:100%;border-right:none}
  .br-col-body{max-height:none}
  .br-card-name{font-size:20px}
  .br-card-table{font-size:16px}
}
@media(max-width:480px){
  .br-header{flex-wrap:wrap;gap:8px}
  .br-header-left{order:1}
  .br-header-center{order:3;width:100%;text-align:center}
  .br-header-right{order:2;margin-left:auto}
  .br-area-filter{min-width:120px;font-size:13px;padding:8px 12px}
}
`;
