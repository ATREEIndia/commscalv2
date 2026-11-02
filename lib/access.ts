// Sections a guest (reg_users role "guest") can be given access to, and how
// much. Other registered roles have full access; guests only get what the admin
// picked on the Users page, stored as reg_users/{email}.guestAccess.

// 'own' (Database only): add items and edit/delete only the ones they added.
export type AccessLevel = 'none' | 'view' | 'own' | 'edit'

export const GUEST_ROLE = 'guest'

export const GUEST_SECTIONS = [
    { key: 'dashboardTasks', label: 'Tasks on the Dashboard', levels: ['none', 'view', 'edit'] },
    { key: 'myTasks', label: 'My Tasks', levels: ['none', 'view', 'edit'] },
    { key: 'smcal', label: 'SM Cal', levels: ['none', 'view', 'edit'] },
    { key: 'genwtw', label: 'Generate WTW', levels: ['none', 'view'] },
    { key: 'database', label: 'Database', levels: ['none', 'view', 'own', 'edit'] },
] as const satisfies readonly { key: string; label: string; levels: readonly AccessLevel[] }[]

export type GuestSection = (typeof GUEST_SECTIONS)[number]['key']
export type GuestAccess = Partial<Record<GuestSection, AccessLevel>>

export const ACCESS_LABEL: Record<AccessLevel, string> = { none: 'No access', view: 'View only', own: 'Add & edit own', edit: 'Can edit' }

// The section a page belongs to. The dashboard itself is open to guests; only
// its task section is gated (dashboardTasks). null = a page guests never get.
export const sectionForPath = (path: string): GuestSection | 'dashboard' | null => {
    if (path === '/') return 'dashboard'
    if (path === '/task' || path.startsWith('/task/')) return 'myTasks'
    if (path === '/smcal' || path.startsWith('/smcal/')) return 'smcal'
    if (path === '/genwtw' || path.startsWith('/genwtw/')) return 'genwtw'
    if (path === '/database' || path.startsWith('/database/')) return 'database'
    return null
}

// A guest's level for one section, capped at what that section allows
// (Generate WTW is never editable by a guest).
export const guestLevel = (access: GuestAccess | undefined, section: GuestSection): AccessLevel => {
    const level = access?.[section] ?? 'none'
    const allowed: readonly AccessLevel[] = GUEST_SECTIONS.find((s) => s.key === section)!.levels
    return allowed.includes(level) ? level : 'none'
}
