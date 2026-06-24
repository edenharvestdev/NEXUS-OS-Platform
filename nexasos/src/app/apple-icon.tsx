import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #D4A96A 0%, #B48648 52%, #7A5A32 100%)',
          borderRadius: 38,
          position: 'relative',
        }}
      >
        <div
          style={{
            fontSize: 98,
            fontWeight: 900,
            color: '#FFFFFF',
            fontFamily: 'Montserrat, system-ui, sans-serif',
            letterSpacing: -2,
            textShadow: '0 4px 12px rgba(0,0,0,0.2)',
            marginTop: 4,
          }}
        >
          N
        </div>
      </div>
    ),
    { ...size },
  )
}
