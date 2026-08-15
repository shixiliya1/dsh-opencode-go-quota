# DSH OpenCode Go Quota

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

DSH Web に永続的にインストールできるプラグインです。サイドバーの下部に OC Go の利用枠エントリーを追加し、開くと直近、週間、月間の利用状況と各リセット時刻を表示します。

一回の DSH プロセスでしか有効でなかった動的 Cordis プラグインを置き換えます。`web` profile にインストールすると、DSH を再起動しても自動的に読み込まれます。

## セキュリティ境界

- Host 側で Node の `fetch` を使って OpenCode データを取得し、Authorization ヘッダーは Host に保持します。
- ブラウザーが呼び出すのは、同一オリジンでキーを含まないローカルエンドポイント `/api/opencode-go-quota` のみです。
- プラグインは最初に DSH の credentials seam 経由で `OPENCODE_GO_API_KEY` を読み、その後で起動環境を確認します。
- プラグインが API キーを読み取り、表示、記録、書き込みすることはありません。

マシン上で設定済みの `OPENCODE_GO_API_KEY` はそのまま再利用でき、パネルへ再入力する必要はありません。

## 画面

- 幅広いサイドバーに OC Go エントリーを表示し、コンパクト状態では `OC` と表示します。
- 全画面オーバーレイで、直近 5 時間、週間、月間の使用率、残量率、進捗、リセット時刻を表示します。
- 月額 USD 60 を参考にした推定値を表示します。この金額は OpenCode の公式請求額ではありません。
- パネルを開くと即座に読み取り、その後は 5 分ごとに更新します。更新ボタンで再取得できます。

## ローカル開発

```powershell
pnpm install
pnpm run typecheck
pnpm run build
```

## DSH Web へのインストール

事前ビルド済み Release パッケージをインストールします。

```powershell
dsh plugin --profile web add https://github.com/shixiliya1/dsh-opencode-go-quota/releases/download/v0.1.1/dsh-opencode-go-quota-0.1.1.tgz
```

Release パッケージはローカルビルド不要です。タグに固定したソース版もインストールできます。

```powershell
dsh plugin --profile web add github:shixiliya1/dsh-opencode-go-quota#v0.1.1
```

ソースインストールではこのパッケージの `prepare` ビルドが実行されます。DSH profile の pnpm がビルド許可を求めた場合は、エラーが表示した正確なパッケージキーだけを、その profile の `pnpm-workspace.yaml` に追加して同じコマンドを再実行してください。一回限りの agent profile には `web` を `headless` に置き換えます。

更新時は新しい Release URL で `dsh plugin add` を再実行します。アンインストール:

```powershell
dsh plugin --profile web remove dsh-opencode-go-quota
```

### ローカル開発版のインストール

Windows では、まず空白を含まないパスに事前ビルドパッケージを作成します。

```powershell
pnpm pack --pack-destination C:\dsh-packages
npx @deepseek-ai/dsh plugin --profile web add file:C:/dsh-packages/dsh-opencode-go-quota-0.1.1.tgz
```

DSH Web を再起動し、ブラウザーを更新してください。サイドバー下部にエントリーが現れます。

空白を含む Windows のソースパスを `link:` の後ろに直接置かないでください。現在の DSH CLI は複数のパッケージ名として分割します。ソースからインストールする場合は、`link:` を使う前に空白を含まないパスへ移動してください。

## 互換性

- DSH web profile `0.1.0-rc.6`
- Node.js `^22.19` または `>=24`
- OpenCode エンドポイント: `GET https://opencode.ai/zen/go/v1/usage`

HTTP 401 は拒否されたキー、HTTP 403 は Go サブスクリプションがないアカウントとして表示されます。API エラーによってキーや上流レスポンス本文がブラウザーへ送られることはありません。
