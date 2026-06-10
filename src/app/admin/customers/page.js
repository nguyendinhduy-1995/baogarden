'use client';

import { useState, useEffect } from 'react';
import { getCustomers, saveCustomer, deleteCustomer, getBookings } from '@/lib/db';
import { formatCurrency, formatDate, getRelativeTime } from '@/lib/utils';
import styles from './page.module.css';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiUser, FiPhone, FiMail, FiTag, FiCalendar, FiDollarSign, FiEye } from 'react-icons/fi';

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

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [detailBookings, setDetailBookings] = useState([]);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', dob: '', gender: 'male', tags: '', notes: '',
  });

  const loadData = () => {
    setCustomers(getCustomers());
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    let list = customers;
    if (tagFilter !== 'all') {
      list = list.filter(c => c.tags?.includes(tagFilter));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
    setFiltered(list);
  }, [customers, search, tagFilter]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const customerData = {
      ...(editCustomer ? { id: editCustomer.id, totalVisits: editCustomer.totalVisits, totalSpent: editCustomer.totalSpent } : {}),
      name: form.name,
      phone: form.phone,
      email: form.email,
      dob: form.dob,
      gender: form.gender,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      notes: form.notes,
    };
    saveCustomer(customerData);
    loadData();
    resetForm();
  };

  const resetForm = () => {
    setShowModal(false);
    setEditCustomer(null);
    setForm({ name: '', phone: '', email: '', dob: '', gender: 'male', tags: '', notes: '' });
  };

  const handleEdit = (cust) => {
    setEditCustomer(cust);
    setForm({
      name: cust.name || '', phone: cust.phone || '', email: cust.email || '',
      dob: cust.dob || '', gender: cust.gender || 'male',
      tags: (cust.tags || []).join(', '), notes: cust.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm('Bạn có chắc muốn xóa khách hàng này?')) {
      deleteCustomer(id);
      loadData();
    }
  };

  const handleViewDetail = (cust) => {
    setShowDetail(cust);
    const allBookings = getBookings();
    setDetailBookings(allBookings.filter(b => b.customerId === cust.id));
  };

  const tabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'VIP', label: 'VIP' },
    { key: 'VVIP', label: 'VVIP' },
    { key: 'Regular', label: 'Regular' },
    { key: 'New', label: 'Mới' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Khách hàng</h1>
          <p className="page-subtitle">Quản lý thông tin và lịch sử khách hàng</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} id="add-customer-btn">
          <FiPlus /> Thêm khách hàng
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            id="customer-search"
          />
        </div>
        <div className={styles.statsRow}>
          <span className={styles.statBadge}>{customers.length} khách hàng</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 'var(--space-xl)' }}>
        {tabs.map(tab => (
          <button key={tab.key} className={`tab ${tagFilter === tab.key ? 'active' : ''}`} onClick={() => setTagFilter(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Customer Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>Chưa có khách hàng nào</h3>
          <p>Thêm khách hàng đầu tiên để bắt đầu</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Số điện thoại</th>
                <th>Email</th>
                <th>Số lần đến</th>
                <th>Tổng chi tiêu</th>
                <th>Tags</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cust, i) => (
                <tr key={cust.id}>
                  <td>
                    <div className={styles.customerCell}>
                      <div className={styles.avatar} style={{ background: GRADIENT_COLORS[i % GRADIENT_COLORS.length] }}>
                        {cust.name?.charAt(0)}
                      </div>
                      <div>
                        <div className={styles.custName}>{cust.name}</div>
                        <div className={styles.custSince}>Từ {formatDate(cust.createdAt)}</div>
                      </div>
                    </div>
                  </td>
                  <td>{cust.phone}</td>
                  <td style={{ color: 'var(--text-tertiary)' }}>{cust.email || '—'}</td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{cust.totalVisits || 0}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}> lần</span>
                  </td>
                  <td style={{ color: 'var(--gold-400)', fontWeight: 700 }}>{formatCurrency(cust.totalSpent || 0)}</td>
                  <td>
                    <div className={styles.tags}>
                      {(cust.tags || []).map(tag => (
                        <span key={tag} className={`badge ${tag === 'VIP' || tag === 'VVIP' ? 'badge-gold' : tag === 'New' ? 'badge-green' : 'badge-gray'}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className={styles.actionBtns}>
                      <button className="btn btn-sm btn-ghost" onClick={() => handleViewDetail(cust)} title="Chi tiết"><FiEye size={14} /></button>
                      <button className="btn btn-sm btn-ghost" onClick={() => handleEdit(cust)} title="Sửa"><FiEdit2 size={14} /></button>
                      <button className="btn btn-sm btn-ghost" style={{ color: '#ef4444' }} onClick={() => handleDelete(cust.id)} title="Xóa"><FiTrash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && resetForm()}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editCustomer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}</h2>
              <button className="btn btn-icon btn-ghost" onClick={resetForm}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Họ tên *</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required id="cust-name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại *</label>
                    <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required id="cust-phone" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} id="cust-email" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ngày sinh</label>
                    <input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} id="cust-dob" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Giới tính</label>
                    <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} id="cust-gender">
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tags (phân cách bằng dấu phẩy)</label>
                    <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="VIP, Regular, New" id="cust-tags" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Ghi chú</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Ghi chú về khách hàng..." id="cust-notes" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Hủy</button>
                <button type="submit" className="btn btn-primary" id="cust-submit">{editCustomer ? 'Cập nhật' : 'Thêm khách hàng'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowDetail(null)}>
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h2>Thông tin khách hàng</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowDetail(null)}><FiX /></button>
            </div>
            <div className="modal-body">
              {/* Profile */}
              <div className={styles.detailProfile}>
                <div className={styles.detailAvatar} style={{ background: GRADIENT_COLORS[0] }}>
                  {showDetail.name?.charAt(0)}
                </div>
                <div>
                  <h3 className={styles.detailName}>{showDetail.name}</h3>
                  <div className={styles.detailContact}>
                    <span><FiPhone size={13} /> {showDetail.phone}</span>
                    {showDetail.email && <span><FiMail size={13} /> {showDetail.email}</span>}
                  </div>
                  <div className={styles.detailTags}>
                    {(showDetail.tags || []).map(tag => (
                      <span key={tag} className={`badge ${tag === 'VIP' || tag === 'VVIP' ? 'badge-gold' : 'badge-gray'}`}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className={styles.detailStats}>
                <div className={styles.detailStat}>
                  <FiCalendar size={16} />
                  <div>
                    <span className={styles.detailStatValue}>{showDetail.totalVisits || 0}</span>
                    <span className={styles.detailStatLabel}>Lần đến</span>
                  </div>
                </div>
                <div className={styles.detailStat}>
                  <FiDollarSign size={16} />
                  <div>
                    <span className={styles.detailStatValue}>{formatCurrency(showDetail.totalSpent || 0)}</span>
                    <span className={styles.detailStatLabel}>Tổng chi tiêu</span>
                  </div>
                </div>
              </div>

              {showDetail.notes && (
                <div className={styles.detailNotes}>
                  <h4>Ghi chú</h4>
                  <p>{showDetail.notes}</p>
                </div>
              )}

              {/* Booking history */}
              <div className={styles.detailSection}>
                <h4>Lịch sử đặt bàn ({detailBookings.length})</h4>
                {detailBookings.length === 0 ? (
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Chưa có lịch sử đặt bàn</p>
                ) : (
                  <div className={styles.bookingHistory}>
                    {detailBookings.map(b => (
                      <div key={b.id} className={styles.historyItem}>
                        <div className={styles.historyInfo}>
                          <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>{b.tableId}</span>
                          <span>{b.date} • {b.time}</span>
                          <span>{b.guests} khách</span>
                        </div>
                        <span className="badge" style={{
                          background: b.status === 'completed' ? 'rgba(139, 92, 246, 0.15)' : b.status === 'cancelled' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(74, 222, 128, 0.15)',
                          color: b.status === 'completed' ? '#8b5cf6' : b.status === 'cancelled' ? '#ef4444' : '#4ade80',
                          fontSize: '0.7rem',
                        }}>
                          {b.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetail(null)}>Đóng</button>
              <button className="btn btn-primary" onClick={() => { handleEdit(showDetail); setShowDetail(null); }}>
                <FiEdit2 size={14} /> Chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
