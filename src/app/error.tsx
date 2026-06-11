'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0f',
      color: '#f5f5f7',
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: '24px',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '420px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 800,
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #fde68a, #fbbf24, #f59e0b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Đã xảy ra lỗi
        </h1>
        <p style={{
          color: '#71717a',
          fontSize: '14px',
          lineHeight: 1.6,
          marginBottom: '24px',
        }}>
          Hệ thống gặp sự cố không mong muốn. Vui lòng thử lại hoặc liên hệ quản trị viên.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)',
              color: '#0a0a0f',
              fontWeight: 700,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Thử lại
          </button>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#f5f5f7',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
