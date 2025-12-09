import type { Metadata } from 'next';
import './globals.css';
import { ThemeToggle } from '@/components/ThemeToggle';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('venue-theme');
                  const theme = stored === 'dark' ? 'dark' : 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <div className="app-shell">
          <header className="app-header">
            <div
              className="app-header-inner"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div className="app-brand">
                  <span className="app-logo-dot" />
                  <span className="app-brand-text">Venue Reviews</span>
                </div>
                <p className="app-tagline">
                  Rotten Tomatoes, but for live music venues.
                </p>
              </div>
              <ThemeToggle />
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
