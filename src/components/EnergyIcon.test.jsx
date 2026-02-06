import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import EnergyIcon from './EnergyIcon'

describe('EnergyIcon', () => {
  it('renders correctly with default size', () => {
    render(<EnergyIcon type="green" />)
    const icon = screen.getByRole('img', { name: /Green Energy/i })
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass('w-4 h-4')
    expect(icon).toHaveTextContent('g')
  })

  it('renders with custom size', () => {
    render(<EnergyIcon type="red" size="w-8 h-8" />)
    const icon = screen.getByRole('img', { name: /Red Energy/i })
    expect(icon).toHaveClass('w-8 h-8')
  })

  it('renders "none" type correctly', () => {
    render(<EnergyIcon type="none" />)
    const icon = screen.getByRole('img', { name: /No Energy/i })
    expect(icon).toHaveTextContent('-')
  })

  it('has correct tooltip', () => {
    render(<EnergyIcon type="blue" />)
    const icon = screen.getByRole('img')
    expect(icon).toHaveAttribute('title', 'Blue Energy')
  })
})
