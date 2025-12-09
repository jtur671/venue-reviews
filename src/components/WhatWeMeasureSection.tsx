const whatWeMeasure = [
  'Sound: clarity, volume, and how mixes translate.',
  'Vibe: crowd energy, staff, and overall feel.',
  'Layout: stage, sightlines, green room, and load-in.',
  'Fairness: payout, merch cuts, and how the room treats artists.',
];

export function WhatWeMeasureSection() {
  return (
    <div className="section mt-lg mb-0">
      <div className="section-header section-header-compact">
        <h2 className="section-title text-xl">What we measure</h2>
        <p className="section-subtitle text-sm mt-sm">
          The checklist behind every rating.
        </p>
      </div>
      <ul className="measure-list">
        {whatWeMeasure.map((item) => (
          <li key={item} className="section-subtitle measure-item">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
