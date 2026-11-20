import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { startRingtone, stopRingtone } from '@/lib/sound'

const ICE_SERVERS = [
  {
    urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
  },
]

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

export function useCall(user) {
  const [incoming, setIncoming] = useState(null)
  const [call, setCall] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [notice, setNotice] = useState('')

  const callRef = useRef(null)
  const incomingRef = useRef(null)
  const pcRef = useRef(null)
  const localRef = useRef(null)
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
    },
    [sendSignal]
  )

  const preparePeer = useCallback(async () => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
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
        setCall((prev) =>
          prev && prev.phase !== 'connected'
            ? { ...prev, phase: 'connected', startedAt: prev.startedAt || Date.now() }
            : prev
        )
      }
    }

    if (localRef.current) {
      for (const track of localRef.current.getTracks()) pc.addTrack(track, localRef.current)
    }
    return pc
  }, [sendSignal])

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
          return
        }
        const offer = {
          callId: payload.callId,
          conversationId: payload.conversationId,
          peerId: payload.from,
          peerName: payload.fromName || 'Someone',
          withVideo: Boolean(payload.withVideo),
          sdp: payload.sdp,
        }
        incomingRef.current = offer
        startRingtone()
        setIncoming({
          callId: offer.callId,
          conversationId: offer.conversationId,
          peerId: offer.peerId,
          peerName: offer.peerName,
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
        setCall((prev) => (prev ? { ...prev, phase: 'connecting' } : prev))
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
    [user, sendSignal, applyPendingIce, cleanup, showNotice]
  )

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

  const getStream = useCallback(async (withVideo) => {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo })
    } catch {
      if (withVideo) {
        try {
          return await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        } catch {
          return null
        }
      }
      return null
    }
  }, [])

  const startCall = useCallback(
    async ({ conversationId, peerId, peerName, withVideo = false }) => {
      if (!user || callRef.current || incomingRef.current) return
      const stream = await getStream(withVideo)
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
        withVideo: info.withVideo,
      })
      if (!sent) {
        showNotice('Could not reach the other user')
        cleanup(false)
        return
      }

      timerRef.current = window.setTimeout(() => {
        if (callRef.current?.phase === 'calling') {
          showNotice('No answer')
          cleanup(false)
        }
      }, 45000)
    },
    [user, getStream, preparePeer, sendSignal, showNotice, cleanup]
  )

  const acceptCall = useCallback(async () => {
    const offer = incomingRef.current
    if (!offer) return
    stopRingtone()
    const stream = await getStream(offer.withVideo)
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
    })
  }, [getStream, preparePeer, applyPendingIce, sendSignal, showNotice, cleanup])

  const declineCall = useCallback(async () => {
    const offer = incomingRef.current
    if (!offer) return
    stopRingtone()
    await sendSignal(offer.peerId, { type: 'decline', callId: offer.callId })
    incomingRef.current = null
    setIncoming(null)
  }, [sendSignal])

  const endCall = useCallback(() => cleanup(true), [cleanup])

  const toggleMute = useCallback(() => {
    const stream = localRef.current
    if (!stream) return
    const nextMuted = !callRef.current?.muted
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted
    })
    setCall((prev) => (prev ? { ...prev, muted: nextMuted } : prev))
  }, [])

  return {
    incoming,
    call,
    localStream,
    remoteStream,
    notice,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
  }
}
