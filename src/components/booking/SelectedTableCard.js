'use client';

import { FiCheckCircle, FiShield, FiHeadphones, FiUsers, FiMapPin, FiClock, FiCalendar, FiTag } from 'react-icons/fi';

export default function SelectedTableCard({ table, onBook, formatVND }) {
  if (!table) return null;

  const isVip = table.status === 'vip' || table.type === 'vip';
  const deposit = table.deposit || 500000;
  const minSpend = table.minSpend || 0;
  const guests = table.guests || '4-6';
  const area = table.area || 'Gần sân khấu';

  const format = formatVND || ((n) => new Intl.NumberFormat('vi-VN').format(n) + 'đ');

  return (
    <div className="px-4 pb-5 pt-3 animate-[slideUpCard_0.35s_cubic-bezier(0.16,1,0.3,1)]">
      {/* Card with gold border */}
      <div className="rounded-2xl border border-[#D4A84A]/40 bg-gradient-to-br from-[#111828] to-[#0a0f1a] p-3 pr-4 shadow-[0_6px_28px_rgba(0,0,0,0.5)]">
        {/* Top row */}
        <div className="flex items-center gap-2.5">
          {/* Circle badge */}
          <div className="shrink-0 flex items-center justify-center w-11 h-11
                        rounded-full border-2 border-[#D4A84A]/60
                        bg-[#0a0a14] shadow-[0_0_14px_rgba(212,168,74,0.2)]">
            <span className="text-[#D4A84A] font-bold text-[11px] leading-none">
              {table.label}
            </span>
          </div>

          {/* Center info */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="text-white font-bold text-[15px] leading-tight truncate"
                style={{ fontFamily: "'Playfair Display', serif" }}>
                Bàn {table.label}
              </h3>
              {isVip ? (
                <span className="shrink-0 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider
                                 rounded bg-gradient-to-r from-[#F8C85A] to-[#D89A32] text-[#05070B]">
                  VIP
                </span>
              ) : (
                <span className="shrink-0 px-1.5 py-px text-[8px] font-medium uppercase tracking-wider
                                 rounded bg-white/8 text-gray-400">
                  Standard
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 text-[10px] text-gray-400">
              <span className="flex items-center gap-0.5">
                <FiUsers className="w-2.5 h-2.5 shrink-0" />
                {guests} khách
              </span>
              <span className="flex items-center gap-0.5">
                <FiMapPin className="w-2.5 h-2.5 shrink-0" />
                {area}
              </span>
              <span className="flex items-center gap-0.5">
                <FiClock className="w-2.5 h-2.5 shrink-0" />
                Tạm giữ 15 phút
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="shrink-0 text-right">
            <p className="text-[9px] text-gray-500">Cọc từ</p>
            <p className="text-[13px] font-extrabold bg-gradient-to-r from-[#FFF1B8] via-[#F8C85A] to-[#D89A32]
                         bg-clip-text text-transparent leading-tight whitespace-nowrap">
              {format(deposit)}
            </p>
            {minSpend > 0 && (
              <p className="text-[7px] text-gray-500 mt-0.5 leading-tight whitespace-nowrap">
                Tối thiểu {format(minSpend)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-[1.3fr_1fr] gap-2 mt-2.5">
        <button
          onClick={() => onBook?.(table)}
          className="flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-[13px] text-[#05070B]
                     bg-gradient-to-r from-[#F8C85A] to-[#D89A32]
                     shadow-[0_4px_16px_rgba(212,168,74,0.3)]
                     hover:shadow-[0_4px_24px_rgba(212,168,74,0.45)]
                     active:scale-[0.97] transition-all duration-200"
        >
          <FiCalendar className="w-3.5 h-3.5" />
          Đặt bàn ngay
        </button>
        <button
          className="flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-[13px] text-[#D4A84A]
                     border border-[#D4A84A]/30 bg-[#D4A84A]/5
                     hover:bg-[#D4A84A]/10 hover:border-[#D4A84A]/50
                     active:scale-[0.97] transition-all duration-200"
        >
          <FiTag className="w-3.5 h-3.5" />
          Xem ưu đãi
        </button>
      </div>

      {/* Trust badges */}
      <div className="flex items-center justify-around mt-2.5 pt-2 border-t border-white/5">
        {[
          { icon: FiCheckCircle, text: 'Xác nhận tức thì' },
          { icon: FiShield, text: 'Giữ bàn chắc chắn' },
          { icon: FiHeadphones, text: 'Hỗ trợ 24/7' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-1">
            <Icon className="w-2.5 h-2.5 text-emerald-500/70" />
            <span className="text-[9px] text-gray-500">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
