'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface CustomerNote {
  id: string;
  note: string;
  createdAt: string;
  user: { name: string };
}

interface CustomerBooking {
  id: string;
  bookingCode: string;
  bookingDate: string;
  bookingTime: string;
  guestCount: number;
  status: string;
  depositAmount: number;
  note: string | null;
  table: { code: string; name: string };
  createdByUser: { name: string } | null;
}

interface CustomerDetail {
  id: string;
  name: string;
  phone: string;
  note: string | null;
  customerType: string;
  createdAt: string;
  updatedAt: string;
  bookings: CustomerBooking[];
  customerNotes: CustomerNote[];
  bookingCount: number;
  totalRevenue: number;
  noShowCount: number;
  cancelledCount: number;
  completedCount: number;
  avgGuestCount: number;
  favoriteTable: { code: string; name: string; count: number } | null;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ xác nhận', cls: 'cp-st-gold' },
  CONFIRMED: { label: 'Đã xác nhận', cls: 'cp-st-blue' },
  ARRIVED: { label: 'Đã đến', cls: 'cp-st-green' },
  CANCELLED: { label: 'Đã hủy', cls: 'cp-st-red' },
  NO_SHOW: { label: 'Không đến', cls: 'cp-st-gray' },
  COMPLETED: { label: 'Hoàn tất', cls: 'cp-st-purple' },
};

const TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  NEW: { label: 'Mới', cls: 'cp-type-green' },
  RETURNING: { label: 'Quay lại', cls: 'cp-type-blue' },
  VIP: { label: 'VIP', cls: 'cp-type-gold' },
  BLACKLIST: { label: 'Blacklist', cls: 'cp-type-red' },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'decimal', maximumFractionDigits: 0 }).format(amount) + 'đ';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', note: '', customerType: '' });
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCustomer = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      if (!res.ok) {
        router.replace('/admin/customers');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setCustomer(data.data);
      }
    } catch {
      router.replace('/admin/customers');
    } finally {
      setLoading(false);
    }
  }, [customerId, router]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const handleStartEdit = () => {
    if (!customer) return;
    setEditForm({
      name: customer.name,
      phone: customer.phone,
      note: customer.note || '',
      customerType: customer.customerType,
    });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          phone: editForm.phone.trim(),
          note: editForm.note.trim() || null,
          customerType: editForm.customerType,
        }),
      });
      if (res.ok) {
        setEditing(false);
        showToast('Cập nhật thành công', 'success');
        await loadCustomer();
      } else {
        const errData = await res.json().catch(() => null);
        showToast(errData?.error || 'Có lỗi xảy ra', 'error');
      }
    } catch {
      showToast('Lỗi kết nối', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote.trim() }),
      });
      if (res.ok) {
        setNewNote('');
        showToast('Thêm ghi chú thành công', 'success');
        await loadCustomer();
      }
    } catch {
      showToast('Lỗi kết nối', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="cp-root">
        <style>{CSS}</style>
        <div className="cp-loading">
          <div className="cp-loading-bar">
            <div className="cp-loading-fill" />
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="cp-root">
        <style>{CSS}</style>
        <div className="cp-empty">
          <h3>Không tìm thấy khách hàng</h3>
          <Link href="/admin/customers" className="btn btn-secondary" style={{ marginTop: 'var(--space-lg)' }}>
            ← Quay lại
          </Link>
        </div>
      </div>
    );
  }

  const typeInfo = TYPE_CONFIG[customer.customerType];

  return (
    <div className="cp-root">
      <style>{CSS}</style>

      {/* Toast */}
      {toast && (
        <div className={`cp-toast ${toast.type === 'success' ? 'cp-toast-ok' : 'cp-toast-err'}`}>
          {toast.message}
        </div>
      )}

      {/* Back link */}
      <Link href="/admin/customers" className="cp-back">
        ← Quay lại danh sách
      </Link>

      {/* Header */}
      <div className="cp-header">
        <div className="cp-header-left">
          <div className="cp-avatar">{customer.name?.charAt(0) || '?'}</div>
          <div className="cp-header-info">
            {editing ? (
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="cp-edit-name"
              />
            ) : (
              <h1 className="cp-name">{customer.name}</h1>
            )}
            <div className="cp-meta-row">
              {editing ? (
                <>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="cp-edit-phone"
                  />
                  <select
                    value={editForm.customerType}
                    onChange={(e) => setEditForm({ ...editForm, customerType: e.target.value })}
                    className="cp-edit-select"
                  >
                    <option value="NEW">Mới</option>
                    <option value="RETURNING">Quay lại</option>
                    <option value="VIP">VIP</option>
                    <option value="BLACKLIST">Blacklist</option>
                  </select>
                </>
              ) : (
                <>
                  <span className="cp-phone">{customer.phone}</span>
                  <span className={`cp-type-badge ${typeInfo?.cls || 'cp-type-gray'}`}>
                    {typeInfo?.label || customer.customerType}
                  </span>
                  <span className="cp-since">Từ {formatDate(customer.createdAt)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="cp-header-actions">
          {editing ? (
            <>
              <button className="btn btn-secondary" onClick={() => setEditing(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={handleStartEdit}>Chỉnh sửa</button>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="cp-stats">
        <div className="cp-stat-card">
          <div className="cp-stat-label">Tổng đặt bàn</div>
          <div className="cp-stat-value">{customer.bookingCount || 0}</div>
        </div>
        <div className="cp-stat-card">
          <div className="cp-stat-label">Tổng doanh số</div>
          <div className="cp-stat-value cp-stat-gold">{formatCurrency(customer.totalRevenue || 0)}</div>
        </div>
        <div className="cp-stat-card">
          <div className="cp-stat-label">Đã đến</div>
          <div className="cp-stat-value cp-stat-green">{customer.completedCount || 0}</div>
        </div>
        <div className="cp-stat-card">
          <div className="cp-stat-label">Không đến</div>
          <div className="cp-stat-value cp-stat-red">{customer.noShowCount || 0}</div>
        </div>
        <div className="cp-stat-card">
          <div className="cp-stat-label">Đã hủy</div>
          <div className="cp-stat-value cp-stat-dim">{customer.cancelledCount || 0}</div>
        </div>
        <div className="cp-stat-card">
          <div className="cp-stat-label">Số khách TB</div>
          <div className="cp-stat-value">{customer.avgGuestCount || 0}</div>
        </div>
        {customer.favoriteTable && (
          <div className="cp-stat-card cp-stat-card-wide">
            <div className="cp-stat-label">Bàn yêu thích</div>
            <div className="cp-stat-value cp-stat-fav">
              {customer.favoriteTable.code}
              <span className="cp-fav-count">({customer.favoriteTable.count} lần)</span>
            </div>
          </div>
        )}
      </div>

      {/* Note section (editable) */}
      {editing && (
        <div className="cp-section">
          <h3 className="cp-section-title">Ghi chú chung</h3>
          <textarea
            value={editForm.note}
            onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
            rows={3}
            placeholder="Ghi chú về khách hàng..."
            className="cp-edit-textarea"
          />
        </div>
      )}

      {!editing && customer.note && (
        <div className="cp-section">
          <h3 className="cp-section-title">Ghi chú chung</h3>
          <p className="cp-note-text">{customer.note}</p>
        </div>
      )}

      {/* Staff notes */}
      <div className="cp-section">
        <h3 className="cp-section-title">
          Ghi chú từ nhân viên ({customer.customerNotes?.length || 0})
        </h3>
        <div className="cp-note-form">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Thêm ghi chú..."
            className="cp-note-input"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(); }}
          />
          <button
            className="btn btn-primary"
            onClick={handleAddNote}
            disabled={savingNote || !newNote.trim()}
          >
            Gửi
          </button>
        </div>
        {customer.customerNotes && customer.customerNotes.length > 0 ? (
          <div className="cp-notes-list">
            {customer.customerNotes.map((n) => (
              <div key={n.id} className="cp-note-item">
                <p className="cp-note-content">{n.note}</p>
                <div className="cp-note-meta">
                  <span className="cp-note-author">{n.user?.name}</span>
                  <span>·</span>
                  <span>{formatDateTime(n.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="cp-empty-text">Chưa có ghi chú nào</p>
        )}
      </div>

      {/* Booking history */}
      <div className="cp-section">
        <h3 className="cp-section-title">
          Lịch sử đặt bàn ({customer.bookings?.length || 0})
        </h3>

        {customer.bookings && customer.bookings.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="cp-table-wrap cp-desktop">
              <table className="cp-table">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Ngày</th>
                    <th>Giờ</th>
                    <th>Bàn</th>
                    <th>Số khách</th>
                    <th>Cọc</th>
                    <th>Trạng thái</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.bookings.map((b) => {
                    const si = STATUS_CONFIG[b.status];
                    return (
                      <tr key={b.id}>
                        <td className="cp-code">{b.bookingCode}</td>
                        <td>{formatDate(b.bookingDate)}</td>
                        <td className="cp-time">{b.bookingTime}</td>
                        <td><span className="cp-table-badge">{b.table?.code}</span></td>
                        <td>{b.guestCount}</td>
                        <td className="cp-deposit">{formatCurrency(b.depositAmount || 0)}</td>
                        <td>
                          <span className={`cp-status ${si?.cls || 'cp-st-gray'}`}>
                            {si?.label || b.status}
                          </span>
                        </td>
                        <td className="cp-bnote">{b.note || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="cp-booking-cards cp-mobile">
              {customer.bookings.map((b) => {
                const si = STATUS_CONFIG[b.status];
                return (
                  <div key={b.id} className="cp-bcard">
                    <div className="cp-bcard-top">
                      <span className="cp-code">{b.bookingCode}</span>
                      <span className={`cp-status ${si?.cls || 'cp-st-gray'}`}>
                        {si?.label || b.status}
                      </span>
                    </div>
                    <div className="cp-bcard-body">
                      <div className="cp-bcard-row">
                        <span className="cp-bcard-label">Ngày</span>
                        <span>{formatDate(b.bookingDate)}</span>
                      </div>
                      <div className="cp-bcard-row">
                        <span className="cp-bcard-label">Giờ</span>
                        <span className="cp-time">{b.bookingTime}</span>
                      </div>
                      <div className="cp-bcard-row">
                        <span className="cp-bcard-label">Bàn</span>
                        <span className="cp-table-badge">{b.table?.code}</span>
                      </div>
                      <div className="cp-bcard-row">
                        <span className="cp-bcard-label">Số khách</span>
                        <span>{b.guestCount}</span>
                      </div>
                      <div className="cp-bcard-row">
                        <span className="cp-bcard-label">Cọc</span>
                        <span className="cp-deposit">{formatCurrency(b.depositAmount || 0)}</span>
                      </div>
                      {b.note && (
                        <div className="cp-bcard-row">
                          <span className="cp-bcard-label">Ghi chú</span>
                          <span className="cp-bnote">{b.note}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="cp-empty-text">Chưa có lịch sử đặt bàn</p>
        )}
      </div>
    </div>
  );
}

const CSS = `
.cp-root{animation:cp-in 0.25s ease}
@keyframes cp-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* Toast */
.cp-toast{
  position:fixed;top:20px;right:20px;z-index:10000;
  padding:12px 20px;border-radius:10px;font-size:0.85rem;font-weight:600;
  animation:cp-toast-in 0.3s ease;
  box-shadow:0 4px 20px rgba(0,0,0,0.3);
}
@keyframes cp-toast-in{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
.cp-toast-ok{background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(34,197,94,0.3)}
.cp-toast-err{background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3)}

/* Loading */
.cp-loading{display:flex;justify-content:center;padding:var(--space-4xl)}
.cp-loading-bar{width:60px;height:2px;background:var(--border-subtle);position:relative;overflow:hidden;border-radius:1px}
.cp-loading-fill{position:absolute;top:0;left:-60px;width:60px;height:100%;background:var(--gold-400);animation:cp-slide 1.2s ease-in-out infinite}
@keyframes cp-slide{0%{left:-60px}100%{left:60px}}

/* Empty */
.cp-empty{text-align:center;padding:var(--space-4xl);color:var(--text-secondary)}

/* Back link */
.cp-back{
  display:inline-flex;align-items:center;gap:6px;
  color:var(--text-tertiary);font-size:0.85rem;
  margin-bottom:var(--space-lg);text-decoration:none;
  transition:color 0.15s;min-height:44px;
}
.cp-back:hover{color:var(--gold-400)}

/* Header */
.cp-header{
  display:flex;align-items:flex-start;justify-content:space-between;
  gap:var(--space-lg);margin-bottom:var(--space-2xl);flex-wrap:wrap;
}
.cp-header-left{display:flex;align-items:center;gap:var(--space-lg);min-width:0;flex:1}
.cp-avatar{
  width:56px;height:56px;border-radius:var(--radius-lg);flex-shrink:0;
  background:linear-gradient(135deg,#667eea,#764ba2);
  display:flex;align-items:center;justify-content:center;
  color:white;font-weight:800;font-size:1.4rem;
}
.cp-header-info{min-width:0;flex:1}
.cp-name{font-size:1.4rem;font-weight:800;color:var(--text-primary);margin:0 0 4px 0;line-height:1.3}
.cp-meta-row{display:flex;align-items:center;gap:var(--space-md);flex-wrap:wrap;font-size:0.9rem}
.cp-phone{color:var(--text-secondary)}
.cp-since{font-size:0.78rem;color:var(--text-tertiary)}
.cp-header-actions{display:flex;gap:var(--space-sm);flex-shrink:0}

/* Edit inputs */
.cp-edit-name{
  font-size:1.3rem;font-weight:800;font-family:inherit;
  background:var(--bg-tertiary);border:1px solid var(--border-subtle);
  border-radius:var(--radius-md);padding:4px 12px;color:var(--text-primary);
  width:100%;max-width:300px;
}
.cp-edit-phone{
  font-family:inherit;background:var(--bg-tertiary);
  border:1px solid var(--border-subtle);border-radius:var(--radius-md);
  padding:4px 8px;width:150px;color:var(--text-primary);font-size:0.9rem;
}
.cp-edit-select{
  font-family:inherit;padding:4px 8px;background:var(--bg-tertiary);
  border:1px solid var(--border-subtle);border-radius:var(--radius-md);
  color:var(--text-primary);font-size:0.85rem;
}
.cp-edit-textarea{
  width:100%;font-family:inherit;padding:10px 14px;
  background:var(--bg-tertiary);border:1px solid var(--border-subtle);
  border-radius:var(--radius-md);color:var(--text-primary);font-size:0.9rem;
  resize:vertical;
}

/* Type badges */
.cp-type-badge{
  display:inline-block;padding:3px 10px;border-radius:6px;
  font-size:0.75rem;font-weight:600;white-space:nowrap;
}
.cp-type-green{background:rgba(34,197,94,0.12);color:#4ade80}
.cp-type-blue{background:rgba(59,130,246,0.12);color:#3b82f6}
.cp-type-gold{background:rgba(212,168,74,0.12);color:var(--gold-400)}
.cp-type-red{background:rgba(239,68,68,0.12);color:#ef4444}
.cp-type-gray{background:rgba(107,114,128,0.12);color:#6b7280}

/* Stats grid */
.cp-stats{
  display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));
  gap:var(--space-md);margin-bottom:var(--space-2xl);
}
.cp-stat-card{
  padding:var(--space-lg);border-radius:12px;
  background:var(--bg-card);border:1px solid var(--border-subtle);
}
.cp-stat-card-wide{grid-column:span 2}
.cp-stat-label{font-size:0.72rem;color:var(--text-tertiary);text-transform:uppercase;font-weight:600;letter-spacing:0.03em;margin-bottom:var(--space-sm)}
.cp-stat-value{font-size:1.4rem;font-weight:800;color:var(--text-primary)}
.cp-stat-gold{color:var(--gold-400)}
.cp-stat-green{color:#4ade80}
.cp-stat-red{color:#ef4444}
.cp-stat-dim{color:var(--text-tertiary)}
.cp-stat-fav{font-size:1.1rem;display:flex;align-items:baseline;gap:6px}
.cp-fav-count{font-size:0.78rem;font-weight:600;color:var(--text-tertiary)}

/* Section */
.cp-section{
  background:var(--bg-card);border:1px solid var(--border-subtle);
  border-radius:12px;padding:var(--space-xl);margin-bottom:var(--space-xl);
}
.cp-section-title{font-size:1rem;font-weight:700;margin:0 0 var(--space-lg) 0;color:var(--text-primary)}
.cp-note-text{font-size:0.9rem;color:var(--text-secondary);line-height:1.6;margin:0}

/* Notes */
.cp-note-form{display:flex;gap:var(--space-md);margin-bottom:var(--space-lg)}
.cp-note-input{
  flex:1;padding:10px 14px;font-family:inherit;font-size:0.9rem;
  background:var(--bg-tertiary);border:1px solid var(--border-subtle);
  border-radius:var(--radius-md);color:var(--text-primary);
  min-height:44px;
}
.cp-note-input:focus{border-color:var(--gold-400);outline:none}
.cp-notes-list{display:flex;flex-direction:column;gap:var(--space-md)}
.cp-note-item{
  padding:var(--space-md) var(--space-lg);
  background:var(--bg-tertiary);border-radius:var(--radius-md);
}
.cp-note-content{font-size:0.9rem;margin:0 0 var(--space-sm) 0;color:var(--text-primary);line-height:1.5}
.cp-note-meta{display:flex;align-items:center;gap:var(--space-md);font-size:0.75rem;color:var(--text-tertiary)}
.cp-note-author{font-weight:600}
.cp-empty-text{font-size:0.85rem;color:var(--text-tertiary);margin:0}

/* Booking table */
.cp-table-wrap{
  border-radius:8px;overflow:hidden;overflow-x:auto;
  -webkit-overflow-scrolling:touch;border:1px solid var(--border-subtle);
}
.cp-table{width:100%;border-collapse:collapse;font-size:0.85rem}
.cp-table th{
  padding:10px 14px;text-align:left;font-size:0.72rem;font-weight:600;
  color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em;
  border-bottom:1px solid var(--border-subtle);white-space:nowrap;
  background:var(--bg-tertiary);
}
.cp-table td{
  padding:12px 14px;border-bottom:1px solid var(--border-subtle);
  vertical-align:middle;color:var(--text-secondary);
}
.cp-table tr:last-child td{border-bottom:none}
.cp-table tr:hover{background:rgba(255,255,255,0.015)}
.cp-code{color:var(--gold-400);font-weight:700;font-size:0.8rem;white-space:nowrap}
.cp-time{font-weight:600;color:var(--text-primary)}
.cp-table-badge{
  display:inline-block;padding:2px 8px;border-radius:5px;font-size:0.75rem;font-weight:600;
  background:rgba(212,168,74,0.1);color:var(--gold-400);
}
.cp-deposit{color:var(--gold-400);font-weight:600}
.cp-bnote{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.82rem;color:var(--text-tertiary)}

/* Status badges */
.cp-status{
  display:inline-block;padding:3px 8px;border-radius:6px;
  font-size:0.72rem;font-weight:600;white-space:nowrap;
}
.cp-st-gold{background:rgba(212,168,74,0.12);color:var(--gold-400)}
.cp-st-blue{background:rgba(59,130,246,0.12);color:#3b82f6}
.cp-st-green{background:rgba(34,197,94,0.12);color:#4ade80}
.cp-st-red{background:rgba(239,68,68,0.12);color:#ef4444}
.cp-st-gray{background:rgba(107,114,128,0.12);color:#6b7280}
.cp-st-purple{background:rgba(168,85,247,0.12);color:#a855f7}

/* Mobile booking cards */
.cp-booking-cards{display:flex;flex-direction:column;gap:10px}
.cp-bcard{
  border:1px solid var(--border-subtle);border-radius:10px;
  overflow:hidden;background:var(--bg-tertiary);
}
.cp-bcard-top{
  display:flex;align-items:center;justify-content:space-between;
  padding:10px 14px;border-bottom:1px solid var(--border-subtle);
  background:rgba(255,255,255,0.02);
}
.cp-bcard-body{padding:10px 14px}
.cp-bcard-row{
  display:flex;align-items:center;justify-content:space-between;
  padding:5px 0;font-size:0.85rem;color:var(--text-secondary);
}
.cp-bcard-label{color:var(--text-tertiary);font-size:0.78rem;font-weight:600}

/* Desktop/mobile toggle */
.cp-desktop{display:block}
.cp-mobile{display:none}

/* Responsive */
@media(max-width:768px){
  .cp-header{flex-direction:column;gap:var(--space-md)}
  .cp-header-actions{width:100%;justify-content:flex-end}
  .cp-stats{grid-template-columns:repeat(2,1fr)}
  .cp-stat-card-wide{grid-column:span 2}
  .cp-stat-value{font-size:1.2rem}
  .cp-note-form{flex-direction:column}
}
@media(max-width:640px){
  .cp-desktop{display:none}
  .cp-mobile{display:flex}
  .cp-stats{grid-template-columns:repeat(2,1fr)}
  .cp-stat-card-wide{grid-column:span 2}
  .cp-avatar{width:46px;height:46px;font-size:1.1rem}
  .cp-name{font-size:1.15rem}
  .cp-toast{left:12px;right:12px;top:12px}
  .cp-section{padding:var(--space-lg)}
}
`;
