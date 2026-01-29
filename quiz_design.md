# 微信小程序：多类目动态刷题系统 (Quiz System V1.0)
**项目主理人：** 阿黄 (有阿黄，Ai不慌)

## 1. 项目愿景
本项目旨在为多平台（小红书、淘宝、拼多多、闲鱼）的数字化资料提供高性能交付方案。通过“在线刷题”增强资料附加值，支持后台动态增删科目，初期采用手动发码，预留 API 自动化接口。

---

## 2. 技术架构规范
- **前端**：微信小程序原生框架 (WXML/WXSS/JS)
- **后端**：Node.js (Express/NestJS) - 建议使用 Docker 部署
- **数据库**：MongoDB (非关系型数据库，完美支持题目解析中的复杂格式)

---

## 3. 数据库模型 (Data Schema)



### 3.1 Exam (考试科目表)
```json
{
  "id": "ObjectId",
  "name": "String",        // 示例：教育心理学复习题库
  "category": "String",    // 示例：英语/音乐/专业课
  "icon": "String",        // 封面图路径
  "isActive": "Boolean",   // 后端控制是否前端显示
  "createdAt": "Date"
}
### 3.2 Question (题目表)
JSON
{
  "id": "ObjectId",
  "examId": "ObjectId",    // 关联科目 ID
  "type": "Enum",          // SINGLE/MULTI/JUDGE
  "content": "String",     // 题干内容
  "options": ["String"],   // 选项列表
  "answer": ["String"],    // 正确答案
  "explanation": "String", // 答案解析
  "mediaUrl": "String"     // 预留：图片或音频 URL
}
### 3.3 ActivationCode (卡券激活码表)
JSON
{
  "code": "String",        // 8-12位唯一激活码
  "examId": "ObjectId",    // 绑定的科目
  "isUsed": "Boolean",     // 是否核销
  "userId": "String",      // 用户的 OpenID
  "source": "Enum",        // 来源：XHS/TB/PDD/XY/MANUAL
  "activatedAt": "Date"
}
## 4. 核心功能逻辑
### 4.1 动态类目加载逻辑
逻辑：小程序启动时请求 /api/v1/exams，前端通过 wx:for 渲染。

意义：阿黄无需修改代码，只需在数据库添加一条 Exam 记录，小程序首页自动出现新科目。

### 4.2 激活解锁逻辑 (V1.0)
获取方式：用户在淘宝/小红书下单后，店主手动发送激活码。

核销流程：用户输入 code -> 后端校验 code 是否存在且未被使用 -> 校验成功后在 UserPermission 表记录该用户对该 examId 的永久访问权。

### 4.3 自动化扩展 (V2.0 预留)
接口规范：已预留 POST /api/v1/codes/generate 接口，未来可通过 n8n 自动化调用。

## 5. API 接口参考清单
GET /api/v1/exams - 列表获取

GET /api/v1/questions/:examId - 题目拉取

POST /api/v1/activate - 激活码核销

POST /api/v1/admin/import - 后端题目批量导入

## 6. Claude Code 启动指令
请将以下 Prompt 发送给 Claude：
"