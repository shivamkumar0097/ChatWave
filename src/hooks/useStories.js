import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const STORY_COLUMNS =
  'id, user_id, kind, text_content, image_url, background, created_at, expires_at, profiles(id, name, avatar_color, avatar_url)'

export function useStories(user) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !supabase) return
    const { data, error } = await supabase
      .from('stories')
      .select(STORY_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) {
      setLoading(false)
      return
    }

    const now = Date.now()
    const rows = (data || []).filter(
      (story) => !story.expires_at || new Date(story.expires_at).getTime() > now
    )
    const { data: views } = await supabase.from('story_views').select('story_id, viewer_id')
    const viewed = {}
    for (const view of views || []) {
      if (!viewed[view.story_id]) viewed[view.story_id] = new Set()
      viewed[view.story_id].add(view.viewer_id)
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
          stories: [],
        })
      }
      byUser.get(row.user_id).stories.push({
        id: row.id,
        kind: row.kind,
        text: row.text_content || '',
        imageUrl: row.image_url || null,
        background: row.background || '#7c5cff',
        createdAt: row.created_at,
        expiresAt: row.expires_at,
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
      .channel('chatwave-stories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'story_views' }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, load])

  const addTextStory = useCallback(
    async (text, background) => {
      if (!user || !supabase || !text.trim()) return false
      const { error } = await supabase.from('stories').insert({
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

  const addImageStory = useCallback(
    async (file) => {
      if (!user || !supabase || !file) return false
      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return false
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('story-images')
        .upload(path, file, { contentType: file.type })
      if (uploadError) return false
      const url = supabase.storage.from('story-images').getPublicUrl(path).data.publicUrl
      const { error } = await supabase.from('stories').insert({
        user_id: user.id,
        kind: 'image',
        image_url: url,
      })
      if (error) return false
      await load()
      return true
    },
    [load, user]
  )

  const deleteStory = useCallback(
    async (storyId) => {
      if (!user || !supabase) return false
      const { error } = await supabase.from('stories').delete().eq('id', storyId)
      if (error) return false
      await load()
      return true
    },
    [load, user]
  )

  const markViewed = useCallback(
    async (storyId) => {
      if (!user || !supabase) return
      await supabase.from('story_views').insert({ story_id: storyId, viewer_id: user.id })
      setGroups((prev) =>
        prev.map((group) => ({
          ...group,
          stories: group.stories.map((story) =>
            story.id === storyId
              ? { ...story, viewedBy: new Set([...story.viewedBy, user.id]) }
              : story
          ),
        }))
      )
    },
    [user]
  )

  return {
    groups,
    loading,
    addTextStory,
    addImageStory,
    deleteStory,
    markViewed,
    reload: load,
  }
}
