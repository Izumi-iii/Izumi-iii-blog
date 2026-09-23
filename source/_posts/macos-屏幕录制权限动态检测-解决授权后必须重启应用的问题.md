---
title: "macOS 屏幕录制权限动态检测：解决授权后必须重启应用的问题"
date: 2026-09-23 03:01:00
tags:
  - "权限获取，macOS，Swift"
categories:
  - "macOS"
---

# macOS 屏幕录制权限动态检测：解决授权后必须重启应用的问题

在 macOS 截图工具中，用户经常会遇到这样的问题：

1. Snapio 第一次启动时没有屏幕录制权限；
2. 用户打开“系统设置 → 隐私与安全性 → 屏幕录制”并授权；
3. 返回 Snapio 后，系统设置显示权限已经开启；
4. 但是点击截图仍然没有反应；
5. 只有重启应用后，截图功能才恢复。

这个问题通常不是截图逻辑本身失败，而是应用内部仍然持有旧的权限状态。

本文介绍一种基于 `CGPreflightScreenCaptureAccess`、`CGWindowListCopyWindowInfo` 和 `CGDisplayStream` 的权限检测方案。

## 一、问题原因

最简单的权限检查方式是：

```swift
CGPreflightScreenCaptureAccess()
```

它可以判断当前应用是否拥有屏幕录制权限。

但是在用户刚刚通过系统设置授权后，权限状态可能不会立即同步到当前进程。此时可能出现：

```swift
CGPreflightScreenCaptureAccess() == false
```

但实际上系统设置已经显示该应用处于授权状态。

如果应用只在启动时检查一次权限，就会一直认为权限缺失，直到应用重启。

因此，权限检测不能只依赖启动时的一次结果，而应该在以下时机重新检查：

- 应用从后台回到前台时；
- 用户关闭系统设置后；
- 用户点击“重新检查权限”时；
- 用户点击截图入口时；
- 权限窗口打开期间进行定时刷新。

## 二、参考实现

下面的代码来自一个实际可用的屏幕录制权限检测方案：

```swift
static private func checkPermission() -> Bool {
    if CGPreflightScreenCaptureAccess() {
        return true
    }

    if #available(macOS 10.15, *) {
        if storedFlag {
            return CGDisplayStream(
                dispatchQueueDisplay: CGMainDisplayID(),
                outputWidth: 1,
                outputHeight: 1,
                pixelFormat: Int32(kCVPixelFormatType_32BGRA),
                properties: nil,
                queue: ScreenRecord.checkingQueue,
                handler: { _, _, _, _ in }
            ) != nil
        } else {
            let runningApplication = NSRunningApplication.current
            let processIdentifier = runningApplication.processIdentifier

            guard let windows = CGWindowListCopyWindowInfo(
                [.optionOnScreenOnly],
                kCGNullWindowID
            ) as? [[String: AnyObject]],
            let _ = windows.first(where: { window -> Bool in
                guard let windowProcessIdentifier = (
                    window[kCGWindowOwnerPID as String] as? Int
                ).flatMap(pid_t.init),
                windowProcessIdentifier != processIdentifier,
                let windowRunningApplication = NSRunningApplication(
                    processIdentifier: windowProcessIdentifier
                ),
                windowRunningApplication.executableURL?.lastPathComponent != "Dock",
                let _ = window[String(kCGWindowName)] as? String
                else {
                    return false
                }

                return true
            })
            else {
                return false
            }

            storedFlag = true
            return true
        }
    } else {
        return true
    }
}
```

其中，`storedFlag` 和检查队列需要定义在类型内部：

```swift
private static var storedFlag = false

private static let checkingQueue = DispatchQueue(
    label: "com.example.screen-capture-permission-check"
)
```

## 三、代码执行流程

整个检测流程可以分为三个阶段。

### 1. 首先调用系统预检查接口

```swift
if CGPreflightScreenCaptureAccess() {
    return true
}
```

如果返回 `true`，说明当前应用已经被系统确认拥有屏幕录制权限，可以直接继续截图。

这是最可靠、最直接的检查路径，因此应该优先调用。

### 2. 第一次备用检测：读取其他应用窗口信息

当系统预检查接口返回 `false` 时，代码会执行：

```swift
CGWindowListCopyWindowInfo(
    [.optionOnScreenOnly],
    kCGNullWindowID
)
```

该 API 返回当前屏幕上的窗口列表。

代码会排除：

- Snapio 自己的窗口；
- Dock；
- 没有窗口标题的窗口。

核心判断条件是：

```swift
windowProcessIdentifier != processIdentifier
```

这表示目标窗口必须属于其他应用。

同时要求：

```swift
window[String(kCGWindowName)] as? String != nil
```

如果当前进程可以读取其他应用窗口的标题，通常说明屏幕内容访问权限已经生效。

检测成功后：

```swift
storedFlag = true
return true
```

`storedFlag` 表示当前进程已经完成过一次备用权限确认。

### 3. 后续备用检测：创建最小显示流

当 `storedFlag` 已经为 `true` 时，代码会改用：

```swift
CGDisplayStream(...)
```

这里创建的是一个 `1 × 1` 的显示流：

```swift
outputWidth: 1,
outputHeight: 1
```

它并不是用来真正录屏，而是用于验证当前进程能否创建显示内容访问流。

如果创建成功：

```swift
CGDisplayStream(...) != nil
```

就可以认为屏幕录制权限可用。

使用最小尺寸的好处是：

- 不读取大量屏幕数据；
- 不影响正常截图；
- 检测开销较低；
- 更接近真实截图后端的能力验证。

## 四、为什么要使用 `storedFlag`

`storedFlag` 的作用是区分“首次探测”和“后续探测”。

流程如下：

```text
第一次检查
  ↓
CGPreflightScreenCaptureAccess()
  ↓
失败
  ↓
读取其他应用窗口标题
  ↓
成功后设置 storedFlag = true
```

后续检查：

```text
再次检查
  ↓
CGPreflightScreenCaptureAccess()
  ↓
仍未立即反映最新状态
  ↓
storedFlag == true
  ↓
创建 1 × 1 CGDisplayStream
  ↓
判断实际访问能力
```

这样可以避免每次权限刷新都重复调用窗口列表接口，也避免把多个备用检测结果简单地进行 `OR` 组合。

不建议直接写成：

```swift
return canCreateDisplayStream() || canReadForeignWindowTitle()
```

原因是：

- 两种检查的时机和系统行为可能不同；
- TCC 权限切换期间可能产生不一致结果；
- 可能出现一次检查成功、下一次检查失败；
- UI 状态容易出现闪烁；
- 业务层可能因此频繁启用和禁用截图按钮。

## 五、在权限客户端中使用

可以将权限探测封装到 Platform 层：

```swift
@MainActor
final class MacPermissionClient {
    func currentSnapshot() async -> PermissionSnapshot {
        PermissionSnapshot(
            screenCapture: ScreenCapturePermissionProbe.hasAccess()
                ? .granted
                : .missing,
            accessibility: AXIsProcessTrusted()
                ? .granted
                : .missing
        )
    }
}
```

这样 Core 层不需要直接依赖 AppKit 或具体的系统权限 API。

屏幕录制权限和辅助功能权限应该分别检查：

```swift
screenCapture: ScreenCapturePermissionProbe.hasAccess()
    ? .granted
    : .missing
```

```swift
accessibility: AXIsProcessTrusted()
    ? .granted
    : .missing
```

两种权限职责不同：

| 权限 | 作用 |
| --- | --- |
| 屏幕录制 | 读取屏幕像素、创建截图 |
| 辅助功能 | 自动滚动、发送滚轮事件、控制其他应用 |

因此，普通截图和自动滚动长截图的权限要求也不同。

## 六、权限刷新策略

仅仅实现 `checkPermission()` 还不够，还需要在正确的时机调用它。

### 应用回到前台时刷新

```swift
func applicationDidBecomeActive(
    _ notification: Notification
) {
    Task { @MainActor in
        await permissionGate.refreshSilently()
    }
}
```

这里建议使用静默刷新，避免每次应用激活时都显示“正在检查”的加载状态。

### 权限窗口打开时轮询

当权限窗口可见时，可以使用定时器定期刷新：

```swift
private func refreshPermissionsSilently() {
    Task { @MainActor in
        await permissionGate.refreshSilently()
    }
}
```

轮询过程中不应频繁切换 UI 的 loading 状态，否则会造成：

- 状态文本闪烁；
- Continue 按钮闪烁；
- 菜单项反复启用和禁用；
- 用户误以为权限检查失败。

### 用户点击截图时再次刷新

截图入口最好再执行一次权限刷新：

```swift
func beginCapture() async {
    await permissionGate.refreshSilently()

    guard permissionGate.snapshot.canCapture else {
        return
    }

    await captureCoordinator.begin(.interactive)
}
```

这样可以覆盖用户刚刚从系统设置返回、但应用还没有收到激活通知的情况。

## 七、修复失败后无法重试的问题

权限问题之外，还要注意截图状态机。

一个常见错误是入口只允许 `.idle`：

```swift
guard case .idle = state else {
    return
}
```

如果截图失败后状态变成：

```swift
.failed
```

用户再次点击截图就会直接返回，表现为“点击没有反应”。

更合理的做法是定义统一的可重试状态：

```swift
var isAvailableForNewRequest: Bool {
    switch state {
    case .idle, .failed:
        return true

    case .checkingPermissions,
         .preparing,
         .selecting,
         .capturing,
         .resultReady:
        return false
    }
}
```

入口使用：

```swift
guard captureCoordinator.isAvailableForNewRequest,
      scrollCaptureCoordinator.isAvailableForNewRequest
else {
    return
}
```

`begin()` 内部也必须使用相同判断：

```swift
func begin(_ intent: CaptureIntent) async {
    guard isAvailableForNewRequest else {
        return
    }

    // 创建新的 session 并开始截图
}
```

不能只修改菜单入口而不修改 coordinator，否则请求仍然会在底层被丢弃。

## 八、普通截图和长截图的权限要求

普通截图通常只需要：

```swift
try permissionGate.require([.screenCapture])
```

自动滚动长截图需要：

```swift
try permissionGate.require([
    .screenCapture,
    .accessibility
])
```

原因是自动滚动需要向其他应用发送滚轮事件，而这属于辅助功能权限控制范围。

如果缺少权限，应当：

1. 停止当前截图流程；
2. 不显示错误的预览窗口；
3. 不创建空的截图结果；
4. 打开权限提示窗口；
5. 保留普通截图和长截图入口的正确状态。

## 九、常见错误

### 错误一：只在应用启动时检查权限

```swift
init() {
    permission = checkPermission()
}
```

问题是用户在运行期间授权后，应用不会自动获取新状态。

### 错误二：只使用 `CGPreflightScreenCaptureAccess`

```swift
return CGPreflightScreenCaptureAccess()
```

这可能在权限刚切换时得到旧结果。

### 错误三：把多个检测结果直接做 OR

```swift
return canCreateDisplayStream()
    || canReadForeignWindowTitle()
```

这种写法在 TCC 状态同步过程中容易产生不稳定结果。

### 错误四：失败后只允许 idle

```swift
guard case .idle = state else {
    return
}
```

这会导致截图失败后无法直接重试。

### 错误五：权限窗口和实际截图权限使用两套判断

如果权限窗口显示“已开启”，但截图 coordinator 使用另一套缓存结果，用户仍然会遇到：

```text
设置中已授权
截图按钮却没有反应
```

权限状态应该由同一个 `PermissionGate` 统一管理。

## 十、总结

这个问题的根本原因通常有两个：

1. macOS 权限状态在应用运行期间发生变化，但应用没有重新探测；
2. 截图失败后状态停留在 `.failed`，入口却只允许 `.idle`。

参考代码通过以下方式解决第一类问题：

- 优先调用 `CGPreflightScreenCaptureAccess()`；
- 首次失败时读取其他应用窗口标题；
- 后续使用最小 `CGDisplayStream` 验证实际能力；
- 使用 `storedFlag` 区分首次和后续探测；
- 在应用激活、权限窗口显示和截图入口处刷新权限。

状态机修复则通过以下方式解决第二类问题：

- 将 `.idle` 和 `.failed` 都视为可发起新请求；
- 入口和 coordinator 使用同一个可用性判断；
- 失败后创建新的 session；
- 不再要求用户重启应用才能继续截图。

最终流程可以概括为：

```text
用户授权
  ↓
应用重新刷新权限
  ↓
备用探测确认实际能力
  ↓
PermissionGate 更新状态
  ↓
截图入口重新启用
  ↓
普通截图或长截图正常开始
```
```
