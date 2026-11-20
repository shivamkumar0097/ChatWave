import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@chatwave.app'
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY)
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }
  if (!SUPABASE_URL || !SERVICE_KEY) return { statusCode: 500, body: 'Server not configured' }
  if (WEBHOOK_SECRET && event.headers['x-webhook-secret'] !== WEBHOOK_SECRET) {
    return { statusCode: 401, body: 'Unauthorized' }
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: 'Invalid payload' }
  }

  const record = payload.record || {}
  if (!record.conversation_id || !record.sender_id) {
    return { statusCode: 200, body: 'No message data' }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  })

  const { data: members } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', record.conversation_id)
    .neq('user_id', record.sender_id)

  const recipientIds = (members || []).map((member) => member.user_id)
  if (!recipientIds.length) return { statusCode: 200, body: 'No recipients' }

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, subscription')
    .in('user_id', recipientIds)
  if (!subscriptions?.length) return { statusCode: 200, body: 'No subscriptions' }

  const body = record.deleted_for_all
    ? 'Message deleted'
    : record.view_once
      ? 'View once message'
      : record.content ||
        (record.image_url ? 'Photo' : record.file_name ? record.file_name : 'New message')

  const notification = JSON.stringify({
    title: 'ChatWave',
    body,
    tag: record.conversation_id,
    url: `/?chat=${record.conversation_id}`,
  })

  await Promise.allSettled(
    subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, notification)
      } catch (error) {
        const status = error?.statusCode
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', row.id)
        }
      }
    })
  )

  return { statusCode: 200, body: 'OK' }
}
