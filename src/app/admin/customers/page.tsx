'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

interface Customer {
  id: string;
  name: string;
  phone: string;
  note: string | null;
  customerType: string;
  createdAt: string;
  bookingCount: number;
  lastBookingDate: string | null;
  totalRevenue: number;
}

const TYPE_CONFIG: Record<string, { label: string; badge: string }> = {
  NEW: { label: 'Mới', badge: 'cu-badge-green' },
  RETURNING: { label: 'Quay lại', badge: 'cu-badge-blue' },
  VIP: { label: 'VIP', badge: 'cu-badge-gold' },
  BLACKLIST: { label: 'Blacklist', badge: 'cu-badge-red' },
};

const GRADIENT_COLORS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
  'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'decimal', maximumFractionDigits: 0 }).format(amount) + 'đ';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    name: '', phone: '', note: '', customerType: 'NEW',
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmBlacklist, setConfirmBlacklist] = useState(false);

  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergePrimaryId, setMergePrimaryId] = useState('');
  const [mergeDuplicateId, setMergeDuplicateId] = useState('');
  const [merging, setMerging] = useState(false);

  const pageSize = 20;

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (typeFilter !== 'all') params.set('customerType', typeFilter);
      params.set('page', String(page));
      params.set('limit', String(pageSize));

      const res = await fetch(`/api/customers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCustomers(data.data || []);
          setTotalCount(data.pagination?.total || 0);
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, typeFilter, page]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter]);

  // Fetch type counts for tabs
  const loadTypeCounts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/customers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const counts: Record<string, number> = { all: data.data.length };
          for (const c of data.data) {
            counts[c.customerType] = (counts[c.customerType] || 0) + 1;
          }
          setTypeCounts(counts);
        }
      }
    } catch {
      // silently fail
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadTypeCounts();
  }, [loadTypeCounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.customerType === 'BLACKLIST' && !editCustomer?.customerType?.includes('BLACKLIST')) {
      if (!confirmBlacklist) {
        setConfirmBlacklist(true);
        return;
      }
    }
    setConfirmBlacklist(false);

    try {
      const url = editCustomer ? `/api/customers/${editCustomer.id}` : '/api/customers';
      const method = editCustomer ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          note: form.note.trim() || undefined,
          customerType: form.customerType,
        }),
      });
      if (res.ok) {
        showToast(editCustomer ? 'Cập nhật khách hàng thành công' : 'Thêm khách hàng thành công', 'success');
        resetForm();
        await loadCustomers();
      } else {
        const errData = await res.json().catch(() => null);
        showToast(errData?.error || 'Có lỗi xảy ra, vui lòng thử lại', 'error');
      }
    } catch {
      showToast('Lỗi kết nối, vui lòng thử lại', 'error');
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setEditCustomer(null);
    setForm({ name: '', phone: '', note: '', customerType: 'NEW' });
    setConfirmBlacklist(false);
  };

  const handleEdit = (cust: Customer) => {
    setEditCustomer(cust);
    setForm({
      name: cust.name, phone: cust.phone,
      note: cust.note || '', customerType: cust.customerType,
    });
    setShowModal(true);
  };

  const exportCSV = () => {
    if (customers.length === 0) { showToast('Không có dữ liệu để xuất', 'error'); return; }
    const headers = ['Tên','SĐT','Loại KH','Số lần đặt','Lần đặt gần nhất','Tổng doanh số','Ghi chú'];
    const escape = (v: string) => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const rows = customers.map(c => [
      c.name, c.phone,
      TYPE_CONFIG[c.customerType]?.label || c.customerType,
      String(c.bookingCount || 0),
      c.lastBookingDate ? formatDate(c.lastBookingDate) : '',
      String(c.totalRevenue || 0),
      c.note || ''
    ].map(escape).join(','));
    const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleMerge = async () => {
    if (!mergePrimaryId || !mergeDuplicateId) {
      showToast('Vui lòng chọn đủ 2 khách hàng', 'error');
      return;
    }
    if (mergePrimaryId === mergeDuplicateId) {
      showToast('Không thể gộp khách hàng với chính mình', 'error');
      return;
    }
    setMerging(true);
    try {
      const res = await fetch('/api/customers/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryId: mergePrimaryId, duplicateId: mergeDuplicateId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Gộp khách hàng thành công', 'success');
        setShowMergeModal(false);
        setMergePrimaryId('');
        setMergeDuplicateId('');
        await loadCustomers();
      } else {
        showToast(data.error || 'Có lỗi xảy ra', 'error');
      }
    } catch {
      showToast('Lỗi kết nối, vui lòng thử lại', 'error');
    } finally {
      setMerging(false);
    }
  };

  const typeTabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'NEW', label: 'Mới' },
    { key: 'RETURNING', label: 'Quay lại' },
    { key: 'VIP', label: 'VIP' },
    { key: 'BLACKLIST', label: 'Blacklist' },
  ];

  return (
    <div className="cu">
      <style>{CSS}</style>

      {/* Toast */}
      {toast && (
        <div className={`cu-toast ${toast.type === 'success' ? 'cu-toast-ok' : 'cu-toast-err'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Khách hàng</h1>
          <p className="page-subtitle">Quản lý thông tin và lịch sử khách hàng</p>
        </div>
        <div className="cu-header-actions">
          <button className="cu-export-btn" onClick={() => setShowMergeModal(true)}>Gộp trùng</button>
          <button className="cu-export-btn" onClick={exportCSV}>Xuất CSV</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} id="add-customer-btn">
            Thêm khách hàng
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="cu-filters">
        <div className="cu-search-box">
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="cu-search-input"
            id="customer-search"
          />
          {search !== debouncedSearch && (
            <span className="cu-search-indicator" />
          )}
        </div>
        <div className="cu-stats-row">
          <span className="cu-stat-badge">{totalCount} khách hàng</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 'var(--space-xl)' }}>
        {typeTabs.map(tab => {
          const count = typeCounts[tab.key];
          return (
            <button
              key={tab.key}
              className={`tab ${typeFilter === tab.key ? 'active' : ''}`}
              onClick={() => setTypeFilter(tab.key)}
            >
              {tab.label}{count !== undefined ? ` (${count})` : ''}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="cu-skeleton-wrap">
          {/* Skeleton stat cards */}
          <div className="cu-skeleton-stats">
            {[0,1,2].map(i => (
              <div key={i} className="cu-skeleton-card">
                <div className="cu-skeleton cu-skeleton-line" style={{ width: '60%', height: 12 }} />
                <div className="cu-skeleton cu-skeleton-line" style={{ width: '40%', height: 24, marginTop: 10 }} />
              </div>
            ))}
          </div>
          {/* Skeleton table */}
          <div className="cu-skeleton-table">
            <div className="cu-skeleton-thead">
              <div className="cu-skeleton cu-skeleton-line" style={{ width: '100%', height: 10 }} />
            </div>
            {[0,1,2,3,4].map(i => (
              <div key={i} className="cu-skeleton-row">
                <div className="cu-skeleton-cell" style={{ flex: 2 }}>
                  <div className="cu-skeleton-avatar cu-skeleton" />
                  <div style={{ flex: 1 }}>
                    <div className="cu-skeleton cu-skeleton-line" style={{ width: '70%', height: 12 }} />
                    <div className="cu-skeleton cu-skeleton-line" style={{ width: '40%', height: 8, marginTop: 6 }} />
                  </div>
                </div>
                <div className="cu-skeleton-cell" style={{ flex: 1 }}>
                  <div className="cu-skeleton cu-skeleton-line" style={{ width: '80%', height: 12 }} />
                </div>
                <div className="cu-skeleton-cell cu-hide-mobile" style={{ flex: 1 }}>
                  <div className="cu-skeleton cu-skeleton-line" style={{ width: '50%', height: 12 }} />
                </div>
                <div className="cu-skeleton-cell cu-hide-mobile" style={{ flex: 1 }}>
                  <div className="cu-skeleton cu-skeleton-line" style={{ width: '60%', height: 12 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : customers.length === 0 ? (
        <div className="empty-state">
          <h3>Chưa có khách hàng nào</h3>
          <p>Thêm khách hàng đầu tiên để bắt đầu</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="cu-table-wrap cu-hide-mobile">
            <table className="cu-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>SĐT</th>
                  <th>Số lần đặt</th>
                  <th>Lần đặt gần nhất</th>
                  <th>Tổng doanh số</th>
                  <th>Loại KH</th>
                  <th>Ghi chú</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((cust, i) => {
                  const typeInfo = TYPE_CONFIG[cust.customerType];
                  return (
                    <tr key={cust.id}>
                      <td>
                        <div className="cu-customer-cell">
                          <div className="cu-avatar" style={{ background: GRADIENT_COLORS[i % GRADIENT_COLORS.length] }}>
                            {cust.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="cu-name">{cust.name}</div>
                            <div className="cu-since">Từ {formatDate(cust.createdAt)}</div>
                          </div>
                        </div>
                      </td>
                      <td>{cust.phone}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{cust.bookingCount || 0}</span>
                        <span className="cu-unit"> lần</span>
                      </td>
                      <td className="cu-date-cell">
                        {cust.lastBookingDate ? formatDate(cust.lastBookingDate) : '—'}
                      </td>
                      <td className="cu-revenue">{formatCurrency(cust.totalRevenue || 0)}</td>
                      <td>
                        <span className={`cu-badge ${typeInfo?.badge || 'cu-badge-gray'}`}>
                          {typeInfo?.label || cust.customerType}
                        </span>
                      </td>
                      <td className="cu-note-cell">{cust.note || '—'}</td>
                      <td>
                        <div className="cu-action-btns">
                          <Link href={`/admin/customers/${cust.id}`} className="btn btn-sm btn-ghost" title="Chi tiết">
                            Chi tiết
                          </Link>
                          <button className="btn btn-sm btn-ghost" onClick={() => handleEdit(cust)} title="Sửa">
                            Sửa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="cu-cards cu-show-mobile">
            {customers.map((cust, i) => {
              const typeInfo = TYPE_CONFIG[cust.customerType];
              return (
                <div key={cust.id} className="cu-card">
                  <div className="cu-card-top">
                    <div className="cu-card-customer">
                      <div className="cu-avatar" style={{ background: GRADIENT_COLORS[i % GRADIENT_COLORS.length] }}>
                        {cust.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="cu-name">{cust.name}</div>
                        <div className="cu-since">{cust.phone}</div>
                      </div>
                    </div>
                    <span className={`cu-badge ${typeInfo?.badge || 'cu-badge-gray'}`}>
                      {typeInfo?.label || cust.customerType}
                    </span>
                  </div>
                  <div className="cu-card-meta">
                    <span><strong>{cust.bookingCount || 0}</strong> lần đặt</span>
                    <span>{cust.lastBookingDate ? formatDate(cust.lastBookingDate) : '—'}</span>
                  </div>
                  <div className="cu-card-revenue">
                    {formatCurrency(cust.totalRevenue || 0)}
                  </div>
                  <div className="cu-card-actions">
                    <Link href={`/admin/customers/${cust.id}`} className="cu-act-btn cu-act-detail">Chi tiết</Link>
                    <button className="cu-act-btn cu-act-edit" onClick={() => handleEdit(cust)}>Sửa</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="cu-pagination">
              <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Trước
              </button>
              <span className="cu-page-info">
                Trang {page}/{totalPages}
              </span>
              <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {/* Confirm blacklist dialog */}
      {confirmBlacklist && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setConfirmBlacklist(false)}>
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2>Xác nhận Blacklist</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setConfirmBlacklist(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 'var(--space-xl)' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Bạn có chắc chắn muốn đưa khách hàng <strong style={{ color: 'var(--text-primary)' }}>{form.name}</strong> vào danh sách Blacklist? Khách hàng này sẽ bị đánh dấu và hạn chế đặt bàn.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmBlacklist(false)}>Hủy</button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#ef4444' }}
                onClick={() => {
                  const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                  handleSubmit(fakeEvent);
                }}
              >
                Xác nhận Blacklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && resetForm()}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editCustomer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}</h2>
              <button className="btn btn-icon btn-ghost" onClick={resetForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div className="form-row cu-form-row">
                  <div className="form-group">
                    <label className="form-label">Họ tên *</label>
                    <input
                      type="text" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required id="cust-name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại *</label>
                    <input
                      type="tel" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      required id="cust-phone"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Loại khách hàng</label>
                  <select
                    value={form.customerType}
                    onChange={(e) => setForm({ ...form, customerType: e.target.value })}
                  >
                    <option value="NEW">Mới</option>
                    <option value="RETURNING">Quay lại</option>
                    <option value="VIP">VIP</option>
                    <option value="BLACKLIST">Blacklist</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ghi chú</label>
                  <textarea
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    rows={3} placeholder="Ghi chú về khách hàng..."
                    id="cust-notes"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Hủy</button>
                <button type="submit" className="btn btn-primary" id="cust-submit">
                  {editCustomer ? 'Cập nhật' : 'Thêm khách hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowMergeModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>Gộp khách hàng trùng</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowMergeModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Chọn khách hàng chính (giữ lại) và khách hàng trùng (sẽ bị xoá). Tất cả booking sẽ được chuyển sang khách hàng chính.
              </p>
              <div className="form-group">
                <label className="form-label">Khách hàng chính (giữ lại)</label>
                <select
                  value={mergePrimaryId}
                  onChange={(e) => setMergePrimaryId(e.target.value)}
                >
                  <option value="">-- Chọn khách hàng --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Khách hàng trùng (sẽ xoá)</label>
                <select
                  value={mergeDuplicateId}
                  onChange={(e) => setMergeDuplicateId(e.target.value)}
                >
                  <option value="">-- Chọn khách hàng --</option>
                  {customers.filter((c) => c.id !== mergePrimaryId).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowMergeModal(false)}>Hủy</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleMerge}
                disabled={merging || !mergePrimaryId || !mergeDuplicateId}
                style={{ background: '#ef4444' }}
              >
                {merging ? 'Đang gộp...' : 'Xác nhận gộp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
.cu{animation:cu-in 0.25s ease}
@keyframes cu-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* header actions */
.cu-header-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.cu-export-btn{padding:9px 18px;border-radius:10px;font-size:0.82rem;font-weight:600;background:transparent;color:var(--text-secondary);border:1px solid var(--border-subtle);cursor:pointer;white-space:nowrap;transition:border-color 0.15s,color 0.15s;font-family:inherit;min-height:44px}
.cu-export-btn:hover{border-color:var(--gold-400);color:var(--gold-400)}

/* toast */
.cu-toast{
  position:fixed;top:20px;right:20px;z-index:10000;
  padding:12px 20px;border-radius:10px;font-size:0.85rem;font-weight:600;
  animation:cu-toast-in 0.3s ease;
  box-shadow:0 4px 20px rgba(0,0,0,0.3);
}
@keyframes cu-toast-in{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
.cu-toast-ok{background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(34,197,94,0.3)}
.cu-toast-err{background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3)}

/* filters */
.cu-filters{display:flex;align-items:center;justify-content:space-between;gap:var(--space-lg);margin-bottom:var(--space-xl);flex-wrap:wrap}
.cu-search-box{position:relative;flex:1;max-width:360px}
.cu-search-input{
  width:100%;padding:10px 14px;
  background:var(--bg-tertiary);border:1px solid var(--border-subtle);
  border-radius:var(--radius-md);font-size:0.85rem;
  color:var(--text-primary);font-family:inherit;
  transition:border-color 0.15s;
}
.cu-search-input:focus{border-color:var(--gold-400);outline:none}
.cu-search-indicator{
  position:absolute;right:12px;top:50%;transform:translateY(-50%);
  width:6px;height:6px;border-radius:50%;background:var(--gold-400);
  animation:cu-pulse 0.8s ease infinite;
}
.cu-stats-row{display:flex;gap:var(--space-md)}
.cu-stat-badge{
  padding:6px 14px;background:var(--bg-tertiary);
  border-radius:var(--radius-full);font-size:0.8rem;
  color:var(--text-secondary);font-weight:600;
}

/* skeleton */
@keyframes cu-pulse{0%,100%{opacity:0.04}50%{opacity:0.08}}
.cu-skeleton{background:var(--border-subtle);border-radius:var(--radius-sm);animation:cu-pulse 1.5s ease-in-out infinite}
.cu-skeleton-wrap{display:flex;flex-direction:column;gap:var(--space-xl)}
.cu-skeleton-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-lg)}
.cu-skeleton-card{
  padding:20px;border-radius:12px;
  background:var(--bg-card);border:1px solid var(--border-subtle);
}
.cu-skeleton-line{border-radius:4px}
.cu-skeleton-table{
  background:var(--bg-card);border:1px solid var(--border-subtle);
  border-radius:12px;overflow:hidden;
}
.cu-skeleton-thead{padding:14px;border-bottom:1px solid var(--border-subtle)}
.cu-skeleton-row{
  display:flex;align-items:center;gap:var(--space-lg);
  padding:14px;border-bottom:1px solid var(--border-subtle);
}
.cu-skeleton-row:last-child{border-bottom:none}
.cu-skeleton-cell{display:flex;align-items:center;gap:10px}
.cu-skeleton-avatar{width:38px;height:38px;border-radius:var(--radius-md);flex-shrink:0}

/* table */
.cu-table-wrap{
  background:var(--bg-card);border:1px solid var(--border-subtle);
  border-radius:12px;overflow:hidden;overflow-x:auto;-webkit-overflow-scrolling:touch;
}
.cu-table{width:100%;border-collapse:collapse;font-size:0.85rem}
.cu-table th{
  padding:10px 14px;text-align:left;font-size:0.72rem;font-weight:600;
  color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em;
  border-bottom:1px solid var(--border-subtle);white-space:nowrap;
}
.cu-table td{padding:12px 14px;border-bottom:1px solid var(--border-subtle);vertical-align:middle}
.cu-table tr:last-child td{border-bottom:none}
.cu-table tr:hover{background:rgba(255,255,255,0.015)}

/* customer cell */
.cu-customer-cell{display:flex;align-items:center;gap:var(--space-md)}
.cu-avatar{
  width:38px;height:38px;border-radius:var(--radius-md);flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  color:white;font-weight:700;font-size:0.9rem;
}
.cu-name{font-weight:600;color:var(--text-primary)}
.cu-since{font-size:0.7rem;color:var(--text-tertiary)}
.cu-unit{color:var(--text-tertiary);font-size:0.8rem}
.cu-date-cell{font-size:0.85rem;color:var(--text-secondary)}
.cu-revenue{color:var(--gold-400);font-weight:700}
.cu-note-cell{max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.85rem;color:var(--text-tertiary)}
.cu-action-btns{display:flex;gap:4px}

/* badges */
.cu-badge{display:inline-block;padding:3px 8px;border-radius:6px;font-size:0.72rem;font-weight:600;white-space:nowrap}
.cu-badge-green{background:rgba(34,197,94,0.12);color:#4ade80}
.cu-badge-blue{background:rgba(59,130,246,0.12);color:#3b82f6}
.cu-badge-gold{background:rgba(212,168,74,0.12);color:var(--gold-400)}
.cu-badge-red{background:rgba(239,68,68,0.12);color:#ef4444}
.cu-badge-gray{background:rgba(107,114,128,0.12);color:#6b7280}

/* pagination */
.cu-pagination{
  display:flex;align-items:center;justify-content:center;
  gap:var(--space-sm);margin-top:var(--space-xl);
}
.cu-page-info{font-size:0.85rem;color:var(--text-secondary);padding:0 var(--space-md)}

/* mobile cards */
.cu-show-mobile{display:none}
.cu-cards{display:flex;flex-direction:column;gap:10px}
.cu-card{
  padding:14px;border-radius:12px;
  background:var(--bg-card);border:1px solid var(--border-subtle);
}
.cu-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px}
.cu-card-customer{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
.cu-card-customer .cu-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cu-card-meta{display:flex;gap:16px;font-size:0.78rem;color:var(--text-tertiary);margin-bottom:8px}
.cu-card-meta strong{color:var(--text-primary)}
.cu-card-revenue{font-size:0.95rem;font-weight:700;color:var(--gold-400);margin-bottom:10px}
.cu-card-actions{display:flex;gap:8px}
.cu-act-btn{
  padding:8px 14px;border-radius:8px;font-size:0.78rem;font-weight:600;
  border:1px solid var(--border-subtle);background:var(--bg-secondary);
  color:var(--text-secondary);cursor:pointer;transition:all 0.15s;
  font-family:inherit;text-decoration:none;text-align:center;
  min-height:44px;display:flex;align-items:center;justify-content:center;
}
.cu-act-detail{flex:1;border-color:rgba(59,130,246,0.2);color:#3b82f6}
.cu-act-detail:hover{background:rgba(59,130,246,0.08)}
.cu-act-edit{border-color:rgba(212,168,74,0.2);color:var(--gold-400)}
.cu-act-edit:hover{background:rgba(212,168,74,0.08)}

/* form row responsive */
.cu-form-row{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-lg)}

/* responsive */
@media(max-width:1024px){
  .cu-filters{flex-direction:column;align-items:stretch}
  .cu-search-box{max-width:none}
  .cu-skeleton-stats{grid-template-columns:1fr 1fr}
}
@media(max-width:640px){
  .cu-hide-mobile{display:none}
  .cu-show-mobile{display:flex}
  .cu-filters{flex-direction:column;align-items:stretch}
  .cu-search-box{max-width:none}
  .cu-form-row{grid-template-columns:1fr}
  .cu-toast{left:12px;right:12px;top:12px}
  .cu-skeleton-stats{grid-template-columns:1fr}
  .cu-card-meta{flex-wrap:wrap;gap:8px}
  .cu-card-actions{flex-direction:column}
  .cu-act-btn{width:100%}
}
`;
