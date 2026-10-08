// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import Media from './Media.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const mounted = []
afterEach(() => act(() => mounted.splice(0).forEach(({ root, host }) => { root.unmount(); host.remove() })))

describe('Previously animated PT650 built-in exercises', () => {
  it('renders no motion player, placeholder, 3D scene or SVG frame', () => {
    for (const id of ['0662', '3360', '0685', 'pt650-0001', '0227', '0025']) {
      const host = document.createElement('div')
      document.body.appendChild(host)
      const root = createRoot(host)
      mounted.push({ root, host })
      act(() => root.render(<Media ex={{ id, n: 'exercise' }} />))
      expect(host.innerHTML).toBe('')
    }
  })
})
