import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Counts whitespace-delimited words in a string. */
export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/** Truncates a string to at most `maxWords` whitespace-delimited words,
 *  preserving the original whitespace/formatting of the kept portion. */
export function truncateWords(text: string, maxWords: number): string {
  const matches = text.matchAll(/\S+/g)
  let count = 0
  let endIndex = -1
  for (const match of matches) {
    count++
    if (count === maxWords) {
      endIndex = match.index + match[0].length
      break
    }
  }
  if (endIndex === -1) return text
  return text.slice(0, endIndex)
}
