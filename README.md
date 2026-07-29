# yezi0052.github.-

全屋定制墙板网站代码。

## 后台入口

线上后台地址：

https://yezi0052.github.-/admin

后台用于修改首页的品牌、导航、首屏文案、服务数据、预约表单、空间方案、定制流程、实景案例、材料工艺、预算估算、门店信息、图片地址和页脚文字。保存后会自动提交到 GitHub，并触发 GitHub Pages 重新部署。

后台的“墙板照片管理”支持直接选择 JPG、PNG、WebP 图片，上传到 `public/uploads` 后会自动填写到所选网页位置。照片上传完成后仍需点击“保存并部署”，让新的图片地址写入网站内容。

## 后台登录方式

后台使用 GitHub Personal Access Token 登录，不需要单独的账号密码。

创建 Token 时建议选择 Fine-grained personal access token：

- Repository access：选择 `yezi0052/yezi0052.github.-`
- Permissions：`Contents` 选择 `Read and write`

Token 只在浏览器里使用，不要发给别人，也不要提交到代码仓库。

## 本地运行

```bash
pnpm install
pnpm dev
```

打开：

http://127.0.0.1:3000

后台：

http://127.0.0.1:3000/admin
