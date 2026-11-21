import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { startRingtone, stopRingtone } from '@/lib/sound'

const ICE_SERVERS = [
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
    ],
  },
]

const PEER_CONFIG = {
  iceServers: ICE_SERVERS,
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
}

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: { ideal: 1 },
  sampleRate: { ideal: 48000 },
}

if (import.meta.env.VITE_TURN_URL) {
  ICE_SERVERS.push({
    urls: import.meta.env.VITE_TURN_URL,
    username: import.meta.env.VITE_TURN_USERNAME || '',
    credential: import.meta.env.VITE_TURN_CREDENTIAL || '',
  })
}

const makeCallId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const displayNameOf = (user) =>
  user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Someone'

const descriptionOf = (description) => ({ type: description.type, sdp: description.sdp })

const historyKey = (userId) => `cw-calls:${userId}`

const readHistory = (userId) => {
  if (typeof window === 'undefined' || !userId) return []
  try {
    const value = JSON.parse(window.localStorage.getItem(historyKey(userId)) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const writeHistory = (userId, entries) => {
  if (typeof window === 'undefined' || !userId) return
  window.localStorage.setItem(historyKey(userId), JSON.stringify(entries.slice(0, 100)))
}

export function useCall(user) {
  const [incoming, setIncoming] = useState(null)
  const [call, setCall] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [facingMode, setFacingMode] = useState('user')
  const [remoteFacingMode, setRemoteFacingMode] = useState('environment')
  const [notice, setNotice] = useState('')
  const [history, setHistory] = useState(() => readHistory(user?.id))

  const historyRef = useRef(history)
  const historyIdRef = useRef(null)
  const patchEntryRef = useRef(null)
  const pushEntryRef = useRef(null)
  const callRef = useRef(null)
  const incomingRef = useRef(null)
  const pcRef = useRef(null)
  const localRef = useRef(null)
  const facingModeRef = useRef('user')
  const switchingRef = useRef(false)
  const peerChannelsRef = useRef(new Map())
  const pendingIceRef = useRef([])
  const timerRef = useRef(null)
  const noticeTimerRef = useRef(null)
  const signalHandlerRef = useRef(null)

  const showNotice = useCallback((message) => {
    setNotice(message)
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), 3600)
  }, [])

  const sendSignal = useCallback(
    async (peerId, payload) => {
      if (!user || !peerId || !supabase) return
      let channel = peerChannelsRef.current.get(peerId)
      if (!channel) {
        channel = supabase.channel(`calls:${peerId}`, { config: { broadcast: { self: false } } })
        await new Promise((resolve) => {
          let done = false
          const finish = () => {
            if (!done) {
              done = true
              resolve()
            }
          }
          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') finish()
          })
          window.setTimeout(finish, 3000)
        })
        peerChannelsRef.current.set(peerId, channel)
      }
      const result = await channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: { ...payload, from: user.id, to: peerId },
      })
      return result === 'ok'
    },
    [user]
  )

  const cleanup = useCallback(
    (notifyPeer = false) => {
      stopRingtone()
      if (historyIdRef.current) {
        const entry = historyRef.current.find((item) => item.id === historyIdRef.current)
        if (entry) {
          patchEntryRef.current?.(entry.id, {
            duration: entry.connectedAt
              ? Math.floor((Date.now() - entry.connectedAt) / 1000)
              : 0,
            status: entry.connectedAt
              ? 'completed'
              : entry.direction === 'outgoing'
                ? 'no_answer'
                : 'missed',
          })
        }
        historyIdRef.current = null
      }
      const current = callRef.current
      if (notifyPeer && current) {
        sendSignal(current.peerId, { type: 'end', callId: current.callId })
      }
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = null
      if (pcRef.current) pcRef.current.close()
      pcRef.current = null
      if (localRef.current) localRef.current.getTracks().forEach((track) => track.stop())
      localRef.current = null
      pendingIceRef.current = []
      incomingRef.current = null
      callRef.current = null
      setIncoming(null)
      setCall(null)
      setLocalStream(null)
      setRemoteStream(null)
      facingModeRef.current = 'user'
      setFacingMode('user')
      setRemoteFacingMode('environment')
    },
    [sendSignal]
  )

  const patchCall = useCallback((patch) => {
    setCall((prev) => {
      if (!prev) return prev
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
      callRef.current = next
      return next
    })
  }, [])

  const preparePeer = useCallback(async () => {
    const pc = new RTCPeerConnection(PEER_CONFIG)
    pcRef.current = pc

    pc.onicecandidate = (event) => {
      const current = callRef.current
      if (event.candidate && current) {
        sendSignal(current.peerId, {
          type: 'ice',
          callId: current.callId,
          candidate: event.candidate.toJSON(),
        })
      }
    }

    pc.ontrack = (event) => {
      if (event.streams?.[0]) setRemoteStream(event.streams[0])
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        stopRingtone()
        patchEntryRef.current?.(historyIdRef.current, { status: 'completed', connectedAt: Date.now() })
        patchCall((prev) =>
          prev.phase === 'connected'
            ? prev
            : { ...prev, phase: 'connected', startedAt: prev.startedAt || Date.now() }
        )
      }
    }

    if (localRef.current) {
      for (const track of localRef.current.getTracks()) pc.addTrack(track, localRef.current)
    }
    return pc
  }, [sendSignal, patchCall])

  const applyPendingIce = useCallback(async (pc) => {
    for (const candidate of pendingIceRef.current) {
      try {
        await pc.addIceCandidate(candidate)
      } catch {}
    }
    pendingIceRef.current = []
  }, [])

  const handleSignal = useCallback(
    async (payload) => {
      if (!user || !payload || payload.to !== user.id) return
      const current = callRef.current
      const type = payload.type

      if (type === 'offer') {
        if (current || incomingRef.current) {
          await sendSignal(payload.from, { type: 'busy', callId: payload.callId })
          pushEntryRef.current?.({
            id: makeCallId(),
            peerId: payload.from,
            peerName: payload.fromName || 'Someone',
            avatarUrl: payload.fromAvatar || null,
            avatarColor: payload.fromColor || null,
            withVideo: Boolean(payload.withVideo),
            direction: 'incoming',
            status: 'missed',
            startedAt: Date.now(),
            duration: 0,
          })
          return
        }
        const offer = {
          callId: payload.callId,
          conversationId: payload.conversationId,
          peerId: payload.from,
          peerName: payload.fromName || 'Someone',
          peerAvatar: payload.fromAvatar || null,
          peerColor: payload.fromColor || null,
          withVideo: Boolean(payload.withVideo),
          facingMode: payload.facingMode === 'user' ? 'user' : 'environment',
          sdp: payload.sdp,
        }
        incomingRef.current = offer
        setRemoteFacingMode(offer.facingMode)
        startRingtone()
        setIncoming({
          callId: offer.callId,
          conversationId: offer.conversationId,
          peerId: offer.peerId,
          peerName: offer.peerName,
          avatarUrl: offer.peerAvatar,
          avatarColor: offer.peerColor,
          withVideo: offer.withVideo,
        })
        return
      }

      if (type === 'answer') {
        if (!current || current.callId !== payload.callId) return
        const pc = pcRef.current
        if (!pc) return
        try {
          await pc.setRemoteDescription(payload.sdp)
        } catch {
          showNotice('Call could not be connected')
          cleanup(false)
          return
        }
        stopRingtone()
        await applyPendingIce(pc)
        setRemoteFacingMode(payload.facingMode === 'user' ? 'user' : 'environment')
        patchCall({ phase: 'connecting' })
        return
      }

      if (type === 'camera') {
        if (!current || current.callId !== payload.callId) return
        setRemoteFacingMode(payload.facingMode === 'user' ? 'user' : 'environment')
        return
      }

      if (type === 'ice') {
        if (!payload.candidate) return
        if (incomingRef.current?.callId === payload.callId && !pcRef.current) {
          pendingIceRef.current.push(payload.candidate)
          return
        }
        const pc = pcRef.current
        if (!pc || (current && current.callId !== payload.callId)) return
        if (!pc.remoteDescription) {
          pendingIceRef.current.push(payload.candidate)
          return
        }
        try {
          await pc.addIceCandidate(payload.candidate)
        } catch {}
        return
      }

      if (type === 'end' || type === 'decline' || type === 'busy') {
        if (type === 'end' && current?.callId !== payload.callId && incomingRef.current?.callId !== payload.callId) return
        cleanup(false)
        if (type === 'decline') showNotice('Call declined')
        if (type === 'busy') showNotice('User is busy')
      }
    },
    [user, sendSignal, applyPendingIce, cleanup, showNotice, patchCall]
  )

  useEffect(() => {
    historyRef.current = history
  }, [history])

  useEffect(() => {
    setHistory(readHistory(user?.id))
  }, [user?.id])

  const pushEntry = useCallback(
    (entry) => {
      if (!user) return
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 100)
        writeHistory(user.id, next)
        return next
      })
    },
    [user]
  )

  const patchEntry = useCallback(
    (id, patch) => {
      if (!user || !id) return
      setHistory((prev) => {
        const next = prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
        writeHistory(user.id, next)
        return next
      })
    },
    [user]
  )

  const removeHistoryEntry = useCallback(
    (id) => {
      if (!user) return
      setHistory((prev) => {
        const next = prev.filter((entry) => entry.id !== id)
        writeHistory(user.id, next)
        return next
      })
    },
    [user]
  )

  const clearHistory = useCallback(() => {
    if (!user) return
    writeHistory(user.id, [])
    setHistory([])
  }, [user])

  useEffect(() => {
    patchEntryRef.current = patchEntry
  }, [patchEntry])

  useEffect(() => {
    pushEntryRef.current = pushEntry
  }, [pushEntry])

  useEffect(() => {
    signalHandlerRef.current = handleSignal
  }, [handleSignal])

  useEffect(() => {
    if (!user || !supabase) return undefined
    const channel = supabase
      .channel(`calls:${user.id}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'signal' }, ({ payload }) => signalHandlerRef.current?.(payload))
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  useEffect(
    () => () => {
      cleanup(false)
      peerChannelsRef.current.forEach((channel) => supabase?.removeChannel(channel))
      peerChannelsRef.current.clear()
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
    },
    [cleanup]
  )

  const getStream = useCallback(async (withVideo, mode = 'user') => {
    const constrained = withVideo ? { facingMode: { ideal: mode } } : false
    if (withVideo) {
      for (const video of [constrained, true]) {
        try {
          return await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video })
        } catch {}
      }
      try {
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      } catch {}
    }
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch {}
    return null
  }, [])

  const startCall = useCallback(
    async ({
      conversationId,
      peerId,
      peerName,
      peerAvatar = null,
      peerColor = null,
      selfAvatar = null,
      selfColor = null,
      withVideo = false,
    }) => {
      if (!user || callRef.current || incomingRef.current) return
      const stream = await getStream(withVideo, facingModeRef.current)
      if (!stream) {
        showNotice('Microphone or camera access denied')
        return
      }

      const callId = makeCallId()
      const info = {
        callId,
        conversationId,
        peerId,
        peerName,
        avatarUrl: peerAvatar,
        avatarColor: peerColor,
        withVideo: stream.getVideoTracks().length > 0,
        role: 'caller',
        phase: 'calling',
        startedAt: null,
        muted: false,
      }
      localRef.current = stream
      setLocalStream(stream)
      callRef.current = info
      setCall(info)
      startRingtone()

      const pc = await preparePeer()
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      const sent = await sendSignal(peerId, {
        type: 'offer',
        callId,
        conversationId,
        sdp: descriptionOf(pc.localDescription),
        fromName: displayNameOf(user),
        fromAvatar: selfAvatar,
        fromColor: selfColor,
        withVideo: info.withVideo,
        facingMode: facingModeRef.current,
      })
      if (!sent) {
        showNotice('Could not reach the other user')
        cleanup(false)
        return
      }

      const historyId = makeCallId()
      historyIdRef.current = historyId
      pushEntry({
        id: historyId,
        peerId,
        peerName,
        avatarUrl: peerAvatar,
        avatarColor: peerColor,
        withVideo: info.withVideo,
        direction: 'outgoing',
        status: 'calling',
        startedAt: Date.now(),
        duration: 0,
      })

      timerRef.current = window.setTimeout(() => {
        if (callRef.current?.phase === 'calling') {
          showNotice('No answer')
          cleanup(false)
        }
      }, 45000)
    },
    [user, getStream, preparePeer, sendSignal, showNotice, cleanup, pushEntry]
  )

  const acceptCall = useCallback(async () => {
    const offer = incomingRef.current
    if (!offer) return
    stopRingtone()
    const stream = await getStream(offer.withVideo, facingModeRef.current)
    if (!stream) {
      showNotice('Microphone or camera access denied')
      return
    }

    incomingRef.current = null
    setIncoming(null)
    const info = {
      callId: offer.callId,
      conversationId: offer.conversationId,
      peerId: offer.peerId,
      peerName: offer.peerName,
      avatarUrl: offer.peerAvatar,
      avatarColor: offer.peerColor,
      withVideo: stream.getVideoTracks().length > 0,
      role: 'callee',
      phase: 'connecting',
      startedAt: null,
      muted: false,
    }
    localRef.current = stream
    setLocalStream(stream)
    callRef.current = info
    setCall(info)

    const historyId = makeCallId()
    historyIdRef.current = historyId
    pushEntry({
      id: historyId,
      peerId: offer.peerId,
      peerName: offer.peerName,
      avatarUrl: offer.peerAvatar,
      avatarColor: offer.peerColor,
      withVideo: info.withVideo,
      direction: 'incoming',
      status: 'calling',
      startedAt: Date.now(),
      duration: 0,
    })

    const pc = await preparePeer()
    try {
      await pc.setRemoteDescription(offer.sdp)
    } catch {
      showNotice('Call could not be connected')
      cleanup(false)
      return
    }
    await applyPendingIce(pc)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    await sendSignal(info.peerId, {
      type: 'answer',
      callId: info.callId,
      sdp: descriptionOf(pc.localDescription),
      facingMode: facingModeRef.current,
    })
  }, [getStream, preparePeer, applyPendingIce, sendSignal, showNotice, cleanup, pushEntry])

  const declineCall = useCallback(async () => {
    const offer = incomingRef.current
    if (!offer) return
    stopRingtone()
    await sendSignal(offer.peerId, { type: 'decline', callId: offer.callId })
    pushEntry({
      id: makeCallId(),
      peerId: offer.peerId,
      peerName: offer.peerName,
      avatarUrl: offer.peerAvatar,
      avatarColor: offer.peerColor,
      withVideo: offer.withVideo,
      direction: 'incoming',
      status: 'declined',
      startedAt: Date.now(),
      duration: 0,
    })
    incomingRef.current = null
    setIncoming(null)
  }, [sendSignal, pushEntry])

  const switchCamera = useCallback(async () => {
    const stream = localRef.current
    const pc = pcRef.current
    if (switchingRef.current || !stream || !pc || pc.signalingState === 'closed') return
    const oldTrack = stream.getVideoTracks()[0]
    if (!oldTrack) return
    switchingRef.current = true

    const nextFacing = facingModeRef.current === 'user' ? 'environment' : 'user'
    const currentId = oldTrack.getSettings?.().deviceId
    let devices = []
    try {
      devices = (await navigator.mediaDevices.enumerateDevices()).filter(
        (device) => device.kind === 'videoinput'
      )
    } catch {}
    const alternate = devices.find((device) => device.deviceId && device.deviceId !== currentId)

    if (devices.length === 1 && !alternate) {
      switchingRef.current = false
      showNotice('Only one camera available')
      return
    }

    const request = async (video) => navigator.mediaDevices.getUserMedia({ audio: false, video })
    const attempts = []
    if (alternate?.deviceId) {
      attempts.push({ video: { deviceId: { exact: alternate.deviceId } }, exact: true, switched: true })
    }
    attempts.push({ video: { facingMode: { exact: nextFacing } }, exact: true, switched: true })
    attempts.push({ video: { facingMode: { ideal: nextFacing } }, facing: nextFacing, switched: true })
    attempts.push({ video: true, exact: true, switched: false })

    stream.removeTrack(oldTrack)
    oldTrack.stop()
    await new Promise((resolve) => window.setTimeout(resolve, 120))

    let nextStream = null
    let switched = false
    for (const attempt of attempts) {
      try {
        const candidate = await request(attempt.video)
        const track = candidate.getVideoTracks()[0]
        if (!track) {
          candidate.getTracks().forEach((item) => item.stop())
          continue
        }
        const settings = track.getSettings?.()
        const matches = attempt.exact || (settings?.facingMode && settings.facingMode === attempt.facing)
        if (matches) {
          nextStream = candidate
          switched = attempt.switched
          break
        }
        candidate.getTracks().forEach((item) => item.stop())
      } catch {}
    }

    if (!nextStream) {
      for (const video of [{ facingMode: { ideal: facingModeRef.current } }, true]) {
        try {
          const candidate = await request(video)
          if (candidate.getVideoTracks().length) {
            nextStream = candidate
            break
          }
        } catch {}
      }
    }

    const nextTrack = nextStream?.getVideoTracks()[0]
    if (!nextTrack) {
      switchingRef.current = false
      showNotice('Could not switch camera')
      return
    }

    const sender = pc.getSenders().find((item) => item.track?.kind === 'video')
    if (!sender) {
      nextTrack.stop()
      switchingRef.current = false
      return
    }
    try {
      await sender.replaceTrack(nextTrack)
    } catch {
      nextTrack.stop()
      switchingRef.current = false
      showNotice('Could not switch camera')
      return
    }

    stream.addTrack(nextTrack)
    const effectiveFacing = switched ? nextFacing : facingModeRef.current
    facingModeRef.current = effectiveFacing
    setFacingMode(effectiveFacing)
    const updated = new MediaStream(stream.getTracks())
    localRef.current = updated
    setLocalStream(updated)
    switchingRef.current = false

    const current = callRef.current
    if (current) {
      sendSignal(current.peerId, {
        type: 'camera',
        callId: current.callId,
        facingMode: effectiveFacing,
      })
    }
  }, [sendSignal, showNotice])

  const endCall = useCallback(() => cleanup(true), [cleanup])

  const toggleMute = useCallback(() => {
    const stream = localRef.current
    if (!stream) return
    const nextMuted = !callRef.current?.muted
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted
    })
    patchCall({ muted: nextMuted })
  }, [patchCall])

  return {
    incoming,
    call,
    localStream,
    remoteStream,
    facingMode,
    remoteFacingMode,
    notice,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    switchCamera,
    history,
    removeHistoryEntry,
    clearHistory,
  }
}
