import { Context, Service } from '@deepseek-ai/cordis'
import { credentialRef, type CredentialRef } from '@deepseek-ai/dsh-credentials'

export const OPENCODE_GO_USAGE_URL = 'https://opencode.ai/zen/go/v1/usage'
export const DEFAULT_API_KEY_ENV = 'OPENCODE_GO_API_KEY'
export const DEFAULT_REFRESH_INTERVAL_SECONDS = 300

export type QuotaWindowId = 'rolling' | 'weekly' | 'monthly'
export type QuotaError =
  | 'missing-key'
  | 'unauthorized'
  | 'not-entitled'
  | 'timeout'
  | 'network-error'
  | 'upstream-error'
  | 'invalid-response'

export interface QuotaWindow {
  percent: number
  resetsAt?: string
}

export interface QuotaView {
  fetchedAt: number
  usage: Record<QuotaWindowId, QuotaWindow>
  error?: QuotaError
}

export interface OpenCodeGoQuotaConfig {
  apiKeyEnv?: string
  refreshIntervalSeconds?: number
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    opencodeGoQuota: OpenCodeGoQuotaService
  }
}

function emptyUsage(): Record<QuotaWindowId, QuotaWindow> {
  return {
    rolling: { percent: 0 },
    weekly: { percent: 0 },
    monthly: { percent: 0 },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeWindow(value: unknown): QuotaWindow | undefined {
  if (!isRecord(value) || typeof value.percent !== 'number' || !Number.isFinite(value.percent)) return undefined
  const percent = Math.min(100, Math.max(0, value.percent))
  return typeof value.resetsAt === 'string' ? { percent, resetsAt: value.resetsAt } : { percent }
}

function parseUsage(payload: unknown): Record<QuotaWindowId, QuotaWindow> | undefined {
  if (!isRecord(payload) || !isRecord(payload.usage)) return undefined
  const rolling = normalizeWindow(payload.usage.rolling)
  const weekly = normalizeWindow(payload.usage.weekly)
  const monthly = normalizeWindow(payload.usage.monthly)
  return rolling !== undefined && weekly !== undefined && monthly !== undefined
    ? { rolling, weekly, monthly }
    : undefined
}

export class OpenCodeGoQuotaService extends Service {
  private readonly apiKeyEnv: CredentialRef
  private readonly refreshIntervalMs: number
  private cached: QuotaView | undefined
  private cachedAt = 0
  private inflight: Promise<QuotaView> | undefined

  constructor(ctx: Context, config: OpenCodeGoQuotaConfig = {}) {
    super(ctx, 'opencodeGoQuota')
    this.apiKeyEnv = credentialRef(config.apiKeyEnv ?? DEFAULT_API_KEY_ENV)
    this.refreshIntervalMs = Math.max(0, (config.refreshIntervalSeconds ?? DEFAULT_REFRESH_INTERVAL_SECONDS) * 1_000)
  }

  async view(): Promise<QuotaView> {
    if (this.cached !== undefined && Date.now() - this.cachedAt < this.refreshIntervalMs) return this.cached
    return this.refresh()
  }

  async refresh(): Promise<QuotaView> {
    if (this.inflight !== undefined) return this.inflight
    const task = this.query()
    this.inflight = task
    try {
      const view = await task
      if (view.error === undefined) {
        this.cached = view
        this.cachedAt = view.fetchedAt
      }
      return view
    } finally {
      if (this.inflight === task) this.inflight = undefined
    }
  }

  private async query(): Promise<QuotaView> {
    const fetchedAt = Date.now()
    const key = await this.resolveApiKey()
    if (key === undefined) return { fetchedAt, usage: emptyUsage(), error: 'missing-key' }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12_000)
    let response: Response
    try {
      response = await fetch(OPENCODE_GO_USAGE_URL, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: 'Bearer ' + key,
        },
        signal: controller.signal,
      })
    } catch (error) {
      const name = error instanceof Error ? error.name : ''
      return { fetchedAt, usage: emptyUsage(), error: name === 'AbortError' ? 'timeout' : 'network-error' }
    } finally {
      clearTimeout(timer)
    }

    if (response.status === 401) return { fetchedAt, usage: emptyUsage(), error: 'unauthorized' }
    if (response.status === 403) return { fetchedAt, usage: emptyUsage(), error: 'not-entitled' }
    if (!response.ok) return { fetchedAt, usage: emptyUsage(), error: 'upstream-error' }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      return { fetchedAt, usage: emptyUsage(), error: 'invalid-response' }
    }
    const usage = parseUsage(payload)
    return usage === undefined
      ? { fetchedAt, usage: emptyUsage(), error: 'invalid-response' }
      : { fetchedAt, usage }
  }

  private async resolveApiKey(): Promise<string | undefined> {
    const credentials = this.ctx.get('credentials') as
      | { resolve(ref: CredentialRef): Promise<{ value: string } | undefined> }
      | undefined
    if (credentials !== undefined) {
      const hit = await credentials.resolve(this.apiKeyEnv)
      if (hit !== undefined && hit.value.length > 0) return hit.value
    }

    const launchEnvironment = this.ctx.get('launchEnvironment') as
      | { get(name: string): { value: string } | undefined }
      | undefined
    const launchValue = launchEnvironment?.get(String(this.apiKeyEnv))
    if (launchValue !== undefined && launchValue.value.length > 0) return launchValue.value

    const processValue = (process.env as Record<string, string | undefined>)[String(this.apiKeyEnv)]
    return typeof processValue === 'string' && processValue.length > 0 ? processValue : undefined
  }
}
