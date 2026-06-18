/** LINE push notification (outbound) */

export async function pushLineMessage(
  lineUserId: string,
  text: string,
): Promise<{ ok: boolean; detail?: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token || !lineUserId) {
    return { ok: false, detail: 'LINE not configured or no line_user_id' }
  }
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: 'text', text: text.slice(0, 5000) }],
    }),
  })
  if (!res.ok) {
    return { ok: false, detail: await res.text() }
  }
  return { ok: true }
}

export async function pushLineMulticast(
  lineUserIds: string[],
  text: string,
): Promise<{ ok: boolean; detail?: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token || !lineUserIds.length) {
    return { ok: false, detail: 'LINE not configured' }
  }
  const res = await fetch('https://api.line.me/v2/bot/message/multicast', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: lineUserIds.slice(0, 500),
      messages: [{ type: 'text', text: text.slice(0, 5000) }],
    }),
  })
  if (!res.ok) {
    return { ok: false, detail: await res.text() }
  }
  return { ok: true }
}
