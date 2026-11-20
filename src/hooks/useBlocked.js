import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useBlocked(user) {
  const [blockedIds, setBlockedIds] = useState(() => new Set())

  const load = useCallback(async () => {
    if (!user || !supabase) return
    const { data, error } = await supabase
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', user.id)
    if (!error) setBlockedIds(new Set((data || []).map((row) => row.blocked_id)))
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!user || !supabase) return undefined
    const channel = supabase
      .channel('chatwave-blocks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_users' }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, load])

  const block = useCallback(
    async (userId) => {
      if (!user || !userId || !supabase) return false
      const { error } = await supabase
        .from('blocked_users')
        .insert({ blocker_id: user.id, blocked_id: userId })
      if (error) return false
      await load()
      return true
    },
    [load, user]
  )

  const unblock = useCallback(
    async (userId) => {
      if (!user || !userId || !supabase) return false
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
      if (error) return false
      await load()
      return true
    },
    [load, user]
  )

  return { blockedIds, block, unblock, isBlocked: (id) => blockedIds.has(id) }
}
