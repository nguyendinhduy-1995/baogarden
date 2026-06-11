import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Báo Garden - Hệ thống quản lý CRM & Đặt bàn',
  description: 'Hệ thống quản lý khách hàng, đặt bàn trực tuyến và quản lý đơn hàng cho Báo Garden',
  keywords: 'Báo Garden, CRM, đặt bàn, booking, nhà hàng, quán bar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0a0f" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@400;500;600;700;800&display=swap&subset=vietnamese" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
