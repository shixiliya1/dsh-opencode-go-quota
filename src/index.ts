import { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { makeQuotaRoutes } from './routes.js'
import { OpenCodeGoQuotaService, type OpenCodeGoQuotaConfig } from './service.js'

export { OPENCODE_GO_QUOTA_API_PREFIX, makeQuotaRoutes } from './routes.js'
export {
  DEFAULT_API_KEY_ENV,
  DEFAULT_REFRESH_INTERVAL_SECONDS,
  OPENCODE_GO_USAGE_URL,
  OpenCodeGoQuotaService,
} from './service.js'
export type {
  OpenCodeGoQuotaConfig,
  QuotaError,
  QuotaView,
  QuotaWindow,
  QuotaWindowId,
} from './service.js'

export const name = 'opencode-go-quota'
export const inject = ['webServer']

export function apply(ctx: Context, config: OpenCodeGoQuotaConfig = {}): void {
  const service = new OpenCodeGoQuotaService(ctx, config)
  const routes = makeQuotaRoutes(service)
  ctx.effect(
    () => {
      const disposers = routes.map((route) => ctx.webServer.register(route))
      return () => { for (const dispose of disposers) dispose() }
    },
    'opencode-go-quota: routes',
  )
}
