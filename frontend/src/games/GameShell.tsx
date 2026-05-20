import type { ReactNode } from 'react'

interface Props {
  title: string
  onBack: () => void
  balance: number
  children: ReactNode
}

export default function GameShell({ title, onBack, balance, children }: Props) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        background: 'rgba(7,7,15,0.85)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(255,215,0,0.12)',
        padding: '11px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.05)',
            color: '#888',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 8,
            fontSize: 13,
            padding: '7px 16px',
            letterSpacing: 0.3,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#ddd' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#888' }}
        >
          ← Menu
        </button>

        <span style={{
          fontFamily: 'Orbitron, sans-serif',
          fontWeight: 700,
          fontSize: 15,
          color: '#FFD700',
          flex: 1,
          textAlign: 'center',
          letterSpacing: 2,
          textShadow: '0 0 14px rgba(255,215,0,0.45)',
        }}>
          {title}
        </span>

        <div style={{
          background: 'rgba(0,230,118,0.07)',
          border: '1px solid rgba(0,230,118,0.18)',
          borderRadius: 8,
          padding: '6px 14px',
          textAlign: 'right',
          flexShrink: 0,
        }}>
          <div style={{ color: '#444', fontSize: 8, letterSpacing: 2, marginBottom: 2 }}>BANCA</div>
          <div style={{ color: '#00e676', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 14 }}>
            R$ {balance.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
        {children}
      </div>
    </div>
  )
}
