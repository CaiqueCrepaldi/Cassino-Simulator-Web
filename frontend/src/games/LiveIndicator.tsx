export function LiveIndicator({ connected }: { connected: boolean }) {
  return (
    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: connected ? '#00e676' : '#ff5252',
        boxShadow: connected ? '0 0 6px #00e676' : '0 0 6px #ff5252',
        display: 'inline-block', flexShrink: 0,
      }} />
      <span style={{ color: connected ? '#00e676' : '#ff5252', fontSize: 10, letterSpacing: 1.5 }}>
        {connected ? 'AO VIVO' : 'RECONECTANDO...'}
      </span>
    </div>
  )
}
