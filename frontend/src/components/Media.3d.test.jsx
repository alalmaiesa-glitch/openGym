// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => {
  const state = { S: { gifSize: 'full' } }
  state.snapshot = () => ({ S: state.S, update: vi.fn() })
  return state
})

vi.mock('../store/useStore.js', () => ({
  useStore: selector => selector(mocks.snapshot()),
}))

vi.mock('./PT650ThreeExercise.jsx', () => ({
  default: ({ model, playing }) => (
    <div
      className="pt650-three-test"
      data-pt650-3d={model.id}
      data-clip={model.clip}
      data-playing={playing ? 'yes' : 'no'}
    />
  ),
}))

const { default: Media } = await import('./Media.jsx')

let host, root
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('PT650 built-in 3D media', () => {
  it('prefers the registered 3D push-up over its transitional SVG animation', () => {
    act(() => root.render(<Media ex={{ id: '0662', n: 'push-up' }} />))
    expect(host.querySelector('.exmedia')?.dataset.pt650Media).toBe('push-up-3d-v1')
    expect(host.querySelector('.pt650-three-test')?.getAttribute('data-pt650-3d')).toBe('push-up-3d-v1')
    expect(host.querySelector('.pt650-three-test')?.getAttribute('data-clip')).toBe('Pushup')
  })

  it('keeps existing exercise-specific SVG media until a 3D replacement is registered', () => {
    act(() => root.render(<Media ex={{ id: '0025', n: 'barbell bench press' }} />))
    expect(host.querySelector('.exmedia')?.dataset.pt650Media).toBe('bench-press-v1')
    expect(host.querySelector('.pt650-three-test')).toBeNull()
    expect(host.querySelector('[data-pt650-animation="bench-press-v1"]')).not.toBeNull()
  })
})
