import type { Metadata } from 'next';
import './globals.css';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { AlertsProvider } from '@/context/AlertsContext';

export const metadata: Metadata = {
  title: 'OpenTerm - Financial Terminal',
  description: 'Bloomberg-style financial terminal with free data sources',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-terminal-bg text-terminal-text font-mono">
        <AlertsProvider>
          <WorkspaceProvider>
            {children}
          </WorkspaceProvider>
        </AlertsProvider>
      </body>
    </html>
  );
}
