export const metadata = {
  title: 'n8nar Meta Ads MCP',
  description: 'MCP server for the Meta Marketing API — Claude custom connector',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif',
          background: '#0b0d12',
          color: '#e7ebf0',
        }}
      >
        {children}
      </body>
    </html>
  );
}
