import { useEffect, useRef, useState } from 'react'
import PT650ExerciseAnimation from './PT650ExerciseAnimation.jsx'
import PT650ThreeExercise from './PT650ThreeExercise.jsx'

export const providerAssetId = candidate =>
  candidate?.asset?.id || candidate?.asset?.assetId || candidate?.provider || ''

function ProviderVideo({ candidate, playing, fallback }) {
  const videoRef = useRef(null)
  const [failed, setFailed] = useState(false)
  const asset = candidate.asset || {}
  const mp4 = asset.mp4 || asset.video?.mp4 || asset.asset || ''
  const webm = asset.webm || asset.video?.webm || ''
  const poster = asset.poster || asset.thumbnail || ''

  useEffect(() => {
    const video = videoRef.current
    if (!video || failed) return
    if (playing) video.play().catch(() => {})
    else video.pause()
  }, [playing, failed])

  if (failed || (!mp4 && !webm)) return fallback
  return (
    <video
      ref={videoRef}
      className="pt650-provider-video"
      muted
      loop
      playsInline
      poster={poster || undefined}
      onError={() => setFailed(true)}
    >
      {webm && <source src={webm} type="video/webm" />}
      {mp4 && <source src={mp4} type="video/mp4" />}
    </video>
  )
}

function ProviderFrames({ candidate, playing, fallback }) {
  const asset = candidate.asset || {}
  const frames = Array.isArray(asset.frames) ? asset.frames.filter(Boolean) : []
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!playing || frames.length < 2 || failed) return undefined
    const delay = Math.max(250, Number(asset.frameMs || 700))
    const timer = window.setInterval(() => setIndex(i => (i + 1) % frames.length), delay)
    return () => window.clearInterval(timer)
  }, [playing, frames.length, asset.frameMs, failed])

  if (failed || frames.length === 0) return fallback
  return (
    <img
      className="pt650-provider-frames"
      src={frames[index % frames.length]}
      alt=""
      aria-hidden="true"
      onError={() => setFailed(true)}
    />
  )
}

function Renderer({ candidates, index, playing, onTogglePlaying }) {
  const candidate = candidates[index]
  if (!candidate) return null
  const fallback = <Renderer candidates={candidates} index={index + 1} playing={playing} onTogglePlaying={onTogglePlaying} />

  if (candidate.renderer === 'three') {
    return (
      <PT650ThreeExercise
        model={candidate.asset}
        playing={playing}
        onTogglePlaying={onTogglePlaying}
        fallback={fallback}
      />
    )
  }

  if (candidate.renderer === 'svg') {
    return <PT650ExerciseAnimation exerciseId={candidate.exerciseId} playing={playing} />
  }

  if (candidate.renderer === 'video') {
    return <ProviderVideo candidate={candidate} playing={playing} fallback={fallback} />
  }

  if (candidate.renderer === 'frame-sequence') {
    return <ProviderFrames candidate={candidate} playing={playing} fallback={fallback} />
  }

  return fallback
}

export default function PT650AnimationProviderMedia({ candidates, playing = true, onTogglePlaying }) {
  const available = (candidates || []).filter(candidate => candidate?.available)
  if (!available.length) return null
  return <Renderer candidates={available} index={0} playing={playing} onTogglePlaying={onTogglePlaying} />
}
