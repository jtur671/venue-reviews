import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Venue Reviews',
  description: 'Rate live music venues by sound, vibe, and more.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <div className="app-header-inner">
              <div className="app-brand">
                <span className="app-logo-dot" />
                <span className="app-brand-text">Venue Reviews</span>
              </div>
              <p className="app-tagline">
                Rotten Tomatoes, but for live music venues.
              </p>
            </div>
          </header>

          <main className="app-main">{children}</main>

          <footer className="app-footer">
            <p>Built for discovering better shows, not just bigger ones.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
