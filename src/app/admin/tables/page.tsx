'use client';

import { useState, useEffect, useCallback } from 'react';

interface TableArea {
  id: string;
  name: string;
  description: string | null;
}

interface RestaurantTable {
  id: string;
  code: string;
  name: string;
  areaId: string;
  status: string;
  minGuests: number;
  maxGuests: number;
  depositAmount: number;
  minSpend: number;
  note: string | null;
  posX: number;
  posY: number;
  width: number;
  height: number;
  area: TableArea;
  _count?: { bookings: number };
}

interface QrData {
  tableId: string;
  tableCode: string;
  tableName: string;
  qrToken: string;
  menuUrl: string;
}

const TABLE_STATUS_CONFIG: Record<string, { label: string; badge: string; color: string }> = {
  AVAILABLE: { label: 'Trống', badge: 'tb-badge-green', color: '#4ade80' },
  BOOKED: { label: 'Đã đặt', badge: 'tb-badge-red', color: '#ef4444' },
  VIP: { label: 'VIP', badge: 'tb-badge-gold', color: '#fbbf24' },
  INACTIVE: { label: 'Tạm ngưng', badge: 'tb-badge-gray', color: '#9ca3af' },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'decimal', maximumFractionDigits: 0 }).format(amount) + 'đ';
}

function buildPrintableQrCard(tableName: string, tableCode: string, menuUrl: string): string {
  return `<div style="width:320px;padding:28px 24px;border:2px solid #d4a84a;border-radius:16px;text-align:center;font-family:'Segoe UI',system-ui,sans-serif;background:#fff;page-break-inside:avoid;margin:16px auto">
    <div style="font-size:22px;font-weight:800;color:#d4a84a;letter-spacing:0.02em;margin-bottom:4px">BÁO GARDEN</div>
    <div style="font-size:11px;color:#888;margin-bottom:18px;letter-spacing:0.08em;text-transform:uppercase">Ẩm thực &amp; Giải trí</div>
    <div style="width:64px;height:2px;background:#d4a84a;margin:0 auto 18px"></div>
    <div style="font-size:13px;color:#666;margin-bottom:4px">MÃ BÀN</div>
    <div style="font-size:28px;font-weight:800;color:#222;margin-bottom:2px">${tableCode}</div>
    <div style="font-size:15px;font-weight:600;color:#444;margin-bottom:18px">${tableName}</div>
    <div style="padding:12px;background:#f8f6f1;border-radius:10px;margin-bottom:16px">
      <div style="font-size:10px;color:#888;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em">Truy cập link đặt món</div>
      <div style="font-size:11px;color:#d4a84a;word-break:break-all;font-weight:600">${menuUrl}</div>
    </div>
    <div style="font-size:11px;color:#999;line-height:1.6">Quét mã QR hoặc truy cập link<br/>để xem menu &amp; đặt món</div>
  </div>`;
}

export default function TablesPage() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [areas, setAreas] = useState<TableArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'floor'>('list');
  const [areaFilter, setAreaFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editTable, setEditTable] = useState<RestaurantTable | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '', name: '', areaId: '', minGuests: '2', maxGuests: '4',
    depositAmount: '0', minSpend: '0', status: 'AVAILABLE',
    note: '', posX: '0', posY: '0', width: '36', height: '22',
  });

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirm, setConfirm] = useState<{ table: RestaurantTable } | null>(null);

  // QR state
  const [qrModal, setQrModal] = useState<RestaurantTable | null>(null);
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrRegenerating, setQrRegenerating] = useState(false);

  const flash = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tablesRes, areasRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/tables/areas'),
      ]);

      if (tablesRes.ok) {
        const data = await tablesRes.json();
        if (data.success) setTables(data.data || []);
      }
      if (areasRes.ok) {
        const data = await areasRes.json();
        if (data.success) setAreas(data.data || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTables = tables.filter(t => {
    if (areaFilter !== 'all' && t.areaId !== areaFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editTable ? `/api/tables/${editTable.id}` : '/api/tables';
      const method = editTable ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          areaId: form.areaId,
          minGuests: parseInt(form.minGuests),
          maxGuests: parseInt(form.maxGuests),
          depositAmount: parseFloat(form.depositAmount),
          minSpend: parseFloat(form.minSpend),
          status: form.status,
          note: form.note.trim() || null,
          posX: parseFloat(form.posX),
          posY: parseFloat(form.posY),
          width: parseFloat(form.width),
          height: parseFloat(form.height),
        }),
      });
      if (res.ok) {
        flash(editTable ? 'Cập nhật bàn thành công' : 'Tạo bàn thành công');
        resetForm();
        await loadData();
      } else {
        const data = await res.json();
        flash(data.error || 'Thao tác thất bại', false);
      }
    } catch {
      flash('Lỗi kết nối', false);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setEditTable(null);
    setForm({
      code: '', name: '', areaId: areas[0]?.id || '', minGuests: '2', maxGuests: '4',
      depositAmount: '0', minSpend: '0', status: 'AVAILABLE',
      note: '', posX: '0', posY: '0', width: '36', height: '22',
    });
  };

  const handleEdit = (table: RestaurantTable) => {
    setEditTable(table);
    setForm({
      code: table.code, name: table.name, areaId: table.areaId,
      minGuests: String(table.minGuests), maxGuests: String(table.maxGuests),
      depositAmount: String(table.depositAmount), minSpend: String(table.minSpend),
      status: table.status, note: table.note || '',
      posX: String(table.posX), posY: String(table.posY),
      width: String(table.width), height: String(table.height),
    });
    setShowModal(true);
  };

  const handleDeleteConfirm = (table: RestaurantTable) => {
    setConfirm({ table });
  };

  const doDelete = async (table: RestaurantTable) => {
    setConfirm(null);
    try {
      const res = await fetch(`/api/tables/${table.id}`, { method: 'DELETE' });
      if (res.ok) {
        flash('Đã xóa bàn thành công');
        await loadData();
      } else {
        const data = await res.json();
        flash(data.error || 'Không thể xóa bàn này', false);
      }
    } catch {
      flash('Lỗi kết nối', false);
    }
  };

  // --- QR Handlers ---
  const openQrModal = async (table: RestaurantTable) => {
    setQrModal(table);
    setQrData(null);
    setQrLoading(true);
    try {
      const res = await fetch(`/api/tables/${table.id}/qr`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setQrData(data.data);
        } else {
          flash(data.error || 'Không thể tải QR', false);
          setQrModal(null);
        }
      } else {
        const data = await res.json().catch(() => ({ error: 'Bàn chưa có mã QR' }));
        flash(data.error || 'Không thể tải QR', false);
        setQrModal(null);
      }
    } catch {
      flash('Lỗi kết nối', false);
      setQrModal(null);
    } finally {
      setQrLoading(false);
    }
  };

  const closeQrModal = () => {
    setQrModal(null);
    setQrData(null);
  };

  const handleCopyLink = async () => {
    if (!qrData) return;
    try {
      await navigator.clipboard.writeText(qrData.menuUrl);
      flash('Đã sao chép link');
    } catch {
      flash('Không thể sao chép', false);
    }
  };

  const handleRegenerateQr = async () => {
    if (!qrModal) return;
    setQrRegenerating(true);
    try {
      const res = await fetch(`/api/tables/${qrModal.id}/regenerate-qr`, { method: 'POST' });
      if (res.ok) {
        flash('Đã tạo lại mã QR');
        // Reload QR data
        const qrRes = await fetch(`/api/tables/${qrModal.id}/qr`);
        if (qrRes.ok) {
          const data = await qrRes.json();
          if (data.success) setQrData(data.data);
        }
      } else {
        const data = await res.json().catch(() => ({ error: 'Không thể tạo lại QR' }));
        flash(data.error || 'Không thể tạo lại QR', false);
      }
    } catch {
      flash('Lỗi kết nối', false);
    } finally {
      setQrRegenerating(false);
    }
  };

  const handlePrintQr = () => {
    if (!qrData) return;
    const html = buildPrintableQrCard(qrData.tableName, qrData.tableCode, qrData.menuUrl);
    const w = window.open('', '_blank', 'width=420,height=600');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>QR - ${qrData.tableCode}</title><style>@media print{body{margin:0}}</style></head><body style="display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff">${html}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const handleDownloadQr = () => {
    if (!qrData) return;
    const html = buildPrintableQrCard(qrData.tableName, qrData.tableCode, qrData.menuUrl);
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QR - ${qrData.tableCode} - ${qrData.tableName}</title></head><body style="display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff">${html}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR-${qrData.tableCode}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash('Đã tải file QR');
  };

  const handlePrintAllQr = async () => {
    flash('Đang tải dữ liệu QR...');
    const results: QrData[] = [];
    for (const table of tables) {
      try {
        const res = await fetch(`/api/tables/${table.id}/qr`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) results.push(data.data);
        }
      } catch {
        // skip tables without QR
      }
    }
    if (results.length === 0) {
      flash('Không có bàn nào có mã QR', false);
      return;
    }
    const cards = results.map(d => buildPrintableQrCard(d.tableName, d.tableCode, d.menuUrl)).join('');
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>QR - Tất cả bàn</title><style>@media print{body{margin:0}.qr-grid{display:flex;flex-wrap:wrap;gap:0;justify-content:center}}</style></head><body style="margin:16px;background:#fff"><h2 style="text-align:center;font-family:system-ui;color:#333;margin-bottom:8px">Báo Garden - Mã QR tất cả bàn</h2><p style="text-align:center;font-family:system-ui;color:#888;font-size:13px;margin-bottom:24px">${results.length} bàn</p><div class="qr-grid" style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center">${cards}</div></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  if (loading) {
    return (
      <div className="tb-loading">
        <style>{CSS}</style>
        <div className="tb-loader" />
      </div>
    );
  }

  return (
    <div className="tb">
      <style>{CSS}</style>

      {/* Header */}
      <div className="tb-header">
        <div>
          <h1 className="tb-title">Quản lý bàn</h1>
          <p className="tb-sub">Quản lý sơ đồ bàn và cấu hình</p>
        </div>
        <div className="tb-header-actions">
          <div className="tb-view-toggle">
            <button
              className={`tb-view-btn ${viewMode === 'list' ? 'tb-view-btn-on' : ''}`}
              onClick={() => setViewMode('list')}
            >
              Danh sách
            </button>
            <button
              className={`tb-view-btn ${viewMode === 'floor' ? 'tb-view-btn-on' : ''}`}
              onClick={() => setViewMode('floor')}
            >
              Sơ đồ
            </button>
          </div>
          <button className="tb-qr-all-btn" onClick={handlePrintAllQr}>
            ⎙ In tất cả QR
          </button>
          <button className="tb-add-btn" onClick={() => { resetForm(); setShowModal(true); }}>
            + Thêm bàn
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="tb-filters">
        <div className="tb-search-wrap">
          <input
            type="text"
            placeholder="Tìm theo mã, tên bàn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="tb-search"
          />
        </div>
        <div className="tb-area-tabs">
          <button className={`tb-area-tab ${areaFilter === 'all' ? 'tb-area-tab-on' : ''}`} onClick={() => setAreaFilter('all')}>
            Tất cả
          </button>
          {areas.map(area => (
            <button key={area.id} className={`tb-area-tab ${areaFilter === area.id ? 'tb-area-tab-on' : ''}`} onClick={() => setAreaFilter(area.id)}>
              {area.name}
            </button>
          ))}
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        filteredTables.length === 0 ? (
          <div className="tb-empty">
            <h3>Chưa có bàn nào</h3>
            <p>Thêm bàn mới để bắt đầu</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="tb-table-wrap tb-hide-m">
              <table className="tb-table">
                <thead>
                  <tr>
                    <th>Mã bàn</th>
                    <th>Tên</th>
                    <th>Khu vực</th>
                    <th>Sức chứa</th>
                    <th>Tiền cọc</th>
                    <th>Min spend</th>
                    <th>Trạng thái</th>
                    <th>Ghi chú</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTables.map((table) => {
                    const statusInfo = TABLE_STATUS_CONFIG[table.status];
                    return (
                      <tr key={table.id}>
                        <td><span className="tb-code">{table.code}</span></td>
                        <td className="tb-bold">{table.name}</td>
                        <td className="tb-dim">{table.area?.name}</td>
                        <td>{table.minGuests} - {table.maxGuests} người</td>
                        <td className="tb-gold">{formatCurrency(table.depositAmount)}</td>
                        <td>{formatCurrency(table.minSpend)}</td>
                        <td>
                          <span className={`tb-badge ${statusInfo?.badge || 'tb-badge-gray'}`}>
                            {statusInfo?.label || table.status}
                          </span>
                        </td>
                        <td className="tb-note-cell">{table.note || '—'}</td>
                        <td>
                          <div className="tb-acts">
                            <button className="tb-act tb-act-qr" onClick={() => openQrModal(table)}>QR</button>
                            <button className="tb-act tb-act-ghost" onClick={() => handleEdit(table)}>Sửa</button>
                            <button className="tb-act tb-act-danger" onClick={() => handleDeleteConfirm(table)}>Xóa</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="tb-cards tb-show-m">
              {filteredTables.map((table) => {
                const statusInfo = TABLE_STATUS_CONFIG[table.status];
                return (
                  <div key={table.id} className="tb-card">
                    <div className="tb-card-top">
                      <div>
                        <span className="tb-code">{table.code}</span>
                        <span className="tb-card-name">{table.name}</span>
                      </div>
                      <span className={`tb-badge ${statusInfo?.badge || 'tb-badge-gray'}`}>
                        {statusInfo?.label || table.status}
                      </span>
                    </div>
                    <div className="tb-card-meta">
                      <span>Khu vực: <strong>{table.area?.name}</strong></span>
                      <span>{table.minGuests}-{table.maxGuests} khách</span>
                      <span>Cọc: <strong className="tb-gold">{formatCurrency(table.depositAmount)}</strong></span>
                      <span>Min: {formatCurrency(table.minSpend)}</span>
                    </div>
                    {table.note && <div className="tb-card-note">{table.note}</div>}
                    <div className="tb-acts">
                      <button className="tb-act tb-act-qr" onClick={() => openQrModal(table)}>QR</button>
                      <button className="tb-act tb-act-ghost" onClick={() => handleEdit(table)}>Sửa</button>
                      <button className="tb-act tb-act-danger" onClick={() => handleDeleteConfirm(table)}>Xóa</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )
      )}

      {/* Floor Plan View */}
      {viewMode === 'floor' && (
        <div className="tb-floor-card">
          <div className="tb-floor">
            {/* Legend */}
            <div className="tb-legend">
              {Object.entries(TABLE_STATUS_CONFIG).map(([key, cfg]) => (
                <div key={key} className="tb-legend-item">
                  <div className="tb-legend-dot" style={{ background: cfg.color }} />
                  <span>{cfg.label}</span>
                </div>
              ))}
            </div>

            {/* Tables on floor */}
            {filteredTables.map((table) => {
              const statusInfo = TABLE_STATUS_CONFIG[table.status];
              return (
                <div
                  key={table.id}
                  onClick={() => handleEdit(table)}
                  className="tb-floor-item"
                  style={{
                    left: `${table.posX}%`,
                    top: `${table.posY}%`,
                    width: `${table.width * 2.5}px`,
                    height: `${table.height * 2.5}px`,
                    borderColor: statusInfo?.color || 'var(--border-default)',
                  }}
                  title={`${table.code} - ${table.name} (${statusInfo?.label})`}
                >
                  <span className="tb-floor-code" style={{ color: statusInfo?.color }}>
                    {table.code}
                  </span>
                  <span className="tb-floor-cap">
                    {table.minGuests}-{table.maxGuests}p
                  </span>
                </div>
              );
            })}

            {filteredTables.length === 0 && (
              <div className="tb-floor-empty">
                Chưa có bàn nào để hiển thị
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="tb-overlay" onClick={(e) => e.target === e.currentTarget && resetForm()}>
          <div className="tb-modal">
            <div className="tb-modal-head">
              <h2>{editTable ? 'Chỉnh sửa bàn' : 'Thêm bàn mới'}</h2>
              <button className="tb-modal-x" onClick={resetForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="tb-modal-body">
                <div className="tb-form-row">
                  <div className="tb-fg">
                    <label>Mã bàn *</label>
                    <input
                      type="text" value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      required placeholder="VD: T01, VIP-01"
                    />
                  </div>
                  <div className="tb-fg">
                    <label>Tên bàn *</label>
                    <input
                      type="text" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required placeholder="VD: Bàn 01, Phòng VIP 1"
                    />
                  </div>
                </div>
                <div className="tb-form-row">
                  <div className="tb-fg">
                    <label>Khu vực *</label>
                    <select
                      value={form.areaId}
                      onChange={(e) => setForm({ ...form, areaId: e.target.value })}
                      required
                    >
                      <option value="">Chọn khu vực</option>
                      {areas.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="tb-fg">
                    <label>Trạng thái</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="AVAILABLE">Trống</option>
                      <option value="BOOKED">Đã đặt</option>
                      <option value="VIP">VIP</option>
                      <option value="INACTIVE">Tạm ngưng</option>
                    </select>
                  </div>
                </div>
                <div className="tb-form-row">
                  <div className="tb-fg">
                    <label>Tối thiểu (khách)</label>
                    <input type="number" min="1" value={form.minGuests} onChange={(e) => setForm({ ...form, minGuests: e.target.value })} />
                  </div>
                  <div className="tb-fg">
                    <label>Tối đa (khách)</label>
                    <input type="number" min="1" value={form.maxGuests} onChange={(e) => setForm({ ...form, maxGuests: e.target.value })} />
                  </div>
                </div>
                <div className="tb-form-row">
                  <div className="tb-fg">
                    <label>Tiền cọc (VNĐ)</label>
                    <input type="number" min="0" value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: e.target.value })} />
                  </div>
                  <div className="tb-fg">
                    <label>Min spend (VNĐ)</label>
                    <input type="number" min="0" value={form.minSpend} onChange={(e) => setForm({ ...form, minSpend: e.target.value })} />
                  </div>
                </div>
                <div className="tb-form-row">
                  <div className="tb-fg">
                    <label>Vị trí X (%)</label>
                    <input type="number" min="0" max="100" step="0.1" value={form.posX} onChange={(e) => setForm({ ...form, posX: e.target.value })} />
                  </div>
                  <div className="tb-fg">
                    <label>Vị trí Y (%)</label>
                    <input type="number" min="0" max="100" step="0.1" value={form.posY} onChange={(e) => setForm({ ...form, posY: e.target.value })} />
                  </div>
                </div>
                <div className="tb-form-row">
                  <div className="tb-fg">
                    <label>Chiều rộng</label>
                    <input type="number" min="10" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} />
                  </div>
                  <div className="tb-fg">
                    <label>Chiều cao</label>
                    <input type="number" min="10" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} />
                  </div>
                </div>
                <div className="tb-fg">
                  <label>Ghi chú</label>
                  <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} placeholder="Ghi chú..." />
                </div>
              </div>
              <div className="tb-modal-foot">
                <button type="button" className="tb-btn-sec" onClick={resetForm}>Hủy</button>
                <button type="submit" className="tb-btn-pri" disabled={saving}>
                  {saving ? 'Đang lưu...' : editTable ? 'Cập nhật' : 'Tạo bàn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrModal && (
        <div className="tb-overlay" onClick={e => e.target === e.currentTarget && closeQrModal()}>
          <div className="tb-modal tb-qr-modal">
            <div className="tb-modal-head">
              <h2>Mã QR — {qrModal.code}</h2>
              <button className="tb-modal-x" onClick={closeQrModal}>✕</button>
            </div>
            <div className="tb-modal-body">
              {qrLoading ? (
                <div className="tb-qr-loading">
                  <div className="tb-loader" />
                  <p>Đang tải...</p>
                </div>
              ) : qrData ? (
                <>
                  {/* QR Printable Card Preview */}
                  <div className="tb-qr-preview" id="tb-qr-card">
                    <div className="tb-qr-brand">BÁO GARDEN</div>
                    <div className="tb-qr-brand-sub">Ẩm thực &amp; Giải trí</div>
                    <div className="tb-qr-divider" />
                    <div className="tb-qr-label">MÃ BÀN</div>
                    <div className="tb-qr-code-big">{qrData.tableCode}</div>
                    <div className="tb-qr-name">{qrData.tableName}</div>
                    <div className="tb-qr-url-box">
                      <div className="tb-qr-url-label">Link đặt món</div>
                      <div className="tb-qr-url">{qrData.menuUrl}</div>
                    </div>
                    <div className="tb-qr-hint">Quét mã QR hoặc truy cập link để xem menu &amp; đặt món</div>
                  </div>

                  {/* Action buttons */}
                  <div className="tb-qr-actions">
                    <button className="tb-qr-act tb-qr-act-copy" onClick={handleCopyLink}>
                      ⧉ Copy link
                    </button>
                    <button className="tb-qr-act tb-qr-act-download" onClick={handleDownloadQr}>
                      ↓ Tải QR
                    </button>
                    <button className="tb-qr-act tb-qr-act-print" onClick={handlePrintQr}>
                      ⎙ In QR
                    </button>
                    <button
                      className="tb-qr-act tb-qr-act-regen"
                      onClick={handleRegenerateQr}
                      disabled={qrRegenerating}
                    >
                      {qrRegenerating ? '...' : '↻ Tạo lại QR'}
                    </button>
                  </div>

                  <div className="tb-qr-warn">
                    Lưu ý: Tạo lại QR sẽ khiến mã cũ không còn hoạt động.
                  </div>
                </>
              ) : (
                <div className="tb-qr-loading">
                  <p>Không thể tải dữ liệu QR</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div className="tb-overlay" onClick={e => e.target === e.currentTarget && setConfirm(null)}>
          <div className="tb-confirm">
            <h3>Xác nhận xóa bàn</h3>
            <p>Bạn có chắc muốn xóa bàn <strong>{confirm.table.code}</strong> — {confirm.table.name}?</p>
            <div className="tb-confirm-btns">
              <button className="tb-btn-sec" onClick={() => setConfirm(null)}>Không</button>
              <button className="tb-btn-danger" onClick={() => doDelete(confirm.table)}>Xóa bàn</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`tb-toast ${toast.ok ? 'tb-toast-ok' : 'tb-toast-err'}`}>{toast.ok ? '✓' : '⚠'} {toast.msg}</div>}
    </div>
  );
}

const CSS = `
/* animation */
.tb{animation:tb-in 0.25s ease}
@keyframes tb-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* loader */
.tb-loading{display:flex;justify-content:center;padding:var(--space-4xl)}
.tb-loader{width:60px;height:2px;background:var(--border-subtle);border-radius:1px;position:relative;overflow:hidden}
.tb-loader::after{content:'';position:absolute;top:0;left:-60px;width:60px;height:100%;background:var(--gold-400);animation:tb-line 1.2s ease-in-out infinite}
@keyframes tb-line{0%{left:-60px}100%{left:60px}}

/* header */
.tb-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;gap:12px;flex-wrap:wrap}
.tb-title{font-size:1.4rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary)}
.tb-sub{font-size:0.82rem;color:var(--text-tertiary);margin-top:2px}
.tb-header-actions{display:flex;align-items:center;gap:var(--space-md);flex-wrap:wrap}
.tb-view-toggle{display:flex;background:var(--bg-tertiary);border-radius:var(--radius-md);padding:3px}
.tb-view-btn{padding:7px 14px;border-radius:6px;font-size:0.78rem;font-weight:500;background:none;border:none;color:var(--text-tertiary);cursor:pointer;transition:all 0.15s;white-space:nowrap;font-family:inherit;min-height:36px}
.tb-view-btn-on{background:var(--bg-card);color:var(--text-primary);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.2)}
.tb-add-btn{padding:9px 18px;border-radius:10px;font-size:0.82rem;font-weight:600;background:var(--gold-400);color:var(--bg-primary);border:none;cursor:pointer;white-space:nowrap;transition:opacity 0.15s;font-family:inherit;min-height:44px}
.tb-add-btn:hover{opacity:0.85}
.tb-qr-all-btn{padding:9px 18px;border-radius:10px;font-size:0.82rem;font-weight:600;background:var(--bg-tertiary);color:var(--text-secondary);border:1px solid var(--border-subtle);cursor:pointer;white-space:nowrap;transition:all 0.15s;font-family:inherit;min-height:44px}
.tb-qr-all-btn:hover{border-color:var(--gold-400);color:var(--gold-400)}

/* filters */
.tb-filters{display:flex;align-items:center;gap:var(--space-lg);margin-bottom:var(--space-xl);flex-wrap:wrap}
.tb-search-wrap{flex:1;max-width:360px;min-width:200px}
.tb-search{width:100%;padding:9px 14px;border-radius:10px;background:var(--bg-card);border:1px solid var(--border-subtle);color:var(--text-primary);font-size:0.85rem;outline:none;font-family:inherit;min-height:44px;transition:border-color 0.15s}
.tb-search:focus{border-color:var(--gold-400)}
.tb-area-tabs{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;padding-bottom:2px}
.tb-area-tabs::-webkit-scrollbar{display:none}
.tb-area-tab{flex-shrink:0;padding:7px 14px;border-radius:8px;font-size:0.78rem;font-weight:500;background:none;border:1px solid transparent;color:var(--text-tertiary);cursor:pointer;transition:all 0.15s;white-space:nowrap;font-family:inherit;min-height:36px}
.tb-area-tab:hover{color:var(--text-primary);border-color:var(--border-subtle)}
.tb-area-tab-on{background:rgba(212,168,74,0.1);border-color:rgba(212,168,74,0.2);color:var(--gold-400);font-weight:600}

/* empty */
.tb-empty{text-align:center;padding:40px 20px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px}
.tb-empty h3{font-size:0.95rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px}
.tb-empty p{font-size:0.82rem;color:var(--text-tertiary)}

/* desktop table */
.tb-table-wrap{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px;overflow:hidden;overflow-x:auto;-webkit-overflow-scrolling:touch}
.tb-table{width:100%;border-collapse:collapse;font-size:0.82rem}
.tb-table th{padding:10px 12px;text-align:left;font-size:0.7rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border-subtle);white-space:nowrap}
.tb-table td{padding:10px 12px;border-bottom:1px solid var(--border-subtle);vertical-align:middle}
.tb-table tr:last-child td{border-bottom:none}
.tb-table tr:hover{background:rgba(255,255,255,0.015)}

.tb-code{font-weight:700;color:var(--gold-400);font-size:0.82rem}
.tb-bold{font-weight:600;color:var(--text-primary)}
.tb-dim{font-size:0.82rem;color:var(--text-secondary)}
.tb-gold{color:var(--gold-400);font-weight:600}
.tb-note-cell{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.82rem;color:var(--text-tertiary)}

/* badges */
.tb-badge{display:inline-block;padding:3px 8px;border-radius:6px;font-size:0.7rem;font-weight:600;white-space:nowrap}
.tb-badge-green{background:rgba(34,197,94,0.12);color:#4ade80}
.tb-badge-red{background:rgba(239,68,68,0.12);color:#ef4444}
.tb-badge-gold{background:rgba(251,191,36,0.12);color:#fbbf24}
.tb-badge-gray{background:rgba(107,114,128,0.12);color:#9ca3af}

/* actions */
.tb-acts{display:flex;gap:5px;flex-wrap:wrap}
.tb-act{padding:5px 10px;border-radius:7px;font-size:0.72rem;font-weight:600;border:1px solid var(--border-subtle);background:var(--bg-secondary);color:var(--text-secondary);cursor:pointer;transition:all 0.15s;white-space:nowrap;font-family:inherit;min-height:32px;display:inline-flex;align-items:center}
.tb-act-ghost{border-color:transparent;color:var(--text-tertiary)}
.tb-act-ghost:hover{color:var(--text-primary)}
.tb-act-danger{border-color:rgba(239,68,68,0.2);color:#ef4444}
.tb-act-danger:hover{background:rgba(239,68,68,0.08)}
.tb-act-qr{border-color:rgba(212,168,74,0.3);color:var(--gold-400);background:rgba(212,168,74,0.06)}
.tb-act-qr:hover{background:rgba(212,168,74,0.14)}

/* mobile cards */
.tb-show-m{display:none}
.tb-cards{display:flex;flex-direction:column;gap:10px}
.tb-card{padding:14px;border-radius:12px;background:var(--bg-card);border:1px solid var(--border-subtle)}
.tb-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px}
.tb-card-name{margin-left:8px;font-weight:600;color:var(--text-primary);font-size:0.88rem}
.tb-card-meta{display:flex;flex-wrap:wrap;gap:12px;font-size:0.78rem;color:var(--text-tertiary);margin-bottom:10px}
.tb-card-meta strong{color:var(--text-primary)}
.tb-card-note{font-size:0.78rem;color:var(--text-tertiary);margin-bottom:10px;padding:8px;background:var(--bg-tertiary);border-radius:8px}

/* floor plan */
.tb-floor-card{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px;overflow:hidden}
.tb-floor{position:relative;width:100%;height:600px;background:var(--bg-primary);overflow:auto}
.tb-legend{position:absolute;top:var(--space-lg);right:var(--space-lg);display:flex;flex-direction:column;gap:var(--space-sm);padding:var(--space-md);background:var(--bg-card);border-radius:var(--radius-md);border:1px solid var(--border-subtle);z-index:10;font-size:0.75rem}
.tb-legend-item{display:flex;align-items:center;gap:6px}
.tb-legend-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0}
.tb-legend-item span{color:var(--text-secondary)}
.tb-floor-item{position:absolute;min-width:80px;min-height:50px;background:var(--bg-card);border:2px solid;border-radius:var(--radius-md);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;box-shadow:0 1px 4px rgba(0,0,0,0.15);font-size:0.75rem}
.tb-floor-item:hover{box-shadow:0 2px 10px rgba(0,0,0,0.3);transform:scale(1.04)}
.tb-floor-code{font-weight:700;font-size:0.8rem}
.tb-floor-cap{color:var(--text-tertiary);font-size:0.65rem}
.tb-floor-empty{display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary)}

/* modal */
.tb-overlay{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;animation:tb-fade 0.15s}
@keyframes tb-fade{from{opacity:0}to{opacity:1}}
.tb-modal{width:100%;max-width:600px;max-height:90vh;overflow-y:auto;background:var(--bg-secondary);border:1px solid var(--border-subtle);border-radius:20px;animation:tb-up 0.25s cubic-bezier(0.16,1,0.3,1)}
@keyframes tb-up{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
.tb-modal-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--border-subtle)}
.tb-modal-head h2{font-size:1.1rem;font-weight:700;color:var(--text-primary)}
.tb-modal-x{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);color:var(--text-tertiary);font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;min-width:44px;min-height:44px}
.tb-modal-body{padding:20px 24px;display:flex;flex-direction:column;gap:14px}
.tb-modal-foot{padding:16px 24px;border-top:1px solid var(--border-subtle);display:flex;justify-content:flex-end;gap:10px}

/* form */
.tb-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tb-fg{display:flex;flex-direction:column;gap:5px}
.tb-fg label{font-size:0.72rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em}
.tb-fg input,.tb-fg select,.tb-fg textarea{padding:10px 14px;border-radius:10px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);color:var(--text-primary);font-size:0.88rem;outline:none;font-family:inherit;transition:border-color 0.15s;min-height:44px}
.tb-fg input:focus,.tb-fg select:focus,.tb-fg textarea:focus{border-color:var(--gold-400)}
.tb-fg textarea{resize:vertical;min-height:60px}

.tb-btn-pri{padding:10px 20px;border-radius:10px;font-size:0.85rem;font-weight:600;background:var(--gold-400);color:var(--bg-primary);border:none;cursor:pointer;font-family:inherit;min-height:44px}
.tb-btn-pri:disabled{opacity:0.5;cursor:wait}
.tb-btn-sec{padding:10px 20px;border-radius:10px;font-size:0.85rem;font-weight:500;background:var(--bg-tertiary);border:1px solid var(--border-subtle);color:var(--text-secondary);cursor:pointer;font-family:inherit;min-height:44px}
.tb-btn-danger{padding:10px 20px;border-radius:10px;font-size:0.85rem;font-weight:600;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;font-family:inherit;min-height:44px}

/* confirm dialog */
.tb-confirm{width:100%;max-width:400px;padding:28px;background:var(--bg-secondary);border:1px solid var(--border-subtle);border-radius:20px;text-align:center;animation:tb-up 0.25s cubic-bezier(0.16,1,0.3,1)}
.tb-confirm h3{font-size:1.1rem;font-weight:700;margin-bottom:8px;color:var(--text-primary)}
.tb-confirm p{font-size:0.88rem;color:var(--text-secondary);margin-bottom:20px;line-height:1.5}
.tb-confirm-btns{display:flex;gap:10px;justify-content:center}

/* toast */
.tb-toast{position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:999;padding:10px 20px;border-radius:12px;backdrop-filter:blur(12px);font-size:0.82rem;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.4);white-space:nowrap;animation:tb-down 0.3s cubic-bezier(0.16,1,0.3,1)}
.tb-toast-ok{background:rgba(16,24,16,0.96);border:1px solid rgba(34,197,94,0.2);color:#4ade80}
.tb-toast-err{background:rgba(16,16,24,0.96);border:1px solid rgba(239,68,68,0.2);color:#f87171}
@keyframes tb-down{from{transform:translateX(-50%) translateY(-16px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}

/* ========== QR MODAL STYLES ========== */
.tb-qr-modal{max-width:460px}
.tb-qr-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 0;gap:12px}
.tb-qr-loading p{font-size:0.85rem;color:var(--text-tertiary)}

.tb-qr-preview{padding:28px 24px;border:2px solid rgba(212,168,74,0.25);border-radius:16px;text-align:center;background:rgba(212,168,74,0.03)}
.tb-qr-brand{font-size:1.3rem;font-weight:800;color:var(--gold-400);letter-spacing:0.02em}
.tb-qr-brand-sub{font-size:0.7rem;color:var(--text-tertiary);margin-top:2px;letter-spacing:0.08em;text-transform:uppercase}
.tb-qr-divider{width:48px;height:2px;background:var(--gold-400);margin:14px auto}
.tb-qr-label{font-size:0.7rem;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px}
.tb-qr-code-big{font-size:1.8rem;font-weight:800;color:var(--text-primary);line-height:1.2}
.tb-qr-name{font-size:0.95rem;font-weight:600;color:var(--text-secondary);margin-bottom:16px}
.tb-qr-url-box{padding:12px;background:var(--bg-tertiary);border-radius:10px;margin-bottom:14px}
.tb-qr-url-label{font-size:0.65rem;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px}
.tb-qr-url{font-size:0.75rem;color:var(--gold-400);word-break:break-all;font-weight:600;line-height:1.5}
.tb-qr-hint{font-size:0.72rem;color:var(--text-tertiary);line-height:1.5}

.tb-qr-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tb-qr-act{padding:10px 14px;border-radius:10px;font-size:0.8rem;font-weight:600;border:1px solid var(--border-subtle);background:var(--bg-tertiary);color:var(--text-secondary);cursor:pointer;transition:all 0.15s;font-family:inherit;min-height:44px;text-align:center;display:flex;align-items:center;justify-content:center;gap:4px}
.tb-qr-act:hover{border-color:var(--gold-400);color:var(--gold-400)}
.tb-qr-act:disabled{opacity:0.5;cursor:wait}
.tb-qr-act-copy{border-color:rgba(59,130,246,0.25);color:rgba(96,165,250,1)}
.tb-qr-act-copy:hover{background:rgba(59,130,246,0.08)}
.tb-qr-act-download{border-color:rgba(34,197,94,0.25);color:#4ade80}
.tb-qr-act-download:hover{background:rgba(34,197,94,0.08)}
.tb-qr-act-print{border-color:rgba(212,168,74,0.25);color:var(--gold-400)}
.tb-qr-act-print:hover{background:rgba(212,168,74,0.08)}
.tb-qr-act-regen{border-color:rgba(239,68,68,0.2);color:#f87171}
.tb-qr-act-regen:hover{background:rgba(239,68,68,0.06)}

.tb-qr-warn{font-size:0.72rem;color:var(--text-tertiary);text-align:center;padding:8px 12px;background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.1);border-radius:8px;line-height:1.5}

/* responsive */
@media(max-width:1024px){
  .tb-filters{flex-wrap:wrap}
  .tb-area-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch;flex-wrap:nowrap}
  .tb-area-tab{white-space:nowrap;flex-shrink:0}
  .tb-floor{height:450px}
}
@media(max-width:640px){
  .tb-header{flex-direction:column;gap:12px}
  .tb-header-actions{width:100%;justify-content:space-between}
  .tb-title{font-size:1.2rem}
  .tb-filters{flex-direction:column;align-items:stretch;gap:var(--space-md)}
  .tb-search-wrap{max-width:unset}
  .tb-area-tabs{width:100%}
  .tb-hide-m{display:none}
  .tb-show-m{display:flex}
  .tb-form-row{grid-template-columns:1fr}
  .tb-modal{border-radius:20px 20px 0 0;max-height:95vh;align-self:flex-end}
  .tb-modal-head{padding:16px 20px}
  .tb-modal-body{padding:16px 20px}
  .tb-modal-foot{padding:12px 20px}
  .tb-floor{height:350px}
  .tb-legend{top:var(--space-sm);right:var(--space-sm);padding:var(--space-sm)}
  .tb-act{min-height:44px;padding:8px 14px;font-size:0.78rem}
  .tb-qr-modal{max-width:100%}
  .tb-qr-actions{grid-template-columns:1fr 1fr}
  .tb-qr-code-big{font-size:1.5rem}
  .tb-qr-preview{padding:20px 16px}
}
`;
