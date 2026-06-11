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

// ==================== COMPONENT ====================
export default function KitchenPage() {
  const [items, setItems] = useState<OrderItemData[]>([]);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [areaFilter, setAreaFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const prevPendingCount = useRef(0);

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
          {/* PENDING Column */}
          <div className="kt-column">
            <div className="kt-col-header kt-col-pending">
              <span>Mới nhận</span>
              <span className="kt-col-count">{pending.length}</span>
            </div>
            <div className="kt-col-body">
              {pending.map(item => (
                <KitchenCard
                  key={item.id}
                  item={item}
                  onAction={() => updateStatus(item.id, 'PREPARING')}
                  actionLabel="Nhận làm"
                  actionClass="kt-btn-accept"
                  isUpdating={updatingId === item.id}
                />
              ))}
              {pending.length === 0 && <div className="kt-col-empty">Không có món mới</div>}
            </div>
          </div>

          {/* PREPARING Column */}
          <div className="kt-column">
            <div className="kt-col-header kt-col-preparing">
              <span>Đang làm</span>
              <span className="kt-col-count">{preparing.length}</span>
            </div>
            <div className="kt-col-body">
              {preparing.map(item => (
                <KitchenCard
                  key={item.id}
                  item={item}
                  onAction={() => updateStatus(item.id, 'READY')}
                  actionLabel="Hoàn thành"
                  actionClass="kt-btn-done"
                  isUpdating={updatingId === item.id}
                />
              ))}
              {preparing.length === 0 && <div className="kt-col-empty">Không có món đang làm</div>}
            </div>
          </div>

          {/* READY Column */}
          <div className="kt-column">
            <div className="kt-col-header kt-col-ready">
              <span>Hoàn thành</span>
              <span className="kt-col-count">{ready.length}</span>
            </div>
            <div className="kt-col-body">
              {ready.map(item => (
                <KitchenCard
                  key={item.id}
                  item={item}
                  onAction={() => updateStatus(item.id, 'SERVED')}
                  actionLabel="Đã phục vụ"
                  actionClass="kt-btn-served"
                  isUpdating={updatingId === item.id}
                />
              ))}
              {ready.length === 0 && <div className="kt-col-empty">Chưa có món hoàn thành</div>}
            </div>
          </div>
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
        <span className="kt-card-qty">{item.quantity}x</span>
        {item.itemNameSnapshot}
      </div>
      {item.note && <div className="kt-card-note">{item.note}</div>}
      <div className="kt-card-meta">
        <span className="kt-card-source">{item.order.source === 'CUSTOMER_QR' ? 'QR' : 'NV'}</span>
        <span className="kt-card-area">{item.order.session.table.area.name}</span>
      </div>
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

.kt-page{
  min-height:100vh;background:#0c0c12;color:#e8e8e8;
  font-family:'Inter',system-ui,-apple-system,sans-serif;
  display:flex;flex-direction:column;
}

.kt-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;color:#999}
.kt-spinner{width:36px;height:36px;border:3px solid #333;border-top-color:#ff8c42;border-radius:50%;animation:kt-spin .8s linear infinite}
@keyframes kt-spin{to{transform:rotate(360deg)}}

/* Header */
.kt-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 20px;border-bottom:1px solid #1a1a24;
  background:#0c0c12;position:sticky;top:0;z-index:10;
}
.kt-header-left{display:flex;align-items:center;gap:12px}
.kt-title{font-size:24px;font-weight:800;color:#ff8c42;letter-spacing:2px}
.kt-badge{
  background:#ff4444;color:#fff;font-size:14px;font-weight:700;
  min-width:28px;height:28px;border-radius:14px;
  display:flex;align-items:center;justify-content:center;
  padding:0 8px;animation:kt-pulse 2s infinite;
}
@keyframes kt-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}

.kt-header-right{display:flex;gap:8px}
.kt-area-filter{
  padding:8px 14px;border-radius:8px;background:#1a1a24;
  border:1px solid #2a2a34;color:#ccc;font-size:13px;
  outline:none;cursor:pointer;min-height:44px;
}

/* Kanban */
.kt-kanban{
  flex:1;display:flex;gap:0;overflow-x:auto;
  -webkit-overflow-scrolling:touch;
}
.kt-column{flex:1;min-width:280px;display:flex;flex-direction:column;border-right:1px solid #1a1a24}
.kt-column:last-child{border-right:none}

.kt-col-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:12px 16px;font-size:15px;font-weight:700;
  position:sticky;top:0;z-index:5;text-transform:uppercase;letter-spacing:1px;
}
.kt-col-pending{background:#1a1412;color:#ff8c42;border-bottom:3px solid #ff8c42}
.kt-col-preparing{background:#1a1812;color:#ffc042;border-bottom:3px solid #ffc042}
.kt-col-ready{background:#121a14;color:#4ade80;border-bottom:3px solid #4ade80}
.kt-col-count{
  font-size:13px;min-width:26px;height:26px;border-radius:13px;
  display:flex;align-items:center;justify-content:center;
  background:rgba(255,255,255,.1);
}
.kt-col-body{flex:1;padding:8px;overflow-y:auto}
.kt-col-empty{text-align:center;padding:40px 12px;color:#555;font-size:14px}

/* Card */
.kt-card{
  background:#161620;border:1px solid #1e1e2a;border-radius:10px;
  padding:14px;margin-bottom:8px;transition:border-color .2s;
}
.kt-card-overdue{border-color:#ff4444;background:#1a1014}
.kt-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.kt-card-table{
  font-size:14px;font-weight:700;color:#ff8c42;
  padding:3px 10px;border-radius:6px;background:#ff8c4218;
}
.kt-card-time{font-size:13px;color:#888}
.kt-time-overdue{color:#ff4444;font-weight:700}
.kt-card-name{font-size:18px;font-weight:600;color:#e8e8e8;margin-bottom:6px;line-height:1.3}
.kt-card-qty{color:#ff8c42;margin-right:6px}
.kt-card-note{
  font-size:13px;color:#ffc042;background:#ffc04215;
  padding:6px 10px;border-radius:6px;margin-bottom:8px;
  border-left:3px solid #ffc042;
}
.kt-card-meta{display:flex;gap:8px;margin-bottom:10px}
.kt-card-source,.kt-card-area{
  font-size:11px;color:#888;padding:2px 8px;border-radius:4px;background:#1a1a24;
}
.kt-action-btn{
  width:100%;padding:10px;border-radius:8px;border:none;
  font-size:14px;font-weight:600;cursor:pointer;
  transition:all .15s;min-height:44px;
}
.kt-action-btn:active{transform:scale(.97)}
.kt-action-btn:disabled{opacity:.6;cursor:default;transform:none}
.kt-btn-accept{background:#ff8c42;color:#0c0c12}
.kt-btn-done{background:#4ade80;color:#0c0c12}
.kt-btn-served{background:#3a3a4a;color:#ccc}

/* Responsive */
@media(max-width:900px){
  .kt-kanban{flex-direction:column}
  .kt-column{min-width:100%;border-right:none;border-bottom:1px solid #1a1a24}
  .kt-column:last-child{border-bottom:none}
}
`;
