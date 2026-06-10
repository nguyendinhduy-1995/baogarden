'use client';

import { useState } from 'react';
import { FiCalendar, FiClock, FiUsers, FiChevronDown } from 'react-icons/fi';

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
          <FiCalendar className="w-4 h-4 text-[#D4A84A] shrink-0" />
          <select
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="appearance-none bg-transparent text-[#D4A84A] text-sm font-medium
                       w-full outline-none cursor-pointer truncate
                       [&>option]:bg-[#08111C] [&>option]:text-white"
          >
            <option value="">Ngày</option>
            {/* Generate next 14 days */}
            {Array.from({ length: 14 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() + i);
              const val = d.toISOString().split('T')[0];
              const label = d.toLocaleDateString('vi-VN', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
              });
              return (
                <option key={val} value={val}>
                  {label}
                </option>
              );
            })}
          </select>
          <FiChevronDown className="w-3.5 h-3.5 text-[#D4A84A]/60 shrink-0
                                    group-hover:text-[#D4A84A] transition-colors" />
        </label>
      </div>

      {/* Time pill */}
      <div className="flex-1 min-w-0">
        <label className="relative flex items-center gap-2 px-3 py-2.5
                          rounded-xl border border-[#D4A84A]/40
                          bg-gradient-to-r from-[#D4A84A]/10 to-[#D4A84A]/5
                          cursor-pointer group">
          <FiClock className="w-4 h-4 text-[#D4A84A] shrink-0" />
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
          <FiChevronDown className="w-3.5 h-3.5 text-[#D4A84A]/60 shrink-0
                                    group-hover:text-[#D4A84A] transition-colors" />
        </label>
      </div>

      {/* Guests pill */}
      <div className="flex-1 min-w-0">
        <label className="relative flex items-center gap-2 px-3 py-2.5
                          rounded-xl border border-[#D4A84A]/40
                          bg-gradient-to-r from-[#D4A84A]/10 to-[#D4A84A]/5
                          cursor-pointer group">
          <FiUsers className="w-4 h-4 text-[#D4A84A] shrink-0" />
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
          <FiChevronDown className="w-3.5 h-3.5 text-[#D4A84A]/60 shrink-0
                                    group-hover:text-[#D4A84A] transition-colors" />
        </label>
      </div>
    </div>
  );
}
