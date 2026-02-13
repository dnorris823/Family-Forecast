import { expect, test } from 'vitest'
import { cn } from './utils'

test('cn merges classes correctly', () => {
    expect(cn('c-1', 'c-2')).toBe('c-1 c-2')
})

test('cn handles conditional classes', () => {
    expect(cn('c-1', true && 'c-2', false && 'c-3')).toBe('c-1 c-2')
})

test('cn merges tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
})
