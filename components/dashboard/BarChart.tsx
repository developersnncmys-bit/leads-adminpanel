'use client';

import { useState } from 'react';

// Pre-defined mock lead counts for all 12 months.
// When backend is connected, replace this with real API data.
const MOCK_MONTHLY_VALUES = [28, 42, 35, 51, 36, 48, 62, 45, 53, 38, 57, 44];
const ALL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Auto-slice up to current month — updates itself when the month changes
const currentMonthIndex = new Date().getMonth(); // 0 = Jan, 11 = Dec
const DATA = ALL_MONTHS.slice(0, currentMonthIndex + 1).map((label, i) => ({
  label,
  value: MOCK_MONTHLY_VALUES[i],
}));

const W = 480;
const H = 140;
const PL = 8;
const PR = 8;
const PT = 8;
const PB = 24;
const CHART_H = H - PT - PB;
const CHART_W = W - PL - PR;
const SLOT_W = CHART_W / DATA.length;
const BAR_W = SLOT_W * 0.42;

export default function BarChart() {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...DATA.map((d) => d.value));

  // Since we use preserveAspectRatio="none", SVG fills container exactly.
  // So SVG x% === container x% — safe to use for HTML tooltip positioning.
  const tooltipLeftPct = (i: number) => {
    const cx = PL + i * SLOT_W + SLOT_W / 2;
    return (cx / W) * 100;
  };

  const tooltipTopPct = (value: number) => {
    const barH = (value / max) * CHART_H;
    const y = PT + CHART_H - barH;
    return (y / H) * 100;
  };

  return (
    <div className="w-full relative" style={{ paddingTop: 52 }}>

      {/* HTML tooltip — lives outside SVG, never clipped */}
      {hovered !== null && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: `${tooltipLeftPct(hovered)}%`,
            top: `calc(${tooltipTopPct(DATA[hovered].value) * (160 / H)}% + 52px)`,
            transform: 'translate(-50%, -110%)',
          }}
        >
          <div className="bg-gray-900 rounded-xl px-3 py-2 shadow-xl text-center whitespace-nowrap">
            <p className="text-[10px] text-white/50 font-medium">{DATA[hovered].label} 2026</p>
            <p className="text-sm font-bold text-white leading-tight">{DATA[hovered].value} leads</p>
          </div>
          {/* Arrow */}
          <div className="flex justify-center">
            <div
              className="w-0 h-0"
              style={{
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '5px solid #111827',
              }}
            />
          </div>
        </div>
      )}

      {/* SVG — preserveAspectRatio="none" ensures it fills exactly 100% width,
          so our % calculations match the rendered positions perfectly */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full block"
        style={{ height: 160 }}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = PT + CHART_H - pct * CHART_H;
          return (
            <line
              key={pct}
              x1={PL} y1={y}
              x2={W - PR} y2={y}
              stroke="#f1f5f9"
              strokeWidth={1}
              strokeDasharray={pct === 0 ? undefined : '4 4'}
            />
          );
        })}

        {DATA.map(({ label, value }, i) => {
          const barH = (value / max) * CHART_H;
          const x = PL + i * SLOT_W + (SLOT_W - BAR_W) / 2;
          const y = PT + CHART_H - barH;
          const isHovered = hovered === i;
          const isHighest = value === max;

          return (
            <g key={label}>
              {/* Full-column invisible hit area */}
              <rect
                x={PL + i * SLOT_W}
                y={PT}
                width={SLOT_W}
                height={CHART_H}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />

              {/* Bar */}
              <rect
                x={x} y={y}
                width={BAR_W} height={barH}
                rx={5}
                fill={isHovered ? '#1d4ed8' : isHighest ? '#2563eb' : '#dbeafe'}
                style={{ transition: 'fill 0.12s ease', pointerEvents: 'none' }}
              />

              {/* Month label */}
              <text
                x={x + BAR_W / 2}
                y={H - 6}
                textAnchor="middle"
                fill={isHovered ? '#2563eb' : '#94a3b8'}
                fontSize="11"
                fontWeight={isHovered ? '700' : '500'}
                style={{ transition: 'fill 0.12s ease' }}
                pointerEvents="none"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
