'use client';

import { useState, useEffect } from 'react';
import { TABLES, TABLE_TYPES, BOOKING_STATUSES } from '@/data/tables';
import { getBookingsByDate } from '@/lib/db';
import { formatCurrency, getTodayString } from '@/lib/utils';
import styles from './page.module.css';
import { FiCalendar, FiUsers, FiInfo } from 'react-icons/fi';

export default function FloorPlanPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [bookedTables, setBookedTables] = useState({});
  const [selectedTable, setSelectedTable] = useState(null);

  useEffect(() => {
    const bookings = getBookingsByDate(selectedDate);
    const map = {};
    bookings.forEach(b => {
      if (!['cancelled', 'noShow'].includes(b.status)) {
        map[b.tableId] = b;
      }
    });
    setBookedTables(map);
  }, [selectedDate]);

  const getTableStatus = (tableId) => {
    const booking = bookedTables[tableId];
    if (!booking) return 'available';
    return booking.status;
  };

  const getStatusColor = (tableId) => {
    const status = getTableStatus(tableId);
    switch (status) {
      case 'confirmed': return '#4ade80';
      case 'checkedIn': return '#3b82f6';
      case 'pending': return '#f59e0b';
      case 'completed': return '#8b5cf6';
      default: {
        const table = TABLES.find(t => t.id === tableId);
        if (table?.type === 'vip' || table?.type === 'room') return '#f59e0b';
        return '#4ade80';
      }
    }
  };

  const stats = {
    total: TABLES.length,
    available: TABLES.filter(t => !bookedTables[t.id]).length,
    booked: Object.keys(bookedTables).length,
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sơ đồ bàn</h1>
          <p className="page-subtitle">Tổng quan trạng thái bàn theo thời gian thực</p>
        </div>
        <div className={styles.dateSelector}>
          <FiCalendar size={14} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={styles.dateInput}
          />
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statDot} style={{ background: '#4ade80' }} />
          <span>Trống: <strong>{stats.available}</strong></span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statDot} style={{ background: '#ef4444' }} />
          <span>Đã đặt: <strong>{stats.booked}</strong></span>
        </div>
        <div className={styles.statItem}>
          <span>Tổng: <strong>{stats.total}</strong></span>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span><span className={styles.legendDot} style={{ background: '#4ade80' }} /> Trống</span>
        <span><span className={styles.legendDot} style={{ background: '#f59e0b' }} /> Chờ xác nhận</span>
        <span><span className={styles.legendDot} style={{ background: '#3b82f6' }} /> Đã check-in</span>
        <span><span className={styles.legendDot} style={{ background: '#8b5cf6' }} /> Hoàn thành</span>
      </div>

      <div className={styles.floorPlanWrapper}>
        {/* Floor plan */}
        <div className={styles.floorPlan}>
          {/* Stage */}
          <div className={styles.stage}>
            <div className={styles.stageInner}>🎤 Sân khấu</div>
          </div>

          {TABLES.map((table) => {
            const status = getTableStatus(table.id);
            const booking = bookedTables[table.id];
            const color = booking ? (
              status === 'checkedIn' ? '#3b82f6' :
              status === 'confirmed' ? '#4ade80' :
              status === 'pending' ? '#f59e0b' :
              status === 'completed' ? '#8b5cf6' : '#ef4444'
            ) : (
              table.type === 'vip' || table.type === 'room' ? '#f59e0b' : '#4ade80'
            );

            const isSelected = selectedTable?.id === table.id;

            return (
              <button
                key={table.id}
                className={`${styles.tableNode} ${isSelected ? styles.selected : ''} ${booking ? styles.booked : ''}`}
                style={{
                  left: `${table.position.x}%`,
                  top: `${table.position.y}%`,
                  '--tbl-color': color,
                  width: table.type === 'room' ? '56px' : '42px',
                  height: table.type === 'room' ? '38px' : '30px',
                }}
                onClick={() => setSelectedTable(table)}
              >
                <span className={styles.tableLabel}>{table.label}</span>
              </button>
            );
          })}
        </div>

        {/* Side panel */}
        {selectedTable && (
          <div className={styles.sidePanel}>
            <h3 className={styles.panelTitle}>Bàn {selectedTable.label}</h3>
            <div className={styles.panelBadge}>
              <span className={`badge ${selectedTable.type === 'vip' || selectedTable.type === 'room' ? 'badge-gold' : 'badge-green'}`}>
                {TABLE_TYPES[selectedTable.type]?.label}
              </span>
            </div>

            <div className={styles.panelDetails}>
              <div className={styles.panelRow}>
                <span><FiUsers size={14} /> Sức chứa</span>
                <span>{selectedTable.capacity[0]} - {selectedTable.capacity[1]} khách</span>
              </div>
              <div className={styles.panelRow}>
                <span>Tiền cọc</span>
                <span className="text-gold">{formatCurrency(selectedTable.deposit)}</span>
              </div>
              <div className={styles.panelRow}>
                <span>Tối thiểu</span>
                <span>{formatCurrency(selectedTable.minSpend)}</span>
              </div>
            </div>

            {bookedTables[selectedTable.id] && (
              <div className={styles.bookingInfo}>
                <h4>Thông tin đặt bàn</h4>
                <div className={styles.panelRow}>
                  <span>Khách</span>
                  <span>{bookedTables[selectedTable.id].customerName}</span>
                </div>
                <div className={styles.panelRow}>
                  <span>SĐT</span>
                  <span>{bookedTables[selectedTable.id].customerPhone}</span>
                </div>
                <div className={styles.panelRow}>
                  <span>Giờ</span>
                  <span>{bookedTables[selectedTable.id].time}</span>
                </div>
                <div className={styles.panelRow}>
                  <span>Trạng thái</span>
                  <span className={`badge`} style={{
                    background: BOOKING_STATUSES[bookedTables[selectedTable.id].status]?.bg,
                    color: BOOKING_STATUSES[bookedTables[selectedTable.id].status]?.color,
                    fontSize: '0.7rem',
                  }}>
                    {BOOKING_STATUSES[bookedTables[selectedTable.id].status]?.label}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
