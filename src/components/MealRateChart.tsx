type Point = { label: string; mealRate: string; totalMeals?: number };

export function MealRateChart({ data }: { data: Point[] }) {
  if (!data?.length) {
    return <p className="text-sm text-gray-400">No monthly meal-cost history yet.</p>;
  }

  const values = data.map((d) => Number(d.mealRate) || 0);
  const max = Math.max(...values, 1);
  const height = 160;
  const barW = Math.max(18, Math.min(42, 320 / data.length));
  const gap = 8;
  const width = data.length * (barW + gap) + 24;
  const bottom = 28;

  return (
    <div className="overflow-x-auto thin-scroll">
      <svg width={width} height={height + bottom} className="text-brand-600">
        {data.map((d, i) => {
          const value = values[i];
          const h = (value / max) * height;
          const x = 12 + i * (barW + gap);
          const y = height - h;
          return (
            <g key={d.label}>
              <rect x={x} y={y} width={barW} height={Math.max(h, 2)} rx={4} className="fill-brand-500/80" />
              <text x={x + barW / 2} y={height + 16} textAnchor="middle" className="fill-gray-500" fontSize="10">
                {d.label.slice(2)}
              </text>
              <text x={x + barW / 2} y={Math.max(12, y - 4)} textAnchor="middle" className="fill-gray-700" fontSize="9">
                {value ? `৳${value.toFixed(0)}` : "0"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
