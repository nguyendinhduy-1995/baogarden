'use client';

import { useState } from 'react';

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
    <div className="st">
      <style>{CSS}</style>

      <div className="st-header">
        <div>
          <h1 className="st-title">Cài đặt</h1>
          <p className="st-sub">Cấu hình hệ thống đặt bàn và quản lý</p>
        </div>
        <button className="st-save-btn" onClick={handleSave} id="save-settings">
          {saved ? 'Đã lưu ✓' : 'Lưu thay đổi'}
        </button>
      </div>

      <div className="st-sections">
        {/* General */}
        <div className="st-section">
          <div className="st-section-head">
            <div>
              <h3>Thông tin chung</h3>
              <p>Thông tin cơ bản về nhà hàng</p>
            </div>
          </div>
          <div className="st-section-body">
            <div className="st-form-row">
              <div className="st-fg">
                <label>Tên nhà hàng</label>
                <input type="text" value={settings.restaurantName} onChange={(e) => setSettings({ ...settings, restaurantName: e.target.value })} />
              </div>
              <div className="st-fg">
                <label>Số điện thoại</label>
                <input type="tel" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
              </div>
            </div>
            <div className="st-form-row">
              <div className="st-fg">
                <label>Email</label>
                <input type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
              </div>
              <div className="st-fg">
                <label>Địa chỉ</label>
                <input type="text" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
              </div>
            </div>
          </div>
        </div>

        {/* Hours */}
        <div className="st-section">
          <div className="st-section-head">
            <div>
              <h3>Giờ hoạt động</h3>
              <p>Thiết lập giờ mở/đóng cửa</p>
            </div>
          </div>
          <div className="st-section-body">
            <div className="st-form-row">
              <div className="st-fg">
                <label>Giờ mở cửa</label>
                <input type="time" value={settings.openTime} onChange={(e) => setSettings({ ...settings, openTime: e.target.value })} />
              </div>
              <div className="st-fg">
                <label>Giờ đóng cửa</label>
                <input type="time" value={settings.closeTime} onChange={(e) => setSettings({ ...settings, closeTime: e.target.value })} />
              </div>
            </div>
            <div className="st-form-row">
              <div className="st-fg">
                <label>Thời gian giữ bàn (phút)</label>
                <input type="number" value={settings.holdTime} onChange={(e) => setSettings({ ...settings, holdTime: parseInt(e.target.value) })} />
              </div>
              <div className="st-fg">
                <label>Số khách tối đa / bàn</label>
                <input type="number" value={settings.maxGuests} onChange={(e) => setSettings({ ...settings, maxGuests: parseInt(e.target.value) })} />
              </div>
            </div>
          </div>
        </div>

        {/* Booking */}
        <div className="st-section">
          <div className="st-section-head">
            <div>
              <h3>Cài đặt đặt bàn</h3>
              <p>Cấu hình tiền cọc và xác nhận</p>
            </div>
          </div>
          <div className="st-section-body">
            <div className="st-form-row">
              <div className="st-fg">
                <label>Tiền cọc mặc định (VNĐ)</label>
                <input type="number" value={settings.defaultDeposit} onChange={(e) => setSettings({ ...settings, defaultDeposit: parseInt(e.target.value) })} />
              </div>
            </div>
            <div className="st-toggle-row">
              <div>
                <span className="st-toggle-label">Tự động xác nhận đặt bàn</span>
                <span className="st-toggle-desc">Đặt bàn sẽ được xác nhận ngay lập tức</span>
              </div>
              <button
                className={`st-toggle ${settings.autoConfirm ? 'st-toggle-on' : ''}`}
                onClick={() => setSettings({ ...settings, autoConfirm: !settings.autoConfirm })}
              >
                <span className="st-toggle-thumb" />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="st-section">
          <div className="st-section-head">
            <div>
              <h3>Thông báo</h3>
              <p>Cấu hình cách nhận thông báo</p>
            </div>
          </div>
          <div className="st-section-body">
            <div className="st-toggle-row">
              <div>
                <span className="st-toggle-label">Thông báo qua Email</span>
                <span className="st-toggle-desc">Nhận email khi có đặt bàn mới</span>
              </div>
              <button
                className={`st-toggle ${settings.notifyEmail ? 'st-toggle-on' : ''}`}
                onClick={() => setSettings({ ...settings, notifyEmail: !settings.notifyEmail })}
              >
                <span className="st-toggle-thumb" />
              </button>
            </div>
            <div className="st-toggle-row">
              <div>
                <span className="st-toggle-label">Thông báo qua SMS</span>
                <span className="st-toggle-desc">Gửi SMS xác nhận cho khách hàng</span>
              </div>
              <button
                className={`st-toggle ${settings.notifySms ? 'st-toggle-on' : ''}`}
                onClick={() => setSettings({ ...settings, notifySms: !settings.notifySms })}
              >
                <span className="st-toggle-thumb" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
/* animation */
.st{animation:st-in 0.25s ease}
@keyframes st-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* header */
.st-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;gap:12px;flex-wrap:wrap}
.st-title{font-size:1.4rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary)}
.st-sub{font-size:0.82rem;color:var(--text-tertiary);margin-top:2px}
.st-save-btn{padding:9px 18px;border-radius:10px;font-size:0.82rem;font-weight:600;background:var(--gold-400);color:var(--bg-primary);border:none;cursor:pointer;white-space:nowrap;transition:opacity 0.15s;font-family:inherit;min-height:44px}
.st-save-btn:hover{opacity:0.85}

/* sections */
.st-sections{display:flex;flex-direction:column;gap:var(--space-xl)}
.st-section{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px;overflow:hidden}
.st-section-head{display:flex;align-items:center;gap:var(--space-lg);padding:var(--space-xl);border-bottom:1px solid var(--border-subtle)}
.st-section-head h3{font-size:1rem;font-weight:700;margin-bottom:2px;color:var(--text-primary)}
.st-section-head p{font-size:0.8rem;color:var(--text-tertiary)}
.st-section-body{padding:var(--space-xl);display:flex;flex-direction:column;gap:var(--space-xl)}

/* form */
.st-form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.st-fg{display:flex;flex-direction:column;gap:5px}
.st-fg label{font-size:0.72rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em}
.st-fg input,.st-fg select,.st-fg textarea{padding:10px 14px;border-radius:10px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);color:var(--text-primary);font-size:0.88rem;outline:none;font-family:inherit;transition:border-color 0.15s;min-height:44px}
.st-fg input:focus,.st-fg select:focus,.st-fg textarea:focus{border-color:var(--gold-400)}

/* toggle */
.st-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:var(--space-xl);padding:var(--space-md) 0}
.st-toggle-label{display:block;font-weight:600;font-size:0.9rem;margin-bottom:2px;color:var(--text-primary)}
.st-toggle-desc{display:block;font-size:0.8rem;color:var(--text-tertiary)}
.st-toggle{width:48px;height:26px;border-radius:13px;background:var(--bg-tertiary);border:1px solid var(--border-subtle);position:relative;cursor:pointer;transition:all 0.15s;flex-shrink:0;min-width:48px}
.st-toggle-on{background:rgba(251,191,36,0.2);border-color:var(--gold-400)}
.st-toggle-thumb{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--text-tertiary);transition:all 0.15s}
.st-toggle-on .st-toggle-thumb{left:25px;background:var(--gold-400)}

/* responsive */
@media(max-width:1024px){
  .st-form-row{grid-template-columns:1fr 1fr}
}
@media(max-width:640px){
  .st-header{flex-direction:column;gap:10px}
  .st-save-btn{width:100%;text-align:center}
  .st-title{font-size:1.1rem}
  .st-sub{font-size:0.75rem}
  .st-form-row{grid-template-columns:1fr}
  .st-section-head{padding:14px 16px;flex-direction:column;gap:8px}
  .st-section-head h3{font-size:0.92rem}
  .st-section-head p{font-size:0.75rem}
  .st-section-body{padding:14px 16px}
  .st-toggle-row{gap:12px}
  .st-toggle-label{font-size:0.85rem}
  .st-toggle-desc{font-size:0.75rem}
  .st-fg input,.st-fg select,.st-fg textarea{font-size:0.88rem;min-height:44px}
  .st-fg label{font-size:0.68rem}
  .st-sections{gap:12px}
}
`;
