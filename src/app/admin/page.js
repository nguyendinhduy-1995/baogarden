'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDashboardStats, getBookingsByDate, updateBookingStatus, seedSampleData } from '@/lib/db';
import { TABLES, BOOKING_STATUSES } from '@/data/tables';
import { formatCurrency, getTodayString, getWeekDayName } from '@/lib/utils';
import styles from './page.module.css';
import { FiUsers, FiCalendar, FiClock, FiDollarSign, FiPlus, FiCheck, FiLogIn, FiX, FiTrendingUp, FiMapPin, FiEye } from 'react-icons/fi';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [todayBookings, setTodayBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    seedSampleData();
    const s = getDashboardStats();
    const b = getBookingsByDate(getTodayString());
    setStats(s);
    setTodayBookings(b.sort((a, b) => a.time.localeCompare(b.time)));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = (bookingId, newStatus) => {
    updateBookingStatus(bookingId, newStatus);
    loadData();
  };

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Chào buổi sáng' : today.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  if (loading) {
    return <div className={styles.loading}><div className={styles.spinner} /></div>;
  }

  const statCards = [
    { label: 'Tổng khách hàng', value: stats?.totalCustomers || 0, icon: <FiUsers />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
    { label: 'Đặt bàn hôm nay', value: stats?.todayBookings || 0, icon: <FiCalendar />, color: '#4ade80', bg: 'rgba(74, 222, 128, 0.12)' },
    { label: 'Chờ xác nhận', value: stats?.pendingBookings || 0, icon: <FiClock />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    { label: 'Doanh thu hôm nay', value: formatCurrency(stats?.todayRevenue || 0), icon: <FiDollarSign />, color: '#a855f7', bg: 'rgba(168, 85, 246, 0.12)' },
  ];

  return (
    <div className={styles.dashboard}>
      {/* Welcome header */}
      <div className={styles.welcomeHeader}>
        <div>
          <h1 className={styles.welcomeTitle}>{greeting}, Admin 👋</h1>
          <p className={styles.welcomeDate}>
            {getWeekDayName(getTodayString())}, {today.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className={styles.welcomeActions}>
          <Link href="/admin/bookings" className="btn btn-primary" id="new-booking-quick">
            <FiPlus /> Thêm đặt bàn
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        {statCards.map((card, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">{card.label}</div>
                <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
              </div>
              <div className="stat-icon" style={{ background: card.bg, color: card.color }}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's bookings */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Đặt bàn hôm nay</h2>
          <Link href="/admin/bookings" className={styles.sectionLink}>
            Xem tất cả <FiEye size={14} />
          </Link>
        </div>

        {todayBookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h3>Chưa có đặt bàn hôm nay</h3>
            <p>Các đặt bàn mới sẽ hiển thị tại đây</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Bàn</th>
                  <th>Giờ</th>
                  <th>Số khách</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {todayBookings.map((booking) => {
                  const statusInfo = BOOKING_STATUSES[booking.status];
                  return (
                    <tr key={booking.id}>
                      <td>
                        <div className={styles.customerCell}>
                          <div className={styles.customerAvatar}>{booking.customerName?.charAt(0)}</div>
                          <div>
                            <div className={styles.customerName}>{booking.customerName}</div>
                            <div className={styles.customerPhone}>{booking.customerPhone}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-gold">{booking.tableId}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{booking.time}</td>
                      <td>{booking.guests} người</td>
                      <td>
                        <span
                          className="badge"
                          style={{ background: statusInfo?.bg, color: statusInfo?.color, border: `1px solid ${statusInfo?.color}30` }}
                        >
                          <span className="status-dot pulse" style={{ background: statusInfo?.color }} />
                          {statusInfo?.label}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionBtns}>
                          {booking.status === 'pending' && (
                            <>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleStatusChange(booking.id, 'confirmed')}
                                title="Xác nhận"
                              >
                                <FiCheck size={14} /> Xác nhận
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleStatusChange(booking.id, 'cancelled')}
                                title="Hủy"
                              >
                                <FiX size={14} />
                              </button>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleStatusChange(booking.id, 'checkedIn')}
                              title="Check-in"
                            >
                              <FiLogIn size={14} /> Check-in
                            </button>
                          )}
                          {booking.status === 'checkedIn' && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleStatusChange(booking.id, 'completed')}
                              title="Hoàn thành"
                            >
                              <FiCheck size={14} /> Hoàn thành
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
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <Link href="/admin/bookings" className={styles.quickAction}>
          <div className={styles.quickActionIcon} style={{ background: 'rgba(74, 222, 128, 0.12)', color: '#4ade80' }}>
            <FiCalendar size={20} />
          </div>
          <span>Quản lý đặt bàn</span>
        </Link>
        <Link href="/admin/customers" className={styles.quickAction}>
          <div className={styles.quickActionIcon} style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <FiUsers size={20} />
          </div>
          <span>Quản lý khách hàng</span>
        </Link>
        <Link href="/admin/floor-plan" className={styles.quickAction}>
          <div className={styles.quickActionIcon} style={{ background: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24' }}>
            <FiMapPin size={20} />
          </div>
          <span>Xem sơ đồ bàn</span>
        </Link>
        <Link href="/" className={styles.quickAction}>
          <div className={styles.quickActionIcon} style={{ background: 'rgba(168, 85, 246, 0.12)', color: '#a855f7' }}>
            <FiTrendingUp size={20} />
          </div>
          <span>Trang đặt bàn</span>
        </Link>
      </div>
    </div>
  );
}
