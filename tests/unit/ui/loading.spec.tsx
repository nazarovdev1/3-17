import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ui } from '@/content/text'
import { manifest } from '@/assets/loader'
import { LoadingScreen } from '@/ui/LoadingScreen'
import { SettingsScreen } from '@/ui/SettingsScreen'
import { useAssetLoad } from '@/ui/assetLoadStore'

afterEach(() => cleanup())

it('shows real progress on the key-ring loading screen', () => {
  useAssetLoad.setState({ status: 'loading', loaded: 300, total: 1000 })
  render(<LoadingScreen />)
  const bar = screen.getByRole('progressbar', { name: ui('loading.label') })
  expect(bar.getAttribute('aria-valuenow')).toBe('30')
  expect(screen.getByText(ui('loading.percent', { percent: 30 }))).toBeTruthy()
  expect(screen.getByText(ui('loading.place'))).toBeTruthy()
})

it('offers a retry when loading fails', () => {
  const start = vi.fn()
  useAssetLoad.setState({ status: 'error', loaded: 10, total: 1000, start })
  render(<LoadingScreen />)
  expect(screen.getByRole('alert').textContent).toBe(ui('loading.error'))
  fireEvent.click(screen.getByRole('button', { name: ui('loading.retry') }))
  expect(start).toHaveBeenCalledOnce()
})

it('lists every asset and font in the settings credits', () => {
  render(<SettingsScreen onBack={() => {}} mode="desktop" />)
  fireEvent.click(screen.getByRole('button', { name: ui('settings.credits') }))
  const credits = screen.getByRole('region', { name: ui('settings.credits_title') })
  for (const a of manifest.assets) expect(credits.textContent).toContain(a.title)
  expect(credits.textContent).toContain('Literata')
  expect(credits.textContent).toContain('Inter')
})
