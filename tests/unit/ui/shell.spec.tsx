import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ContentWarning } from '@/ui/ContentWarning'
import { SettingsScreen } from '@/ui/SettingsScreen'
import { useSettings, DEFAULT_SETTINGS } from '@/ui/settingsStore'
import { useGame } from '@/ui/gameStore'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  useSettings.setState({ settings: { ...DEFAULT_SETTINGS } })
})

describe('ContentWarning', () => {
  it('blocks continue until the player confirms', async () => {
    const user = userEvent.setup()
    useGame.setState({
      screen: 'warning',
      meta: { endingsSeen: [], chaptersUnlocked: [], contentWarningAccepted: false },
    })
    render(<ContentWarning />)
    const go = screen.getByRole('button', { name: 'Davom etish' })
    expect(go).toBeDisabled()
    await user.click(screen.getByLabelText('Buni oʻqidim, davom etaman'))
    expect(go).toBeEnabled()
  })

  it('reduce flashing toggle persists', async () => {
    const user = userEvent.setup()
    render(<ContentWarning />)
    await user.click(screen.getByLabelText('Miltillashni kamaytirish'))
    expect(JSON.parse(window.localStorage.getItem('g317:settings')!).reduceFlashing).toBe(true)
  })
})

describe('SettingsScreen persistence', () => {
  it('text size and mode persist to localStorage', async () => {
    const user = userEvent.setup()
    render(<SettingsScreen onBack={() => undefined} mode="mobile" />)
    await user.click(screen.getByRole('button', { name: /^L$/ }))
    await user.click(screen.getByRole('button', { name: 'Kompyuter' }))
    const stored = JSON.parse(window.localStorage.getItem('g317:settings')!)
    expect(stored.textSize).toBe('L')
    expect(stored.mode).toBe('desktop')
  })

  it('volume slider writes a clamped number', async () => {
    render(<SettingsScreen onBack={() => undefined} mode="mobile" />)
    const master = screen.getAllByRole('slider')[0]!
    fireEvent.change(master, { target: { value: '0.3' } })
    expect(useSettings.getState().settings.masterVolume).toBeCloseTo(0.3)
  })
})
