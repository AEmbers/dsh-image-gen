# Changelog

## 0.9.4 — 双代核心兼容声明（0.2.0-rc.2 + 0.2.1-alpha.1）

### 变更

- **`package.json` 补上两代核心的兼容声明**：
  - `engines.dsh` = `>=0.2.0-rc.1 <0.3.0-0`
  - `dsh.compatibility.dsh` = `>=0.2.0-rc.1 <0.3.0-0`，`dshReleases` 里
    `0.2.0-rc.1` / `0.2.0-rc.2` / `0.2.1-alpha.1` 均标 `compatible`
- **放宽 peer 下界**：`@deepseek-ai/cordis` `>=4.0.0 <5` → `>=4.0.4 <5`；
  `@deepseek-ai/schemastery` `>=3.18.0 <4` → `>=3.18.4 <4`。
  两个范围本来就同时覆盖 `cordis 4.0.5-alpha.1` 与 `schemastery 3.18.5-alpha.1`
  （0.2.1-alpha.1 的实际依赖），这里只是把下界对齐到实测过的版本。

### 为什么两代都写

当前 Desktop 宿主打包的核心仍是 **0.2.0-rc.2**，profile 无法单独升级核心。
只声明 `0.2.1-alpha.1` 的 fork 会在过渡期被宿主整体拒绝（`dsh: installation rejected`，
且一次 `add` 多个包会整批回滚）。所以声明必须同时覆盖两代。

### 闸门说明（实测）

DSH 的安装闸门只看 `peerDependencies`：`dsh-app-boot/lib/index.js` 的
`evaluatePluginCompatibility()` 只遍历名字为 `@deepseek-ai/dsh` 或以 `@deepseek-ai/dsh-`
开头的条目，用 `semver.satisfies(runtime, range, {includePrerelease:true})` 判定；
`engines.dsh` 与 `dsh.compatibility` 不参与闸门，是给插件管理 UI 看的声明层。

本插件**没有任何 `@deepseek-ai/dsh-*` peer 条目**，所以它本来就过闸门（这也解释了
为什么它在 0.2.1-alpha.1 沙箱里"能装能启但零声明"）。本次补的是声明层，
并把 cordis / schemastery 的精确下界对齐到实测版本。

### 验证

- 0.2.1-alpha.1 沙箱：`plugin add` 通过；boot 成功保活；`dsh-image-gen/client.js`
  出现在服务端实际挂载的客户端模块清单里。
- 0.2.0-rc.2 沙箱：`plugin add` 通过；boot 成功保活；bundle patch 正常合并
  （`# == dsh-image-gen` 段落出现在 composed config）。
