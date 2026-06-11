'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface BookingCustomer { id: string; name: string; phone: string; }
interface BookingTable { id: string; code: string; name: string; area: { id: string; name: string }; }
interface BookingEvent { id: string; type: string; oldStatus: string | null; newStatus: string | null; note: string | null; createdAt: string; user: { name: string } | null; }
interface Booking {
  id: string; bookingCode: string; bookingDate: string; bookingTime: string;
  guestCount: number; status: string; depositAmount: number; minSpend: number;
  note: string | null; source: string; createdAt: string;
  customer: BookingCustomer; table: BookingTable; createdByUser: { name: string } | null;
  events?: BookingEvent[];
}
interface TableOption {
  id: string; code: string; name: string; minGuests: number; maxGuests: number;
  depositAmount: number; minSpend: number; area: { id: string; name: string };
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ xác nhận', cls: 'bk-badge-warn' },
  CONFIRMED: { label: 'Đã xác nhận', cls: 'bk-badge-blue' },
  ARRIVED: { label: 'Đã đến', cls: 'bk-badge-green' },
  CANCELLED: { label: 'Đã hủy', cls: 'bk-badge-red' },
  NO_SHOW: { label: 'Không đến', cls: 'bk-badge-gray' },
  COMPLETED: { label: 'Hoàn tất', cls: 'bk-badge-purple' },
};

const TIME_SLOTS: string[] = [];
for (let h = 17; h <= 23; h++) { TIME_SLOTS.push(`${h.toString().padStart(2,'0')}:00`); TIME_SLOTS.push(`${h.toString().padStart(2,'0')}:30`); }
for (let h = 0; h <= 3; h++) { TIME_SLOTS.push(`${h.toString().padStart(2,'0')}:00`); if (h < 3) TIME_SLOTS.push(`${h.toString().padStart(2,'0')}:30`); }

function fmtCurrency(n: number) { return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + 'đ'; }
function fmtDate(s: string) { if (!s) return ''; const d = new Date(s); const dd = String(d.getDate()).padStart(2,'0'); const mm = String(d.getMonth()+1).padStart(2,'0'); return `${dd}/${mm}/${d.getFullYear()}`; }
function fmtDateTime(s: string) { if (!s) return ''; const d = new Date(s); return `${fmtDate(s)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function today() { return new Date().toISOString().split('T')[0]; }

const EVENT_LABELS: Record<string, string> = {
  CREATED: 'Tạo booking', CONFIRMED: 'Xác nhận', ARRIVED: 'Khách đến',
  CANCELLED: 'Hủy', NO_SHOW: 'Không đến', COMPLETED: 'Hoàn tất',
  UPDATED: 'Cập nhật', TABLE_CHANGED: 'Đổi bàn', NOTE_ADDED: 'Thêm ghi chú',
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(today());
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<Booking | null>(null);
  const [detailEvents, setDetailEvents] = useState<BookingEvent[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; action: string; code: string } | null>(null);
  const [changeTable, setChangeTable] = useState<{ bookingId: string; currentTableId: string; newTableId: string } | null>(null);
  const [internalNote, setInternalNote] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calWeekStart, setCalWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split('T')[0];
  });
  const [form, setForm] = useState({ customerName: '', customerPhone: '', tableId: '', date: today(), time: '20:00', guests: '2', notes: '', source: 'STAFF' });
  const pageSize = 20;

  const flash = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (dateFilter) p.set('date', dateFilter);
      if (statusFilter !== 'all') p.set('status', statusFilter);
      if (search) p.set('search', search);
      p.set('page', String(page)); p.set('limit', String(pageSize));
      const res = await fetch(`/api/bookings?${p.toString()}`);
      if (res.ok) { const d = await res.json(); if (d.success) { setBookings(d.data || []); setTotalCount(d.pagination?.total || 0); } }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [dateFilter, statusFilter, search, page]);

  const loadTables = useCallback(async () => {
    try { const res = await fetch('/api/tables?status=AVAILABLE'); if (res.ok) { const d = await res.json(); if (d.success) setTables(d.data || []); } } catch { /* silent */ }
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);
  useEffect(() => { loadTables(); }, [loadTables]);
  useEffect(() => { setPage(1); }, [dateFilter, statusFilter, search]);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const selectAll = () => {
    if (selectedIds.size === bookings.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(bookings.map(b => b.id)));
  };
  const batchAction = async (status: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    let ok = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/bookings/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        if (res.ok) ok++;
      } catch { /* skip */ }
    }
    flash(`Đã cập nhật ${ok}/${ids.length} booking`);
    setSelectedIds(new Set());
    await loadBookings();
  };

  const printBooking = () => {
    if (!showDetail) return;
    const st = STATUS_CONFIG[showDetail.status];
    const html = `<html><head><title>Booking ${showDetail.bookingCode}</title><style>body{font-family:system-ui;padding:32px;max-width:600px;margin:auto}h1{font-size:1.2rem;border-bottom:2px solid #d4a84a;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:16px}td{padding:8px 4px;border-bottom:1px solid #eee;font-size:0.9rem}td:first-child{color:#888;width:120px}@media print{body{padding:0}}</style></head><body><h1>Báo Garden — ${showDetail.bookingCode}</h1><table><tr><td>Trạng thái</td><td><strong>${st?.label || showDetail.status}</strong></td></tr><tr><td>Khách hàng</td><td>${showDetail.customer?.name}</td></tr><tr><td>SĐT</td><td>${showDetail.customer?.phone}</td></tr><tr><td>Bàn</td><td>${showDetail.table?.code} - ${showDetail.table?.name}</td></tr><tr><td>Khu vực</td><td>${showDetail.table?.area?.name}</td></tr><tr><td>Ngày</td><td>${fmtDate(showDetail.bookingDate)}</td></tr><tr><td>Giờ</td><td>${showDetail.bookingTime}</td></tr><tr><td>Số khách</td><td>${showDetail.guestCount} người</td></tr><tr><td>Tiền cọc</td><td>${fmtCurrency(showDetail.depositAmount || 0)}</td></tr>${showDetail.note ? `<tr><td>Ghi chú</td><td>${showDetail.note}</td></tr>` : ''}</table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  const doStatus = async (id: string, status: string) => {
    setActionLoading(id); setConfirm(null);
    try {
      const res = await fetch(`/api/bookings/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (res.ok) { flash(status === 'CANCELLED' ? 'Đã hủy booking' : status === 'CONFIRMED' ? 'Đã xác nhận' : status === 'ARRIVED' ? 'Đã check-in' : 'Đã cập nhật'); await loadBookings(); }
      else flash('Cập nhật thất bại', false);
    } catch { flash('Lỗi kết nối', false); } finally { setActionLoading(null); }
  };

  const handleStatus = (id: string, status: string, code: string) => {
    if (status === 'CANCELLED' || status === 'NO_SHOW') { setConfirm({ id, action: status, code }); return; }
    doStatus(id, status);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: form.customerName.trim(), customerPhone: form.customerPhone.trim(), tableId: form.tableId, bookingDate: form.date, bookingTime: form.time, guestCount: parseInt(form.guests), note: form.notes.trim() || undefined, source: form.source }) });
      if (res.ok) { flash('Tạo booking thành công'); resetForm(); await loadBookings(); }
      else { const d = await res.json(); flash(d.error || 'Tạo thất bại', false); }
    } catch { flash('Lỗi kết nối', false); }
  };

  const resetForm = () => { setShowModal(false); setForm({ customerName: '', customerPhone: '', tableId: '', date: today(), time: '20:00', guests: '2', notes: '', source: 'STAFF' }); };

  const viewDetail = async (b: Booking) => {
    setShowDetail(b);
    setInternalNote('');
    setChangeTable(null);
    try { const res = await fetch(`/api/bookings/${b.id}`); if (res.ok) { const d = await res.json(); if (d.success) setDetailEvents(d.data?.events || []); } } catch { /* silent */ }
  };

  const handleChangeTable = async () => {
    if (!changeTable || !changeTable.newTableId || changeTable.newTableId === changeTable.currentTableId) return;
    try {
      const res = await fetch(`/api/bookings/${changeTable.bookingId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: changeTable.newTableId })
      });
      if (res.ok) { flash('Đã đổi bàn thành công'); setChangeTable(null); setShowDetail(null); await loadBookings(); }
      else { const d = await res.json(); flash(d.error || 'Đổi bàn thất bại', false); }
    } catch { flash('Lỗi kết nối', false); }
  };

  const handleAddNote = async () => {
    if (!showDetail || !internalNote.trim()) return;
    try {
      const res = await fetch(`/api/bookings/${showDetail.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: (showDetail.note ? showDetail.note + '\n' : '') + `[Nội bộ] ${internalNote.trim()}` })
      });
      if (res.ok) { flash('Đã thêm ghi chú'); setInternalNote(''); setShowDetail(null); await loadBookings(); }
      else flash('Thêm ghi chú thất bại', false);
    } catch { flash('Lỗi kết nối', false); }
  };

  const exportCSV = () => {
    if (bookings.length === 0) { flash('Không có dữ liệu để xuất', false); return; }
    const headers = ['Mã booking','Khách hàng','SĐT','Ngày','Giờ','Số khách','Bàn','Khu vực','Tiền cọc','Trạng thái','Nguồn','Người tạo'];
    const escape = (v: string) => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const rows = bookings.map(b => [
      b.bookingCode, b.customer?.name || '', b.customer?.phone || '',
      fmtDate(b.bookingDate), b.bookingTime, String(b.guestCount),
      b.table?.code || '', b.table?.area?.name || '',
      String(b.depositAmount || 0), STATUS_CONFIG[b.status]?.label || b.status,
      b.source || '', b.createdByUser?.name || ''
    ].map(escape).join(','));
    const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `bookings_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const tabs = [
    { key: 'all', label: 'Tất cả' }, { key: 'PENDING', label: 'Chờ xác nhận' },
    { key: 'CONFIRMED', label: 'Đã xác nhận' }, { key: 'ARRIVED', label: 'Đã đến' },
    { key: 'COMPLETED', label: 'Hoàn tất' }, { key: 'CANCELLED', label: 'Đã hủy' },
    { key: 'NO_SHOW', label: 'Không đến' },
  ];

  const ActionBtns = ({ b }: { b: Booking }) => (
    <div className="bk-acts">
      {b.status === 'PENDING' && <button className="bk-act bk-act-ok" onClick={() => handleStatus(b.id, 'CONFIRMED', b.bookingCode)} disabled={actionLoading === b.id}>Xác nhận</button>}
      {b.status === 'CONFIRMED' && <button className="bk-act bk-act-ok" onClick={() => handleStatus(b.id, 'ARRIVED', b.bookingCode)} disabled={actionLoading === b.id}>Check-in</button>}
      {b.status === 'ARRIVED' && <button className="bk-act bk-act-ok" onClick={() => handleStatus(b.id, 'COMPLETED', b.bookingCode)} disabled={actionLoading === b.id}>Hoàn tất</button>}
      {['PENDING','CONFIRMED'].includes(b.status) && (
        <>
          <button className="bk-act bk-act-no" onClick={() => handleStatus(b.id, 'CANCELLED', b.bookingCode)} disabled={actionLoading === b.id}>Hủy</button>
          <button className="bk-act bk-act-ghost" onClick={() => handleStatus(b.id, 'NO_SHOW', b.bookingCode)} disabled={actionLoading === b.id}>No-show</button>
        </>
      )}
      <button className="bk-act bk-act-ghost" onClick={() => viewDetail(b)}>Chi tiết</button>
    </div>
  );

  return (
    <div className="bkp">
      <style>{CSS}</style>

      {/* Header */}
      <div className="bkp-header">
        <div><h1 className="bkp-title">Quản lý đặt bàn</h1><p className="bkp-sub">Quản lý tất cả đặt bàn và trạng thái</p></div>
        <div className="bkp-header-actions">
          <button className="bkp-export-btn" onClick={exportCSV}>Xuất CSV</button>
          <button className="bkp-add-btn" onClick={() => setShowModal(true)} id="add-booking-btn">+ Thêm đặt bàn</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bkp-filters">
        <input type="text" placeholder="Tìm theo tên, SĐT..." value={searchInput} onChange={e => setSearchInput(e.target.value)} className="bkp-search" id="booking-search" />
        <div className="bkp-filter-row">
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bkp-date" id="booking-date-filter" />
          <button className="bkp-clear-date" onClick={() => setDateFilter('')}>{dateFilter ? 'Tất cả ngày' : 'Đang xem tất cả'}</button>
        </div>
      </div>

      {/* View toggle + Tabs */}
      <div className="bkp-view-bar">
        <div className="bkp-tabs">
          {tabs.map(t => <button key={t.key} className={`bkp-tab ${statusFilter === t.key ? 'bkp-tab-on' : ''}`} onClick={() => setStatusFilter(t.key)}>{t.label}</button>)}
        </div>
        <div className="bkp-view-toggle">
          <button className={`bkp-vt ${viewMode === 'list' ? 'bkp-vt-on' : ''}`} onClick={() => setViewMode('list')}>Danh sách</button>
          <button className={`bkp-vt ${viewMode === 'calendar' ? 'bkp-vt-on' : ''}`} onClick={() => { setViewMode('calendar'); setDateFilter(''); }}>Lịch</button>
        </div>
      </div>

      {/* Calendar view */}
      {viewMode === 'calendar' ? (
        <div className="bkc">
          <div className="bkc-nav">
            <button className="bkc-arrow" onClick={() => { const d = new Date(calWeekStart); d.setDate(d.getDate() - 7); setCalWeekStart(d.toISOString().split('T')[0]); }}>←</button>
            <span className="bkc-range">
              {(() => { const s = new Date(calWeekStart); const e = new Date(calWeekStart); e.setDate(e.getDate() + 6); return `${s.getDate()}/${s.getMonth()+1} – ${e.getDate()}/${e.getMonth()+1}/${e.getFullYear()}`; })()}
            </span>
            <button className="bkc-arrow" onClick={() => { const d = new Date(calWeekStart); d.setDate(d.getDate() + 7); setCalWeekStart(d.toISOString().split('T')[0]); }}>→</button>
            <button className="bkc-today" onClick={() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); setCalWeekStart(d.toISOString().split('T')[0]); }}>Hôm nay</button>
          </div>
          <div className="bkc-grid">
            {[0,1,2,3,4,5,6].map(offset => {
              const day = new Date(calWeekStart); day.setDate(day.getDate() + offset);
              const dayStr = day.toISOString().split('T')[0];
              const dayBookings = bookings.filter(b => b.bookingDate.startsWith(dayStr));
              const isToday = dayStr === today();
              const dayNames = ['T2','T3','T4','T5','T6','T7','CN'];
              return (
                <div key={offset} className={`bkc-day ${isToday ? 'bkc-day-today' : ''}`}>
                  <div className="bkc-day-head">
                    <span className="bkc-day-name">{dayNames[offset]}</span>
                    <span className="bkc-day-num">{day.getDate()}</span>
                  </div>
                  <div className="bkc-day-body">
                    {dayBookings.length === 0 ? <span className="bkc-no">—</span> : dayBookings.sort((a,b) => a.bookingTime.localeCompare(b.bookingTime)).map(b => {
                      const st = STATUS_CONFIG[b.status];
                      return (
                        <button key={b.id} className="bkc-card" onClick={() => viewDetail(b)}>
                          <span className="bkc-time">{b.bookingTime}</span>
                          <span className="bkc-name">{b.customer?.name}</span>
                          <span className="bkc-info">{b.table?.code} · {b.guestCount}p</span>
                          <span className={`bkp-badge bkp-badge-sm ${st?.cls || ''}`}>{st?.label || b.status}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) :

      /* List view */
      loading ? (
        <div className="bkp-skeleton">
          {[1,2,3,4,5].map(i => <div key={i} className="bkp-skel-row"><div className="bkp-skel-a" /><div className="bkp-skel-b" /><div className="bkp-skel-c" /></div>)}
        </div>
      ) : bookings.length === 0 ? (
        <div className="bkp-empty"><p>Không có đặt bàn nào</p><span>Thử thay đổi bộ lọc hoặc thêm đặt bàn mới</span></div>
      ) : (
        <>
          {/* Batch action bar */}
          {selectedIds.size > 0 && (
            <div className="bkp-batch">
              <span>Đã chọn {selectedIds.size} booking</span>
              <div className="bkp-batch-acts">
                <button className="bkp-btn-pri bkp-btn-sm" onClick={() => batchAction('CONFIRMED')}>Xác nhận</button>
                <button className="bkp-btn-danger bkp-btn-sm" onClick={() => batchAction('CANCELLED')}>Hủy</button>
                <button className="bkp-btn-sec bkp-btn-sm" onClick={() => setSelectedIds(new Set())}>Bỏ chọn</button>
              </div>
            </div>
          )}
          {/* Desktop table */}
          <div className="bkp-table-wrap bkp-hide-m">
            <table className="bkp-table">
              <thead><tr>
                <th style={{width:36}}><input type="checkbox" checked={selectedIds.size === bookings.length && bookings.length > 0} onChange={selectAll} /></th>
                <th>Mã</th><th>Khách hàng</th><th>Ngày</th><th>Giờ</th><th>Khách</th>
                <th>Bàn</th><th>Khu vực</th><th>Cọc</th><th>Trạng thái</th><th>Người tạo</th><th>Hành động</th>
              </tr></thead>
              <tbody>
                {bookings.map(b => {
                  const st = STATUS_CONFIG[b.status];
                  return (
                    <tr key={b.id} className={selectedIds.has(b.id) ? 'bkp-row-selected' : ''}>
                      <td><input type="checkbox" checked={selectedIds.has(b.id)} onChange={() => toggleSelect(b.id)} /></td>
                      <td><span className="bkp-code">{b.bookingCode}</span></td>
                      <td>
                        <div className="bkp-customer">
                          <div className="bkp-avatar">{b.customer?.name?.charAt(0) || '?'}</div>
                          <div><div className="bkp-cname">{b.customer?.name}</div><div className="bkp-cphone">{b.customer?.phone}</div></div>
                        </div>
                      </td>
                      <td className="bkp-dim">{fmtDate(b.bookingDate)}</td>
                      <td className="bkp-bold">{b.bookingTime}</td>
                      <td>{b.guestCount}p</td>
                      <td><span className="bkp-badge bkp-badge-warn">{b.table?.code}</span></td>
                      <td className="bkp-dim">{b.table?.area?.name}</td>
                      <td className="bkp-gold">{fmtCurrency(b.depositAmount || 0)}</td>
                      <td><span className={`bkp-badge ${st?.cls || 'bkp-badge-gray'}`}>{st?.label || b.status}</span></td>
                      <td className="bkp-dim">{b.createdByUser?.name || '—'}</td>
                      <td><ActionBtns b={b} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="bkp-cards bkp-show-m">
            {bookings.map(b => {
              const st = STATUS_CONFIG[b.status];
              return (
                <div key={b.id} className="bkp-card">
                  <div className="bkp-card-top">
                    <div className="bkp-customer">
                      <div className="bkp-avatar">{b.customer?.name?.charAt(0) || '?'}</div>
                      <div><div className="bkp-cname">{b.customer?.name}</div><div className="bkp-cphone">{b.customer?.phone}</div></div>
                    </div>
                    <span className={`bkp-badge ${st?.cls || 'bkp-badge-gray'}`}>{st?.label || b.status}</span>
                  </div>
                  <div className="bkp-card-meta">
                    <span>Bàn <strong>{b.table?.code}</strong></span>
                    <span><strong>{b.bookingTime}</strong></span>
                    <span>{fmtDate(b.bookingDate)}</span>
                    <span>{b.guestCount} khách</span>
                  </div>
                  {(b.depositAmount > 0) && <div className="bkp-card-deposit">Cọc: <strong>{fmtCurrency(b.depositAmount)}</strong></div>}
                  <ActionBtns b={b} />
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bkp-paging">
              <button className="bkp-pg-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</button>
              <span className="bkp-pg-info">Trang {page}/{totalPages} ({totalCount} kết quả)</span>
              <button className="bkp-pg-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Sau</button>
            </div>
          )}
        </>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="bkp-overlay" onClick={e => e.target === e.currentTarget && resetForm()}>
          <div className="bkp-modal">
            <div className="bkp-modal-head"><h2>Thêm đặt bàn mới</h2><button className="bkp-modal-x" onClick={resetForm}>✕</button></div>
            <form onSubmit={handleSubmit}>
              <div className="bkp-modal-body">
                <div className="bkp-form-row">
                  <div className="bkp-fg"><label>Họ tên khách *</label><input type="text" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} required id="modal-customer-name" /></div>
                  <div className="bkp-fg"><label>Số điện thoại *</label><input type="tel" value={form.customerPhone} onChange={e => setForm({...form, customerPhone: e.target.value})} required id="modal-customer-phone" /></div>
                </div>
                <div className="bkp-form-row">
                  <div className="bkp-fg"><label>Bàn *</label>
                    <select value={form.tableId} onChange={e => setForm({...form, tableId: e.target.value})} required id="modal-table">
                      <option value="">Chọn bàn</option>
                      {tables.map(t => <option key={t.id} value={t.id}>{t.code} - {t.name} ({t.area.name})</option>)}
                    </select>
                  </div>
                  <div className="bkp-fg"><label>Số khách</label><input type="number" min="1" max="50" value={form.guests} onChange={e => setForm({...form, guests: e.target.value})} id="modal-guests" /></div>
                </div>
                <div className="bkp-form-row">
                  <div className="bkp-fg"><label>Ngày</label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} id="modal-date" /></div>
                  <div className="bkp-fg"><label>Giờ</label>
                    <select value={form.time} onChange={e => setForm({...form, time: e.target.value})} id="modal-time">
                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="bkp-fg"><label>Nguồn</label>
                  <select value={form.source} onChange={e => setForm({...form, source: e.target.value})}>
                    <option value="STAFF">Nhân viên</option><option value="PHONE">Điện thoại</option>
                    <option value="FACEBOOK">Facebook</option><option value="ZALO">Zalo</option><option value="WALK_IN">Walk-in</option>
                  </select>
                </div>
                <div className="bkp-fg"><label>Ghi chú</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} placeholder="Yêu cầu đặc biệt..." id="modal-notes" /></div>
              </div>
              <div className="bkp-modal-foot">
                <button type="button" className="bkp-btn-sec" onClick={resetForm}>Hủy</button>
                <button type="submit" className="bkp-btn-pri" id="modal-submit">Tạo đặt bàn</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="bkp-overlay" onClick={e => e.target === e.currentTarget && setShowDetail(null)}>
          <div className="bkp-modal bkp-modal-lg">
            <div className="bkp-modal-head"><h2>Chi tiết đặt bàn</h2><button className="bkp-modal-x" onClick={() => setShowDetail(null)}>✕</button></div>
            <div className="bkp-modal-body">
              <div className="bkp-detail-grid">
                {[
                  ['Mã đặt bàn', showDetail.bookingCode, 'bkp-gold'],
                  ['Trạng thái', null, '', true],
                  ['Khách hàng', showDetail.customer?.name],
                  ['SĐT', showDetail.customer?.phone],
                  ['Bàn', `${showDetail.table?.code} - ${showDetail.table?.name}`],
                  ['Khu vực', showDetail.table?.area?.name],
                  ['Ngày', fmtDate(showDetail.bookingDate)],
                  ['Giờ', showDetail.bookingTime],
                  ['Số khách', `${showDetail.guestCount} người`],
                  ['Tiền cọc', fmtCurrency(showDetail.depositAmount || 0), 'bkp-gold'],
                  ['Min spend', fmtCurrency(showDetail.minSpend || 0)],
                  ['Nguồn', showDetail.source],
                  ['Người tạo', showDetail.createdByUser?.name || '—'],
                  ['Tạo lúc', fmtDateTime(showDetail.createdAt)],
                ].map(([label, value, cls, isBadge], i) => (
                  <div key={i} className="bkp-di">
                    <span className="bkp-dl">{label as string}</span>
                    {isBadge ? (
                      <span className={`bkp-badge ${STATUS_CONFIG[showDetail.status]?.cls || 'bkp-badge-gray'}`}>{STATUS_CONFIG[showDetail.status]?.label || showDetail.status}</span>
                    ) : (
                      <span className={`bkp-dv ${cls || ''}`}>{value as string}</span>
                    )}
                  </div>
                ))}
                {showDetail.note && <div className="bkp-di bkp-di-full"><span className="bkp-dl">Ghi chú</span><span className="bkp-dv">{showDetail.note}</span></div>}
              </div>
              {detailEvents.length > 0 && (
                <div className="bkp-events">
                  <h4>Lịch sử sự kiện</h4>
                  {detailEvents.map(ev => (
                    <div key={ev.id} className="bkp-ev">
                      <div className="bkp-ev-l">
                        <strong>{EVENT_LABELS[ev.type] || ev.type}</strong>
                        {ev.user && <span className="bkp-ev-by">bởi {ev.user.name}</span>}
                        {ev.note && <span className="bkp-ev-note">— {ev.note}</span>}
                      </div>
                      <span className="bkp-ev-time">{fmtDateTime(ev.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick table change */}
              {!['COMPLETED','CANCELLED','NO_SHOW'].includes(showDetail.status) && (
                <div className="bkp-quick-section">
                  <h4>Đổi bàn nhanh</h4>
                  {changeTable ? (
                    <div className="bkp-quick-row">
                      <select value={changeTable.newTableId} onChange={e => setChangeTable({...changeTable, newTableId: e.target.value})} className="bkp-quick-select">
                        <option value={changeTable.currentTableId}>Bàn hiện tại: {showDetail.table?.code}</option>
                        {tables.filter(t => t.id !== changeTable.currentTableId).map(t => <option key={t.id} value={t.id}>{t.code} - {t.name} ({t.area.name})</option>)}
                      </select>
                      <button className="bkp-btn-pri bkp-btn-sm" onClick={handleChangeTable} disabled={changeTable.newTableId === changeTable.currentTableId}>Xác nhận</button>
                      <button className="bkp-btn-sec bkp-btn-sm" onClick={() => setChangeTable(null)}>Hủy</button>
                    </div>
                  ) : (
                    <button className="bkp-btn-outline" onClick={() => setChangeTable({ bookingId: showDetail.id, currentTableId: showDetail.table?.id, newTableId: showDetail.table?.id })}>Đổi bàn</button>
                  )}
                </div>
              )}

              {/* Internal note */}
              <div className="bkp-quick-section">
                <h4>Ghi chú nội bộ</h4>
                <div className="bkp-quick-row">
                  <input type="text" value={internalNote} onChange={e => setInternalNote(e.target.value)} placeholder="VD: Khách VIP, cần bàn riêng..." className="bkp-quick-input" onKeyDown={e => e.key === 'Enter' && handleAddNote()} />
                  <button className="bkp-btn-pri bkp-btn-sm" onClick={handleAddNote} disabled={!internalNote.trim()}>Gửi</button>
                </div>
              </div>
            </div>
            <div className="bkp-modal-foot">
              <button className="bkp-btn-outline" onClick={printBooking}>In booking</button>
              <button className="bkp-btn-sec" onClick={() => setShowDetail(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div className="bkp-overlay" onClick={e => e.target === e.currentTarget && setConfirm(null)}>
          <div className="bkp-confirm">
            <h3>Xác nhận {confirm.action === 'CANCELLED' ? 'hủy' : 'no-show'}</h3>
            <p>Bạn có chắc muốn {confirm.action === 'CANCELLED' ? 'hủy' : 'đánh dấu no-show'} booking <strong>{confirm.code}</strong>?</p>
            <div className="bkp-confirm-btns">
              <button className="bkp-btn-sec" onClick={() => setConfirm(null)}>Không</button>
              <button className="bkp-btn-danger" onClick={() => doStatus(confirm.id, confirm.action)}>
                {confirm.action === 'CANCELLED' ? 'Hủy booking' : 'Xác nhận No-show'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`bkp-toast ${toast.ok ? 'bkp-toast-ok' : 'bkp-toast-err'}`}>{toast.ok ? '✓' : '⚠'} {toast.msg}</div>}
    </div>
  );
}

const CSS = `
.bkp{animation:bkp-in 0.25s ease}
@keyframes bkp-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* header */
.bkp-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;gap:12px;flex-wrap:wrap}
.bkp-title{font-size:1.4rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary)}
.bkp-sub{font-size:0.82rem;color:var(--text-tertiary);margin-top:2px}
.bkp-header-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.bkp-add-btn{padding:9px 18px;border-radius:10px;font-size:0.82rem;font-weight:600;background:var(--gold-400);color:var(--bg-primary);border:none;cursor:pointer;white-space:nowrap;transition:opacity 0.15s;font-family:inherit;min-height:44px}
.bkp-add-btn:hover{opacity:0.85}
.bkp-export-btn{padding:9px 18px;border-radius:10px;font-size:0.82rem;font-weight:600;background:transparent;color:var(--text-secondary);border:1px solid var(--border-subtle);cursor:pointer;white-space:nowrap;transition:border-color 0.15s,color 0.15s;font-family:inherit;min-height:44px}
.bkp-export-btn:hover{border-color:var(--gold-400);color:var(--gold-400)}

/* filters */
.bkp-filters{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.bkp-search{flex:1;min-width:200px;padding:9px 14px;border-radius:10px;background:var(--bg-card);border:1px solid var(--border-subtle);color:var(--text-primary);font-size:0.85rem;outline:none;font-family:inherit}
.bkp-search:focus{border-color:var(--gold-400)}
.bkp-filter-row{display:flex;gap:8px;align-items:center}
.bkp-date{padding:9px 12px;border-radius:10px;background:var(--bg-card);border:1px solid var(--border-subtle);color:var(--text-primary);font-size:0.85rem;font-family:inherit}
.bkp-clear-date{padding:8px 12px;border-radius:8px;font-size:0.78rem;font-weight:500;background:none;border:1px solid var(--border-subtle);color:var(--text-tertiary);cursor:pointer;white-space:nowrap;font-family:inherit}

/* tabs */
.bkp-tabs{display:flex;gap:4px;overflow-x:auto;margin-bottom:16px;scrollbar-width:none;-ms-overflow-style:none;padding-bottom:2px}
.bkp-tabs::-webkit-scrollbar{display:none}
.bkp-tab{flex-shrink:0;padding:7px 14px;border-radius:8px;font-size:0.78rem;font-weight:500;background:none;border:1px solid transparent;color:var(--text-tertiary);cursor:pointer;transition:all 0.15s;white-space:nowrap;font-family:inherit}
.bkp-tab:hover{color:var(--text-primary);border-color:var(--border-subtle)}
.bkp-tab-on{background:rgba(212,168,74,0.1);border-color:rgba(212,168,74,0.2);color:var(--gold-400);font-weight:600}

/* view toggle */
.bkp-view-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.bkp-view-toggle{display:flex;gap:2px;background:var(--bg-tertiary);border-radius:8px;padding:2px}
.bkp-vt{padding:6px 14px;border-radius:6px;font-size:0.78rem;font-weight:500;background:transparent;border:none;color:var(--text-tertiary);cursor:pointer;font-family:inherit;transition:all 0.15s}
.bkp-vt-on{background:var(--bg-card);color:var(--text-primary);box-shadow:0 1px 3px rgba(0,0,0,0.2)}

/* calendar */
.bkc{animation:bkp-in 0.2s ease}
.bkc-nav{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.bkc-arrow{width:32px;height:32px;border-radius:8px;border:1px solid var(--border-subtle);background:var(--bg-card);color:var(--text-secondary);cursor:pointer;font-size:0.9rem;display:flex;align-items:center;justify-content:center;transition:all 0.15s;font-family:inherit}
.bkc-arrow:hover{border-color:var(--gold-400);color:var(--gold-400)}
.bkc-range{font-size:0.9rem;font-weight:600;color:var(--text-primary)}
.bkc-today{padding:5px 12px;border-radius:6px;font-size:0.75rem;font-weight:600;background:rgba(212,168,74,0.1);border:1px solid rgba(212,168,74,0.2);color:var(--gold-400);cursor:pointer;font-family:inherit;margin-left:auto}
.bkc-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
.bkc-day{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:10px;min-height:120px;overflow:hidden}
.bkc-day-today{border-color:rgba(212,168,74,0.3);background:rgba(212,168,74,0.02)}
.bkc-day-head{padding:8px 10px;border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:space-between}
.bkc-day-name{font-size:0.72rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.03em}
.bkc-day-num{font-size:0.82rem;font-weight:700;color:var(--text-primary)}
.bkc-day-body{padding:6px;display:flex;flex-direction:column;gap:4px}
.bkc-no{text-align:center;color:var(--text-tertiary);font-size:0.75rem;padding:8px}
.bkc-card{display:flex;flex-direction:column;gap:2px;padding:6px 8px;border-radius:6px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);cursor:pointer;text-align:left;font-family:inherit;transition:all 0.15s;border:none}
.bkc-card:hover{background:rgba(212,168,74,0.06)}
.bkc-time{font-size:0.72rem;font-weight:700;color:var(--gold-400)}
.bkc-name{font-size:0.75rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bkc-info{font-size:0.68rem;color:var(--text-tertiary)}
.bkp-badge-sm{font-size:0.6rem;padding:1px 5px}

/* skeleton */
.bkp-skeleton{display:flex;flex-direction:column;gap:12px;padding:20px 0}
.bkp-skel-row{display:flex;gap:12px;align-items:center;padding:12px 16px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:10px}
.bkp-skel-a{width:36px;height:36px;border-radius:50%;background:var(--bg-tertiary);animation:bkp-pulse 1.5s ease-in-out infinite;flex-shrink:0}
.bkp-skel-b{flex:1;height:14px;border-radius:4px;background:var(--bg-tertiary);animation:bkp-pulse 1.5s ease-in-out infinite 0.1s}
.bkp-skel-c{width:60px;height:14px;border-radius:4px;background:var(--bg-tertiary);animation:bkp-pulse 1.5s ease-in-out infinite 0.2s}
@keyframes bkp-pulse{0%,100%{opacity:0.5}50%{opacity:0.2}}

/* batch */
.bkp-batch{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:rgba(212,168,74,0.06);border:1px solid rgba(212,168,74,0.2);border-radius:10px;margin-bottom:12px;gap:12px;flex-wrap:wrap}
.bkp-batch span{font-size:0.82rem;font-weight:600;color:var(--gold-400)}
.bkp-batch-acts{display:flex;gap:6px}
.bkp-row-selected{background:rgba(212,168,74,0.04)}
.bkp-table input[type="checkbox"]{width:16px;height:16px;accent-color:var(--gold-400);cursor:pointer}
@keyframes bkp-slide{0%{left:-48px}100%{left:48px}}

/* empty */
.bkp-empty{text-align:center;padding:40px 20px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px}
.bkp-empty p{font-size:0.9rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px}
.bkp-empty span{font-size:0.78rem;color:var(--text-tertiary)}

/* table */
.bkp-table-wrap{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px;overflow:hidden;overflow-x:auto;-webkit-overflow-scrolling:touch}
.bkp-table{width:100%;border-collapse:collapse;font-size:0.82rem}
.bkp-table th{padding:10px 12px;text-align:left;font-size:0.7rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border-subtle);white-space:nowrap}
.bkp-table td{padding:10px 12px;border-bottom:1px solid var(--border-subtle);vertical-align:middle}
.bkp-table tr:last-child td{border-bottom:none}
.bkp-table tr:hover{background:rgba(255,255,255,0.015)}

.bkp-code{color:var(--gold-400);font-weight:700;font-size:0.78rem}
.bkp-customer{display:flex;align-items:center;gap:8px}
.bkp-avatar{width:30px;height:30px;border-radius:8px;flex-shrink:0;background:linear-gradient(135deg,rgba(212,168,74,0.15),rgba(212,168,74,0.05));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.72rem;color:var(--gold-400)}
.bkp-cname{font-weight:600;font-size:0.85rem;color:var(--text-primary)}
.bkp-cphone{font-size:0.72rem;color:var(--text-tertiary)}
.bkp-dim{font-size:0.82rem;color:var(--text-secondary)}
.bkp-bold{font-weight:600;color:var(--text-primary)}
.bkp-gold{color:var(--gold-400);font-weight:600}

/* badges */
.bkp-badge{display:inline-block;padding:3px 8px;border-radius:6px;font-size:0.7rem;font-weight:600;white-space:nowrap}
.bkp-badge-warn{background:rgba(245,158,11,0.12);color:#f59e0b}
.bkp-badge-blue{background:rgba(59,130,246,0.12);color:#3b82f6}
.bkp-badge-green{background:rgba(34,197,94,0.12);color:#4ade80}
.bkp-badge-red{background:rgba(239,68,68,0.12);color:#ef4444}
.bkp-badge-gray{background:rgba(107,114,128,0.12);color:#6b7280}
.bkp-badge-purple{background:rgba(168,85,247,0.12);color:#a855f7}

/* actions */
.bk-acts,.bkp-acts{display:flex;gap:5px;flex-wrap:wrap}
.bk-act,.bkp-act{padding:5px 10px;border-radius:7px;font-size:0.72rem;font-weight:600;border:1px solid var(--border-subtle);background:var(--bg-secondary);color:var(--text-secondary);cursor:pointer;transition:all 0.15s;white-space:nowrap;font-family:inherit}
.bk-act:disabled,.bkp-act:disabled{opacity:0.4;cursor:wait}
.bk-act-ok,.bkp-act-ok{border-color:rgba(34,197,94,0.2);color:#4ade80}
.bk-act-ok:hover{background:rgba(34,197,94,0.08)}
.bk-act-no,.bkp-act-no{border-color:rgba(239,68,68,0.2);color:#ef4444}
.bk-act-no:hover{background:rgba(239,68,68,0.08)}
.bk-act-ghost,.bkp-act-ghost{border-color:transparent;color:var(--text-tertiary)}
.bk-act-ghost:hover{color:var(--text-primary)}

/* mobile cards */
.bkp-show-m{display:none}
.bkp-cards{display:flex;flex-direction:column;gap:10px}
.bkp-card{padding:14px;border-radius:12px;background:var(--bg-card);border:1px solid var(--border-subtle)}
.bkp-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.bkp-card-meta{display:flex;flex-wrap:wrap;gap:12px;font-size:0.78rem;color:var(--text-tertiary);margin-bottom:10px}
.bkp-card-meta strong{color:var(--text-primary)}
.bkp-card-deposit{font-size:0.78rem;color:var(--gold-400);margin-bottom:10px}
.bkp-card-deposit strong{font-weight:700}

/* pagination */
.bkp-paging{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px}
.bkp-pg-btn{padding:7px 14px;border-radius:8px;font-size:0.78rem;font-weight:600;background:var(--bg-card);border:1px solid var(--border-subtle);color:var(--text-secondary);cursor:pointer;font-family:inherit}
.bkp-pg-btn:disabled{opacity:0.3;cursor:default}
.bkp-pg-info{font-size:0.8rem;color:var(--text-tertiary);padding:0 8px}

/* modal */
.bkp-overlay{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;animation:bkp-fade 0.15s}
@keyframes bkp-fade{from{opacity:0}to{opacity:1}}
.bkp-modal{width:100%;max-width:560px;max-height:90vh;overflow-y:auto;background:var(--bg-secondary);border:1px solid var(--border-subtle);border-radius:20px;animation:bkp-up 0.25s cubic-bezier(0.16,1,0.3,1)}
.bkp-modal-lg{max-width:640px}
@keyframes bkp-up{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
.bkp-modal-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--border-subtle)}
.bkp-modal-head h2{font-size:1.1rem;font-weight:700;color:var(--text-primary)}
.bkp-modal-x{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);color:var(--text-tertiary);font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center}
.bkp-modal-body{padding:20px 24px;display:flex;flex-direction:column;gap:14px}
.bkp-modal-foot{padding:16px 24px;border-top:1px solid var(--border-subtle);display:flex;justify-content:flex-end;gap:10px}

/* form */
.bkp-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.bkp-fg{display:flex;flex-direction:column;gap:5px}
.bkp-fg label{font-size:0.72rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em}
.bkp-fg input,.bkp-fg select,.bkp-fg textarea{padding:10px 14px;border-radius:10px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);color:var(--text-primary);font-size:0.88rem;outline:none;font-family:inherit;transition:border-color 0.15s}
.bkp-fg input:focus,.bkp-fg select:focus,.bkp-fg textarea:focus{border-color:var(--gold-400)}
.bkp-fg textarea{resize:vertical}

.bkp-btn-pri{padding:10px 20px;border-radius:10px;font-size:0.85rem;font-weight:600;background:var(--gold-400);color:var(--bg-primary);border:none;cursor:pointer;font-family:inherit}
.bkp-btn-sec{padding:10px 20px;border-radius:10px;font-size:0.85rem;font-weight:500;background:var(--bg-tertiary);border:1px solid var(--border-subtle);color:var(--text-secondary);cursor:pointer;font-family:inherit}
.bkp-btn-danger{padding:10px 20px;border-radius:10px;font-size:0.85rem;font-weight:600;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;font-family:inherit}

/* detail grid */
.bkp-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.bkp-di{display:flex;flex-direction:column;gap:3px}
.bkp-di-full{grid-column:span 2}
.bkp-dl{font-size:0.7rem;color:var(--text-tertiary);font-weight:600;text-transform:uppercase;letter-spacing:0.04em}
.bkp-dv{font-size:0.88rem;color:var(--text-primary);font-weight:500}

/* events */
.bkp-events{margin-top:20px;padding-top:20px;border-top:1px solid var(--border-subtle)}
.bkp-events h4{font-size:0.88rem;font-weight:600;margin-bottom:12px;color:var(--text-primary)}
.bkp-ev{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg-tertiary);border-radius:8px;margin-bottom:6px;font-size:0.82rem;gap:8px}
.bkp-ev-l{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.bkp-ev-by{color:var(--text-tertiary)}
.bkp-ev-note{color:var(--text-secondary)}
.bkp-ev-time{font-size:0.72rem;color:var(--text-tertiary);white-space:nowrap}

/* quick actions in detail */
.bkp-quick-section{margin-top:16px;padding-top:16px;border-top:1px solid var(--border-subtle)}
.bkp-quick-section h4{font-size:0.82rem;font-weight:600;margin-bottom:8px;color:var(--text-primary)}
.bkp-quick-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.bkp-quick-select{flex:1;min-width:160px;padding:8px 12px;border-radius:8px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);color:var(--text-primary);font-size:0.82rem;font-family:inherit}
.bkp-quick-input{flex:1;min-width:160px;padding:8px 12px;border-radius:8px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);color:var(--text-primary);font-size:0.82rem;font-family:inherit;outline:none}
.bkp-quick-input:focus{border-color:var(--gold-400)}
.bkp-btn-sm{padding:6px 14px;font-size:0.78rem;border-radius:8px;min-height:34px}
.bkp-btn-outline{padding:7px 14px;border-radius:8px;font-size:0.78rem;font-weight:500;background:transparent;border:1px solid var(--border-subtle);color:var(--text-secondary);cursor:pointer;font-family:inherit;transition:all 0.15s}
.bkp-btn-outline:hover{border-color:var(--gold-400);color:var(--gold-400)}

/* confirm */
.bkp-confirm{width:100%;max-width:400px;padding:28px;background:var(--bg-secondary);border:1px solid var(--border-subtle);border-radius:20px;text-align:center;animation:bkp-up 0.25s cubic-bezier(0.16,1,0.3,1)}
.bkp-confirm h3{font-size:1.1rem;font-weight:700;margin-bottom:8px;color:var(--text-primary)}
.bkp-confirm p{font-size:0.88rem;color:var(--text-secondary);margin-bottom:20px;line-height:1.5}
.bkp-confirm-btns{display:flex;gap:10px;justify-content:center}

/* toast */
.bkp-toast{position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:999;padding:10px 20px;border-radius:12px;backdrop-filter:blur(12px);font-size:0.82rem;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.4);white-space:nowrap;animation:bkp-down 0.3s cubic-bezier(0.16,1,0.3,1)}
.bkp-toast-ok{background:rgba(16,24,16,0.96);border:1px solid rgba(34,197,94,0.2);color:#4ade80}
.bkp-toast-err{background:rgba(16,16,24,0.96);border:1px solid rgba(239,68,68,0.2);color:#f87171}
@keyframes bkp-down{from{transform:translateX(-50%) translateY(-16px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}

/* responsive */
@media(max-width:640px){
  .bkp-hide-m{display:none}
  .bkp-show-m{display:flex}
  .bkp-title{font-size:1.2rem}
  .bkp-form-row{grid-template-columns:1fr}
  .bkp-detail-grid{grid-template-columns:1fr}
  .bkp-di-full{grid-column:span 1}
  .bkp-modal{border-radius:20px 20px 0 0;max-height:95vh;align-self:flex-end}
  .bkp-modal-head{padding:16px 20px}
  .bkp-modal-body{padding:16px 20px}
  .bkp-modal-foot{padding:12px 20px}
  .bkp-filters{flex-direction:column}
  .bkp-search{min-width:unset}
  .bkp-ev{flex-direction:column;align-items:flex-start;gap:4px}
  .bkc-grid{grid-template-columns:repeat(2,1fr)}
  .bkc-day{min-height:80px}
  .bkp-view-bar{flex-direction:column;align-items:stretch}
  .bkp-view-toggle{align-self:flex-end}
}
`;
