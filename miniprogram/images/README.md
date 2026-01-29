# 图片资源说明

本目录需要添加以下图片资源。

## Tab 图标 (tab/)

底部导航栏图标，建议尺寸：81x81 px

| 文件名 | 说明 |
|--------|------|
| home.png | 题库图标（未选中） |
| home-active.png | 题库图标（选中） |
| activate.png | 激活图标（未选中） |
| activate-active.png | 激活图标（选中） |
| mine.png | 我的图标（未选中） |
| mine-active.png | 我的图标（选中） |

## 功能图标 (icon/)

页面内使用的功能图标，建议尺寸：48x48 px

| 文件名 | 说明 |
|--------|------|
| search.png | 搜索图标 |
| default-exam.png | 默认科目图标 |
| unlock.png | 已解锁图标 |
| lock.png | 未解锁图标 |
| empty.png | 空状态图标 |
| empty-box.png | 空盒子图标 |
| back.png | 返回图标 |
| sheet.png | 答题卡图标 |
| close.png | 关闭图标 |
| arrow-right.png | 右箭头 |
| correct.png | 正确图标 |
| wrong.png | 错误图标 |
| default-avatar.png | 默认头像 |
| exam-list.png | 题目列表图标 |
| history.png | 历史记录图标 |
| about.png | 关于图标 |

## 快速获取图标

可以使用以下资源：

1. **Iconfont (阿里图标库)**
   https://www.iconfont.cn/

2. **WeUI (微信官方 UI 库)**
   https://github.com/Tencent/weui-wxss

3. **直接使用纯色方块临时替代**
   - 创建纯色图片作为占位符
   - 后期替换为正式图标

## 临时解决方案

如果暂时没有图标，可以在 WXML 中使用文本或 emoji 临时替代：

```xml
<!-- 替代图标 -->
<text>🔍</text>  <!-- search -->
<text>📚</text>  <!-- exam -->
<text>🔓</text>  <!-- unlock -->
<text>🔒</text>  <!-- lock -->
```
