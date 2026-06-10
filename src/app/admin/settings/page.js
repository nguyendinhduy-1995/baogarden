'use client';

import { useState } from 'react';
import styles from './page.module.css';
import { FiSave, FiGlobe, FiClock, FiDollarSign, FiUsers, FiBell, FiShield } from 'react-icons/fi';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    restaurantName: 'Báo Garden',
    phone: '1900 1234',
    email: 'info@baogarden.vn',
    address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
    openTime: '18:00',
    closeTime: '02:00',
    holdTime: 15,
    maxGuests: 20,
    defaultDeposit: 200000,
    autoConfirm: false,
    notifyEmail: true,
    notifySms: true,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cài đặt</h1>
          <p className="page-subtitle">Cấu hình hệ thống đặt bàn và quản lý</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} id="save-settings">
          <FiSave /> {saved ? 'Đã lưu ✓' : 'Lưu thay đổi'}
        </button>
      </div>

      <div className={styles.sections}>
        {/* General */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <FiGlobe className={styles.sectionIcon} />
            <div>
              <h3>Thông tin chung</h3>
              <p>Thông tin cơ bản về nhà hàng</p>
            </div>
          </div>
          <div className={styles.sectionBody}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tên nhà hàng</label>
                <input type="text" value={settings.restaurantName} onChange={(e) => setSettings({ ...settings, restaurantName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input type="tel" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Địa chỉ</label>
                <input type="text" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
              </div>
            </div>
          </div>
        </div>

        {/* Hours */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <FiClock className={styles.sectionIcon} />
            <div>
              <h3>Giờ hoạt động</h3>
              <p>Thiết lập giờ mở/đóng cửa</p>
            </div>
          </div>
          <div className={styles.sectionBody}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Giờ mở cửa</label>
                <input type="time" value={settings.openTime} onChange={(e) => setSettings({ ...settings, openTime: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Giờ đóng cửa</label>
                <input type="time" value={settings.closeTime} onChange={(e) => setSettings({ ...settings, closeTime: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Thời gian giữ bàn (phút)</label>
                <input type="number" value={settings.holdTime} onChange={(e) => setSettings({ ...settings, holdTime: parseInt(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label">Số khách tối đa / bàn</label>
                <input type="number" value={settings.maxGuests} onChange={(e) => setSettings({ ...settings, maxGuests: parseInt(e.target.value) })} />
              </div>
            </div>
          </div>
        </div>

        {/* Booking */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <FiDollarSign className={styles.sectionIcon} />
            <div>
              <h3>Cài đặt đặt bàn</h3>
              <p>Cấu hình tiền cọc và xác nhận</p>
            </div>
          </div>
          <div className={styles.sectionBody}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tiền cọc mặc định (VNĐ)</label>
                <input type="number" value={settings.defaultDeposit} onChange={(e) => setSettings({ ...settings, defaultDeposit: parseInt(e.target.value) })} />
              </div>
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Tự động xác nhận đặt bàn</span>
                <span className={styles.toggleDesc}>Đặt bàn sẽ được xác nhận ngay lập tức</span>
              </div>
              <button
                className={`${styles.toggle} ${settings.autoConfirm ? styles.toggleOn : ''}`}
                onClick={() => setSettings({ ...settings, autoConfirm: !settings.autoConfirm })}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <FiBell className={styles.sectionIcon} />
            <div>
              <h3>Thông báo</h3>
              <p>Cấu hình cách nhận thông báo</p>
            </div>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Thông báo qua Email</span>
                <span className={styles.toggleDesc}>Nhận email khi có đặt bàn mới</span>
              </div>
              <button
                className={`${styles.toggle} ${settings.notifyEmail ? styles.toggleOn : ''}`}
                onClick={() => setSettings({ ...settings, notifyEmail: !settings.notifyEmail })}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Thông báo qua SMS</span>
                <span className={styles.toggleDesc}>Gửi SMS xác nhận cho khách hàng</span>
              </div>
              <button
                className={`${styles.toggle} ${settings.notifySms ? styles.toggleOn : ''}`}
                onClick={() => setSettings({ ...settings, notifySms: !settings.notifySms })}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
