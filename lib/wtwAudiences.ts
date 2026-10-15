// Who a WTW newsletter run goes to. Shared by the Generate WTW page and the
// /api/genwtw route; the route only ever sends to the list IDs defined here.
export const WTW_AUDIENCES = {
  test: { label: 'Send test', mode: 'test', listIds: [128], description: 'Test list only' },
  internal: { label: 'Send internal', mode: 'send', listIds: [128], description: 'Internal lists' },
  global: { label: 'Send global', mode: 'send', listIds: [128], description: 'All subscribers (internal + global lists)' },
} as const

export type WtwAudience = keyof typeof WTW_AUDIENCES

export const isWtwAudience = (value: unknown): value is WtwAudience =>
  typeof value === 'string' && value in WTW_AUDIENCES
