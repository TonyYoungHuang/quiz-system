# CTCSOL PDF 导入说明

## 当前结论

- 这份 `历年CTCSOL笔试真题集（2014-2025年）2025.2.1.pdf` 不是纯扫描件，文本可以抽取。
- 题型已经超出普通扁平 CSV：
  - 普通单选题
  - A-F / A-G 选项题
  - 图片题
  - 材料题 / 题组题
  - 简答/开放类主观题
- 小程序前台已经支持：
  - 图片展示
  - 材料题子题展示
  - 表格 / 公式块展示
  - 图片点击放大预览
- 后台导入现在支持两条链路：
  - `CSV`：适合普通题
  - `JSON`：适合材料题、配图题、子题结构

## 本次新增

### 1. 后台 JSON 导入

后台 `题目导入` 模态框已支持：

- 切换 `CSV / JSON`
- 读取 `.csv` / `.json`
- JSON 预检
- 下载 JSON 模板

### 2. 云函数结构化导入

`adminImportQuestions` 现在支持：

- `A-G` 选项
- `CASE` 材料题
- `stem`
- `analysis`
- `media`
- `children`

### 3. CTCSOL PDF 解析脚本

新增脚本：

- `tools/ctcsol_pdf_to_import_json.py`

用途：

- 直接读取 CTCSOL PDF
- 自动抽取一批可直接导入后台的客观题
- 自动产出 `questions`
- 把图片题 / 共享选项题 / 题组题列入 `reviewItems`

## 使用步骤

### 第一步：重新部署云函数

需要重新上传部署：

- `miniprogram/cloudfunctions/adminImportQuestions`

建议方式：

- 微信开发者工具
- 右键函数目录
- `上传并部署：云端安装依赖`

### 第二步：刷新后台网页

- 打开后台页面
- `Ctrl + F5` 强刷

### 第三步：运行 PDF 解析脚本

```powershell
python "C:\Users\Administrator\Desktop\AiWeb\web\19.shauti-xiaochengxu\tools\ctcsol_pdf_to_import_json.py" `
  "C:\Users\Administrator\Desktop\历年CTCSOL笔试真题集（2014-2025年）2025.2.1.pdf" `
  -o "C:\Users\Administrator\Desktop\AiWeb\web\19.shauti-xiaochengxu\tmp_ctcsol_import.json"
```

### 第四步：后台导入 JSON

- 进入后台 `题目管理`
- 点击 `批量导入`
- 选择科目
- 数据格式选 `JSON`
- 选择 `tmp_ctcsol_import.json`
- 看预检结果
- 再执行导入

## 当前限制

这条链路已经能替代你手工做 CSV，但还不能承诺“整本 PDF 零人工复核 100% 正确入库”。

当前必须人工复核的主要是：

- 原题依赖图片本体的题
- 多题共用一段材料 / 共用一组选项的题组
- PDF 抽取时跨题串行的少量边界题

也就是说：

- `普通单题`：可以直接自动导入
- `复杂题 / 图题 / 题组题`：可以识别并筛出来，但建议人工复核后再入库

## 建议做法

最稳的顺序是：

1. 先把 `tmp_ctcsol_import.json` 导进测试科目
2. 抽查导入结果
3. 根据 `reviewItems` 补复杂题和图片题
4. 抽查无误后再导入正式科目
