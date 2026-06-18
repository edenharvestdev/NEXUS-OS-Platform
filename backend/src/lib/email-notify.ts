/** Email delivery — SMTP or Resend API */

export async function sendEmail(opts: {
  to: string
  subject: string
  text: string
  html?: string
}): Promise<{ ok: boolean; channel: string; detail?: string }> {
  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'NEXUS OS <onboarding@resend.dev>',
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
        html: opts.html || `<p>${opts.text.replace(/\n/g, '<br>')}</p>`,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      return { ok: false, channel: 'resend', detail: err }
    }
    return { ok: true, channel: 'resend' }
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const nodemailer = await import('nodemailer')
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      })
      return { ok: true, channel: 'smtp' }
    } catch (e: any) {
      return { ok: false, channel: 'smtp', detail: e.message }
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[email:dev] To: ${opts.to} | ${opts.subject}\n${opts.text}`)
    return { ok: true, channel: 'dev_log' }
  }
  return { ok: false, channel: 'none', detail: 'Email not configured' }
}
