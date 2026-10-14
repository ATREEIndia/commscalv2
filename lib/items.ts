import type { itemprobes } from '../app/constants'

// When an entry was added: addedAt (ms) for newer entries, createdon (YYYY-MM-DD) for older ones.
export const addedDate = (entry: itemprobes): Date | null => {
  const d = entry.addedAt ? new Date(entry.addedAt) : entry.createdon ? new Date(entry.createdon) : null
  return d && !isNaN(d.getTime()) ? d : null
}
