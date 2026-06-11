'use client';

export default function FilterBar({
  date,
  time,
  guests,
  onDateChange,
  onTimeChange,
  onGuestsChange,
  timeSlots,
}) {
  const guestOptions = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
      {/* Date pill */}
      <div className="flex-1 min-w-0">
        <label className="relative flex items-center gap-2 px-3 py-2.5
                          rounded-xl border border-[#D4A84A]/40
                          bg-gradient-to-r from-[#D4A84A]/10 to-[#D4A84A]/5
                          cursor-pointer group">
          <span className="text-[#D4A84A] text-sm shrink-0">📅</span>
          <select
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="appearance-none bg-transparent text-[#D4A84A] text-sm font-medium
                       w-full outline-none cursor-pointer truncate
                       [&>option]:bg-[#08111C] [&>option]:text-white"
          >
            <option value="">Ngày</option>
            {Array.from({ length: 14 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() + i);
              const val = d.toISOString().split('T')[0];
              const dd = String(d.getDate()).padStart(2, '0');
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const days = ['CN','T2','T3','T4','T5','T6','T7'];
              const label = `${days[d.getDay()]}, ${dd}/${mm}`;
              return (
                <option key={val} value={val}>
                  {label}
                </option>
              );
            })}
          </select>
          <span className="text-[#D4A84A]/60 text-xs shrink-0 group-hover:text-[#D4A84A] transition-colors">▾</span>
        </label>
      </div>

      {/* Time pill */}
      <div className="flex-1 min-w-0">
        <label className="relative flex items-center gap-2 px-3 py-2.5
                          rounded-xl border border-[#D4A84A]/40
                          bg-gradient-to-r from-[#D4A84A]/10 to-[#D4A84A]/5
                          cursor-pointer group">
          <span className="text-[#D4A84A] text-sm shrink-0">⏰</span>
          <select
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className="appearance-none bg-transparent text-[#D4A84A] text-sm font-medium
                       w-full outline-none cursor-pointer truncate
                       [&>option]:bg-[#08111C] [&>option]:text-white"
          >
            <option value="">Giờ</option>
            {(timeSlots || [
              '11:00', '11:30', '12:00', '12:30',
              '17:00', '17:30', '18:00', '18:30',
              '19:00', '19:30', '20:00', '20:30', '21:00',
            ]).map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
          <span className="text-[#D4A84A]/60 text-xs shrink-0 group-hover:text-[#D4A84A] transition-colors">▾</span>
        </label>
      </div>

      {/* Guests pill */}
      <div className="flex-1 min-w-0">
        <label className="relative flex items-center gap-2 px-3 py-2.5
                          rounded-xl border border-[#D4A84A]/40
                          bg-gradient-to-r from-[#D4A84A]/10 to-[#D4A84A]/5
                          cursor-pointer group">
          <span className="text-[#D4A84A] text-sm shrink-0">👥</span>
          <select
            value={guests}
            onChange={(e) => onGuestsChange(Number(e.target.value))}
            className="appearance-none bg-transparent text-[#D4A84A] text-sm font-medium
                       w-full outline-none cursor-pointer truncate
                       [&>option]:bg-[#08111C] [&>option]:text-white"
          >
            <option value="">Khách</option>
            {guestOptions.map((n) => (
              <option key={n} value={n}>
                {n} khách
              </option>
            ))}
          </select>
          <span className="text-[#D4A84A]/60 text-xs shrink-0 group-hover:text-[#D4A84A] transition-colors">▾</span>
        </label>
      </div>
    </div>
  );
}
