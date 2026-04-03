import json
import re
from datetime import datetime
from pathlib import Path

from pypdf import PdfReader


REPO_ROOT = Path(__file__).resolve().parents[1]
SOURCE_JSON = REPO_ROOT / "tmp_ctcsol_import.json"
MASTER_JSON = REPO_ROOT / "CTCSOL_正式导入总包.json"
PACKAGE_DIR = REPO_ROOT / "CTCSOL_正式导入分包"
CHECKLIST_MD = REPO_ROOT / "CTCSOL_材料题待处理清单.md"
PDF_GLOB_ROOT = Path(r"C:\Users\Administrator\Desktop")
RANGE_RE = re.compile(r"第\s*(\d{1,3})-(\d{1,3})\s*题")
FIRST_QUESTION_RE_TEMPLATE = r"(?<!\d){qno}\."
YEAR_RE = re.compile(r"(20\d{2})")
PAGE_TAG_RE = re.compile(r"\[PAGE (\d+)\]")


def load_source_data():
    return json.loads(SOURCE_JSON.read_text(encoding="utf-8"))


def find_pdf_path():
    matches = sorted(PDF_GLOB_ROOT.glob("*CTCSOL*pdf"))
    if not matches:
        raise FileNotFoundError("未找到 CTCSOL PDF 文件")
    return matches[0]


def load_pdf_pages(pdf_path):
    reader = PdfReader(str(pdf_path))
    pages = []
    for index, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").replace("\u3000", " ")
        text = re.sub(r"\s+", " ", text).strip()
        pages.append({
            "page": index,
            "text": text
        })
    return pages


def build_set_ranges(answer_pages, set_summaries, pages):
    ranges = []
    start_page = 1
    for set_index, answer_page in enumerate(answer_pages, start=1):
        end_page = answer_page - 1
        title = ""
        if set_index - 1 < len(set_summaries):
            title = set_summaries[set_index - 1].get("title", "")
        year_match = YEAR_RE.search(title)
        year = year_match.group(1) if year_match else ""
        set_pages = [page for page in pages if start_page <= page["page"] <= end_page]
        ranges.append({
            "setIndex": set_index,
            "startPage": start_page,
            "endPage": end_page,
            "answerPage": answer_page,
            "title": title,
            "year": year,
            "pages": set_pages
        })
        start_page = answer_page + 1
    return ranges


def get_set_index_by_page(page_no, set_ranges):
    for item in set_ranges:
        if item["startPage"] <= page_no <= item["endPage"]:
            return item["setIndex"]
    return None


def build_question_index(questions, set_ranges):
    indexed = []
    by_set_and_no = {}
    for question in questions:
        set_index = get_set_index_by_page(question["sourcePage"], set_ranges)
        key = (set_index, question["sourceQuestionNo"])
        entry = {
            **question,
            "sourceSetIndex": set_index
        }
        indexed.append(entry)
        by_set_and_no.setdefault(key, []).append(entry)
    return indexed, by_set_and_no


def build_review_index(review_items, set_ranges):
    indexed = []
    by_set_and_no = {}
    for item in review_items:
        set_index = get_set_index_by_page(item["page"], set_ranges)
        entry = {
            **item,
            "sourceSetIndex": set_index
        }
        indexed.append(entry)
        by_set_and_no.setdefault((set_index, item["questionNo"]), []).append(entry)
    return indexed, by_set_and_no


def classify_case_type(block_text, context_text):
    text = f"{context_text}\n{block_text}"
    if any(keyword in text for keyword in ["上图", "下图", "图中", "图片", "图示", "上表", "下表", "图表"]):
        return "图表/图片材料题"
    if any(keyword in text for keyword in ["请排列", "第一步", "第二步", "第三步", "第四步", "第五步"]):
        return "共享步骤/排序题组"
    if any(keyword in text for keyword in ["作文", "短文", "案例", "活动计划", "课堂活动", "学生作文", "课文"]):
        return "文字材料题"
    if text.count("：") >= 2 or any(keyword in text for keyword in ["说：", "问：", "答："]):
        return "对话材料题"
    if any(keyword in text for keyword in ["请选出", "其中有一个多余选项", "A-G", "A B C D E F", "A B C D E F G"]):
        return "共享选项题组"
    if any(keyword in text for keyword in ["上文", "下文", "根据材料", "根据上文", "根据下文", "上述"]):
        return "依赖上文材料题"
    return "题组材料/共享上下文"


def clean_context_text(text):
    text = re.sub(r"\[PAGE \d+\]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def find_material_ranges(set_item, question_lookup, review_lookup):
    joined_parts = []
    for page in set_item["pages"]:
        joined_parts.append(f"[PAGE {page['page']}] {page['text']}")
    joined_text = "\n".join(joined_parts)

    matches = list(RANGE_RE.finditer(joined_text))
    results = []
    for index, match in enumerate(matches):
        start_no = int(match.group(1))
        end_no = int(match.group(2))
        block_end = matches[index + 1].start() if index + 1 < len(matches) else len(joined_text)
        block_text = joined_text[match.start():block_end].strip()
        content_after_heading = joined_text[match.end():block_end].strip()

        first_question_re = re.compile(FIRST_QUESTION_RE_TEMPLATE.format(qno=start_no))
        first_question_match = first_question_re.search(content_after_heading)
        if first_question_match:
            context_text = content_after_heading[:first_question_match.start()].strip()
        else:
            context_text = content_after_heading

        context_text = clean_context_text(context_text)
        snippet_source = context_text or clean_context_text(content_after_heading[:220])
        snippet = snippet_source[:220]

        direct_import_entries = []
        review_entries = []
        child_pages = []
        for qno in range(start_no, end_no + 1):
            direct_import_entries.extend(question_lookup.get((set_item["setIndex"], qno), []))
            review_entries.extend(review_lookup.get((set_item["setIndex"], qno), []))
        child_pages.extend(entry["sourcePage"] for entry in direct_import_entries)
        child_pages.extend(entry["page"] for entry in review_entries)
        if child_pages:
            page_start = min(child_pages)
            page_end = max(child_pages)
        else:
            current_page_match = PAGE_TAG_RE.search(block_text)
            page_start = int(current_page_match.group(1)) if current_page_match else set_item["startPage"]
            page_end = page_start

        results.append({
            "setIndex": set_item["setIndex"],
            "setTitle": set_item["title"],
            "year": set_item["year"],
            "rangeStart": start_no,
            "rangeEnd": end_no,
            "pageStart": page_start,
            "pageEnd": page_end,
            "childQuestionCount": end_no - start_no + 1,
            "directImportCount": len(direct_import_entries),
            "reviewCount": len(review_entries),
            "caseType": classify_case_type(block_text, context_text),
            "snippet": snippet,
            "action": f"按 CASE 重构，stem 放公共材料，children 放 {start_no}-{end_no} 题。"
        })
    return results


def build_release_questions(source_questions, set_ranges):
    items = []
    for question in source_questions:
        set_index = get_set_index_by_page(question["sourcePage"], set_ranges)
        set_item = next((item for item in set_ranges if item["setIndex"] == set_index), None)
        normalized = {
            "type": question["type"],
            "content": question["content"],
            "options": question["options"],
            "answer": question["answer"],
            "explanation": question.get("explanation", ""),
            "sourcePage": question["sourcePage"],
            "sourceQuestionNo": question["sourceQuestionNo"],
            "sourceSetIndex": set_index,
            "sourceYear": set_item["year"] if set_item else "",
            "sourceSetTitle": set_item["title"] if set_item else ""
        }
        if question.get("needsMediaReview"):
            normalized["needsMediaReview"] = True
            normalized["mediaReviewReason"] = "题干提到图片或图示，正式使用前请在后台补图。"
        items.append(normalized)

    items.sort(key=lambda item: (item["sourceSetIndex"] or 999, item["sourceQuestionNo"], item["sourcePage"]))
    for index, item in enumerate(items, start=1):
        item["sortOrder"] = index
    return items


def write_master_json(pdf_path, questions):
    payload = {
        "meta": {
            "sourcePdf": str(pdf_path),
            "generatedAt": datetime.now().isoformat(timespec="seconds"),
            "questionCount": len(questions),
            "packageStrategy": "第 1 包覆盖导入，后续分包追加导入",
            "note": "这是基于当前 CTCSOL PDF 的兼容版正式导入总包。材料题/共享选项题请继续参考《CTCSOL_材料题待处理清单.md》转成 CASE。"
        },
        "questions": questions
    }
    MASTER_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def write_package_jsons(pdf_path, questions):
    PACKAGE_DIR.mkdir(parents=True, exist_ok=True)
    package_size = 100
    packages = [questions[index:index + package_size] for index in range(0, len(questions), package_size)]

    for index, package_questions in enumerate(packages, start=1):
        if index <= 10:
            filename = f"CTCSOL_正式导入包_{index:02d}.json"
        else:
            filename = f"CTCSOL_正式导入包_{index:02d}_余量{len(package_questions)}题.json"

        payload = {
            "meta": {
                "sourcePdf": str(pdf_path),
                "generatedAt": datetime.now().isoformat(timespec="seconds"),
                "packageIndex": index,
                "packageCount": len(packages),
                "questionCount": len(package_questions),
                "sortOrderStart": package_questions[0]["sortOrder"],
                "sortOrderEnd": package_questions[-1]["sortOrder"],
                "importModeSuggestion": "覆盖导入" if index == 1 else "追加导入"
            },
            "questions": package_questions
        }
        (PACKAGE_DIR / filename).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def write_checklist(pdf_path, material_ranges, direct_count, review_count):
    lines = []
    lines.append("# CTCSOL 材料题待处理清单")
    lines.append("")
    lines.append(f"- 源 PDF：`{pdf_path}`")
    lines.append(f"- 生成时间：`{datetime.now().isoformat(timespec='seconds')}`")
    lines.append(f"- 兼容版普通导入题：`{direct_count}` 道")
    lines.append(f"- 原始 reviewItems：`{review_count}` 条")
    lines.append(f"- 扫描到的题组/共享材料范围：`{len(material_ranges)}` 组")
    lines.append("")
    lines.append("## 使用原则")
    lines.append("")
    lines.append("- 下面列出的范围题，不应继续按独立 `SINGLE` 题长期保留。")
    lines.append("- 正式结构应改成一个 `CASE` 顶层题：`stem` 放公共材料，`media` 放图片/表格，`children` 放后续子题。")
    lines.append("- 当前兼容版导入包可先覆盖旧测试题，但这些范围题后续应逐批替换为 `CASE`。")
    lines.append("")
    lines.append("## 推荐 CASE 结构")
    lines.append("")
    lines.append("```json")
    lines.append('{')
    lines.append('  "type": "CASE",')
    lines.append('  "content": "材料题标题",')
    lines.append('  "stem": [{ "type": "text", "content": { "zh": "这里放公共材料正文" } }],')
    lines.append('  "media": [{ "type": "image", "url": "这里放材料图 URL" }],')
    lines.append('  "children": [')
    lines.append('    {')
    lines.append('      "type": "SINGLE",')
    lines.append('      "content": "子题题干",')
    lines.append('      "options": { "A": "选项A", "B": "选项B", "C": "选项C", "D": "选项D" },')
    lines.append('      "answer": "A"')
    lines.append('    }')
    lines.append('  ]')
    lines.append('}')
    lines.append("```")
    lines.append("")

    current_year = None
    for item in material_ranges:
        year_label = item["year"] or f"第{item['setIndex']}套"
        if year_label != current_year:
            if current_year is not None:
                lines.append("")
            lines.append(f"## {year_label}")
            lines.append("")
            lines.append("| 题号范围 | 页码 | 类型 | 当前兼容导入数 | review 条数 | 处理建议 | 材料摘录 |")
            lines.append("| --- | --- | --- | --- | --- | --- | --- |")
            current_year = year_label

        page_text = str(item["pageStart"]) if item["pageStart"] == item["pageEnd"] else f"{item['pageStart']}-{item['pageEnd']}"
        range_text = f"{item['rangeStart']}-{item['rangeEnd']}"
        snippet = item["snippet"].replace("|", "\\|")
        action = item["action"].replace("|", "\\|")
        lines.append(
            f"| {range_text} | {page_text} | {item['caseType']} | {item['directImportCount']} | "
            f"{item['reviewCount']} | {action} | {snippet} |"
        )

    CHECKLIST_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    source = load_source_data()
    pdf_path = find_pdf_path()
    pages = load_pdf_pages(pdf_path)
    set_ranges = build_set_ranges(source["meta"]["answerPages"], source.get("setSummaries", []), pages)
    questions, question_lookup = build_question_index(source["questions"], set_ranges)
    review_items, review_lookup = build_review_index(source["reviewItems"], set_ranges)

    release_questions = build_release_questions(questions, set_ranges)
    material_ranges = []
    for set_item in set_ranges[1:]:
        material_ranges.extend(find_material_ranges(set_item, question_lookup, review_lookup))

    material_ranges.sort(key=lambda item: (item["setIndex"], item["rangeStart"]))

    write_master_json(pdf_path, release_questions)
    write_package_jsons(pdf_path, release_questions)
    write_checklist(pdf_path, material_ranges, len(release_questions), len(review_items))

    print(f"master_questions={len(release_questions)}")
    print(f"package_dir={PACKAGE_DIR}")
    print(f"package_count={(len(release_questions) + 99) // 100}")
    print(f"material_ranges={len(material_ranges)}")
    print(f"checklist={CHECKLIST_MD}")


if __name__ == "__main__":
    main()
