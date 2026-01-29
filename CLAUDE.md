# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **WeChat Mini Program Quiz System** (多类目动态刷题系统) that delivers digital learning materials via activation codes. The project has **two implementations**:

1. **WeChat Cloud Development Version** ([miniprogram/](miniprogram/)) - Serverless architecture using WeChat Cloud Base (云开发)
   - WeChat Cloud Functions (serverless)
   - WeChat Cloud Database (NoSQL)
   - Web admin panel on static hosting

2. **Node.js Backend Version** ([server/](server/)) - Traditional Express + MongoDB (alternative implementation)

**Current Active Implementation**: WeChat Cloud Development (云开发)

**Key Design Principle**: The backend can add/remove exam subjects dynamically without frontend code changes. The mini program fetches exams via cloud functions and renders them automatically.

---

## Architecture: Cloud Development Version

### Mini Program Structure

- **Entry**: [miniprogram/app.js](miniprogram/app.js) - App lifecycle, cloud init, global state (userId, activatedExams)
- **Config**: [miniprogram/app.json](miniprogram/app.json) - Pages, tabBar configuration
- **Project Config**: [miniprogram/project.config.json](miniprogram/project.config.json) - AppID (`wxf70f99e032a96c59`), cloud function root

### Cloud Functions ([miniprogram/cloudfunctions/](miniprogram/cloudfunctions/))

**User-Facing**:
- `getExams` - Fetch exam list (optional category filter)
- `getQuestions` - Get questions for specific exam
- `activateCode` - Redeem activation code (transaction-based)
- `checkPermission` - Verify user access to exam
- `getPermissions` - Get all user permissions

**Admin** (11 functions):
- `adminLogin` - Admin authentication (default password: `admin123`, token expires in 2 hours)
- `adminGetStats` - Dashboard statistics
- `adminGetExams` - List all exams
- `adminCreateExam` - Create new exam subject
- `adminUpdateExam` - Update exam details (name, category, icon, sortOrder)
- `adminDeleteExam` - Delete exam (cascades: questions, codes, permissions)
- `adminGetQuestions` - Get questions for management (with pagination, filters)
- `adminImportQuestions` - Batch import questions from CSV
- `adminGetCodes` - List activation codes with pagination
- `adminGenerateCodes` - Batch generate activation codes
- `adminDeleteCode` - Delete unused activation code

### Mini Program Pages

1. **[pages/index/](miniprogram/pages/index/)** - Exam list with category filter, search
2. **[pages/activate/](miniprogram/pages/activate/)** - Activation code redemption
3. **[pages/exam/](miniprogram/pages/exam/)** - Swiper-based quiz interface
4. **[pages/result/](miniprogram/pages/result/)** - Score display
5. **[pages/mine/](miniprogram/pages/mine/)** - User profile, activated exams

---

## Cloud Database Schema

**Collections**:

1. **exams** - Exam subjects
   - Fields: `_id`, `name`, `category`, `icon`, `sortOrder`
   - Indexes: `idx_active_sort`, `idx_category_active`

2. **questions** - Quiz questions
   - Fields: `_id`, `examId`, `type` (SINGLE/MULTI/JUDGE), `content`, `options`, `answer`, `explanation`, `sortOrder`
   - Indexes: `idx_exam_sort`, `idx_exam_type`

3. **activation_codes** - Activation codes
   - Fields: `_id`, `code` (8-12 chars), `examId`, `isUsed`, `userId`, `source` (MANUAL/XHS/TB/PDD/XY)
   - Unique index on `code`

4. **user_permissions** - User access permissions
   - Fields: `_id`, `userId`, `examId`, `isPermanent`, `expiresAt`, `createdAt`

5. **config** - System configuration (admin password, etc.)
6. **admin_tokens** - Admin session tokens (2-hour expiry)

---

## Development Workflow

### WeChat Developer Tools

1. Open `miniprogram/` directory in WeChat Developer Tools
2. Cloud environment: `cloud1-0g8twq2fde2fa6f0`
3. For local debugging: Enable "不校验合法域名" in DevTools settings

### Adding/Modifying Cloud Functions

1. Create folder in `miniprogram/cloudfunctions/functionName/`
2. Add `index.js` and `package.json`:
```json
{
  "name": "functionName",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```
3. Right-click folder → "上传并部署：云端安装依赖"
4. View logs: Cloud Development Console → Cloud Functions → Select function → Logs

### Static Website Hosting (Admin Panel)

**Note:** Web-based admin panel has limitations due to `wx.cloud` SDK restrictions. For direct database management, use the built-in **云后台** (Cloud Console → Database).

1. Cloud Development Console → Static Website Hosting → Enable (often enabled by default)
2. Upload `admin-web/index.html` to storage or static hosting
3. Access via provided URL or cloud storage download link
4. Default login password: `admin123`

### Admin Panel Features

- **Data Overview**: Statistics for exams, questions, codes, users
- **Exam Management**: Add/delete subjects
- **Question Import**: CSV batch import (supports pipe/comma delimiters)
- **Code Generation**: Batch generate activation codes with copy functionality

**Admin Token Management:**
- Tokens stored in `admin_tokens` collection
- 2-hour expiry from creation time
- Tokens auto-cleaned on expiry during login validation
- Each login generates new token

---

## Key Implementation Details

### Question Types

- **SINGLE** - Single choice (answer: `"A"`)
- **MULTI** - Multiple choice (answer: `["A","C"]`)
- **JUDGE** - True/False (answer: `"true"` or `"A"` for correct, `"false"` or `"B"` for incorrect)

### Activation Code Flow (Transaction-Based)

1. User enters 8-12 character code
2. Cloud function validates code exists and unused
3. Checks if code matches examId
4. Checks if user already has permission
5. **Atomic Transaction**: Uses database transaction to:
   - Mark activation code as used (`isUsed: true`, `userId: <openid>`)
   - Create permission record in `user_permissions` collection
   - Both operations succeed or both fail - ensures data integrity
6. User gains permanent access to exam

### Navigation Flow (Tab Bar Considerations)

Since `pages/activate/activate` is in tabBar, navigation uses `wx.switchTab` instead of `wx.navigateTo`. To pass examId to activate page:
1. Store pending exam in `app.globalData.pendingActivateExam`
2. Use `wx.switchTab` to navigate
3. Activate page reads from `globalData` in `onShow`

### Options Data Format

Questions stored with `options` as object: `{"A": "选项A", "B": "选项B"}`
Must be converted to array format for WXML rendering: `[{key: "A", value: "选项A"}, ...]`
See [miniprogram/pages/exam/exam.js](miniprogram/pages/exam/exam.js) loadQuestions() for conversion logic.

### CSV Import Format

Standard comma-delimited format:
```csv
题型,题目内容,A选项,B选项,C选项,D选项,答案,解析
单选题,以下哪个是正确的？,选项A,选项B,选项C,选项D,A,这是解析
多选题,以下哪些是正确的？,选项A,选项B,选项C,选项D,AB,这是解析
判断题,地球是圆的吗？,,,,,A,这是解析
```

Pipe-delimited format (also supported):
```csv
题型|题目内容|A选项|B选项|C选项|D选项|答案|解析
```

**Field Requirements:**
- `题型`: 单选题/多选题/判断题
- `答案`: SINGLE = A/B/C/D, MULTI = AB/ABC/ABCD, JUDGE = A (correct) or B (incorrect)
- 判断题 options can be empty
- UTF-8 encoding recommended

**Batch Processing:** Cloud functions limited to 20 records per operation. Import automatically batches, handling unlimited records.

---

## Architecture: Node.js Version (Alternative)

The `server/` directory contains a traditional Express + MongoDB implementation with similar functionality. This is **not actively used** but serves as an alternative deployment option.

See [server/README.md](server/README.md) for Node.js backend documentation.

---

## Documentation References

- [quiz_design.md](quiz_design.md) - Project vision, schema specifications, API reference
- [admin-web/DEPLOYMENT_GUIDE.md](admin-web/DEPLOYMENT_GUIDE.md) - Comprehensive deployment guide with CSV format details, troubleshooting, cost analysis
- [admin-web/README.md](admin-web/README.md) - Cloud admin panel quick start
- [server/README.md](server/README.md) - Node.js backend documentation
- [miniprogram/README.md](miniprogram/README.md) - Mini program feature descriptions

---

## Notes

- Project uses Chinese language throughout (comments, documentation, UI text)
- No build tools or test framework configured - pure JavaScript
- Cloud functions have execution time limits - batch operations process 20 records at a time
- Admin authentication uses simple password stored in database `config` collection
- Default admin password: `admin123` (change in production via cloud database console)
- Cloud environment ID: `cloud1-0g8twq2fde2fa6f0`
- Mini Program AppID: `wxf70f99e032a96c59`
- **云后台 (Cloud Console Database)** can be used for basic CRUD operations on all collections
- Activation code format: 8 characters, avoids confusing chars (0/O, 1/I), generated by `adminGenerateCodes`
