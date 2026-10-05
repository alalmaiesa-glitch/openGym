import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkForUpdate, sha256, resetUpdateCheck, RELEASES_PAGE } from './update.js'

describe('sha256', () => {
  it('computes the known SHA-256 for hello world', async () => {
    const input = new TextEncoder().encode('hello world')
    expect(await sha256(input.buffer)).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9')
  })

  it('returns a 64-character lowercase hex digest', async () => {
    const hash = await sha256(new TextEncoder().encode('test').buffer)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('Arabic edition update channel', () => {
  let originalFetch

  beforeEach(() => { originalFetch = globalThis.fetch; resetUpdateCheck() })
  afterEach(() => { globalThis.fetch = originalFetch })

  function mockFetch(body, status = 200) {
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }))
  }

  const release = (tag, assets = []) => ({ tag_name: tag, assets })

  it('is pinned to this fork releases page', () => {
    expect(RELEASES_PAGE).toBe('https://github.com/alalmaiesa-glitch/openGym/releases')
  })

  it('reports no update when the latest release matches this build', async () => {
    mockFetch(release('v' + __APP_VERSION__))
    const result = await checkForUpdate()
    expect(result).toEqual({
      hasUpdate: false,
      latestVersion: __APP_VERSION__,
      apkUrl: null,
      hashUrl: null,
    })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/alalmaiesa-glitch/openGym/releases/latest',
      { headers: { Accept: 'application/vnd.github+json' } },
    )
  })

  it('reports a newer release and strips the v prefix', async () => {
    mockFetch(release('v99.1.2'))
    const result = await checkForUpdate()
    expect(result.hasUpdate).toBe(true)
    expect(result.latestVersion).toBe('99.1.2')
  })

  it('does not flag an older release', async () => {
    mockFetch(release('v0.0.1'))
    expect((await checkForUpdate()).hasUpdate).toBe(false)
  })

  it('finds the APK and its checksum in GitHub release assets', async () => {
    const apk='https://github.com/alalmaiesa-glitch/openGym/releases/download/v99.0.0/openGym-99.0.0.apk'
    const hash=apk+'.sha256'
    mockFetch(release('v99.0.0', [
      { name: 'openGym-99.0.0.apk.sha256', browser_download_url: hash },
      { name: 'openGym-99.0.0.apk', browser_download_url: apk },
    ]))
    const result = await checkForUpdate()
    expect(result.apkUrl).toBe(apk)
    expect(result.hashUrl).toBe(hash)
  })

  it('does not confuse an APK checksum with the APK asset', async () => {
    const hash='https://example.com/openGym.apk.sha256'
    mockFetch(release('v99.0.0', [{ name: 'openGym.apk.sha256', browser_download_url: hash }]))
    const result = await checkForUpdate()
    expect(result.apkUrl).toBe(null)
    expect(result.hashUrl).toBe(hash)
  })

  it('accepts a checksum asset named SHA256 even without the suffix', async () => {
    mockFetch(release('v99.0.0', [
      { name: 'openGym.apk', browser_download_url: 'https://example.com/openGym.apk' },
      { name: 'SHA256 checksum', browser_download_url: 'https://example.com/checksum.txt' },
    ]))
    expect((await checkForUpdate()).hashUrl).toBe('https://example.com/checksum.txt')
  })

  it('treats a repository with no releases as having no update', async () => {
    mockFetch({ message: 'Not Found' }, 404)
    const result = await checkForUpdate()
    expect(result.hasUpdate).toBe(false)
    expect(result.latestVersion).toBe(__APP_VERSION__)
  })

  it('throws a readable GitHub API error for other HTTP failures', async () => {
    mockFetch(null, 500)
    await expect(checkForUpdate()).rejects.toThrow('GitHub API 500')
  })

  it('does not cache a failed request', async () => {
    globalThis.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(release('v99.0.0')) })
    await expect(checkForUpdate()).rejects.toThrow('Network error')
    expect((await checkForUpdate()).hasUpdate).toBe(true)
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })

  it('ignores semver build metadata when deciding precedence', async () => {
    const [maj, min, patch] = __APP_VERSION__.split('+')[0].split('.').map(Number)
    mockFetch(release('v' + [maj, min, patch + 1].join('.') + '+arabic.1'))
    expect((await checkForUpdate()).hasUpdate).toBe(true)

    resetUpdateCheck()
    mockFetch(release('v' + [maj, min, patch].join('.') + '+arabic.2'))
    expect((await checkForUpdate()).hasUpdate).toBe(false)
  })
})
