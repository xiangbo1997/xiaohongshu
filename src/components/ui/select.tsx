'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[]
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, options, ...props }, ref) => {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900',
        'focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
})
Select.displayName = 'Select'

export { Select }
