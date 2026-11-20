import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const PALETTE = ['#6a5acd', '#e91e63', '#00897b', '#f57c00', '#8e24aa', '#1e88e5', '#43a047', '#d81b60']

const PROFILE_COLUMNS = 'id, name, avatar_color, avatar_url, last_seen, bio'
const PROFILE_COLUMNS_BASE = 'id, name, avatar_color, avatar_url, last_seen'

const readReceiptsEnabled = () =>
  typeof window === 'undefined' || window.localStorage.getItem('cw-read-receipts') !== '0'

const colorFor = (id) => {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

const timeOf = (iso) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })

const labelOf = (iso) => {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) return timeOf(iso)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const myReadAtFor = (rows, conversationId, myId) =>
  rows.find((row) => row.conversation_id === conversationId && row.user_id === myId)?.last_read_at ??
  null

const otherReadAtFor = (rows, conversationId, myId) =>
  rows
    .filter((row) => row.conversation_id === conversationId && row.user_id !== myId)
    .reduce(
      (max, row) => (!max || row.last_read_at > max ? row.last_read_at : max),
      null
    )

const readMapFor = (rows, conversationId) => {
  const map = {}
  for (const row of rows) {
    if (row.conversation_id === conversationId) map[row.user_id] = row.last_read_at
  }
  return map
}

const statusFor = (createdAt, myId, memberIds, isGroup, readMap) => {
  if (!isGroup) {
    const otherReadAt = Object.entries(readMap || {}).find(([id]) => id !== myId)?.[1] ?? null
    return otherReadAt && new Date(otherReadAt) >= new Date(createdAt) ? 'read' : 'delivered'
  }
  const others = (memberIds || []).filter((id) => id !== myId)
  if (!others.length) return 'delivered'
  return others.every(
    (id) => readMap?.[id] && new Date(readMap[id]) >= new Date(createdAt)
  )
    ? 'read'
    : 'delivered'
}

const readContextOf = (chat) => ({
  memberIds: chat.memberIds || [],
  isGroup: Boolean(chat.isGroup),
  readMap: chat.readMap || {},
})

const groupReactions = (raw) => {
  const grouped = {}
  for (const emoji of Object.values(raw || {})) {
    if (emoji) grouped[emoji] = (grouped[emoji] || 0) + 1
  }
  return Object.entries(grouped).map(([emoji, count]) => ({ emoji, count }))
}

const hiddenKey = (userId) => `cw-hidden:${userId}`

const readHidden = (userId) => {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(hiddenKey(userId)) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const writeHidden = (userId, messageId) => {
  if (typeof window === 'undefined') return
  const next = [...new Set([...readHidden(userId), messageId])].slice(-1000)
  window.localStorage.setItem(hiddenKey(userId), JSON.stringify(next))
}

const mapMessage = (row, myId, readContext = {}) => {
  const mine = row.sender_id === myId
  const deleted = Boolean(row.deleted_for_all)
  const { memberIds = [], isGroup = false, readMap = {} } = readContext
  const rawReactions = deleted
    ? {}
    : row.reactions && typeof row.reactions === 'object'
      ? row.reactions
      : {}
  return {
    id: row.id,
    senderId: row.sender_id,
    from: mine ? 'me' : 'them',
    text: deleted ? '' : row.content || '',
    imageUrl: deleted ? null : row.image_url || null,
    fileUrl: deleted ? null : row.file_url || null,
    fileName: deleted ? null : row.file_name || null,
    fileType: deleted ? null : row.file_type || null,
    fileSize: deleted ? null : row.file_size || null,
    time: timeOf(row.created_at),
    createdAt: row.created_at,
    replyTo: row.reply_to || null,
    reaction: rawReactions[myId] ?? null,
    reactionList: groupReactions(rawReactions),
    reactionsRaw: rawReactions,
    forwarded: Boolean(row.forwarded),
    edited: Boolean(row.edited_at),
    deleted,
    status: mine ? statusFor(row.created_at, myId, memberIds, isGroup, readMap) : undefined,
  }
}

export function useChats(user, activeId) {
  const [chats, setChats] = useState([])
  const [contacts, setContacts] = useState([])
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const activeRef = useRef(activeId)
  const chatsRef = useRef(chats)

  useEffect(() => {
    activeRef.current = activeId
  }, [activeId])

  useEffect(() => {
    chatsRef.current = chats
  }, [chats])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const displayName = user.user_metadata?.full_name || user.email.split('@')[0]

    await supabase
      .from('profiles')
      .upsert({ id: user.id, name: displayName }, { onConflict: 'id', ignoreDuplicates: true })

    const fetchProfiles = async () => {
      const attempt = await supabase.from('profiles').select(PROFILE_COLUMNS)
      if (!attempt.error) return attempt.data ?? []
      // bio column not migrated yet (schema7.sql not applied) — fall back
      const fallback = await supabase.from('profiles').select(PROFILE_COLUMNS_BASE)
      return fallback.data ?? []
    }

    const [allProfiles, membershipResult] = await Promise.all([
      fetchProfiles(),
      supabase
        .from('conversation_members')
        .select('conversation_id, conversations(id, is_group, title, created_by)')
        .eq('user_id', user.id),
    ])

    setMe(allProfiles.find((profile) => profile.id === user.id) ?? null)
    setContacts(
      allProfiles
        .filter((profile) => profile.id !== user.id)
        .map((profile) => ({
          id: profile.id,
          name: profile.name,
          avatarColor: profile.avatar_color || colorFor(profile.id),
          avatarUrl: profile.avatar_url || null,
          bio: profile.bio || '',
        }))
    )

    const conversations = (membershipResult.data ?? [])
      .map((row) => row.conversations)
      .filter(Boolean)
    const ids = conversations.map((conversation) => conversation.id)

    let memberRows = []
    let messageRows = []
    let readRows = []

    if (ids.length) {
      const baseSelect = 'id, conversation_id, sender_id, content, image_url, created_at'
      const fullSelect = `${baseSelect}, reply_to, reactions, forwarded, edited_at, deleted_for_all, file_url, file_name, file_type, file_size`

      const fetchMessages = async () => {
        const attempt = await supabase
          .from('messages')
          .select(fullSelect)
          .in('conversation_id', ids)
          .order('created_at', { ascending: true })
          .limit(1000)

        if (attempt.error) {
          // columns not migrated yet (schema6.sql not applied) — fall back to base columns
          const fallback = await supabase
            .from('messages')
            .select(baseSelect)
            .in('conversation_id', ids)
            .order('created_at', { ascending: true })
            .limit(1000)
          return fallback.data ?? []
        }
        return attempt.data ?? []
      }

      const fetchMembers = async () => {
        const attempt = await supabase
          .from('conversation_members')
          .select(`conversation_id, user_id, profiles(${PROFILE_COLUMNS})`)
          .in('conversation_id', ids)
        if (!attempt.error) return attempt.data ?? []
        const fallback = await supabase
          .from('conversation_members')
          .select(`conversation_id, user_id, profiles(${PROFILE_COLUMNS_BASE})`)
          .in('conversation_id', ids)
        return fallback.data ?? []
      }

      const [membersData, messagesData, readsResult] = await Promise.all([
        fetchMembers(),
        fetchMessages(),
        supabase
          .from('conversation_reads')
          .select('conversation_id, user_id, last_read_at')
          .in('conversation_id', ids),
      ])
      memberRows = membersData
      messageRows = messagesData
      readRows = readsResult.data ?? []
    }

    const hidden = new Set(readHidden(user.id))

    const built = conversations.map((conversation) => {
      const memberIds = memberRows
        .filter((row) => row.conversation_id === conversation.id)
        .map((row) => row.user_id)
      const members = memberRows
        .filter((row) => row.conversation_id === conversation.id)
        .map((row) => ({
          id: row.user_id,
          name: row.profiles?.name || 'Member',
          avatarColor: row.profiles?.avatar_color || colorFor(row.user_id),
          avatarUrl: row.profiles?.avatar_url || null,
          bio: row.profiles?.bio || '',
        }))
      const other = members.find((member) => member.id !== user.id)
      const isGroup = Boolean(conversation.is_group)
      const name =
        conversation.title ||
        members.filter((member) => member.id !== user.id).map((member) => member.name).join(', ') ||
        'Saved messages'
      const otherReadAt = otherReadAtFor(readRows, conversation.id, user.id)
      const readMap = readMapFor(readRows, conversation.id)
      const myReadAt = myReadAtFor(readRows, conversation.id, user.id)
      const readContext = { memberIds, isGroup, readMap }
      const messages = messageRows
        .filter((row) => row.conversation_id === conversation.id && !hidden.has(row.id))
        .map((row) => mapMessage(row, user.id, readContext))
      const unread = messages.filter(
        (message) =>
          message.from === 'them' &&
          (!myReadAt || new Date(message.createdAt) > new Date(myReadAt))
      ).length

      return {
        id: conversation.id,
        name,
        avatarColor: isGroup ? colorFor(conversation.id) : other?.avatarColor || colorFor(conversation.id),
        avatarUrl: isGroup ? null : other?.avatarUrl || null,
        bio: isGroup ? '' : other?.bio || '',
        isGroup,
        createdBy: conversation.created_by || null,
        members,
        memberIds,
        lastSeen: other?.last_seen ?? null,
        myReadAt,
        otherReadAt,
        readMap,
        online: false,
        typing: false,
        unread,
        lastTime: labelOf(messages[messages.length - 1]?.createdAt),
        messages,
      }
    })

    built.sort((a, b) => {
      const aTime = a.messages[a.messages.length - 1]?.createdAt ?? ''
      const bTime = b.messages[b.messages.length - 1]?.createdAt ?? ''
      return bTime.localeCompare(aTime)
    })

    setChats(built)
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!user) return undefined

    const channel = supabase
      .channel('chatwave-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new
          const isActive = row.conversation_id === activeRef.current
          let known = false

          if (row.sender_id !== user.id && (!isActive || document.hidden)) {
            const preview = row.deleted_for_all
              ? 'Message deleted'
              : row.content ||
                (row.image_url ? 'Photo' : row.file_url ? row.file_name || 'Attachment' : 'New message')
            window.dispatchEvent(
              new CustomEvent('chatwave:incoming', {
                detail: { conversationId: row.conversation_id, body: preview },
              })
            )
          }

          if (row.sender_id !== user.id && isActive && readReceiptsEnabled()) {
            supabase
              .from('conversation_reads')
              .upsert(
                {
                  conversation_id: row.conversation_id,
                  user_id: user.id,
                  last_read_at: new Date().toISOString(),
                },
                { onConflict: 'conversation_id,user_id' }
              )
              .then(() => {})
          }

          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== row.conversation_id) return chat
              known = true
              if (chat.messages.some((message) => message.id === row.id)) return chat
              return {
                ...chat,
                lastTime: timeOf(row.created_at),
                myReadAt: isActive ? row.created_at : chat.myReadAt,
                unread:
                  row.sender_id !== user.id && !isActive ? chat.unread + 1 : chat.unread,
                messages: [...chat.messages, mapMessage(row, user.id, readContextOf(chat))],
              }
            })
          )

          if (!known) load()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new
          if (!row?.id) return

          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== row.conversation_id) return chat
              return {
                ...chat,
                messages: chat.messages.map((message) =>
                  message.id === row.id
                    ? mapMessage(row, user.id, readContextOf(chat))
                    : message
                ),
              }
            })
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const old = payload.old
          if (!old?.id) return

          setChats((prev) =>
            prev.map((chat) => {
              if (old.conversation_id && chat.id !== old.conversation_id) return chat
              return {
                ...chat,
                messages: chat.messages.filter((message) => message.id !== old.id),
              }
            })
          )
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_reads' },
        (payload) => {
          const row = payload.new
          if (!row || row.user_id === user.id) return

          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== row.conversation_id) return chat
              const readMap = { ...(chat.readMap || {}), [row.user_id]: row.last_read_at }
              const otherReadAt = Object.entries(readMap)
                .filter(([id]) => id !== user.id)
                .reduce(
                  (max, [, value]) => (!max || value > max ? value : max),
                  null
                )
              return {
                ...chat,
                readMap,
                otherReadAt,
                messages: chat.messages.map((message) =>
                  message.from === 'me'
                    ? {
                        ...message,
                        status: statusFor(
                          message.createdAt,
                          user.id,
                          chat.memberIds || [],
                          chat.isGroup,
                          readMap
                        ),
                      }
                    : message
                ),
              }
            })
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const row = payload.new
          if (!row?.id) return

          if (row.id === user.id) {
            setMe(row)
            return
          }

          setContacts((prev) =>
            prev.map((contact) =>
              contact.id === row.id
                ? {
                    ...contact,
                    name: row.name,
                    avatarColor: row.avatar_color || contact.avatarColor,
                    avatarUrl: row.avatar_url || null,
                    bio: row.bio || '',
                  }
                : contact
            )
          )
          setChats((prev) =>
            prev.map((chat) => {
              if (!chat.memberIds.includes(row.id)) return chat
              if (chat.isGroup) {
                return {
                  ...chat,
                  members: (chat.members || []).map((member) =>
                    member.id === row.id
                      ? {
                          ...member,
                          name: row.name,
                          avatarColor: row.avatar_color || member.avatarColor,
                          avatarUrl: row.avatar_url || null,
                          bio: row.bio || '',
                        }
                      : member
                  ),
                }
              }
              return {
                ...chat,
                name: row.name,
                avatarColor: row.avatar_color || chat.avatarColor,
                avatarUrl: row.avatar_url || null,
                bio: row.bio || '',
                lastSeen: row.last_seen,
              }
            })
          )
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_members' },
        (payload) => {
          const conversationId = payload.new?.conversation_id || payload.old?.conversation_id
          if (!conversationId) return
          if (!chatsRef.current.some((chat) => chat.id === conversationId)) return
          load()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, load])

  const sendMessage = useCallback(
    async (conversationId, text, imageUrl = null, options = {}) => {
      if (!user || !conversationId) return { error: new Error('Not ready') }

      const row = {
        conversation_id: conversationId,
        sender_id: user.id,
        content: text || '',
        image_url: imageUrl || null,
      }
      if (options.replyTo) row.reply_to = options.replyTo
      if (options.forwarded) row.forwarded = true
      if (options.fileUrl) {
        row.file_url = options.fileUrl
        row.file_name = options.fileName || 'Attachment'
        row.file_type = options.fileType || null
        row.file_size = options.fileSize || null
      }

      const fullColumns =
        'id, conversation_id, sender_id, content, image_url, reply_to, reactions, forwarded, created_at, edited_at, deleted_for_all, file_url, file_name, file_type, file_size'
      const midColumns =
        'id, conversation_id, sender_id, content, image_url, reply_to, reactions, forwarded, created_at'
      const baseColumns = 'id, conversation_id, sender_id, content, image_url, created_at'

      let data = null
      let error = null

      const attempt = await supabase.from('messages').insert(row).select(fullColumns).single()
      data = attempt.data
      error = attempt.error

      if (error && !options.fileUrl) {
        // schema8 not applied — retry without the new columns
        const retry = await supabase.from('messages').insert(row).select(midColumns).single()
        data = retry.data
        error = retry.error
      }

      if (error && !options.fileUrl) {
        // schema6 not applied — retry with base columns only
        const legacy = {
          conversation_id: conversationId,
          sender_id: user.id,
          content: text || '',
          image_url: imageUrl || null,
        }
        const retry = await supabase
          .from('messages')
          .insert(legacy)
          .select(baseColumns)
          .single()
        data = retry.data
        error = retry.error
      }

      if (error) return { error }

      if (data) {
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id !== conversationId) return chat
            if (chat.messages.some((message) => message.id === data.id)) return chat
            return {
              ...chat,
              lastTime: timeOf(data.created_at),
              messages: [...chat.messages, mapMessage(data, user.id, readContextOf(chat))],
            }
          })
        )
      }

      return { data }
    },
    [user]
  )

  const reactToMessage = useCallback(
    async (conversationId, messageId, emoji) => {
      if (!user || !conversationId || !messageId) return false

      const target = chats
        .find((chat) => chat.id === conversationId)
        ?.messages.find((item) => item.id === messageId)

      const raw = { ...(target?.reactionsRaw || {}) }
      if (raw[user.id] === emoji) delete raw[user.id]
      else raw[user.id] = emoji

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== conversationId) return chat
          return {
            ...chat,
            messages: chat.messages.map((message) =>
              message.id === messageId
                ? {
                    ...message,
                    reactionsRaw: raw,
                    reaction: raw[user.id] ?? null,
                    reactionList: groupReactions(raw),
                  }
                : message
            ),
          }
        })
      )

      const { error } = await supabase
        .from('messages')
        .update({ reactions: raw })
        .eq('id', messageId)
      return !error
    },
    [chats, user]
  )

  const editMessage = useCallback(
    async (conversationId, messageId, text) => {
      if (!user || !conversationId || !messageId) return false
      const next = text.trim()
      if (!next) return false

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== conversationId) return chat
          return {
            ...chat,
            messages: chat.messages.map((message) =>
              message.id === messageId ? { ...message, text: next, edited: true } : message
            ),
          }
        })
      )

      const { error } = await supabase
        .from('messages')
        .update({ content: next, edited_at: new Date().toISOString() })
        .eq('id', messageId)
      return !error
    },
    [user]
  )

  const deleteMessage = useCallback(
    async (conversationId, messageId, forEveryone) => {
      if (!user || !conversationId || !messageId) return false

      if (!forEveryone) {
        writeHidden(user.id, messageId)
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === conversationId
              ? {
                  ...chat,
                  messages: chat.messages.filter((message) => message.id !== messageId),
                }
              : chat
          )
        )
        return true
      }

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== conversationId) return chat
          return {
            ...chat,
            messages: chat.messages.map((message) =>
              message.id === messageId
                ? {
                    ...message,
                    text: '',
                    imageUrl: null,
                    fileUrl: null,
                    fileName: null,
                    fileType: null,
                    fileSize: null,
                    deleted: true,
                    edited: false,
                    reaction: null,
                    reactionList: [],
                    reactionsRaw: {},
                  }
                : message
            ),
          }
        })
      )

      const { error } = await supabase
        .from('messages')
        .update({
          deleted_for_all: true,
          content: '',
          image_url: null,
          file_url: null,
          file_name: null,
          file_type: null,
          file_size: null,
          reactions: {},
        })
        .eq('id', messageId)
      return !error
    },
    [user]
  )

  const markRead = useCallback(
    async (conversationId) => {
      if (!user || !conversationId) return
      const now = new Date().toISOString()

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === conversationId ? { ...chat, unread: 0, myReadAt: now } : chat
        )
      )

      if (readReceiptsEnabled()) {
        await supabase.from('conversation_reads').upsert(
          { conversation_id: conversationId, user_id: user.id, last_read_at: now },
          { onConflict: 'conversation_id,user_id' }
        )
      }
    },
    [user]
  )

  const startChat = useCallback(
    async (otherId) => {
      if (!user) return null

      const { data, error } = await supabase.rpc('start_direct_chat', { other_id: otherId })
      if (error) return null

      await load()
      return data
    },
    [load, user]
  )

  const startGroupChat = useCallback(
    async (name, memberIds = []) => {
      if (!user) return null
      const title = String(name || '').trim()
      const ids = [...new Set(memberIds.filter((id) => id && id !== user.id))]
      if (!title || !ids.length) return null

      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({ is_group: true, title, created_by: user.id })
        .select('id')
        .single()
      if (conversationError || !conversation?.id) return null

      const rows = [
        { conversation_id: conversation.id, user_id: user.id },
        ...ids.map((id) => ({ conversation_id: conversation.id, user_id: id })),
      ]
      const { error: memberError } = await supabase.from('conversation_members').insert(rows)
      if (memberError) {
        await supabase
          .from('conversations')
          .delete()
          .eq('id', conversation.id)
          .eq('created_by', user.id)
        return null
      }

      await load()
      return conversation.id
    },
    [load, user]
  )

  const addGroupMember = useCallback(
    async (conversationId, memberId) => {
      if (!user || !conversationId || !memberId || memberId === user.id) return false
      const { error } = await supabase
        .from('conversation_members')
        .insert({ conversation_id: conversationId, user_id: memberId })
      if (error) return false
      await load()
      return true
    },
    [load, user]
  )

  const removeGroupMember = useCallback(
    async (conversationId, memberId) => {
      if (!user || !conversationId || !memberId) return false
      const { error } = await supabase
        .from('conversation_members')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', memberId)
      if (error) return false
      await load()
      return true
    },
    [load, user]
  )

  return {
    chats,
    contacts,
    me,
    loading,
    sendMessage,
    startChat,
    startGroupChat,
    addGroupMember,
    removeGroupMember,
    markRead,
    reactToMessage,
    editMessage,
    deleteMessage,
    reload: load,
  }
}


