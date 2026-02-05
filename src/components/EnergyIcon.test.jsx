import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import EnergyIcon from './EnergyIcon'

describe('EnergyIcon', () => {
  it('renders with correct label and content for red energy', () => {
    render(<EnergyIcon type="red" />)
    const icon = screen.getByRole('img', { name: /Red Energy/i })
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveTextContent('r')
    expect(icon).toHaveAttribute('title', 'Red Energy')
  })

  it('renders with correct label and content for none energy', () => {
    render(<EnergyIcon type="none" />)
    const icon = screen.getByRole('img', { name: /No Energy/i })
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveTextContent('-')
    expect(icon).toHaveAttribute('title', 'No Energy')
  })

  it('applies custom size class', () => {
    render(<EnergyIcon type="blue" size="w-8 h-8" />)
    const icon = screen.getByRole('img', { name: /Blue Energy/i })
    expect(icon).toHaveClass('w-8 h-8')
  })

  it('applies default size class when not provided', () => {
    render(<EnergyIcon type="green" />)
    const icon = screen.getByRole('img', { name: /Green Energy/i })
    expect(icon).toHaveClass('w-4 h-4')
  })
})
