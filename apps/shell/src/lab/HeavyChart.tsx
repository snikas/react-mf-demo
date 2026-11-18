/** Pretend this is a big charting library. It lives in its own "heavy-chart" chunk. */
const DATA = [
  { label: 'Tokenize', value: 182 },
  { label: 'Detokenize', value: 64 },
  { label: 'Mask', value: 121 },
  { label: 'Cleartext', value: 23 },
];

export default function HeavyChart() {
  const max = Math.max(...DATA.map((d) => d.value));
  return (
    <figure className="lab-chart">
      <svg viewBox="0 0 320 140" role="img" aria-labelledby="heavy-chart-title">
        <title id="heavy-chart-title">Protection operations per minute</title>
        {DATA.map((d, i) => {
          const h = (d.value / max) * 100;
          return (
            <g key={d.label} transform={`translate(${20 + i * 75}, 0)`}>
              <rect x="0" y={110 - h} width="50" height={h} rx="4" fill="var(--color-accent)" />
              <text x="25" y={104 - h} textAnchor="middle" fontSize="11" fill="var(--color-text)">
                {d.value}
              </text>
              <text x="25" y="128" textAnchor="middle" fontSize="11" fill="var(--color-text-muted)">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="shell-muted">Loaded on demand from the heavy-chart chunk.</figcaption>
    </figure>
  );
}
