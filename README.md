# Izumi-iii Blog

这是 `www.izumiiii.asia` 的 Hexo 源码仓库。

## 网页发布文章

打开 [博客管理台](https://www.izumiiii.asia/admin/)，输入一个只允许访问
`Izumi-iii/Izumi-iii-blog` 仓库 Contents 读写权限的 GitHub Fine-grained token。

登录后可以：

- 新建、编辑和删除 Markdown 文章
- 设置标题、日期、标签和分类
- 在发布前预览正文

提交文章后，GitHub Actions 会自动构建并发布网站。通常等待几十秒即可看到更新。

## 本地开发

```bash
npm install
npm run build
npm run server
```

本地预览地址是 `http://localhost:4000/`。

## 文章目录

文章源码位于 `source/_posts/`。自定义域名文件位于 `source/CNAME`。
