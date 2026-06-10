'use client';

import { useRef } from 'react';

/** Single table seat on the floor map */
function TableSeat({ table, isSelected, onClick }) {
  const isBooked = table.status === 'booked';
  const isVip = table.status === 'vip';
  const isRoom = table.id.startsWith('V');

  const colorClasses = isSelected
    ? 'bg-gradient-to-br from-[#E8C44A] to-[#B8860B] border-[#F8C85A] shadow-[0_0_20px_rgba(248,200,90,0.45)] scale-105 z-30'
    : isBooked
      ? 'bg-gradient-to-br from-[#8B1C1C]/80 to-[#641414]/85 border-[#C7362E]/35 opacity-65 cursor-not-allowed'
      : isVip
        ? 'bg-gradient-to-br from-[#A06A0E]/85 to-[#7A5010]/88 border-[#F8C85A]/50 shadow-[0_2px_8px_rgba(248,200,90,0.2)]'
        : isRoom
          ? 'bg-gradient-to-br from-[#5523A0]/80 to-[#3C1960]/88 border-[#A020F0]/45 shadow-[0_2px_8px_rgba(160,32,240,0.15)]'
          : 'bg-gradient-to-br from-[#1D7A30]/82 to-[#155020]/88 border-[#1DAA43]/50 shadow-[0_2px_6px_rgba(29,170,67,0.15)]';

  const hoverClass = !isBooked
    ? 'hover:scale-[1.2] hover:z-20 hover:shadow-lg'
    : '';

  return (
    <button
      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded border-[1.5px] flex items-center justify-center
        text-[0.42rem] font-bold text-white tracking-wide cursor-pointer
        transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${isRoom ? 'rounded-md' : 'rounded'}
        ${colorClasses} ${hoverClass}
        ${isSelected ? 'animate-[selGlow_2s_ease-in-out_infinite]' : ''}
      `}
      style={{
        left: `${table.x}%`,
        top: `${table.y}%`,
        width: table.w || (isRoom ? 50 : 36),
        height: table.h || (isRoom ? 30 : 22),
        textShadow: '0 1px 3px rgba(0,0,0,0.7)',
      }}
      onClick={() => onClick(table)}
      disabled={isBooked}
      id={`table-${table.id}`}
    >
      {table.label}
    </button>
  );
}

export default function FloorMap3D({ tables, selectedId, onTableClick }) {
  const mapRef = useRef(null);

  return (
    <div className="px-3 pb-4" style={{ perspective: '1200px', perspectiveOrigin: '50% 20%' }}>
      {/* Golden metallic frame */}
      <div
        className="rounded-2xl p-[3px] shadow-[0_20px_60px_rgba(0,0,0,0.7),0_4px_20px_rgba(0,0,0,0.5)]"
        style={{
          background: 'linear-gradient(145deg, #8b7530 0%, #c9a84a 15%, #e8cc6e 30%, #c9a84a 45%, #8b7530 55%, #a89040 70%, #d4b855 85%, #8b7530 100%)',
          transform: 'rotateX(8deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Map container */}
        <div
          ref={mapRef}
          className="relative w-full rounded-xl overflow-hidden bg-[#080610]"
          style={{ aspectRatio: '1 / 1.08' }}
        >
          {/* Background 3D image */}
          <img
            src="/floor-plan-bg.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-0"
            draggable={false}
          />

          {/* Dark overlay for contrast */}
          <div className="absolute inset-0 bg-black/[0.18] pointer-events-none z-[1]" />

          {/* Stage label */}
          <div className="absolute top-[5%] left-[30%] w-[40%] z-[5] text-center pointer-events-none">
            <span className="text-[0.7rem] font-bold text-purple-300/50 tracking-widest"
              style={{ textShadow: '0 0 12px rgba(160,32,240,0.5)' }}>
              Sân khấu
            </span>
          </div>

          {/* Landmarks */}
          <div className="absolute left-[1%] top-[46%] z-[5] pointer-events-none">
            <span className="text-[0.55rem] font-semibold italic text-[#c9a44a]/70 tracking-wide">
              Thu ngân
            </span>
          </div>
          <div className="absolute right-0 top-[38%] z-[5] pointer-events-none" style={{ writingMode: 'vertical-rl' }}>
            <span className="text-[0.55rem] font-semibold italic text-[#a88c5a]/60 tracking-wide">
              Phòng chờ
            </span>
          </div>

          {/* Table buttons */}
          {tables.map(table => (
            <TableSeat
              key={table.id}
              table={table}
              isSelected={selectedId === table.id}
              onClick={onTableClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
