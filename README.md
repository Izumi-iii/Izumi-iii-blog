# Izumi-iii Blog

这是 `www.izumiiii.asia` 的 Hexo 源码仓库。

## 网页发布文章

打开 [博客管理台](https://www.izumiiii.asia/admin/)，输入一个只允许访问
`Izumi-iii/Izumi-iii-blog` 仓库 Contents 读写权限的 GitHub Fine-grained token。

登录后可以：

- 新建、编辑和删除 Markdown 文章
- 设置标题、日期、标签和分类
- 在发布前预览正文

Token 保存在当前标签页的会话中，刷新后会自动恢复登录。日期按上海时间填写；
只修改正文时会保留原日期的秒数和时区信息。编辑文章时，管理台会保留其他 YAML
元数据（例如封面、摘要、置顶和自定义字段），但 YAML 的排版和注释可能改变。
标签和分类支持中英文逗号分隔。

正文预览支持表格、引用、有序与嵌套列表、任务列表、删除线、代码块、图片、链接和
各级标题。预览保留安全的 HTML 排版，过滤脚本、事件处理器和危险链接。
代码高亮、Hexo 标签插件及主题的最终样式以博客页面为准。

保存成功后可以继续编辑并再次保存。重命名文件会在同一次提交中更新新旧路径；
遇到版本冲突时，先复制未保存的正文，再重新打开文章核对最新内容。

提交文章后，GitHub Actions 会自动构建并发布网站。通常等待几十秒即可看到更新。

## 本地开发

```bash
npm install
npm run build
npm run server
```

本地预览地址是 `http://localhost:4000/`。

运行管理台回归测试：

```bash
npm test
```

测试使用模拟的 GitHub API，不会向真实仓库写入内容。
管理台的浏览器依赖及许可证位于 `source/admin/vendor/`，直接从本站加载：

| 依赖 | 版本 | 用途 |
| --- | --- | --- |
| [js-yaml](https://github.com/nodeca/js-yaml) | 4.3.2 | YAML 元数据读写 |
| [Marked](https://marked.js.org/) | 15.0.12 | Markdown 预览，与 Hexo 使用的解析器版本一致 |
| [DOMPurify](https://github.com/cure53/DOMPurify) | 3.4.15 | 清理预览 HTML |

文件来自按本仓库锁文件安装的依赖；更新时需同步许可证并运行回归测试。

## 文章目录

文章源码位于 `source/_posts/`。标签使用 YAML 数组，每个标签独占一项。
`source/_drafts/` 存放未发布的草稿，正常构建不包含这些内容；原测试文章已移入此处。
如需本地查看草稿，运行 `npm run server -- --draft`。网页管理台目前仅编辑正式文章。

关于页正文位于 `source/about/index.md`，名字、简介和社交链接在 `_config.fluid.yml`
的 `about` 配置中。自定义域名文件位于 `source/CNAME`。

## 视觉与动效

Fluid 的视觉增强通过 `source/css/refinement.css` 和 `source/js/refinement.js` 加载，
入口配置在 `_config.fluid.yml` 的 `custom_css` / `custom_js`，无需修改主题依赖。
首页包含光晕背景、卡片渐入和悬停反馈；文章页调整阅读排版并增加顶部阅读进度。
页面切换淡入淡出在支持跨页 View Transitions 的浏览器中生效。

滚动保持原生行为。光晕离开视口或标签页隐藏时暂停；开启系统“减少动态效果”
后关闭动画和视差，内容仍可直接阅读。不支持相关浏览器功能时保留基础布局。
