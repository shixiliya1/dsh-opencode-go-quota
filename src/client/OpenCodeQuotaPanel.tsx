import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { useCallback, useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react'
import type { QuotaError, QuotaView, QuotaWindowId } from '../service.js'

const API_PREFIX = '/api/opencode-go-quota'
const MONTHLY_ESTIMATE_USD = 60

const labels: Record<QuotaWindowId, string> = {
  rolling: '滚动 5 小时',
  weekly: '每周额度',
  monthly: '每月额度',
}

const errors: Record<QuotaError, string> = {
  'missing-key': '未找到 OPENCODE_GO_API_KEY。请在 DSH 凭据设置中配置它。',
  unauthorized: 'OpenCode 拒绝了当前密钥。',
  'not-entitled': '当前账号没有 OpenCode Go 订阅权限。',
  timeout: '请求超时，请稍后刷新。',
  'network-error': '无法连接 OpenCode，请检查网络后刷新。',
  'upstream-error': 'OpenCode 服务暂时无法响应。',
  'invalid-response': 'OpenCode 返回了无法识别的额度数据。',
}

export interface QuotaOverlayStore {
  getSnapshot(): boolean
  subscribe(listener: () => void): () => void
  open(): void
  close(): void
}

export interface QuotaPanelInjected {
  quotaOverlay: QuotaOverlayStore
}

export function createQuotaOverlayStore(): QuotaOverlayStore {
  let open = false
  const listeners = new Set<() => void>()
  const notify = (): void => { for (const listener of listeners) listener() }
  return {
    getSnapshot: () => open,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    open: () => {
      if (!open) {
        open = true
        notify()
      }
    },
    close: () => {
      if (open) {
        open = false
        notify()
      }
    },
  }
}

type SidebarButtonProps = PropsRuntime<'sidebar.footer.action'> & InjectFace<QuotaPanelInjected>

export function QuotaSidebarButton({ wide, quotaOverlay }: SidebarButtonProps) {
  return (
    <button
      type="button"
      title="OpenCode Go 额度"
      onClick={() => quotaOverlay.open()}
      style={{
        alignItems: 'center',
        background: 'transparent',
        border: '1px solid rgba(92, 191, 142, 0.28)',
        borderRadius: 9,
        color: '#bfeccc',
        cursor: 'pointer',
        display: 'flex',
        fontFamily: 'Aptos Display, Segoe UI Variable, sans-serif',
        fontSize: 12,
        fontWeight: 650,
        gap: 7,
        height: 34,
        justifyContent: wide ? 'flex-start' : 'center',
        letterSpacing: wide ? '0.015em' : '0.08em',
        margin: wide ? '0 6px 0 0' : '0 3px',
        padding: wide ? '0 10px' : 0,
        transition: 'background 140ms ease, border-color 140ms ease',
        width: wide ? 126 : 34,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          background: '#82e6a4',
          borderRadius: '50%',
          boxShadow: '0 0 0 3px rgba(130, 230, 164, 0.12)',
          display: 'inline-block',
          height: 6,
          width: 6,
        }}
      />
      <span>{wide ? 'OC Go 额度' : 'OC'}</span>
    </button>
  )
}

type OverlayProps = PropsRuntime<'shell.overlay'> & InjectFace<QuotaPanelInjected>

function percentText(percent: number): string {
  return Math.round(percent) + '%'
}

function remaining(percent: number): string {
  return percentText(Math.max(0, 100 - percent))
}

function dollars(percent: number): string {
  return '$' + (MONTHLY_ESTIMATE_USD * percent / 100).toFixed(2)
}

function resetText(value: string | undefined): string {
  if (value === undefined) return '重置时间未提供'
  const time = Date.parse(value)
  if (Number.isNaN(time)) return value
  const delta = time - Date.now()
  if (delta <= 0) return '即将重置'
  const hours = Math.floor(delta / 3_600_000)
  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  const relative = days > 0 ? days + ' 天 ' + restHours + ' 小时后' : Math.max(1, hours) + ' 小时后'
  const date = new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(time))
  return date + ' · ' + relative
}

function panelStyle(): CSSProperties {
  return {
    background: 'linear-gradient(145deg, #10231b 0%, #0b1714 100%)',
    border: '1px solid rgba(121, 214, 161, 0.30)',
    borderRadius: 18,
    boxShadow: '0 28px 80px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    color: '#e4f6e9',
    maxWidth: 610,
    padding: 24,
    pointerEvents: 'auto',
    width: 'min(610px, calc(100vw - 32px))',
  }
}

function QuotaRow({ kind, view }: { kind: QuotaWindowId; view: QuotaView | undefined }) {
  const quota = view?.usage[kind]
  const used = quota?.percent ?? 0
  return (
    <div
      style={{
        background: 'rgba(4, 12, 9, 0.46)',
        border: '1px solid rgba(149, 228, 180, 0.12)',
        borderRadius: 12,
        padding: '14px 15px',
      }}
    >
      <div style={{ alignItems: 'baseline', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#d5efdc', fontSize: 14, fontWeight: 700 }}>{labels[kind]}</span>
        <span style={{ color: '#a5f0bd', fontFamily: 'Cascadia Mono, ui-monospace, monospace', fontSize: 18, fontWeight: 750 }}>
          {percentText(used)}
        </span>
      </div>
      <div
        aria-label={labels[kind] + ' 已用 ' + percentText(used)}
        style={{
          background: 'rgba(207, 245, 220, 0.10)',
          borderRadius: 99,
          height: 7,
          marginTop: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(90deg, #70d99a, #c4f28a)',
            borderRadius: 99,
            height: '100%',
            transition: 'width 260ms ease',
            width: used + '%',
          }}
        />
      </div>
      <div style={{ color: '#9ec8ac', display: 'flex', fontSize: 12, justifyContent: 'space-between', marginTop: 9 }}>
        <span>剩余 {remaining(used)}</span>
        <span>{resetText(quota?.resetsAt)}</span>
      </div>
      <div style={{ color: '#78ad89', fontFamily: 'Cascadia Mono, ui-monospace, monospace', fontSize: 11, marginTop: 7 }}>
        参考月度 $60：已用 {dollars(used)} · 剩余 {dollars(Math.max(0, 100 - used))}
      </div>
    </div>
  )
}

export function OpenCodeQuotaOverlay({ quotaOverlay }: OverlayProps) {
  const open = useSyncExternalStore(quotaOverlay.subscribe, quotaOverlay.getSnapshot, quotaOverlay.getSnapshot)
  const [view, setView] = useState<QuotaView | undefined>()
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (force: boolean): Promise<void> => {
    setLoading(true)
    try {
      const response = await fetch(force ? API_PREFIX + '/refresh' : API_PREFIX, {
        headers: { accept: 'application/json' },
      })
      if (!response.ok) throw new Error('host route failed')
      setView(await response.json() as QuotaView)
    } catch {
      setView({
        fetchedAt: Date.now(),
        usage: {
          rolling: { percent: 0 },
          weekly: { percent: 0 },
          monthly: { percent: 0 },
        },
        error: 'network-error',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void load(false)
    const timer = window.setInterval(() => { void load(false) }, 300_000)
    return () => window.clearInterval(timer)
  }, [open, load])

  if (!open) return null
  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) quotaOverlay.close()
      }}
      style={{
        alignItems: 'center',
        backdropFilter: 'blur(8px)',
        background: 'rgba(2, 10, 7, 0.62)',
        display: 'flex',
        inset: 0,
        justifyContent: 'center',
        padding: 16,
        pointerEvents: 'auto',
        position: 'fixed',
        zIndex: 1000,
      }}
    >
      <section
        aria-label="OpenCode Go 额度"
        aria-modal="true"
        role="dialog"
        style={panelStyle()}
      >
        <header style={{ alignItems: 'flex-start', display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ color: '#75d79b', fontFamily: 'Cascadia Mono, ui-monospace, monospace', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              OpenCode telemetry
            </div>
            <h2 style={{ fontFamily: 'Aptos Display, Segoe UI Variable, sans-serif', fontSize: 24, letterSpacing: '-0.03em', margin: '5px 0 0' }}>
              Go 额度仪表盘
            </h2>
          </div>
          <button
            type="button"
            onClick={() => quotaOverlay.close()}
            style={{
              background: 'rgba(222, 248, 230, 0.08)',
              border: '1px solid rgba(222, 248, 230, 0.16)',
              borderRadius: 8,
              color: '#d5efdc',
              cursor: 'pointer',
              fontSize: 12,
              padding: '7px 10px',
            }}
          >
            关闭
          </button>
        </header>

        {view?.error !== undefined && (
          <div
            role="status"
            style={{
              background: 'rgba(255, 185, 89, 0.10)',
              border: '1px solid rgba(255, 194, 105, 0.28)',
              borderRadius: 10,
              color: '#ffd59a',
              fontSize: 13,
              lineHeight: 1.5,
              marginBottom: 14,
              padding: '10px 12px',
            }}
          >
            {errors[view.error]}
          </div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          <QuotaRow kind="rolling" view={view} />
          <QuotaRow kind="weekly" view={view} />
          <QuotaRow kind="monthly" view={view} />
        </div>

        <footer style={{ alignItems: 'center', color: '#76a788', display: 'flex', fontSize: 11, justifyContent: 'space-between', marginTop: 16 }}>
          <span>数据仅经 Host 请求；密钥不会离开本机凭据层</span>
          <button
            type="button"
            disabled={loading}
            onClick={() => { void load(true) }}
            style={{
              background: loading ? 'rgba(117, 215, 155, 0.10)' : '#78d89a',
              border: 0,
              borderRadius: 8,
              color: loading ? '#9bc8aa' : '#0b2114',
              cursor: loading ? 'default' : 'pointer',
              fontSize: 12,
              fontWeight: 750,
              padding: '8px 12px',
            }}
          >
            {loading ? '刷新中' : '立即刷新'}
          </button>
        </footer>
      </section>
    </div>
  )
}
