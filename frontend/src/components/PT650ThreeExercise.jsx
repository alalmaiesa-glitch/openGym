import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'

const SPEEDS = [0.5, 1, 1.5]

let runtimePromise = null
function loadRuntime() {
  if (!runtimePromise) {
    runtimePromise = Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/controls/OrbitControls.js'),
    ]).then(([THREE, loader, controls]) => ({
      THREE,
      GLTFLoader: loader.GLTFLoader,
      OrbitControls: controls.OrbitControls,
    }))
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

export default function PT650ThreeExercise({
  model,
  playing = true,
  onTogglePlaying,
  fallback = null,
}) {
  const hostRef = useRef(null)
  const mixerRef = useRef(null)
  const controlsRef = useRef(null)
  const cameraRef = useRef(null)
  const cameraHomeRef = useRef(null)
  const frameRef = useRef(0)
  const [state, setState] = useState('loading')
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    setSpeed(1)
  }, [model?.id])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !model) return
    setState('loading')

    // happy-dom/jsdom and old WebViews do not expose WebGL. Keep tests deterministic and
    // use the rendered 3D video fallback on unsupported devices.
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
    let controls = null
    let windowResize = null

    const renderOnce = () => {
      if (!disposed && renderer && scene && camera) renderer.render(scene, camera)
    }

    const animate = () => {
      if (disposed) return
      frameRef.current = requestAnimationFrame(animate)
      if (mixer && clock) mixer.update(clock.getDelta())
      else if (clock) clock.getDelta()
      controls?.update()
      renderOnce()
    }

    loadRuntime().then(({ THREE, GLTFLoader, OrbitControls }) => {
      if (disposed) return

      const viewer = model.viewer || {}
      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(viewer.fov || 32, 1, 0.01, 200)
      cameraRef.current = camera
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
      renderer.setClearColor(0x000000, 0)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.04
      renderer.shadowMap.enabled = false
      host.appendChild(renderer.domElement)
      renderer.domElement.className = 'pt650-three-canvas'
      renderer.domElement.setAttribute('aria-hidden', 'true')

      const hemi = new THREE.HemisphereLight(0xf4f6f8, 0x090b0d, 1.65)
      const key = new THREE.DirectionalLight(0xffffff, 2.15)
      key.position.set(3.5, 5.5, 4.5)
      const fill = new THREE.DirectionalLight(0xb9cfff, 0.62)
      fill.position.set(-4.5, 2.5, -3.5)
      const rim = new THREE.DirectionalLight(0xffffff, 0.48)
      rim.position.set(-2.5, 4, 5)
      scene.add(hemi, key, fill, rim)

      const loader = new GLTFLoader()
      loader.setCrossOrigin('anonymous')
      loader.load(
        model.asset,
        gltf => {
          if (disposed) return
          root = gltf.scene
          scene.add(root)

          // OpenGym3D bakes target-muscle activation into COLOR_0 / MuscleHeat. PT650 keeps
          // that authored signal intact and only normalizes neutral material response.
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
          const distance = maxDim * (viewer.distance || 1.55)
          const dir = new THREE.Vector3(...(viewer.direction || [0.85, 0.25, 1])).normalize()
          const target = new THREE.Vector3(
            center.x,
            center.y + size.y * (viewer.targetY ?? 0.04),
            center.z,
          )

          camera.position.copy(target).addScaledVector(dir, distance)
          camera.lookAt(target)
          camera.near = Math.max(0.01, distance / 100)
          camera.far = distance * 12
          camera.updateProjectionMatrix()

          controls = new OrbitControls(camera, renderer.domElement)
          controlsRef.current = controls
          controls.target.copy(target)
          controls.enablePan = false
          controls.enableDamping = true
          controls.dampingFactor = 0.075
          controls.rotateSpeed = 0.52
          controls.zoomSpeed = 0.62
          controls.minDistance = distance * (viewer.zoomMin || 0.9)
          controls.maxDistance = distance * (viewer.zoomMax || 1.22)
          controls.update()

          const azimuth = controls.getAzimuthalAngle()
          const polar = controls.getPolarAngle()
          const orbitAzimuth = viewer.orbitAzimuth ?? 0.34
          const orbitPolar = viewer.orbitPolar ?? 0.28
          controls.minAzimuthAngle = azimuth - orbitAzimuth
          controls.maxAzimuthAngle = azimuth + orbitAzimuth
          controls.minPolarAngle = Math.max(0.35, polar - orbitPolar)
          controls.maxPolarAngle = Math.min(Math.PI - 0.35, polar + orbitPolar)

          cameraHomeRef.current = {
            position: camera.position.clone(),
            target: target.clone(),
          }

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
          mixer.timeScale = playing ? speed : 0
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
        windowResize = resize
        window.addEventListener('resize', windowResize)
      }

      animate()
    }).catch(() => {
      if (!disposed) setState('error')
    })

    return () => {
      disposed = true
      cancelAnimationFrame(frameRef.current)
      resizeObserver?.disconnect()
      if (windowResize && typeof window !== 'undefined') window.removeEventListener('resize', windowResize)
      if (mixer) mixer.stopAllAction()
      if (scene && root) scene.remove(root)
      controls?.dispose()
      renderer?.dispose()
      if (renderer?.domElement?.parentNode === host) host.removeChild(renderer.domElement)
      mixerRef.current = null
      controlsRef.current = null
      cameraRef.current = null
      cameraHomeRef.current = null
    }
  }, [model])

  useEffect(() => {
    if (mixerRef.current) mixerRef.current.timeScale = playing ? speed : 0
  }, [playing, speed])

  const restartMotion = e => {
    e.stopPropagation()
    mixerRef.current?.setTime(0)
  }

  const resetCamera = e => {
    e.stopPropagation()
    const camera = cameraRef.current
    const controls = controlsRef.current
    const home = cameraHomeRef.current
    if (!camera || !controls || !home) return
    camera.position.copy(home.position)
    controls.target.copy(home.target)
    controls.update()
  }

  const togglePlaying = e => {
    e.stopPropagation()
    onTogglePlaying?.()
  }

  const chooseSpeed = (e, value) => {
    e.stopPropagation()
    setSpeed(value)
  }

  const cycleSpeed = e => {
    e.stopPropagation()
    const at = SPEEDS.indexOf(speed)
    setSpeed(SPEEDS[(at + 1) % SPEEDS.length])
  }

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
      data-pt650-muscle-highlight={model.muscleHighlight || 'none'}
      data-pt650-camera={model.camera || 'auto'}
      data-pt650-speed={speed}
    >
      {state === 'loading' && <span className="pt650-three-loader" aria-hidden="true" />}

      {state === 'ready' && (
        <div
          className="pt650-three-controls"
          onClick={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
        >
          <button
            className="pt650-three-control"
            type="button"
            data-pt650-control="play"
            aria-label={playing ? 'Pause animation' : 'Play animation'}
            onClick={togglePlaying}
          >
            <Icon name={playing ? 'pause' : 'play'} />
          </button>

          <button
            className="pt650-three-control"
            type="button"
            data-pt650-control="restart"
            aria-label="Restart animation"
            onClick={restartMotion}
          >
            <Icon name="reset" />
          </button>

          <div className="pt650-three-speed-options" role="group" aria-label="Playback speed">
            {SPEEDS.map(value => (
              <button
                key={value}
                className={'pt650-three-speed' + (speed === value ? ' on' : '')}
                type="button"
                aria-pressed={speed === value}
                onClick={e => chooseSpeed(e, value)}
              >
                {value}×
              </button>
            ))}
          </div>

          <button
            className="pt650-three-speed-cycle"
            type="button"
            data-pt650-control="speed"
            aria-label={'Playback speed ' + speed + ' times'}
            onClick={cycleSpeed}
          >
            {speed}×
          </button>

          <button
            className="pt650-three-control"
            type="button"
            data-pt650-control="camera-reset"
            aria-label="Reset camera"
            onClick={resetCamera}
          >
            <Icon name="target" />
          </button>
        </div>
      )}
    </div>
  )
}
