// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// Built-in PT650 thumbnails never fetch the inherited exercise image catalogue. An approved
// animated exercise gets a play marker; everything else gets a neutral unavailable tile.
vi.mock('../store/useStore.js', () => ({ useStore: () => null }))
const { Thumb } = await import('./Media.jsx')

const mounted = []
function mount(el) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push({ root, host })
  act(() => root.render(el))
  return { host, root }
}
afterEach(() => { act(() => { mounted.splice(0).forEach(({ root, host }) => { root.unmount(); host.remove() }) }) })

describe('Thumb', () => {
  it('ignores a legacy built-in still and shows the neutral unavailable tile', () => {
    const { host } = mount(<Thumb ex={{ id: 'a', img: 'a.jpg' }} />)
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('.thumb.thumb-x[data-pt650-media="unavailable"]')).toBeTruthy()
    expect(host.querySelector('[data-icon="dumbbell"]')).toBeTruthy()
  })

  it('marks an exercise with an approved PT650 animation without loading an image', () => {
    const { host, root } = mount(<Thumb ex={{ id: '0662', img: 'legacy.jpg' }} />)
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('.pt650-thumb.ready[data-pt650-media="animated"]')).toBeTruthy()
    expect(host.querySelector('[data-icon="play"]')).toBeTruthy()

    act(() => root.render(<Thumb ex={{ id: 'b', img: 'b.jpg' }} />))
    expect(host.querySelector('.pt650-thumb.ready')).toBeNull()
    expect(host.querySelector('[data-icon="dumbbell"]')).toBeTruthy()
  })

  it('a retired authored-SVG-only exercise is unavailable in thumbnails', () => {
    const { host } = mount(<Thumb ex={{ id: '0025', img: 'legacy.jpg' }} />)
    expect(host.querySelector('.thumb-x[data-pt650-media="unavailable"]')).toBeTruthy()
    expect(host.querySelector('[data-icon="dumbbell"]')).toBeTruthy()
  })

  it('an exercise without media has the neutral unavailable tile from the start', () => {
    const { host } = mount(<Thumb ex={{ id: 'c' }} />)
    expect(host.querySelector('.thumb-x[data-pt650-media="unavailable"]')).toBeTruthy()
  })
})
