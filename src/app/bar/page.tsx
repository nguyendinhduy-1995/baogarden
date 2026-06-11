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
    osc.stop(ctx.currentTime + 0.3);
  } catch { /* silent fail */ }
}

// ==================== COMPONENT ====================
export default function BarPage() {
  const [items, setItems] = useState<OrderItemData[]>([]);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [areaFilter, setAreaFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const prevPendingCount = useRef(0);

  const fetchData = useCallback(async () => {
    try {
      const url = areaFilter ? `/api/bar/orders?area=${encodeURIComponent(areaFilter)}` : '/api/bar/orders';
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
      const res = await fetch(`/api/bar/order-items/${itemId}`, {
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

  return (
    <>
      <style>{BR_CSS}</style>
      <div className="br-page">
        {/* Header */}
        <header className="br-header">
          <div className="br-header-left">
            <h1 className="br-title">BAR</h1>
            {pending.length > 0 && (
              <span className="br-badge">{pending.length}</span>
            )}
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
          {/* PENDING Column */}
          <div className="br-column">
            <div className="br-col-header br-col-pending">
              <span>Đã nhận</span>
              <span className="br-col-count">{pending.length}</span>
            </div>
            <div className="br-col-body">
              {pending.map(item => (
                <BarCard
                  key={item.id}
                  item={item}
                  onAction={() => updateStatus(item.id, 'PREPARING')}
                  actionLabel="Bắt đầu pha"
                  actionClass="br-btn-accept"
                  isUpdating={updatingId === item.id}
                />
              ))}
              {pending.length === 0 && <div className="br-col-empty">Không có đơn mới</div>}
            </div>
          </div>

          {/* PREPARING Column */}
          <div className="br-column">
            <div className="br-col-header br-col-preparing">
              <span>Đang pha</span>
              <span className="br-col-count">{preparing.length}</span>
            </div>
            <div className="br-col-body">
              {preparing.map(item => (
                <BarCard
                  key={item.id}
                  item={item}
                  onAction={() => updateStatus(item.id, 'READY')}
                  actionLabel="Hoàn thành"
                  actionClass="br-btn-done"
                  isUpdating={updatingId === item.id}
                />
              ))}
              {preparing.length === 0 && <div className="br-col-empty">Không có đồ đang pha</div>}
            </div>
          </div>

          {/* READY Column */}
          <div className="br-column">
            <div className="br-col-header br-col-ready">
              <span>Hoàn thành</span>
              <span className="br-col-count">{ready.length}</span>
            </div>
            <div className="br-col-body">
              {ready.map(item => (
                <BarCard
                  key={item.id}
                  item={item}
                  onAction={() => updateStatus(item.id, 'SERVED')}
                  actionLabel="Đã phục vụ"
                  actionClass="br-btn-served"
                  isUpdating={updatingId === item.id}
                />
              ))}
              {ready.length === 0 && <div className="br-col-empty">Chưa có đồ hoàn thành</div>}
            </div>
          </div>
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
        <span className="br-card-qty">{item.quantity}x</span>
        {item.itemNameSnapshot}
      </div>
      {item.note && <div className="br-card-note">{item.note}</div>}
      <div className="br-card-meta">
        <span className="br-card-source">{item.order.source === 'CUSTOMER_QR' ? 'QR' : 'NV'}</span>
        <span className="br-card-area">{item.order.session.table.area.name}</span>
      </div>
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

.br-page{
  min-height:100vh;background:#0a0c14;color:#e8e8e8;
  font-family:'Inter',system-ui,-apple-system,sans-serif;
  display:flex;flex-direction:column;
}

.br-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;color:#999}
.br-spinner{width:36px;height:36px;border:3px solid #333;border-top-color:#8b5cf6;border-radius:50%;animation:br-spin .8s linear infinite}
@keyframes br-spin{to{transform:rotate(360deg)}}

/* Header */
.br-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 20px;border-bottom:1px solid #1a1a2e;
  background:#0a0c14;position:sticky;top:0;z-index:10;
}
.br-header-left{display:flex;align-items:center;gap:12px}
.br-title{font-size:24px;font-weight:800;color:#8b5cf6;letter-spacing:2px}
.br-badge{
  background:#ef4444;color:#fff;font-size:14px;font-weight:700;
  min-width:28px;height:28px;border-radius:14px;
  display:flex;align-items:center;justify-content:center;
  padding:0 8px;animation:br-pulse 2s infinite;
}
@keyframes br-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}

.br-header-right{display:flex;gap:8px}
.br-area-filter{
  padding:8px 14px;border-radius:8px;background:#151528;
  border:1px solid #2a2a44;color:#ccc;font-size:13px;
  outline:none;cursor:pointer;min-height:44px;
}

/* Kanban */
.br-kanban{
  flex:1;display:flex;gap:0;overflow-x:auto;
  -webkit-overflow-scrolling:touch;
}
.br-column{flex:1;min-width:280px;display:flex;flex-direction:column;border-right:1px solid #1a1a2e}
.br-column:last-child{border-right:none}

.br-col-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:12px 16px;font-size:15px;font-weight:700;
  position:sticky;top:0;z-index:5;text-transform:uppercase;letter-spacing:1px;
}
.br-col-pending{background:#14122a;color:#a78bfa;border-bottom:3px solid #8b5cf6}
.br-col-preparing{background:#12142a;color:#60a5fa;border-bottom:3px solid #3b82f6}
.br-col-ready{background:#121a14;color:#4ade80;border-bottom:3px solid #4ade80}
.br-col-count{
  font-size:13px;min-width:26px;height:26px;border-radius:13px;
  display:flex;align-items:center;justify-content:center;
  background:rgba(255,255,255,.1);
}
.br-col-body{flex:1;padding:8px;overflow-y:auto}
.br-col-empty{text-align:center;padding:40px 12px;color:#555;font-size:14px}

/* Card */
.br-card{
  background:#12142a;border:1px solid #1e1e3a;border-radius:10px;
  padding:14px;margin-bottom:8px;transition:border-color .2s;
}
.br-card-overdue{border-color:#ef4444;background:#1a1020}
.br-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.br-card-table{
  font-size:14px;font-weight:700;color:#a78bfa;
  padding:3px 10px;border-radius:6px;background:#8b5cf618;
}
.br-card-time{font-size:13px;color:#888}
.br-time-overdue{color:#ef4444;font-weight:700}
.br-card-name{font-size:18px;font-weight:600;color:#e8e8e8;margin-bottom:6px;line-height:1.3}
.br-card-qty{color:#a78bfa;margin-right:6px}
.br-card-note{
  font-size:13px;color:#60a5fa;background:#60a5fa15;
  padding:6px 10px;border-radius:6px;margin-bottom:8px;
  border-left:3px solid #3b82f6;
}
.br-card-meta{display:flex;gap:8px;margin-bottom:10px}
.br-card-source,.br-card-area{
  font-size:11px;color:#888;padding:2px 8px;border-radius:4px;background:#151528;
}
.br-action-btn{
  width:100%;padding:10px;border-radius:8px;border:none;
  font-size:14px;font-weight:600;cursor:pointer;
  transition:all .15s;min-height:44px;
}
.br-action-btn:active{transform:scale(.97)}
.br-action-btn:disabled{opacity:.6;cursor:default;transform:none}
.br-btn-accept{background:#8b5cf6;color:#fff}
.br-btn-done{background:#4ade80;color:#0a0c14}
.br-btn-served{background:#2a2a44;color:#ccc}

/* Responsive */
@media(max-width:900px){
  .br-kanban{flex-direction:column}
  .br-column{min-width:100%;border-right:none;border-bottom:1px solid #1a1a2e}
  .br-column:last-child{border-bottom:none}
}
`;
