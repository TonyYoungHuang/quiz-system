# 微信刷题小程序前端

基于原生微信小程序框架开发的在线刷题应用。

## 项目结构

```
miniprogram/
├── pages/                  # 页面目录
│   ├── index/             # 首页（科目列表）
│   ├── activate/          # 激活码页面
│   ├── exam/              # 答题页面
│   ├── result/            # 结果页面
│   └── mine/              # 个人中心
├── utils/                 # 工具函数
│   ├── api.js            # API 接口封装
│   └── util.js           # 通用工具函数
├── images/               # 图片资源（需自行添加）
├── app.js                # 小程序入口
├── app.json              # 小程序配置
├── app.wxss              # 全局样式
└── sitemap.json          # 站点地图
```

## 功能页面

### 1. 首页 (pages/index)
- 展示所有科目列表
- 支持按分类筛选
- 支持搜索功能
- 显示科目激活状态

### 2. 激活页 (pages/activate)
- 输入激活码解锁科目
- 显示已激活的科目列表
- 快速进入答题

### 3. 答题页 (pages/exam)
- 支持单选、多选、判断三种题型
- 答题卡快速跳转
- 实时显示答题进度
- 答案解析展示

### 4. 结果页 (pages/result)
- 显示答题得分
- 正确率统计
- 鼓励评价

### 5. 个人中心 (pages/mine)
- 用户信息展示
- 已激活科目统计
- 功能入口

## 配置说明

### 修改 API 地址

在 `app.js` 中修改 `baseUrl`：

```javascript
globalData: {
  baseUrl: 'http://localhost:3000/api/v1',  // 开发环境
  // baseUrl: 'https://your-domain.com/api/v1',  // 生产环境
}
```

### 图片资源

需要在 `images/` 目录下添加以下图片：

```
images/
├── tab/                  # 底部导航图标
│   ├── home.png
│   ├── home-active.png
│   ├── activate.png
│   ├── activate-active.png
│   ├── mine.png
│   └── mine-active.png
└── icon/                 # 功能图标
    ├── search.png
    ├── default-exam.png
    ├── unlock.png
    ├── lock.png
    ├── empty.png
    ├── empty-box.png
    ├── back.png
    ├── sheet.png
    ├── close.png
    ├── arrow-right.png
    ├── correct.png
    ├── wrong.png
    ├── default-avatar.png
    ├── exam-list.png
    ├── history.png
    └── about.png
```

## 测试账号

测试激活码（由服务端生成）：
```
J2Q53KMSB6  - 教育心理学
VPAS3ZLS7A  - 英语四级
7MFVGWEMA5  - 音乐理论
A8CV89NWBN  - 计算机二级
```

## 开发指南

### 在微信开发者工具中打开

1. 打开微信开发者工具
2. 选择 "导入项目"
3. 选择本目录
4. 填写 AppID（测试可使用测试号）

### 本地调试

确保后端服务运行在 `http://localhost:3000`

在开发者工具中：
- 勾选 "不校验合法域名"
- 勾选 "不校验 web-view (业务域名)"

## API 接口

详见服务端 API 文档：`server/README.md`

---

**开发者**: 阿黄
**版本**: 1.0.0
