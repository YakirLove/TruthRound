// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import Speech from './Speech'
import { useSettingsStore } from '../store/settingsStore'
afterEach(()=>{cleanup();vi.useRealTimers()})
it('keeps the full speech visible after skipping typewriter animation',()=>{
 vi.useFakeTimers(); useSettingsStore.setState({textSpeed:1,reduceMotion:false})
 render(<Speech turn={{id:'one',speakerId:'lin',content:'这句话应该完整显示。',turnType:'opening',timestamp:''}}/>)
 fireEvent.click(screen.getByRole('button',{name:'显示全文'}))
 expect(screen.getByText('这句话应该完整显示。').textContent).toBe('这句话应该完整显示。')
 act(()=>vi.advanceTimersByTime(500))
 expect(screen.getByText('这句话应该完整显示。').textContent).toBe('这句话应该完整显示。')
 expect(screen.queryByRole('button',{name:'显示全文'})).toBeNull()
})
