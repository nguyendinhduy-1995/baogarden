'use client';

import { useState, useEffect } from 'react';
import { getBookings, saveBooking, updateBookingStatus, deleteBooking, getCustomers, saveCustomer, getCustomerByPhone } from '@/lib/db';
import { TABLES, TABLE_TYPES, TIME_SLOTS, BOOKING_STATUSES } from '@/data/tables';
import { formatCurrency, getTodayString, formatDateTime, generateBookingCode } from '@/lib/utils';
import styles from './page.module.css';
import { FiPlus, FiSearch, FiCheck, FiX, FiLogIn, FiTrash2, FiEdit2, FiCalendar, FiFilter, FiEye } from 'react-icons/fi';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(getTodayString());
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [showDetail, setShowDetail] = useState(null);

  const [form, setForm] = useState({
    customerName: '', customerPhone: '', tableId: '', date: getTodayString(),
    time: '20:00', guests: 2, notes: '', deposit: 0,
  });

  const loadData = () => {
    const all = getBookings();
    setBookings(all);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = bookings;
    if (dateFilter) {
      filtered = filtered.filter(b => b.date === dateFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(b =>
        b.customerName?.toLowerCase().includes(q) ||
        b.customerPhone?.includes(q) ||
        b.tableId?.toLowerCase().includes(q)
      );
    }
    filtered.sort((a, b) => a.time?.localeCompare(b.time));
    setFilteredBookings(filtered);
  }, [bookings, dateFilter, statusFilter, search]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const table = TABLES.find(t => t.id === form.tableId);

    let customer = getCustomerByPhone(form.customerPhone);
    if (!customer) {
      const customers = saveCustomer({ name: form.customerName, phone: form.customerPhone, tags: ['New'] });
      customer = customers.find(c => c.phone === form.customerPhone);
    }

    const bookingData = {
      ...(editBooking ? { id: editBooking.id } : {}),
      customerId: customer?.id,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      tableId: form.tableId,
      date: form.date,
      time: form.time,
      guests: parseInt(form.guests),
      deposit: table?.deposit || 0,
      notes: form.notes,
      status: editBooking ? editBooking.status : 'pending',
      bookingCode: editBooking?.bookingCode || generateBookingCode(),
    };

    saveBooking(bookingData);
    loadData();
    resetForm();
  };

  const resetForm = () => {
    setShowModal(false);
    setEditBooking(null);
    setForm({ customerName: '', customerPhone: '', tableId: '', date: getTodayString(), time: '20:00', guests: 2, notes: '', deposit: 0 });
  };

  const handleEdit = (booking) => {
    setEditBooking(booking);
    setForm({
      customerName: booking.customerName, customerPhone: booking.customerPhone,
      tableId: booking.tableId, date: booking.date, time: booking.time,
      guests: booking.guests, notes: booking.notes || '', deposit: booking.deposit || 0,
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (confirm('Bạn có chắc muốn xóa đặt bàn này?')) {
      deleteBooking(id);
      loadData();
    }
  };

  const handleStatusChange = (id, status) => {
    updateBookingStatus(id, status);
    loadData();
  };

  const statusTabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ xác nhận' },
    { key: 'confirmed', label: 'Đã xác nhận' },
    { key: 'checkedIn', label: 'Đã check-in' },
    { key: 'completed', label: 'Hoàn thành' },
    { key: 'cancelled', label: 'Đã hủy' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý đặt bàn</h1>
          <p className="page-subtitle">Quản lý tất cả đặt bàn và trạng thái</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} id="add-booking-btn">
          <FiPlus /> Thêm đặt bàn
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, bàn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            id="booking-search"
          />
        </div>
        <div className={styles.filterGroup}>
          <div className={styles.dateFilter}>
            <FiCalendar size={14} />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={styles.dateInput}
              id="booking-date-filter"
            />
          </div>
          <button
            className={`btn btn-sm ${dateFilter ? 'btn-ghost' : ''}`}
            onClick={() => setDateFilter('')}
            style={{ fontSize: '0.8rem' }}
          >
            {dateFilter ? 'Xem tất cả ngày' : 'Đang xem tất cả'}
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="tabs" style={{ marginBottom: 'var(--space-xl)' }}>
        {statusTabs.map(tab => (
          <button
            key={tab.key}
            className={`tab ${statusFilter === tab.key ? 'active' : ''}`}
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span style={{ marginLeft: '4px', opacity: 0.6 }}>
                ({bookings.filter(b => (!dateFilter || b.date === dateFilter) && b.status === tab.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {filteredBookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>Không có đặt bàn nào</h3>
          <p>Thử thay đổi bộ lọc hoặc thêm đặt bàn mới</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Bàn</th>
                <th>Ngày</th>
                <th>Giờ</th>
                <th>Số khách</th>
                <th>Cọc</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => {
                const statusInfo = BOOKING_STATUSES[booking.status];
                const table = TABLES.find(t => t.id === booking.tableId);
                return (
                  <tr key={booking.id}>
                    <td>
                      <div className={styles.customerCell}>
                        <div className={styles.avatar}>{booking.customerName?.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{booking.customerName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{booking.customerPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-gold">{booking.tableId}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{booking.date}</td>
                    <td style={{ fontWeight: 600 }}>{booking.time}</td>
                    <td>{booking.guests}</td>
                    <td style={{ color: 'var(--gold-400)', fontWeight: 600 }}>{formatCurrency(booking.deposit || 0)}</td>
                    <td>
                      <span className="badge" style={{ background: statusInfo?.bg, color: statusInfo?.color, border: `1px solid ${statusInfo?.color}30` }}>
                        <span className="status-dot pulse" style={{ background: statusInfo?.color }} />
                        {statusInfo?.label}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionBtns}>
                        {booking.status === 'pending' && (
                          <button className="btn btn-sm btn-secondary" onClick={() => handleStatusChange(booking.id, 'confirmed')} title="Xác nhận">
                            <FiCheck size={13} />
                          </button>
                        )}
                        {booking.status === 'confirmed' && (
                          <button className="btn btn-sm btn-secondary" onClick={() => handleStatusChange(booking.id, 'checkedIn')} title="Check-in">
                            <FiLogIn size={13} />
                          </button>
                        )}
                        {booking.status === 'checkedIn' && (
                          <button className="btn btn-sm btn-secondary" onClick={() => handleStatusChange(booking.id, 'completed')} title="Hoàn thành">
                            <FiCheck size={13} />
                          </button>
                        )}
                        <button className="btn btn-sm btn-ghost" onClick={() => handleEdit(booking)} title="Sửa">
                          <FiEdit2 size={13} />
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => setShowDetail(booking)} title="Chi tiết">
                          <FiEye size={13} />
                        </button>
                        {['pending', 'confirmed'].includes(booking.status) && (
                          <button className="btn btn-sm btn-ghost" style={{ color: '#ef4444' }} onClick={() => handleStatusChange(booking.id, 'cancelled')} title="Hủy">
                            <FiX size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && resetForm()}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editBooking ? 'Chỉnh sửa đặt bàn' : 'Thêm đặt bàn mới'}</h2>
              <button className="btn btn-icon btn-ghost" onClick={resetForm}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Họ tên khách *</label>
                    <input type="text" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required id="modal-customer-name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại *</label>
                    <input type="tel" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} required id="modal-customer-phone" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bàn *</label>
                    <select value={form.tableId} onChange={(e) => setForm({ ...form, tableId: e.target.value })} required id="modal-table">
                      <option value="">Chọn bàn</option>
                      {TABLES.map(t => (
                        <option key={t.id} value={t.id}>{t.label} - {TABLE_TYPES[t.type]?.label} ({t.capacity[0]}-{t.capacity[1]} khách)</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số khách</label>
                    <input type="number" min="1" max="20" value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} id="modal-guests" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ngày</label>
                    <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} id="modal-date" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Giờ</label>
                    <select value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} id="modal-time">
                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Ghi chú</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Yêu cầu đặc biệt..." id="modal-notes" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Hủy</button>
                <button type="submit" className="btn btn-primary" id="modal-submit">{editBooking ? 'Cập nhật' : 'Tạo đặt bàn'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowDetail(null)}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Chi tiết đặt bàn</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowDetail(null)}><FiX /></button>
            </div>
            <div className="modal-body">
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Mã đặt bàn</span>
                  <span className={styles.detailValue} style={{ color: 'var(--gold-400)', fontWeight: 700 }}>{showDetail.bookingCode || 'N/A'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Khách hàng</span>
                  <span className={styles.detailValue}>{showDetail.customerName}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Số điện thoại</span>
                  <span className={styles.detailValue}>{showDetail.customerPhone}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Bàn</span>
                  <span className={styles.detailValue}>{showDetail.tableId}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Ngày</span>
                  <span className={styles.detailValue}>{showDetail.date}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Giờ</span>
                  <span className={styles.detailValue}>{showDetail.time}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Số khách</span>
                  <span className={styles.detailValue}>{showDetail.guests} người</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Tiền cọc</span>
                  <span className={styles.detailValue} style={{ color: 'var(--gold-400)' }}>{formatCurrency(showDetail.deposit || 0)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Trạng thái</span>
                  <span className="badge" style={{ background: BOOKING_STATUSES[showDetail.status]?.bg, color: BOOKING_STATUSES[showDetail.status]?.color }}>
                    {BOOKING_STATUSES[showDetail.status]?.label}
                  </span>
                </div>
                {showDetail.notes && (
                  <div className={styles.detailItem} style={{ gridColumn: 'span 2' }}>
                    <span className={styles.detailLabel}>Ghi chú</span>
                    <span className={styles.detailValue}>{showDetail.notes}</span>
                  </div>
                )}
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Tạo lúc</span>
                  <span className={styles.detailValue} style={{ fontSize: '0.8rem' }}>{formatDateTime(showDetail.createdAt)}</span>
                </div>
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
