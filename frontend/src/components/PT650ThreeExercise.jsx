import { useEffect, useRef, useState } from 'react'

const THREE_MODULE = 'https://esm.sh/three@0.170.0'
const GLTF_LOADER_MODULE = 'https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js'

let runtimePromise = null
function loadRuntime() {
  if (!runtimePromise) {
    runtimePromise = Promise.all([
      import(/* @vite-ignore */ THREE_MODULE),
      import(/* @vite-ignore */ GLTF_LOADER_MODULE),
    ]).then(([THREE, loader]) => ({ THREE, GLTFLoader: loader.GLTFLoader }))
  }
  return runtimePromise
}

function VideoFallback({ model, playing }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (playing) video.play().catch(() => {})
    else video.pause()
  }, [playing])

  if (!model?.previewVideo) return null

  return (
    <video
      ref={videoRef}
      className="pt650-three-video"
      src={model.previewVideo}
      poster={model.poster || undefined}
      autoPlay={playing}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      data-pt650-3d-video={model.id}
    />
  )
}

export default function PT650ThreeExercise({ model, playing = true, fallback = null }) {
  const hostRef = useRef(null)
  const mixerRef = useRef(null)
  const frameRef = useRef(0)
  const [state, setState] = useState('loading')

  useEffect(() => {
    const host = hostRef.current
    if (!host || !model) return

    // happy-dom/jsdom and old WebViews do not expose WebGL. Keep tests deterministic and
    // let the caller's SVG fallback handle unsupported devices.
    if (typeof window === 'undefined' || !window.WebGLRenderingContext) {
      setState('unsupported')
      return
    }

    let disposed = false
    let renderer = null
    let resizeObserver = null
    let scene = null
    let camera = null
    let clock = null
    let mixer = null
    let root = null

    const renderOnce = () => {
      if (!disposed && renderer && scene && camera) renderer.render(scene, camera)
    }

    const animate = () => {
      if (disposed) return
      frameRef.current = requestAnimationFrame(animate)
      if (mixer && clock) mixer.update(clock.getDelta())
      else if (clock) clock.getDelta()
      renderOnce()
    }

    loadRuntime().then(({ THREE, GLTFLoader }) => {
      if (disposed) return

      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(32, 1, 0.01, 200)
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
      renderer.setClearColor(0x000000, 0)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.shadowMap.enabled = false
      host.appendChild(renderer.domElement)
      renderer.domElement.className = 'pt650-three-canvas'
      renderer.domElement.setAttribute('aria-hidden', 'true')

      const hemi = new THREE.HemisphereLight(0xf2f5f7, 0x0b0d10, 2.2)
      const key = new THREE.DirectionalLight(0xffffff, 2.6)
      key.position.set(3, 5, 4)
      const fill = new THREE.DirectionalLight(0x7fa5ff, 0.9)
      fill.position.set(-4, 2, -3)
      scene.add(hemi, key, fill)

      const loader = new GLTFLoader()
      loader.setCrossOrigin('anonymous')
      loader.load(
        model.asset,
        gltf => {
          if (disposed) return
          root = gltf.scene
          scene.add(root)

          // Keep the imported avatar neutral and clearly synthetic. The animation remains
          // untouched; only material presentation is normalized for PT650.
          root.traverse(obj => {
            if (!obj.isMesh) return
            obj.frustumCulled = false
            if (obj.material) {
              const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
              for (const mat of mats) {
                if ('roughness' in mat) mat.roughness = 0.72
                if ('metalness' in mat) mat.metalness = 0.02
              }
            }
          })

          const box = new THREE.Box3().setFromObject(root)
          const size = box.getSize(new THREE.Vector3())
          const center = box.getCenter(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z) || 1
          const distance = maxDim * 1.55

          camera.position.set(center.x + distance * 0.85, center.y + maxDim * 0.25, center.z + distance)
          camera.lookAt(center.x, center.y + size.y * 0.04, center.z)
          camera.near = Math.max(0.01, distance / 100)
          camera.far = distance * 12
          camera.updateProjectionMatrix()

          const clip = gltf.animations.find(a => a.name === model.clip) || gltf.animations[0]
          if (!clip) {
            setState('error')
            renderOnce()
            return
          }

          mixer = new THREE.AnimationMixer(root)
          mixerRef.current = mixer
          const action = mixer.clipAction(clip)
          action.reset()
          action.setLoop(THREE.LoopRepeat, Infinity)
          action.clampWhenFinished = false
          action.play()
          mixer.timeScale = playing ? 1 : 0
          clock = new THREE.Clock()
          setState('ready')
          renderOnce()
        },
        undefined,
        () => {
          if (!disposed) setState('error')
        },
      )

      const resize = () => {
        if (!host || !renderer || !camera) return
        const rect = host.getBoundingClientRect()
        const width = Math.max(1, Math.round(rect.width))
        const height = Math.max(1, Math.round(rect.height))
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderOnce()
      }
      resize()
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(host)
      } else {
        window.addEventListener('resize', resize)
      }

      animate()
    }).catch(() => {
      if (!disposed) setState('error')
    })

    return () => {
      disposed = true
      cancelAnimationFrame(frameRef.current)
      resizeObserver?.disconnect()
      if (mixer) mixer.stopAllAction()
      if (scene && root) scene.remove(root)
      renderer?.dispose()
      if (renderer?.domElement?.parentNode === host) host.removeChild(renderer.domElement)
      mixerRef.current = null
    }
  }, [model])

  useEffect(() => {
    if (mixerRef.current) mixerRef.current.timeScale = playing ? 1 : 0
  }, [playing])

  if (!model) return fallback
  if (state === 'unsupported' || state === 'error') {
    return model.previewVideo ? <VideoFallback model={model} playing={playing} /> : fallback
  }

  return (
    <div
      ref={hostRef}
      className={'pt650-three-stage ' + state}
      data-pt650-3d={model.id}
      data-pt650-3d-license={model.license}
    >
      {state === 'loading' && <span className="pt650-three-loader" aria-hidden="true" />}
    </div>
  )
}
