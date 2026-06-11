'use client';

export default function StatusLegend() {
  const items = [
    { border: 'border-[#1DAA43]', bg: 'bg-[#1DAA43]/15', label: 'Trống' },
    { border: 'border-[#C7362E]', bg: 'bg-[#C7362E]/15', label: 'Đã đặt' },
    { border: 'border-[#F8C85A]', bg: 'bg-[#F8C85A]/15', label: 'VIP' },
    { border: 'border-[#F8C85A]', bg: 'bg-[#F8C85A]/25', label: 'Đang chọn', glow: true },
  ];

  return (
    <div className="flex items-center justify-center gap-4 px-4 py-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className={`inline-block w-[12px] h-[8px] rounded-sm border-[1.5px] ${item.border} ${item.bg}`}
            style={item.glow ? { boxShadow: '0 0 4px rgba(248,200,90,0.5)' } : {}}
          />
          <span className="text-[0.65rem] text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
