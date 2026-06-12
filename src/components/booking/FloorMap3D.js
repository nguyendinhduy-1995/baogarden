'use client';

import { useRef, useMemo } from 'react';

/**
 * Hotspot positions mapped to the actual 3D floor plan image (2838x1472).
 * Each entry: { code, x%, y%, w%, h% } — center of the table on the image.
 */
const TABLE_HOTSPOTS = {
  // ── Khu A (right side) ──
  'A1':  { x: 74.2, y: 10.5, w: 6.8, h: 10.5 },
  'A2':  { x: 82.5, y: 10.5, w: 6.8, h: 10.5 },
  'A3':  { x: 72.5, y: 22.5, w: 5.5, h: 9.0 },
  'A4':  { x: 78.8, y: 22.5, w: 5.5, h: 9.0 },
  'A5':  { x: 85.3, y: 22.5, w: 5.5, h: 9.0 },
  'A7':  { x: 77.5, y: 34.5, w: 5.5, h: 9.0 },
  'A8':  { x: 84.5, y: 34.5, w: 5.5, h: 9.0 },
  'A9':  { x: 85.8, y: 47.5, w: 6.5, h: 11.0 },
  'A11': { x: 86.5, y: 61.0, w: 6.5, h: 10.0 },
  'A13': { x: 89.5, y: 85.0, w: 6.0, h: 9.0 },
  'A14': { x: 74.5, y: 78.0, w: 7.5, h: 10.0 },
  'A15': { x: 63.8, y: 78.0, w: 7.5, h: 10.0 },
  'A16': { x: 53.0, y: 78.0, w: 7.5, h: 10.0 },
  'A17': { x: 42.2, y: 78.0, w: 7.5, h: 10.0 },

  // ── Khu B (left side) ──
  'B1':  { x: 23.5, y: 10.5, w: 6.0, h: 9.5 },
  'B2':  { x: 15.5, y: 10.5, w: 6.0, h: 9.5 },
  'B3':  { x: 29.5, y: 22.5, w: 5.5, h: 9.0 },
  'B4':  { x: 22.0, y: 22.5, w: 5.5, h: 9.0 },
  'B5':  { x: 14.5, y: 22.5, w: 5.5, h: 9.0 },
  'B6':  { x: 14.5, y: 34.5, w: 5.5, h: 9.0 },
  'B8':  { x: 22.0, y: 34.5, w: 5.5, h: 9.0 },
  'B10': { x: 29.5, y: 34.5, w: 5.5, h: 9.0 },
  'B7':  { x: 14.5, y: 46.5, w: 5.5, h: 9.0 },
  'B9':  { x: 22.0, y: 46.5, w: 5.5, h: 9.0 },
  'B11': { x: 29.5, y: 46.5, w: 5.5, h: 9.0 },

  // ── Khu T (center, in front of stage) ──
  'T1':  { x: 65.5, y: 22.5, w: 5.5, h: 9.0 },
  'T3':  { x: 57.5, y: 22.5, w: 5.5, h: 9.0 },
  'T5':  { x: 49.5, y: 22.5, w: 5.5, h: 9.0 },
  'T7':  { x: 41.0, y: 22.5, w: 5.5, h: 9.0 },
  'T2':  { x: 65.5, y: 34.5, w: 5.5, h: 9.0 },
  'T4':  { x: 57.5, y: 34.5, w: 5.5, h: 9.0 },
  'T6':  { x: 49.5, y: 34.5, w: 5.5, h: 9.0 },
  'T8':  { x: 41.0, y: 34.5, w: 5.5, h: 9.0 },
  'T9':  { x: 68.5, y: 52.5, w: 6.0, h: 9.5 },
  'T11': { x: 58.5, y: 52.5, w: 6.0, h: 9.5 },
  'T13': { x: 48.5, y: 52.5, w: 6.0, h: 9.5 },
  'T15': { x: 39.0, y: 52.5, w: 6.0, h: 9.5 },
  'T10': { x: 68.5, y: 64.0, w: 6.0, h: 9.5 },
  'T12': { x: 58.5, y: 64.0, w: 6.0, h: 9.5 },
  'T14': { x: 48.5, y: 64.0, w: 6.0, h: 9.5 },
  'T16': { x: 39.0, y: 64.0, w: 6.0, h: 9.5 },

  // ── VIP 1 (bottom, blue sofas) ──
  'V1-1': { x: 66.5, y: 93.0, w: 14.0, h: 10.0 },
  'V1-2': { x: 47.0, y: 93.0, w: 14.0, h: 10.0 },
  'V1-3': { x: 25.5, y: 78.0, w: 7.0, h: 18.0 },

  // ── VIP 2 (left top, blue sofas) ──
  'V2-1': { x: 5.5, y: 36.0, w: 5.5, h: 18.0 },
  'V2-2': { x: 5.5, y: 10.0, w: 5.5, h: 14.0 },
};

/** Hotspot button overlaid on the floor plan image */
function TableHotspot({ table, hotspot, isSelected, isBooked, isVip, onClick }) {
  // Visual states
  let borderColor = 'rgba(29, 170, 67, 0.6)';  // green = available
  let bgColor = 'rgba(29, 170, 67, 0.12)';
  let glowColor = 'rgba(29, 170, 67, 0.3)';

  if (isSelected) {
    borderColor = 'rgba(248, 200, 90, 0.95)';
    bgColor = 'rgba(248, 200, 90, 0.2)';
    glowColor = 'rgba(248, 200, 90, 0.5)';
  } else if (isBooked) {
    borderColor = 'rgba(199, 54, 46, 0.5)';
    bgColor = 'rgba(199, 54, 46, 0.08)';
    glowColor = 'none';
  } else if (isVip) {
    borderColor = 'rgba(248, 200, 90, 0.5)';
    bgColor = 'rgba(248, 200, 90, 0.08)';
    glowColor = 'rgba(248, 200, 90, 0.15)';
  }

  return (
    <button
      className={`absolute transition-all duration-200 ease-out
        ${isBooked ? 'cursor-not-allowed' : 'cursor-pointer'}
        ${!isBooked ? 'hover:scale-110 hover:z-20' : ''}
        ${isSelected ? 'z-30 animate-[selGlow_2s_ease-in-out_infinite]' : 'z-10'}
      `}
      style={{
        left: `${hotspot.x - hotspot.w / 2}%`,
        top: `${hotspot.y - hotspot.h / 2}%`,
        width: `${hotspot.w}%`,
        height: `${hotspot.h}%`,
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: isVip ? '8px' : '5px',
        boxShadow: isSelected
          ? `0 0 15px ${glowColor}, inset 0 0 8px ${glowColor}`
          : glowColor !== 'none'
            ? `0 0 6px ${glowColor}`
            : 'none',
        backdropFilter: isSelected ? 'brightness(1.3)' : 'none',
      }}
      onClick={() => onClick(table)}
      disabled={isBooked}
      id={`table-${table.id}`}
      title={`${table.code} · ${table.guests} khách · ${table.area}`}
    >
      {/* Invisible — the table image underneath is the visual */}
    </button>
  );
}

export default function FloorMap3D({ tables, selectedId, onTableClick }) {
  const mapRef = useRef(null);

  // Build a lookup from table code to table data
  const tableByCode = useMemo(() => {
    const map = {};
    for (const t of tables) {
      map[t.code] = t;
    }
    return map;
  }, [tables]);

  return (
    <div className="px-3 pb-4">
      {/* Container with aspect ratio matching image */}
      <div
        ref={mapRef}
        className="relative w-full rounded-xl overflow-hidden"
        style={{ aspectRatio: '2838 / 1472' }}
      >
        {/* Actual 3D floor plan image */}
        <img
          src="/floor-plan-3d.jpg"
          alt="Sơ đồ bàn Báo Garden"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-0"
          draggable={false}
        />

        {/* Interactive hotspots overlay */}
        {Object.entries(TABLE_HOTSPOTS).map(([code, hotspot]) => {
          const table = tableByCode[code];
          if (!table) return null;

          const isBooked = table.status === 'booked';
          const isVip = table.status === 'vip' || code.startsWith('V');
          const isSelected = selectedId === table.id;

          return (
            <TableHotspot
              key={code}
              table={table}
              hotspot={hotspot}
              isSelected={isSelected}
              isBooked={isBooked}
              isVip={isVip}
              onClick={onTableClick}
            />
          );
        })}

        {/* Booked overlay legend indicator */}
        {tables.some(t => t.status === 'booked') && (
          <div className="absolute bottom-2 left-2 z-20 px-2 py-1 rounded bg-black/60 backdrop-blur-sm">
            <span className="text-[0.55rem] text-red-400/80 font-medium">
              Bàn viền đỏ = Đã đặt
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
