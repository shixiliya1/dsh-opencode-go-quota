import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import {
  createQuotaOverlayStore,
  OpenCodeQuotaOverlay,
  QuotaSidebarButton,
  type QuotaPanelInjected,
} from './OpenCodeQuotaPanel.js'

export { OpenCodeQuotaOverlay, QuotaSidebarButton } from './OpenCodeQuotaPanel.js'
export type { QuotaPanelInjected } from './OpenCodeQuotaPanel.js'

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  const quotaOverlay = createQuotaOverlayStore()
  ctx.inject(['slots'], (scope: ClientContext) => {
    scope.effect(
      () => scope.slots.register({
        name: 'sidebar.footer.action',
        id: 'opencode-go-quota',
        order: 20,
        label: 'OpenCode Go quota',
        inject: (): QuotaPanelInjected => ({ quotaOverlay }),
      }, QuotaSidebarButton),
      'opencode-go-quota: sidebar entry',
    )
    scope.effect(
      () => scope.slots.register({
        name: 'shell.overlay',
        id: 'opencode-go-quota',
        order: 100,
        label: 'OpenCode Go quota panel',
        inject: (): QuotaPanelInjected => ({ quotaOverlay }),
      }, OpenCodeQuotaOverlay),
      'opencode-go-quota: overlay',
    )
  })
}
