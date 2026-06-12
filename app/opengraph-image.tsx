import { ImageResponse } from 'next/og'

export const alt = 'LearnPeers — Learn from peer tutors, live'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Brand-coloured social card (no external assets — renders fully on the edge).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background:
            'linear-gradient(135deg, #243036 0%, #1b2a39 55%, #0e4360 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: '-2px',
              display: 'flex',
            }}
          >
            <span style={{ color: '#1f8dcc' }}>Learn</span>
            <span style={{ color: '#ffffff' }}>Peers</span>
          </div>
          <div
            style={{
              marginLeft: 12,
              padding: '8px 16px',
              borderRadius: 999,
              background: 'rgba(31,159,224,0.18)',
              border: '1px solid rgba(31,159,224,0.5)',
              color: '#7cc8ee',
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '2px',
            }}
          >
            BETA
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-2px',
              lineHeight: 1.05,
              maxWidth: 1000,
            }}
          >
            Learn from peer tutors, live.
          </div>
          <div style={{ fontSize: 34, color: '#aebfca', fontWeight: 500, marginTop: 16 }}>
            One-on-one video sessions · shared whiteboard · secure payments
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ height: 10, width: 10, borderRadius: 999, background: '#1f8dcc' }} />
          <div style={{ fontSize: 28, color: '#cdd9e1', fontWeight: 600 }}>learnpeers.com</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
