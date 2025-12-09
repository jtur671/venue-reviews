import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';

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
          <Header />

          <main className="app-main">{children}</main>

          <footer className="app-footer">
            <p>Built for discovering better shows, not just bigger ones.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
