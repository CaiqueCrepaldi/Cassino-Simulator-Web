import type { ReactNode } from 'react'

interface Props {
  title: string
  onBack: () => void
  balance: number
  children: ReactNode
}

export default function GameShell({ title, onBack, balance, children }: Props) {
  return (
    <div style={{ background: '#0d0d0d', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#111', padding: '10px 20px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #222', flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ background: '#222', color: '#ccc', fontSize: 13, fontWeight: 'bold', padding: '6px 14px', borderRadius: 6, marginRight: 16 }}
          onMouseEnter={e => (e.currentTarget.style.background = '#333')}
          onMouseLeave={e => (e.currentTarget.style.background = '#222')}
        >
          ← Menu
        </button>
        <span style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 18, flex: 1, textAlign: 'center' }}>{title}</span>
        <span style={{ color: '#00FF00', fontWeight: 'bold', fontSize: 14 }}>💰 R$ {balance.toFixed(2)}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
        {children}
      </div>
    </div>
  )
}
