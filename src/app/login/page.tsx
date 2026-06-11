'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Đăng nhập thất bại');
        setLoading(false);
        return;
      }

      const role = data.user.role;
      if (role === 'ADMIN' || role === 'MANAGER') {
        router.push('/admin');
      } else if (role === 'BOOKING') {
        router.push('/booking-staff');
      } else if (role === 'RECEPTION') {
        router.push('/reception');
      } else if (role === 'WAITER') {
        router.push('/waiter');
      } else if (role === 'KITCHEN') {
        router.push('/kitchen');
      } else if (role === 'BAR') {
        router.push('/bar');
      } else if (role === 'CASHIER') {
        router.push('/cashier');
      } else {
        router.push('/admin');
      }
    } catch {
      setError('Lỗi kết nối server');
      setLoading(false);
    }
  };

  return (
    <div className="lg-page">
      <style>{CSS}</style>

      {/* Ambient glow */}
      <div className="lg-glow lg-glow-1" />
      <div className="lg-glow lg-glow-2" />

      <div className="lg-container">
        {/* Brand */}
        <header className="lg-brand">
          <h1 className="lg-logo">BÁO GARDEN</h1>
          <div className="lg-logo-line" />
          <p className="lg-tagline">HỆ THỐNG QUẢN LÝ</p>
        </header>

        {/* Card */}
        <div className="lg-card">
          <h2 className="lg-title">Đăng nhập</h2>

          <form onSubmit={handleSubmit} className="lg-form">
            {/* Email */}
            <div className={`lg-field ${focused === 'email' ? 'lg-field-focus' : ''} ${email ? 'lg-field-filled' : ''}`}>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused('')}
                placeholder=" "
                required
                autoComplete="email"
              />
              <label htmlFor="login-email">Email</label>
            </div>

            {/* Password */}
            <div className={`lg-field ${focused === 'pass' ? 'lg-field-focus' : ''} ${password ? 'lg-field-filled' : ''}`}>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocused('pass')}
                onBlur={() => setFocused('')}
                placeholder=" "
                required
                autoComplete="current-password"
              />
              <label htmlFor="login-password">Mật khẩu</label>
            </div>

            {/* Error */}
            {error && <div className="lg-error">{error}</div>}

            {/* Submit */}
            <button type="submit" disabled={loading} className="lg-btn" id="login-submit">
              {loading ? (
                <span className="lg-btn-loading">
                  <span className="lg-spinner" />
                  Đang đăng nhập...
                </span>
              ) : 'Đăng nhập'}
            </button>
          </form>

          <div className="lg-divider" />
          <p className="lg-hint">Liên hệ admin nếu quên mật khẩu</p>
        </div>

        {/* Back link */}
        <a href="/booking" className="lg-back">← Quay lại trang đặt bàn</a>

        {/* Footer */}
        <p className="lg-footer">Báo Garden · 08 777 6666 3</p>
      </div>
    </div>
  );
}

const CSS = `
.lg-page {
  min-height: 100dvh;
  display: flex; align-items: center; justify-content: center;
  padding: 24px 16px;
  background: #04060a;
  font-family: 'Inter', -apple-system, sans-serif;
  color: #e2ddd5;
  position: relative; overflow: hidden;
}

/* ambient glows */
.lg-glow {
  position: absolute; border-radius: 50%; pointer-events: none;
  filter: blur(80px); opacity: 0.5;
}
.lg-glow-1 {
  width: 320px; height: 320px; top: -80px; left: -60px;
  background: radial-gradient(circle, rgba(212,168,74,0.08) 0%, transparent 70%);
}
.lg-glow-2 {
  width: 280px; height: 280px; bottom: -60px; right: -40px;
  background: radial-gradient(circle, rgba(212,168,74,0.06) 0%, transparent 70%);
}

.lg-container {
  width: 100%; max-width: 400px;
  position: relative; z-index: 1;
  animation: lg-fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes lg-fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

/* brand */
.lg-brand {
  text-align: center; margin-bottom: 36px;
}
.lg-logo {
  font-family: 'Playfair Display', serif;
  font-size: 32px; font-weight: 800;
  letter-spacing: 0.18em;
  background: linear-gradient(135deg, #FFF1C9 0%, #E8C464 25%, #D4A84A 50%, #B8892E 75%, #D4A84A 100%);
  background-size: 200% auto;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: lg-shimmer 4s linear infinite;
}
@keyframes lg-shimmer {
  0% { background-position: 0% center; }
  100% { background-position: 200% center; }
}
.lg-logo-line {
  width: 40px; height: 1px; margin: 10px auto;
  background: linear-gradient(90deg, transparent, #D4A84A, transparent);
}
.lg-tagline {
  font-size: 9px; letter-spacing: 0.35em;
  color: #7c6d50; font-weight: 600;
}

/* card */
.lg-card {
  background: linear-gradient(160deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
  border: 1px solid rgba(212,168,74,0.08);
  border-radius: 24px;
  padding: 36px 28px 28px;
  backdrop-filter: blur(12px);
  box-shadow:
    0 1px 0 rgba(212,168,74,0.04) inset,
    0 20px 60px rgba(0,0,0,0.4);
}

.lg-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px; font-weight: 700;
  color: #e2ddd5;
  text-align: center; margin-bottom: 28px;
}

/* form */
.lg-form {
  display: flex; flex-direction: column; gap: 16px;
}

/* floating label field */
.lg-field {
  position: relative;
}
.lg-field input {
  width: 100%;
  padding: 18px 16px 8px;
  border-radius: 14px;
  font-size: 15px; font-weight: 500;
  background: rgba(255,255,255,0.025);
  border: 1.5px solid rgba(255,255,255,0.06);
  color: #e2ddd5; outline: none;
  font-family: 'Inter', sans-serif;
  transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
}
.lg-field label {
  position: absolute; left: 16px; top: 14px;
  font-size: 15px; color: #5a5a6a; font-weight: 500;
  pointer-events: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.lg-field input:focus,
.lg-field-focus input {
  border-color: rgba(212,168,74,0.4);
  box-shadow: 0 0 0 3px rgba(212,168,74,0.06);
  background: rgba(212,168,74,0.02);
}
.lg-field input:focus + label,
.lg-field input:not(:placeholder-shown) + label,
.lg-field-filled label {
  top: 5px; font-size: 9px;
  color: #D4A84A; letter-spacing: 0.1em; font-weight: 600;
}

/* error */
.lg-error {
  padding: 10px 14px; border-radius: 12px;
  background: rgba(239,68,68,0.06);
  border: 1px solid rgba(239,68,68,0.15);
  color: #f87171; font-size: 13px; font-weight: 600;
  text-align: center;
  animation: lg-shake 0.4s ease;
}
@keyframes lg-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

/* submit button */
.lg-btn {
  width: 100%; margin-top: 4px;
  padding: 15px 24px; border-radius: 14px;
  font-size: 15px; font-weight: 700; letter-spacing: 0.03em;
  background: linear-gradient(135deg, #FDE68A 0%, #F8C85A 30%, #D89A32 100%);
  color: #04060a; border: none; cursor: pointer;
  font-family: 'Inter', sans-serif;
  box-shadow: 0 4px 20px rgba(212,168,74,0.2), inset 0 1px 0 rgba(255,255,255,0.2);
  transition: all 0.2s;
  position: relative; overflow: hidden;
}
.lg-btn::after {
  content: '';
  position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
  animation: lg-shine 3s ease-in-out infinite;
}
@keyframes lg-shine {
  0% { left: -100%; } 50% { left: 100%; } 100% { left: 100%; }
}
.lg-btn:hover {
  box-shadow: 0 6px 28px rgba(212,168,74,0.35);
  transform: translateY(-1px);
}
.lg-btn:active { transform: scale(0.98) translateY(0); }
.lg-btn:disabled { opacity: 0.5; cursor: wait; transform: none; }

.lg-btn-loading {
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.lg-spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(4,6,10,0.2);
  border-top-color: #04060a;
  border-radius: 50%;
  animation: lg-spin 0.6s linear infinite;
}
@keyframes lg-spin { to { transform: rotate(360deg); } }

/* divider */
.lg-divider {
  height: 1px; margin: 24px 0 16px;
  background: linear-gradient(90deg, transparent, rgba(212,168,74,0.08), transparent);
}

.lg-hint {
  font-size: 11px; color: #555; text-align: center;
  font-weight: 500;
}

/* back link */
.lg-back {
  display: block; text-align: center; margin-top: 24px;
  font-size: 13px; color: #7c6d50; font-weight: 500;
  text-decoration: none;
  transition: color 0.2s;
}
.lg-back:hover { color: #D4A84A; }

/* footer */
.lg-footer {
  text-align: center; margin-top: 32px;
  font-size: 10px; color: #333; font-weight: 500;
  letter-spacing: 0.05em;
}
`;
