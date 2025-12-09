import { WhatWeMeasureSection } from './WhatWeMeasureSection';

const howItWorks = [
  { title: '1️⃣ Search a venue', detail: 'Find rooms by name or city.' },
  { title: '2️⃣ Read the room', detail: 'Scores + reviews from artists and fans.' },
  { title: '3️⃣ Leave your report card', detail: 'Drop a venue or add your take.' },
];

export function HomeHero() {
  return (
    <section className="section">
      <div className="card hero-card">
        <div className="section-header">
          <h1 className="section-title text-2xl">
            Find the right room for your next show.
          </h1>
          <p className="section-subtitle mt-md">
            Search live music venues by how they actually feel for artists and fans.
          </p>
        </div>
        <div id="how-it-works" className="section grid-auto-fit" style={{ marginTop: '1rem', marginBottom: 0 }}>
          {howItWorks.map((step) => (
            <div key={step.title} className="step-card">
              <div className="section-title text-lg mb-sm font-semibold">{step.title}</div>
              <div className="section-subtitle mb-0 text-sm">{step.detail}</div>
            </div>
          ))}
        </div>
        <WhatWeMeasureSection />
      </div>
    </section>
  );
}
