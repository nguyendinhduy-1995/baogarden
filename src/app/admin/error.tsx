'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin error:', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '24px',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '8px',
        }}>
          Lỗi trang admin
        </h2>
        <p style={{
          color: 'var(--text-tertiary)',
          fontSize: '13px',
          lineHeight: 1.6,
          marginBottom: '20px',
        }}>
          Trang này gặp lỗi. Dữ liệu của bạn không bị ảnh hưởng.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={reset} className="btn btn-primary btn-sm">
            Thử lại
          </button>
          <button onClick={() => window.location.href = '/admin'} className="btn btn-secondary btn-sm">
            Về Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
