import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
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
          borderRadius: 108,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 108,
            background: 'linear-gradient(160deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 45%)',
          }}
        />
        <div
          style={{
            fontSize: 280,
            fontWeight: 900,
            color: '#FFFFFF',
            fontFamily: 'Montserrat, system-ui, sans-serif',
            letterSpacing: -6,
            textShadow: '0 10px 28px rgba(0,0,0,0.22)',
            marginTop: 8,
          }}
        >
          N
        </div>
      </div>
    ),
    { ...size },
  )
}
