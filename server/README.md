# Quiz System Server

多类目动态刷题系统后端服务 - 基于 Node.js + Express + MongoDB

## 功能特性

- **动态科目管理** - 后台可随时增删科目，前端自动加载
- **激活码系统** - 支持批量生成、核销、权限管理
- **题库管理** - 支持单选/多选/判断题，批量导入
- **权限控制** - 基于激活码的访问权限管理
- **API 限流** - 防止恶意请求和接口滥用

## 快速开始

### 1. 安装依赖

\`\`\`bash
npm install
\`\`\`

### 2. 配置环境变量

复制 \`.env.example\` 为 \`.env\` 并修改配置：

\`\`\`bash
cp .env.example .env
\`\`\`

\`\``env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/quiz_system
\`\``

### 3. 启动 MongoDB

确保 MongoDB 服务正在运行：

\`\`\`bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
\`\`\`

### 4. 启动服务器

\`\`\`bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
\`\`\`

服务器将在 http://localhost:3000 启动

## API 接口文档

### 基础响应格式

成功响应：
\`\`\`json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
\`\`\`

错误响应：
\`\`\`json
{
  "success": false,
  "message": "错误信息",
  "error": "详细错误"
}
\`\`\`

---

### 公开接口

#### 1. 获取科目列表
\`\`\`http
GET /api/v1/exams
\`\`\`

查询参数：
- \`category\` (可选) - 按分类筛选

示例：
\`\`\`bash
curl http://localhost:3000/api/v1/exams
curl http://localhost:3000/api/v1/exams?category=英语
\`\`\`

---

#### 2. 获取题目列表
\`\`\`http
GET /api/v1/questions/:examId
\`\`\`

查询参数：
- \`type\` (可选) - 题型筛选 (SINGLE/MULTI/JUDGE)
- \`userId\` (可选) - 用户ID（用于权限验证）

示例：
\`\`\`bash
curl "http://localhost:3000/api/v1/questions/507f1f77bcf86cd799439011?userId=wx_openid_123"
\`\`\`

---

#### 3. 激活码核销
\`\`\`http
POST /api/v1/activate
\`\`\`

请求体：
\`\`\`json
{
  "code": "ABC12345",
  "userId": "用户OpenID"
}
\`\`\`

示例：
\`\`\`bash
curl -X POST http://localhost:3000/api/v1/activate \\
  -H "Content-Type: application/json" \\
  -d '{"code":"ABC12345","userId":"wx_openid_123"}'
\`\`\`

---

#### 4. 检查用户权限
\`\`\`http
GET /api/v1/permissions/check?userId=xxx&examId=xxx
\`\`\`

---

### 管理员接口

#### 5. 创建科目
\`\`\`http
POST /api/v1/admin/exams
\`\`\`

请求体：
\`\`\`json
{
  "name": "教育心理学复习题库",
  "category": "专业课",
  "icon": "/uploads/icon.png",
  "description": "教资考试必备",
  "sortOrder": 10
}
\`\`\`

---

#### 6. 批量生成激活码
\`\`\`http
POST /api/v1/admin/codes/generate
\`\`\`

请求体：
\`\`\`json
{
  "examId": "507f1f77bcf86cd799439011",
  "count": 10,
  "source": "XHS",
  "note": "小红书活动"
}
\`\`\`

---

#### 7. 批量导入题目
\`\`\`http
POST /api/v1/admin/questions/import
\`\`\`

请求体：
\`\`\`json
{
  "examId": "507f1f77bcf86cd799439011",
  "questions": [
    {
      "type": "SINGLE",
      "content": "教育的本质是什么？",
      "options": [
        { "key": "A", "value": "培养人" },
        { "key": "B", "value": "传授知识" }
      ],
      "answer": "A",
      "explanation": "教育是一种培养人的社会活动"
    }
  ]
}
\`\`\`

---

## 数据模型

### Exam (科目表)
| 字段 | 类型 | 说明 |
|------|------|------|
| name | String | 科目名称 |
| category | String | 分类 |
| icon | String | 封面图 |
| isActive | Boolean | 是否启用 |
| questionCount | Number | 题目总数 |

### Question (题目表)
| 字段 | 类型 | 说明 |
|------|------|------|
| examId | ObjectId | 关联科目 |
| type | Enum | 题型：SINGLE/MULTI/JUDGE |
| content | String | 题干 |
| options | Array | 选项 |
| answer | Mixed | 正确答案 |
| explanation | String | 解析 |

### ActivationCode (激活码表)
| 字段 | 类型 | 说明 |
|------|------|------|
| code | String | 激活码（8-12位） |
| examId | ObjectId | 绑定科目 |
| isUsed | Boolean | 是否已使用 |
| userId | String | 使用者OpenID |
| source | Enum | 来源渠道 |

### UserPermission (权限表)
| 字段 | 类型 | 说明 |
|------|------|------|
| userId | String | 用户OpenID |
| examId | ObjectId | 科目ID |
| isPermanent | Boolean | 是否永久 |

---

## 项目结构

\`\`\`
server/
├── src/
│   ├── app.js                 # 主入口文件
│   ├── config/
│   │   └── database.js        # 数据库连接配置
│   ├── models/                # 数据模型
│   │   ├── Exam.js
│   │   ├── Question.js
│   │   ├── ActivationCode.js
│   │   └── UserPermission.js
│   ├── controllers/           # 控制器
│   │   ├── examController.js
│   │   ├── questionController.js
│   │   └── activationController.js
│   ├── routes/                # 路由
│   │   ├── examRoutes.js
│   │   ├── questionRoutes.js
│   │   └── activationRoutes.js
│   └── middleware/            # 中间件
│       ├── errorHandler.js
│       └── rateLimiter.js
├── .env.example               # 环境变量模板
├── .gitignore
└── package.json
\`\`\`

---

## 部署建议

### Docker 部署

\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "src/app.js"]
\`\`\`

### 生产环境注意事项

1. 修改 CORS 配置，限制允许的域名
2. 设置强密码和 JWT_SECRET
3. 启用 HTTPS
4. 配置反向代理（Nginx）
5. 设置 MongoDB 访问控制

---

## 许可证

MIT © 阿黄
