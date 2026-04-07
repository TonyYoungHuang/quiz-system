# CTCSOL 真题专题迁移到试卷一次性操作说明

## 本次用途

- 适用场景：`2025年6月真题`、`2025年9月真题` 已经导入到 `专题训练`，现在要一次性改到 `模拟训练/试卷`
- 本次方案不会新增后台长期入口，只提供一次性云函数
- 云函数默认会处理这两个专题，并把题目迁移到同名试卷

## 已新增文件

- `C:\Users\Administrator\Desktop\AiWeb\web\19.shauti-xiaochengxu\miniprogram\cloudfunctions\adminMoveTopicQuestionsToPaperOnce\index.js`
- `C:\Users\Administrator\Desktop\AiWeb\web\19.shauti-xiaochengxu\miniprogram\cloudfunctions\adminMoveTopicQuestionsToPaperOnce\package.json`

## 执行前准备

1. 在微信开发者工具里打开小程序工程
2. 右键上传并部署 `adminMoveTopicQuestionsToPaperOnce`
3. 确认后台已经登录过一次，拿到有效 `token`
4. 准备好 CTCSOL 科目的 `examId`

## 推荐执行顺序

### 1) 先做预检查

在云函数测试里传下面的参数：

```json
{
  "token": "这里填后台登录 token",
  "examId": "这里填 CTCSOL 科目 ID",
  "dryRun": true
}
```

说明：

- 不传 `mappings` 时，默认处理 `2025年6月真题` 和 `2025年9月真题`
- 预检查不会改动数据库；如果试卷不存在，只会提示正式执行时将自动创建同名试卷
- 预检查结果里会返回每个专题匹配到多少题，以及前 5 道样题预览

### 2) 确认无误后正式执行

```json
{
  "token": "这里填后台登录 token",
  "examId": "这里填 CTCSOL 科目 ID",
  "dryRun": false,
  "confirm": "MOVE_TOPIC_TO_PAPER_ONCE"
}
```

正式执行后会：

- 把专题下的题目写入对应 `paperId`
- 默认把原来的 `topicId` 清空，避免继续出现在 `专题训练`
- 如果 `papers` 集合里还没有同名试卷，会自动新建：
  - `2025年6月真题`
  - `2025年9月真题`

## 如果你的标题不是这两个默认名字

可以手动传 `mappings`：

```json
{
  "token": "这里填后台登录 token",
  "examId": "这里填 CTCSOL 科目 ID",
  "dryRun": false,
  "confirm": "MOVE_TOPIC_TO_PAPER_ONCE",
  "mappings": [
    {
      "topicTitle": "2025年6月真题",
      "paperTitle": "2025年6月真题",
      "paperYear": 2025,
      "paperOrder": 202506,
      "clearTopicId": true,
      "createPaperIfMissing": true
    },
    {
      "topicTitle": "2025年9月真题",
      "paperTitle": "2025年9月真题",
      "paperYear": 2025,
      "paperOrder": 202509,
      "clearTopicId": true,
      "createPaperIfMissing": true
    }
  ]
}
```

## 执行后核对

1. 后台 `试卷管理` 里确认已经出现 `2025年6月真题`、`2025年9月真题`
2. 小程序进入 `模拟训练/模拟考试`，确认能看到这两套题
3. 小程序进入 `专题训练`，确认这两套真题不再重复出现
4. 如需补图或继续修题，后续都在试卷路径下处理
