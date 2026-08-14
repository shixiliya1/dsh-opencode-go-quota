import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import type { OpenCodeGoQuotaService, QuotaView } from './service.js'

export const OPENCODE_GO_QUOTA_API_PREFIX = '/api/opencode-go-quota'

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function quotaRoute(path: string, read: () => Promise<QuotaView>): WebRoute {
  return {
    kind: 'exact',
    path,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (req.method !== 'GET') {
        json(res, 405, { error: 'method-not-allowed' })
        return
      }
      void read().then(
        (view) => json(res, 200, view),
        () => json(res, 500, { error: 'internal-error' }),
      )
    },
  }
}

export function makeQuotaRoutes(service: OpenCodeGoQuotaService): WebRoute[] {
  return [
    quotaRoute(OPENCODE_GO_QUOTA_API_PREFIX, () => service.view()),
    quotaRoute(OPENCODE_GO_QUOTA_API_PREFIX + '/refresh', () => service.refresh()),
  ]
}
