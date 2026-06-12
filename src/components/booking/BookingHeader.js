'use client';

import { HOTLINE_RAW } from '@/lib/home-data';

export default function BookingHeader({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-50 bg-[#05070B]/90 backdrop-blur-md border-b border-white/5">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Menu */}
        <button
          onClick={onMenuClick}
          aria-label="Menu"
          className="flex items-center justify-center w-10 h-10 rounded-xl
                     bg-white/5 text-white/70 hover:text-white hover:bg-white/10
                     transition-colors active:scale-95 text-sm font-medium"
        >
          ☰
        </button>

        {/* Title center */}
        <div className="flex flex-col items-center text-center min-w-0">
          <h1
            className="text-xl font-bold tracking-wide text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Đặt bàn online
          </h1>
          <p className="text-[11px] text-gray-400 mt-0.5 tracking-wider">
            Chọn vị trí đẹp – giữ bàn nhanh
          </p>
        </div>

        {/* Phone */}
        <a
          href={`tel:${HOTLINE_RAW}`}
          aria-label="Gọi điện"
          className="flex items-center justify-center w-10 h-10 rounded-xl
                     bg-white/5 text-white/70 hover:text-[#D4A84A] hover:bg-white/10
                     transition-colors active:scale-95 text-sm font-medium"
        >
          ✆
        </a>
      </div>
    </header>
  );
}
