# DSH OpenCode Go Quota

[中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

这是一个可持久安装的 DSH Web 插件：在侧边栏底部提供 OC Go 额度入口，点击后显示滚动、每周和每月额度，以及各窗口的重置时间。

它替代了只能存活在单次 DSH 进程中的动态 Cordis 插件。安装到 web profile 后，重启 DSH 仍会自动加载。

## 安全边界

- Host 端直接使用 Node fetch 向 OpenCode 请求数据，并把 Authorization header 留在 Host；
- 浏览器只访问本机同源的无密钥接口 /api/opencode-go-quota；
- 默认通过 DSH credentials seam 读取 OPENCODE_GO_API_KEY，随后才尝试启动环境变量；
- 插件不会读取、显示、记录或写入 API Key。

本机已配置的 OPENCODE_GO_API_KEY 可以直接复用，无需在面板重新粘贴。

## 界面

- 侧边栏宽栏显示 OC Go 额度，收起时显示 OC；
- 全屏浮层显示 5 小时滚动、每周、每月的已用百分比、剩余百分比、进度和重置时间；
- 以每月 60 美元为参考展示估算值。该金额不是 OpenCode 官方账单金额；
- 面板打开后立即读取，并每 5 分钟刷新一次；刷新按钮可强制重新请求。

## 本地开发

~~~powershell
pnpm install
pnpm run typecheck
pnpm run build
~~~

## 安装到 DSH Web

推荐直接安装预构建发布包：

~~~powershell
pnpm dsh plugin --profile web add https://github.com/shixiliya1/dsh-opencode-go-quota/releases/download/v0.2.0/dsh-opencode-go-quota-0.2.0.tgz
~~~

`dsh-v0.1.3-alpha.1` 尚未发布到 npm。请先在官方源码 tag 目录完成 `pnpm install`，再运行上述 `pnpm dsh` 命令。发布包无需本地构建。也可从固定版本源码安装：

~~~powershell
pnpm dsh plugin --profile web add github:shixiliya1/dsh-opencode-go-quota#v0.2.0
~~~

源码安装会运行本包的 `prepare` 构建。如果 DSH profile 的 pnpm 提示需要允许构建，请按报错中给出的精确包名加入 allowlist，再重试同一条命令。把 `web` 换成 `headless` 可安装到一次性 agent profile。

升级时，用新版发布包地址再次执行 `dsh plugin add`。卸载命令：

~~~powershell
pnpm dsh plugin --profile web remove dsh-opencode-go-quota
~~~

### 本地开发安装

在 Windows 上，先生成一个无空格路径的预构建包：

~~~powershell
pnpm pack --pack-destination C:\Users\xili\.dsh\packages
pnpm dsh plugin --profile web add file:C:/Users/xili/.dsh/packages/dsh-opencode-go-quota-0.2.0.tgz
~~~

然后重新启动 dsh web，并在浏览器中刷新页面。侧边栏底部会出现入口。

不要把包含空格的 Windows 源码路径直接放在 link: 后面；当前 DSH CLI 会把它拆成多个包名。需要从源码安装时，先将源码放到不含空格的目录，再使用 link:。

## 兼容性

- DSH web profile `dsh-v0.1.3-alpha.1`（官方源码 tag 构建）；
- Node.js ^22.19 或 >=24；
- OpenCode 接口 GET https://opencode.ai/zen/go/v1/usage。

401 会显示密钥被拒绝，403 会显示账户没有 Go 订阅。接口错误不会向浏览器回传任何密钥或上游响应体。
