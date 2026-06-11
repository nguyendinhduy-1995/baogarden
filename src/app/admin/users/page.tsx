'use client';

import { useState, useEffect, useCallback } from 'react';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
  bookingStats?: {
    totalBookings: number;
    arrivedCount: number;
    arrivalRate: number;
  };
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  BOOKING: 'Nhân viên booking',
  RECEPTION: 'Lễ tân',
};

const ROLE_BADGE_CLS: Record<string, string> = {
  ADMIN: 'us-badge-red',
  MANAGER: 'us-badge-purple',
  BOOKING: 'us-badge-blue',
  RECEPTION: 'us-badge-green',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [saving, setSaving] = useState(false);

  const [addForm, setAddForm] = useState({
    name: '', email: '', phone: '', password: '', role: 'BOOKING',
  });

  const [editForm, setEditForm] = useState({
    name: '', email: '', phone: '', role: 'BOOKING',
  });

  const [resetForm, setResetForm] = useState({ newPassword: '' });

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirm, setConfirm] = useState<{ user: UserData; action: 'toggle' } | null>(null);

  const flash = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setUsers(data.data || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setCurrentUserId(data.user.id);
        }
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadCurrentUser();
  }, [loadUsers, loadCurrentUser]);

  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone || '').includes(q);
  });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          phone: addForm.phone.trim() || undefined,
          password: addForm.password,
          role: addForm.role,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setAddForm({ name: '', email: '', phone: '', password: '', role: 'BOOKING' });
        flash('Tạo nhân viên thành công');
        await loadUsers();
      } else {
        const data = await res.json();
        flash(data.error || 'Không thể tạo người dùng', false);
      }
    } catch {
      flash('Lỗi kết nối', false);
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim() || null,
          role: editForm.role,
        }),
      });
      if (res.ok) {
        setShowEditModal(false);
        setEditUser(null);
        flash('Cập nhật thành công');
        await loadUsers();
      } else {
        const data = await res.json();
        flash(data.error || 'Không thể cập nhật', false);
      }
    } catch {
      flash('Lỗi kết nối', false);
    } finally {
      setSaving(false);
    }
  };

  const doToggleStatus = async (user: UserData) => {
    if (user.id === currentUserId) {
      flash('Không thể thay đổi trạng thái tài khoản của chính mình', false);
      return;
    }
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setActionLoading(user.id);
    setConfirm(null);
    try {
      const res = await fetch(`/api/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        flash(newStatus === 'ACTIVE' ? 'Đã kích hoạt tài khoản' : 'Đã tạm khóa tài khoản');
        await loadUsers();
      } else {
        flash('Cập nhật trạng thái thất bại', false);
      }
    } catch {
      flash('Lỗi kết nối', false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = (user: UserData) => {
    if (user.id === currentUserId) {
      flash('Không thể thay đổi trạng thái tài khoản của chính mình', false);
      return;
    }
    setConfirm({ user, action: 'toggle' });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${editUser.id}/reset-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetForm.newPassword }),
      });
      if (res.ok) {
        setShowResetModal(false);
        setEditUser(null);
        setResetForm({ newPassword: '' });
        flash('Đã đổi mật khẩu thành công');
      } else {
        const data = await res.json();
        flash(data.error || 'Không thể đổi mật khẩu', false);
      }
    } catch {
      flash('Lỗi kết nối', false);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (user: UserData) => {
    setEditUser(user);
    setEditForm({
      name: user.name, email: user.email,
      phone: user.phone || '', role: user.role,
    });
    setShowEditModal(true);
  };

  const openResetPassword = (user: UserData) => {
    setEditUser(user);
    setResetForm({ newPassword: '' });
    setShowResetModal(true);
  };

  const ActionBtns = ({ user }: { user: UserData }) => (
    <div className="us-acts">
      <button className="us-act us-act-ghost" onClick={() => openEdit(user)}>Sửa</button>
      <button className="us-act us-act-ghost" onClick={() => openResetPassword(user)}>Đổi MK</button>
      <button
        className={`us-act ${user.status === 'ACTIVE' ? 'us-act-danger' : 'us-act-ok'}`}
        onClick={() => handleToggleStatus(user)}
        disabled={actionLoading === user.id || user.id === currentUserId}
      >
        {user.status === 'ACTIVE' ? 'Khóa' : 'Mở'}
      </button>
    </div>
  );

  return (
    <div className="us">
      <style>{CSS}</style>

      {/* Toast */}
      {toast && <div className={`us-toast ${toast.ok ? 'us-toast-ok' : 'us-toast-err'}`}>{toast.ok ? '✓' : '⚠'} {toast.msg}</div>}

      {/* Header */}
      <div className="us-header">
        <div>
          <h1 className="us-title">Quản lý nhân viên</h1>
          <p className="us-sub">Quản lý tài khoản và hiệu suất booking</p>
        </div>
        <button className="us-add-btn" onClick={() => setShowAddModal(true)}>+ Thêm nhân viên</button>
      </div>

      {/* Search */}
      <div className="us-filters">
        <div className="us-search-box">
          <input
            type="text"
            placeholder="Tìm theo tên, email, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="us-search"
          />
        </div>
        <span className="us-count">{users.length} nhân viên</span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="us-loading"><div className="us-loader" /></div>
      ) : filteredUsers.length === 0 ? (
        <div className="us-empty">
          <h3>Chưa có nhân viên nào</h3>
          <p>Thêm nhân viên đầu tiên để bắt đầu</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="us-table-wrap us-hide-mobile">
            <table className="us-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Email</th>
                  <th>SĐT</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Booking</th>
                  <th>Khách đến</th>
                  <th>Tỷ lệ</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={user.status === 'INACTIVE' ? 'us-row-inactive' : ''}>
                    <td>
                      <div className="us-user-cell">
                        <div className={`us-avatar ${user.id === currentUserId ? 'us-avatar-me' : ''}`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="us-name">
                            {user.name}
                            {user.id === currentUserId && <span className="us-me-tag">(Bạn)</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="us-dim">{user.email}</td>
                    <td>{user.phone || '—'}</td>
                    <td>
                      <span className={`us-badge ${ROLE_BADGE_CLS[user.role] || 'us-badge-gray'}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`us-badge ${user.status === 'ACTIVE' ? 'us-badge-green' : 'us-badge-red'}`}>
                        {user.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
                      </span>
                    </td>
                    <td className="us-dim">{formatDate(user.createdAt)}</td>
                    <td className="us-bold">{user.bookingStats?.totalBookings || 0}</td>
                    <td>{user.bookingStats?.arrivedCount || 0}</td>
                    <td>
                      {user.bookingStats && user.bookingStats.totalBookings > 0 ? (
                        <span className={`us-badge ${user.bookingStats.arrivalRate >= 70 ? 'us-badge-green' : user.bookingStats.arrivalRate >= 50 ? 'us-badge-gold' : 'us-badge-red'}`}>
                          {user.bookingStats.arrivalRate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="us-dim">—</span>
                      )}
                    </td>
                    <td>
                      <ActionBtns user={user} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="us-cards us-show-mobile">
            {filteredUsers.map((user) => (
              <div key={user.id} className={`us-card ${user.status === 'INACTIVE' ? 'us-card-inactive' : ''}`}>
                <div className="us-card-top">
                  <div className="us-card-user">
                    <div className={`us-avatar ${user.id === currentUserId ? 'us-avatar-me' : ''}`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="us-card-info">
                      <div className="us-name">
                        {user.name}
                        {user.id === currentUserId && <span className="us-me-tag">(Bạn)</span>}
                      </div>
                      <div className="us-card-email">{user.email}</div>
                    </div>
                  </div>
                  <span className={`us-badge ${user.status === 'ACTIVE' ? 'us-badge-green' : 'us-badge-red'}`}>
                    {user.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
                  </span>
                </div>
                <div className="us-card-meta">
                  <span className={`us-badge ${ROLE_BADGE_CLS[user.role] || 'us-badge-gray'}`}>
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                  {user.phone && <span>{user.phone}</span>}
                </div>
                <div className="us-card-stats">
                  <span><strong>{user.bookingStats?.totalBookings || 0}</strong> booking</span>
                  <span><strong>{user.bookingStats?.arrivedCount || 0}</strong> đến</span>
                  {user.bookingStats && user.bookingStats.totalBookings > 0 && (
                    <span className={user.bookingStats.arrivalRate >= 70 ? 'us-stat-good' : user.bookingStats.arrivalRate >= 50 ? 'us-stat-mid' : 'us-stat-low'}>
                      {user.bookingStats.arrivalRate.toFixed(1)}%
                    </span>
                  )}
                </div>
                <ActionBtns user={user} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="us-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="us-modal">
            <div className="us-modal-head">
              <h2>Thêm nhân viên mới</h2>
              <button className="us-modal-x" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="us-modal-body">
                <div className="us-fg">
                  <label>Họ tên *</label>
                  <input type="text" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required />
                </div>
                <div className="us-form-row">
                  <div className="us-fg">
                    <label>Email *</label>
                    <input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required />
                  </div>
                  <div className="us-fg">
                    <label>SĐT</label>
                    <input type="tel" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
                  </div>
                </div>
                <div className="us-form-row">
                  <div className="us-fg">
                    <label>Mật khẩu *</label>
                    <input type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} required minLength={6} />
                  </div>
                  <div className="us-fg">
                    <label>Vai trò *</label>
                    <select value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}>
                      <option value="BOOKING">Nhân viên booking</option>
                      <option value="RECEPTION">Lễ tân</option>
                      <option value="MANAGER">Quản lý</option>
                      <option value="ADMIN">Quản trị viên</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="us-modal-foot">
                <button type="button" className="us-btn-sec" onClick={() => setShowAddModal(false)}>Hủy</button>
                <button type="submit" className="us-btn-pri" disabled={saving}>
                  {saving ? 'Đang tạo...' : 'Tạo nhân viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editUser && (
        <div className="us-overlay" onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="us-modal">
            <div className="us-modal-head">
              <h2>Chỉnh sửa nhân viên</h2>
              <button className="us-modal-x" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleEditUser}>
              <div className="us-modal-body">
                <div className="us-fg">
                  <label>Họ tên *</label>
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                </div>
                <div className="us-form-row">
                  <div className="us-fg">
                    <label>Email *</label>
                    <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
                  </div>
                  <div className="us-fg">
                    <label>SĐT</label>
                    <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                  </div>
                </div>
                <div className="us-fg">
                  <label>Vai trò *</label>
                  <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                    <option value="BOOKING">Nhân viên booking</option>
                    <option value="RECEPTION">Lễ tân</option>
                    <option value="MANAGER">Quản lý</option>
                    <option value="ADMIN">Quản trị viên</option>
                  </select>
                </div>
              </div>
              <div className="us-modal-foot">
                <button type="button" className="us-btn-sec" onClick={() => setShowEditModal(false)}>Hủy</button>
                <button type="submit" className="us-btn-pri" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && editUser && (
        <div className="us-overlay" onClick={(e) => e.target === e.currentTarget && setShowResetModal(false)}>
          <div className="us-modal us-modal-sm">
            <div className="us-modal-head">
              <h2>Đổi mật khẩu</h2>
              <button className="us-modal-x" onClick={() => setShowResetModal(false)}>✕</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="us-modal-body">
                <p className="us-reset-info">
                  Đổi mật khẩu cho <strong>{editUser.name}</strong> ({editUser.email})
                </p>
                <div className="us-fg">
                  <label>Mật khẩu mới *</label>
                  <input
                    type="password" value={resetForm.newPassword}
                    onChange={(e) => setResetForm({ newPassword: e.target.value })}
                    required minLength={6}
                    placeholder="Tối thiểu 6 ký tự"
                  />
                </div>
              </div>
              <div className="us-modal-foot">
                <button type="button" className="us-btn-sec" onClick={() => setShowResetModal(false)}>Hủy</button>
                <button type="submit" className="us-btn-pri" disabled={saving}>
                  {saving ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div className="us-overlay" onClick={(e) => e.target === e.currentTarget && setConfirm(null)}>
          <div className="us-confirm">
            <h3>{confirm.user.status === 'ACTIVE' ? 'Tạm khóa tài khoản' : 'Kích hoạt tài khoản'}</h3>
            <p>
              Bạn có chắc muốn {confirm.user.status === 'ACTIVE' ? 'tạm khóa' : 'kích hoạt lại'} tài khoản <strong>{confirm.user.name}</strong>?
              {confirm.user.status === 'ACTIVE' && ' Nhân viên sẽ không thể đăng nhập sau khi bị khóa.'}
            </p>
            <div className="us-confirm-btns">
              <button className="us-btn-sec" onClick={() => setConfirm(null)}>Không</button>
              <button
                className={confirm.user.status === 'ACTIVE' ? 'us-btn-danger' : 'us-btn-pri'}
                onClick={() => doToggleStatus(confirm.user)}
              >
                {confirm.user.status === 'ACTIVE' ? 'Tạm khóa' : 'Kích hoạt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
.us{animation:us-in 0.25s ease}
@keyframes us-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* header */
.us-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;gap:12px;flex-wrap:wrap}
.us-title{font-size:1.4rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary)}
.us-sub{font-size:0.82rem;color:var(--text-tertiary);margin-top:2px}
.us-add-btn{padding:9px 18px;border-radius:10px;font-size:0.82rem;font-weight:600;background:var(--gold-400);color:var(--bg-primary);border:none;cursor:pointer;white-space:nowrap;transition:opacity 0.15s;font-family:inherit;min-height:44px;display:inline-flex;align-items:center}
.us-add-btn:hover{opacity:0.85}

/* filters */
.us-filters{display:flex;align-items:center;gap:var(--space-lg);margin-bottom:var(--space-xl);flex-wrap:wrap}
.us-search-box{position:relative;flex:1;max-width:360px}
.us-search{width:100%;padding:10px 14px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:var(--radius-md);font-size:0.85rem;color:var(--text-primary);font-family:inherit;transition:border-color 0.15s;min-height:44px}
.us-search:focus{border-color:var(--gold-400);outline:none}
.us-count{padding:6px 14px;background:var(--bg-tertiary);border-radius:var(--radius-full);font-size:0.8rem;color:var(--text-secondary);font-weight:600;white-space:nowrap}

/* loading */
.us-loading{display:flex;justify-content:center;padding:60px 0}
.us-loader{width:48px;height:2px;background:var(--border-subtle);border-radius:1px;position:relative;overflow:hidden}
.us-loader::after{content:'';position:absolute;top:0;left:-48px;width:48px;height:100%;background:var(--gold-400);animation:us-slide 1s ease-in-out infinite}
@keyframes us-slide{0%{left:-48px}100%{left:48px}}

/* empty */
.us-empty{text-align:center;padding:40px 20px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px}
.us-empty h3{font-size:0.9rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px}
.us-empty p{font-size:0.78rem;color:var(--text-tertiary)}

/* table */
.us-table-wrap{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px;overflow:hidden;overflow-x:auto;-webkit-overflow-scrolling:touch}
.us-table{width:100%;border-collapse:collapse;font-size:0.82rem}
.us-table th{padding:10px 12px;text-align:left;font-size:0.7rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border-subtle);white-space:nowrap}
.us-table td{padding:10px 12px;border-bottom:1px solid var(--border-subtle);vertical-align:middle}
.us-table tr:last-child td{border-bottom:none}
.us-table tr:hover{background:rgba(255,255,255,0.015)}
.us-row-inactive{opacity:0.5}

/* user cell */
.us-user-cell{display:flex;align-items:center;gap:8px}
.us-avatar{width:34px;height:34px;border-radius:var(--radius-md);flex-shrink:0;background:var(--bg-tertiary);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem}
.us-avatar-me{background:var(--gold-gradient);color:#0a0a0f}
.us-name{font-weight:600;color:var(--text-primary)}
.us-me-tag{font-size:0.7rem;color:var(--gold-400);margin-left:6px}
.us-dim{font-size:0.85rem;color:var(--text-secondary)}
.us-bold{font-weight:600}

/* badges */
.us-badge{display:inline-block;padding:3px 8px;border-radius:6px;font-size:0.7rem;font-weight:600;white-space:nowrap}
.us-badge-green{background:rgba(34,197,94,0.12);color:#4ade80}
.us-badge-blue{background:rgba(59,130,246,0.12);color:#3b82f6}
.us-badge-red{background:rgba(239,68,68,0.12);color:#ef4444}
.us-badge-purple{background:rgba(168,85,247,0.12);color:#a855f7}
.us-badge-gold{background:rgba(212,168,74,0.12);color:var(--gold-400)}
.us-badge-gray{background:rgba(107,114,128,0.12);color:#6b7280}

/* actions */
.us-acts{display:flex;gap:5px;flex-wrap:wrap}
.us-act{padding:5px 10px;border-radius:7px;font-size:0.72rem;font-weight:600;border:1px solid var(--border-subtle);background:var(--bg-secondary);color:var(--text-secondary);cursor:pointer;transition:all 0.15s;white-space:nowrap;font-family:inherit;min-height:32px;display:inline-flex;align-items:center;justify-content:center}
.us-act:disabled{opacity:0.4;cursor:not-allowed}
.us-act-ghost{border-color:transparent;color:var(--text-tertiary)}
.us-act-ghost:hover{color:var(--text-primary)}
.us-act-danger{border-color:rgba(239,68,68,0.2);color:#ef4444}
.us-act-danger:hover{background:rgba(239,68,68,0.08)}
.us-act-ok{border-color:rgba(34,197,94,0.2);color:#4ade80}
.us-act-ok:hover{background:rgba(34,197,94,0.08)}

/* mobile cards */
.us-show-mobile{display:none}
.us-cards{display:flex;flex-direction:column;gap:10px}
.us-card{padding:14px;border-radius:12px;background:var(--bg-card);border:1px solid var(--border-subtle)}
.us-card-inactive{opacity:0.5}
.us-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px}
.us-card-user{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
.us-card-info{min-width:0;flex:1}
.us-card-info .us-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.us-card-email{font-size:0.72rem;color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.us-card-meta{display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:0.78rem;color:var(--text-tertiary)}
.us-card-stats{display:flex;gap:14px;font-size:0.78rem;color:var(--text-tertiary);margin-bottom:10px}
.us-card-stats strong{color:var(--text-primary)}
.us-stat-good{color:#4ade80;font-weight:600}
.us-stat-mid{color:var(--gold-400);font-weight:600}
.us-stat-low{color:#ef4444;font-weight:600}

/* toast */
.us-toast{position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:999;padding:10px 20px;border-radius:12px;backdrop-filter:blur(12px);font-size:0.82rem;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.4);white-space:nowrap;animation:us-toast-in 0.3s cubic-bezier(0.16,1,0.3,1)}
.us-toast-ok{background:rgba(16,24,16,0.96);border:1px solid rgba(34,197,94,0.2);color:#4ade80}
.us-toast-err{background:rgba(16,16,24,0.96);border:1px solid rgba(239,68,68,0.2);color:#f87171}
@keyframes us-toast-in{from{transform:translateX(-50%) translateY(-16px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}

/* modal */
.us-overlay{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;animation:us-fade 0.15s}
@keyframes us-fade{from{opacity:0}to{opacity:1}}
.us-modal{width:100%;max-width:560px;max-height:90vh;overflow-y:auto;background:var(--bg-secondary);border:1px solid var(--border-subtle);border-radius:20px;animation:us-up 0.25s cubic-bezier(0.16,1,0.3,1)}
.us-modal-sm{max-width:400px}
@keyframes us-up{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
.us-modal-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--border-subtle)}
.us-modal-head h2{font-size:1.1rem;font-weight:700;color:var(--text-primary)}
.us-modal-x{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);color:var(--text-tertiary);font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;min-width:36px}
.us-modal-body{padding:20px 24px;display:flex;flex-direction:column;gap:14px}
.us-modal-foot{padding:16px 24px;border-top:1px solid var(--border-subtle);display:flex;justify-content:flex-end;gap:10px}

/* form */
.us-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.us-fg{display:flex;flex-direction:column;gap:5px}
.us-fg label{font-size:0.72rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em}
.us-fg input,.us-fg select{padding:10px 14px;border-radius:10px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);color:var(--text-primary);font-size:0.88rem;outline:none;font-family:inherit;transition:border-color 0.15s;min-height:44px}
.us-fg input:focus,.us-fg select:focus{border-color:var(--gold-400)}
.us-reset-info{font-size:0.85rem;color:var(--text-secondary);line-height:1.5}
.us-reset-info strong{color:var(--text-primary)}

.us-btn-pri{padding:10px 20px;border-radius:10px;font-size:0.85rem;font-weight:600;background:var(--gold-400);color:var(--bg-primary);border:none;cursor:pointer;font-family:inherit;min-height:44px}
.us-btn-pri:disabled{opacity:0.5;cursor:not-allowed}
.us-btn-sec{padding:10px 20px;border-radius:10px;font-size:0.85rem;font-weight:500;background:var(--bg-tertiary);border:1px solid var(--border-subtle);color:var(--text-secondary);cursor:pointer;font-family:inherit;min-height:44px}
.us-btn-danger{padding:10px 20px;border-radius:10px;font-size:0.85rem;font-weight:600;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;font-family:inherit;min-height:44px}

/* confirm */
.us-confirm{width:100%;max-width:400px;padding:28px;background:var(--bg-secondary);border:1px solid var(--border-subtle);border-radius:20px;text-align:center;animation:us-up 0.25s cubic-bezier(0.16,1,0.3,1)}
.us-confirm h3{font-size:1.1rem;font-weight:700;margin-bottom:8px;color:var(--text-primary)}
.us-confirm p{font-size:0.88rem;color:var(--text-secondary);margin-bottom:20px;line-height:1.5}
.us-confirm p strong{color:var(--text-primary)}
.us-confirm-btns{display:flex;gap:10px;justify-content:center}

/* responsive */
@media(max-width:1024px){
  .us-filters{flex-direction:column;align-items:stretch}
  .us-search-box{max-width:none}
}
@media(max-width:640px){
  .us-hide-mobile{display:none}
  .us-show-mobile{display:flex}
  .us-title{font-size:1.2rem}
  .us-form-row{grid-template-columns:1fr}
  .us-modal{border-radius:20px 20px 0 0;max-height:95vh;align-self:flex-end}
  .us-modal-head{padding:16px 20px}
  .us-modal-body{padding:16px 20px}
  .us-modal-foot{padding:12px 20px}
  .us-confirm{border-radius:20px 20px 0 0;align-self:flex-end}
  .us-filters{flex-direction:column;align-items:stretch}
  .us-search-box{max-width:none}
  .us-toast{left:12px;right:12px;transform:none;white-space:normal}
  .us-act{min-height:44px;padding:8px 14px}
}
`;
