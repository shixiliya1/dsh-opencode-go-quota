# DSH OpenCode Go Quota

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

A persistently installed DSH Web plugin that adds an OC Go quota entry at the bottom of the sidebar. Open it to view rolling, weekly, and monthly usage with reset times.

It replaces a dynamic Cordis plugin that only survived for one DSH process. Once installed in the `web` profile, it is loaded automatically after DSH restarts.

## Security boundary

- The host uses Node `fetch` to request OpenCode data and keeps the Authorization header on the host.
- The browser only calls the same-origin, key-free local endpoint `/api/opencode-go-quota`.
- The plugin first reads `OPENCODE_GO_API_KEY` through DSH's credentials seam and only then tries the startup environment.
- The plugin never reads, displays, logs, or writes an API key.

An `OPENCODE_GO_API_KEY` already configured on the machine can be reused without pasting it into the panel again.

## Interface

- The wide sidebar shows an OC Go entry; its compact state shows `OC`.
- A full-screen overlay shows five-hour rolling, weekly, and monthly used percentages, remaining percentages, progress bars, and reset times.
- It shows an estimate using USD 60 per month as a reference. This amount is not an official OpenCode billing value.
- The panel refreshes immediately when opened and every five minutes afterward. The refresh button forces a new request.

## Local development

```powershell
pnpm install
pnpm run typecheck
pnpm run build
```

## Install into DSH Web

Install the prebuilt release package:

```powershell
pnpm dsh plugin --profile web add https://github.com/shixiliya1/dsh-opencode-go-quota/releases/download/v0.2.0/dsh-opencode-go-quota-0.2.0.tgz
```

`dsh-v0.1.3-alpha.1` is not published to npm, so run these commands from an official source checkout of that tag after `pnpm install`. The release package does not need a local build. A pinned source installation is also supported:

```powershell
pnpm dsh plugin --profile web add github:shixiliya1/dsh-opencode-go-quota#v0.2.0
```

A source install runs this package's `prepare` build. If pnpm in the DSH profile asks for build permission, add only the exact package key printed by the error to that profile's `pnpm-workspace.yaml`, then rerun the same command. Replace `web` with `headless` for a one-shot agent profile.

To upgrade, run `dsh plugin add` again with the newer release URL. To uninstall:

```powershell
pnpm dsh plugin --profile web remove dsh-opencode-go-quota
```

### Local development installation

On Windows, first create a prebuilt package in a path without spaces:

```powershell
pnpm pack --pack-destination C:\dsh-packages
pnpm dsh plugin --profile web add file:C:/dsh-packages/dsh-opencode-go-quota-0.2.0.tgz
```

Restart DSH Web and refresh the browser. The entry appears at the bottom of the sidebar.

Do not put a Windows source path containing spaces after `link:`. The current DSH CLI splits it into multiple package names. To install from source, move the source to a path without spaces before using `link:`.

## Compatibility

- DSH web profile `dsh-v0.1.3-alpha.1` built from the official source tag
- Node.js `^22.19` or `>=24`
- OpenCode endpoint: `GET https://opencode.ai/zen/go/v1/usage`

HTTP 401 is shown as a rejected key and HTTP 403 as an account without a Go subscription. API errors never send keys or upstream response bodies to the browser.
