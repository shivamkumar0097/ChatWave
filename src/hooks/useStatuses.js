import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const COLUMNS =
  'id, user_id, kind, text_content, image_url, background, created_at, expires_at, profiles(id, name, avatar_color, avatar_url)'

export function useStatuses(user) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !supabase) return
    const { data, error } = await supabase
      .from('statuses')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) {
      setLoading(false)
      return
    }
    const now = Date.now()
    const rows = (data || []).filter(
      (row) => !row.expires_at || new Date(row.expires_at).getTime() > now
    )
    const { data: views } = await supabase.from('status_views').select('status_id, viewer_id')
    const viewed = {}
    for (const view of views || []) {
      if (!viewed[view.status_id]) viewed[view.status_id] = new Set()
      viewed[view.status_id].add(view.viewer_id)
    }
    const byUser = new Map()
    for (const row of rows) {
      const profile = row.profiles || {}
      if (!byUser.has(row.user_id)) {
        byUser.set(row.user_id, {
          userId: row.user_id,
          name: profile.name || 'User',
          avatarUrl: profile.avatar_url || null,
          avatarColor: profile.avatar_color || '#7c5cff',
          items: [],
        })
      }
      byUser.get(row.user_id).items.push({
        id: row.id,
        kind: row.kind,
        text: row.text_content || '',
        imageUrl: row.image_url || null,
        background: row.background || '#7c5cff',
        createdAt: row.created_at,
        viewedBy: viewed[row.id] || new Set(),
      })
    }
    setGroups(
      [...byUser.values()].sort((a, b) => {
        if (a.userId === user.id) return -1
        if (b.userId === user.id) return 1
        return a.name.localeCompare(b.name)
      })
    )
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(load, 60000)
    return () => window.clearInterval(timer)
  }, [load])

  useEffect(() => {
    if (!user || !supabase) return undefined
    const channel = supabase
      .channel('chatwave-statuses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'status_views' }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, load])

  const addText = useCallback(
    async (text, background) => {
      if (!user || !supabase || !text.trim()) return false
      const { error } = await supabase.from('statuses').insert({
        user_id: user.id,
        kind: 'text',
        text_content: text.trim().slice(0, 180),
        background: background || '#7c5cff',
      })
      if (error) return false
      await load()
      return true
    },
    [load, user]
  )

  const addImage = useCallback(
    async (file) => {
      if (!user || !supabase || !file || !file.type.startsWith('image/')) {
        throw new Error('Please choose an image file.')
      }
      if (file.size > 15 * 1024 * 1024) {
        throw new Error('Image is too large. Choose a file under 15 MB.')
      }
      const objectUrl = URL.createObjectURL(file)
      try {
        const image = new Image()
        image.src = objectUrl
        await image.decode()
        const scale = Math.min(1, 1280 / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.82)
        )
        if (!blob) throw new Error('Could not process the image.')

        const unique =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`
        const path = `${user.id}/${unique}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('status-images')
          .upload(path, blob, { contentType: 'image/jpeg' })
        if (uploadError) throw new Error(uploadError.message)
        const url = supabase.storage.from('status-images').getPublicUrl(path).data.publicUrl
        const { error } = await supabase
          .from('statuses')
          .insert({ user_id: user.id, kind: 'image', image_url: url })
        if (error) throw new Error(error.message)
        await load()
        return true
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    },
    [load, user]
  )

  const remove = useCallback(
    async (id) => {
      if (!user || !supabase) return false
      const { error } = await supabase.from('statuses').delete().eq('id', id)
      if (error) return false
      await load()
      return true
    },
    [load, user]
  )

  const markViewed = useCallback(
    async (id) => {
      if (!user || !supabase) return
      await supabase.from('status_views').insert({ status_id: id, viewer_id: user.id })
      setGroups((prev) =>
        prev.map((group) => ({
          ...group,
          items: group.items.map((item) =>
            item.id === id ? { ...item, viewedBy: new Set([...item.viewedBy, user.id]) } : item
          ),
        }))
      )
    },
    [user]
  )

  return { groups, loading, addText, addImage, remove, markViewed }
}
