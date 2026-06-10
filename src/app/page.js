'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FLOOR_TABLES, TIME_SLOTS, formatVND } from '@/data/bookingData';
import BookingHeader from '@/components/booking/BookingHeader';
import FilterBar from '@/components/booking/FilterBar';
import StatusLegend from '@/components/booking/StatusLegend';
import FloorMap3D from '@/components/booking/FloorMap3D';
import SelectedTableCard from '@/components/booking/SelectedTableCard';

export default function BookingPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedTime, setSelectedTime] = useState('20:00');
  const [guestCount, setGuestCount] = useState(2);
  const [selectedTable, setSelectedTable] = useState(
    FLOOR_TABLES.find(t => t.id === 'A10') || null
  );
  const [toast, setToast] = useState(null);

  const handleTableClick = useCallback((table) => {
    if (table.status === 'booked') {
      setToast('Bàn này đã được đặt');
      setTimeout(() => setToast(null), 2500);
      return;
    }
    setSelectedTable(table);
  }, []);

  const handleBook = useCallback(() => {
    if (selectedTable) {
      // Navigate to booking form or handle booking
      alert(`Đặt bàn ${selectedTable.label} thành công! (Demo)`);
    }
  }, [selectedTable]);

  return (
    <div className="min-h-dvh bg-[#05070B] max-w-[480px] mx-auto flex flex-col relative">
      <BookingHeader onMenuClick={() => router.push('/admin')} />

      <FilterBar
        date={selectedDate}
        time={selectedTime}
        guests={guestCount}
        onDateChange={setSelectedDate}
        onTimeChange={setSelectedTime}
        onGuestsChange={(v) => setGuestCount(Number(v))}
        timeSlots={TIME_SLOTS}
      />

      <StatusLegend />

      <FloorMap3D
        tables={FLOOR_TABLES}
        selectedId={selectedTable?.id}
        onTableClick={handleTableClick}
      />

      <SelectedTableCard
        table={selectedTable}
        onBook={handleBook}
        formatVND={formatVND}
      />

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[999]
          px-5 py-3 rounded-xl bg-[#1a1a24]/95 backdrop-blur-xl
          border border-[#C7362E]/40 text-[#ff6b6b] text-sm font-semibold
          shadow-[0_8px_32px_rgba(0,0,0,0.5)]
          animate-[slideDown_0.3s_cubic-bezier(0.16,1,0.3,1)]">
          ⚠️ {toast}
        </div>
      )}
    </div>
  );
}
