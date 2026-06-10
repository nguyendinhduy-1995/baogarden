'use client';

export default function StatusLegend() {
  const items = [
    { color: 'bg-[#1DAA43]', shadow: 'shadow-[0_0_6px_#1DAA43]', label: 'Trống' },
    { color: 'bg-[#C7362E]', shadow: 'shadow-[0_0_6px_#C7362E]', label: 'Đã đặt' },
    { color: 'bg-orange-400', shadow: 'shadow-[0_0_6px_#fb923c]', label: 'VIP' },
  ];

  return (
    <div className="flex items-center justify-center gap-5 px-4 py-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className={`inline-block w-[9px] h-[9px] rounded-full ${item.color} ${item.shadow}`}
          />
          <span className="text-xs text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
