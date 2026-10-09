// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
vi.mock('../lib/i18n-core.js', () => ({ getLang: () => 'ar' }))
const { default: PT650EntryExperience } = await import('./PT650EntryExperience.jsx')
const mounted = []
const mount = () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push({ root, host })
  act(() => root.render(<PT650EntryExperience renderAccount={({ initialMode }) => <form data-account-mode={initialMode}><input type="email" autoComplete="email" /></form>} />))
  return host
}
afterEach(() => act(() => mounted.splice(0).forEach(({ root, host }) => { root.unmount(); host.remove() })))

describe('PT650 public sports entry journey', () => {
  it('starts on a black, inclusive entry screen with precisely one interactive Start button', () => {
    const host = mount()
    expect(host.querySelector('[data-pt650-entry="welcome"]')).toBeTruthy()
    expect(host.querySelector('.pt650-gateway-art svg')).toBeNull()
    expect(host.querySelector('.pt650-gateway-art')).toBeTruthy()
    expect(host.querySelectorAll('button')).toHaveLength(1)
    expect(host.querySelector('button').textContent).toBe('ابدأ')
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('video')).toBeNull()
  })

  it('shows four actual clickable fitness tiles, each leading to real account creation', () => {
    const host = mount()
    act(() => host.querySelector('.pt650-gateway-start').click())
    expect(host.querySelector('[data-pt650-entry="choices"]')).toBeTruthy()
    for (const id of ['strength', 'fitness', 'health', 'balance']) {
      const tile = host.querySelector('[data-pt650-choice="' + id + '"]')
      expect(tile).toBeTruthy()
      act(() => tile.click())
      expect(host.querySelector('[data-pt650-entry="account"]')).toBeTruthy()
      expect(host.querySelector('form')?.dataset.accountMode).toBe('create')
      act(() => host.querySelector('.pt650-gateway-back').click())
      expect(host.querySelector('[data-pt650-entry="choices"]')).toBeTruthy()
    }
  })

  it('offers existing-account sign in and a working back path', () => {
    const host = mount()
    act(() => host.querySelector('.pt650-gateway-start').click())
    act(() => host.querySelector('.pt650-gateway-existing').click())
    expect(host.querySelector('form')?.dataset.accountMode).toBe('signin')
    act(() => host.querySelector('.pt650-gateway-back').click())
    expect(host.querySelector('[data-pt650-entry="choices"]')).toBeTruthy()
    act(() => host.querySelector('.pt650-gateway-back').click())
    expect(host.querySelector('[data-pt650-entry="welcome"]')).toBeTruthy()
    expect(host.querySelectorAll('button')).toHaveLength(1)
  })
})
