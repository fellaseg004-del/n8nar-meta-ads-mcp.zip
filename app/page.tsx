import { TOOL_DEFINITIONS } from '../lib/mcp/tools';

export const dynamic = 'force-dynamic';

function envHealth() {
  return [
    { key: 'MCP_BEARER_TOKEN', ok: !!process.env.MCP_BEARER_TOKEN },
    { key: 'META_ACCESS_TOKEN', ok: !!process.env.META_ACCESS_TOKEN },
    {
      key: 'META_API_VERSION',
      ok: true,
      note: process.env.META_API_VERSION || 'v22.0 (default)',
    },
    {
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      ok:
        !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('<your-project-ref>'),
    },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', ok: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
  ];
}

const card: React.CSSProperties = {
  background: '#141923',
  border: '1px solid #232a37',
  borderRadius: 14,
  padding: '20px 22px',
};

export default function Page() {
  const env = envHealth();
  const allReady = env.every((e) => e.ok);

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '48px 20px 80px' }}>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>🟢 n8nar Meta Ads MCP</h1>
      <p style={{ color: '#9aa6b6', marginTop: 0 }}>
        MCP server للـ Meta Marketing API — Claude custom connector
      </p>

      <div style={{ ...card, marginTop: 24 }}>
        <h2 style={{ fontSize: 17, marginTop: 0 }}>فحص الـ Environment</h2>
        <div
          style={{
            marginBottom: 14,
            fontWeight: 600,
            color: allReady ? '#46d27f' : '#f0b34a',
          }}
        >
          {allReady ? 'كل المتغيرات متظبطة ✅' : 'في متغيرات ناقصة ⚠️'}
        </div>
        {env.map((e) => (
          <div
            key={e.key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid #1d2430',
              fontSize: 14,
            }}
          >
            <code style={{ color: '#cdd6e2' }}>{e.key}</code>
            <span style={{ color: e.ok ? '#46d27f' : '#ef6a6a' }}>
              {e.note ? e.note : e.ok ? 'موجود' : 'ناقص'}
            </span>
          </div>
        ))}
        <p style={{ color: '#6f7c8e', fontSize: 12.5, marginBottom: 0 }}>
          القيم الحساسة مش بتتعرض هنا — بنبيّن وجودها من عدمه بس.
        </p>
      </div>

      <div style={{ ...card, marginTop: 18 }}>
        <h2 style={{ fontSize: 17, marginTop: 0 }}>
          الأدوات المتاحة <span style={{ color: '#6f7c8e' }}>({TOOL_DEFINITIONS.length})</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 18px' }}>
          {TOOL_DEFINITIONS.map((t) => (
            <div key={t.name} style={{ fontSize: 13.5, padding: '5px 0' }}>
              <code style={{ color: '#7cc7ff' }}>{t.name}</code>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...card, marginTop: 18 }}>
        <h2 style={{ fontSize: 17, marginTop: 0 }}>رابط الـ Connector</h2>
        <p style={{ fontSize: 14, color: '#cdd6e2', marginBottom: 6 }}>
          استخدم الرابط ده في Claude (Settings → Connectors → Add custom connector):
        </p>
        <code
          style={{
            display: 'block',
            background: '#0b0d12',
            border: '1px solid #232a37',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 13,
            color: '#9aa6b6',
            direction: 'ltr',
            textAlign: 'left',
          }}
        >
          https://&lt;your-vercel-domain&gt;/api/mcp/&lt;MCP_BEARER_TOKEN&gt;
        </code>
      </div>
    </main>
  );
}
