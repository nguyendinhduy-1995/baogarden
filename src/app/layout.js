import './globals.css';

export const metadata = {
  title: 'Báo Garden - Hệ thống quản lý CRM & Đặt bàn',
  description: 'Hệ thống quản lý khách hàng, đặt bàn trực tuyến và quản lý đơn hàng cho Báo Garden',
  keywords: 'Báo Garden, CRM, đặt bàn, booking, nhà hàng, quán bar',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0a0f" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
