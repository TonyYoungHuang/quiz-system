from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List, Tuple

import fitz


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PDF = ROOT / ".codex-runtime" / "china_culture_notes.pdf"
SOURCE_LABEL = r"E:\对外汉语资料内容\基础知识补充\中国文化要略复习笔记.pdf"
OUTPUT_DIR = ROOT / "artifacts" / "china_culture_outline"
OUTPUT_JSON = OUTPUT_DIR / "china_culture_outline_import.json"
OUTPUT_REVIEW = OUTPUT_DIR / "china_culture_outline_review.md"


CHAPTER_RE = re.compile(r"^第([一二三四五六七八九十百0-9]+)章")
ITEM_RE = re.compile(r"^(\d{1,3})\.\s*(.+)$")


@dataclass
class SourceItem:
    chapter: str
    chapter_title: str
    item_no: int
    source_page: int
    text: str


def normalize_line(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "")
    text = text.replace("\u3000", " ")
    text = text.strip()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])", "", text)
    text = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=[A-Za-z0-9])", "", text)
    text = re.sub(r"(?<=[A-Za-z0-9])\s+(?=[\u4e00-\u9fff])", "", text)
    text = re.sub(r"\(\s+", "(", text)
    text = re.sub(r"\s+\)", ")", text)
    return text


def is_noise_line(text: str) -> bool:
    if not text:
        return True
    if text == "K.Y.Z.2008":
        return True
    if text.isdigit():
        return True
    return False


def detect_chapter_title(lines: List[str], start_index: int) -> Tuple[str, int]:
    titles: List[str] = []
    index = start_index + 1
    while index < len(lines):
        line = lines[index]
        if is_noise_line(line):
            index += 1
            continue
        if ITEM_RE.match(line) or CHAPTER_RE.match(line):
            break
        if len(line) <= 20:
            titles.append(line)
            index += 1
            continue
        break
    if not titles:
        return "", start_index + 1
    title = Counter(titles).most_common(1)[0][0]
    return title, index


def extract_items_from_pdf(pdf_path: Path) -> List[SourceItem]:
    doc = fitz.open(pdf_path)
    current_chapter = ""
    current_title = ""
    items: List[SourceItem] = []
    current_item: SourceItem | None = None

    for page_index in range(doc.page_count):
        raw_lines = [normalize_line(line) for line in doc.load_page(page_index).get_text("text").splitlines()]
        lines = [line for line in raw_lines if not is_noise_line(line)]
        line_index = 0
        while line_index < len(lines):
            line = lines[line_index]
            chapter_match = CHAPTER_RE.match(line)
            if chapter_match:
                current_chapter = chapter_match.group(0)
                current_title, line_index = detect_chapter_title(lines, line_index)
                if current_item:
                    items.append(current_item)
                    current_item = None
                continue

            item_match = ITEM_RE.match(line)
            if item_match:
                if current_item:
                    items.append(current_item)
                current_item = SourceItem(
                    chapter=current_chapter,
                    chapter_title=current_title,
                    item_no=int(item_match.group(1)),
                    source_page=page_index + 1,
                    text=item_match.group(2).strip(),
                )
                line_index += 1
                continue

            if current_item:
                current_item.text = f"{current_item.text} {line}".strip()
            line_index += 1

    if current_item:
        items.append(current_item)
    return [SourceItem(item.chapter, item.chapter_title, item.item_no, item.source_page, clean_item_text(item.text)) for item in items]


def clean_item_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"\s*第[一二三四五六七八九十百0-9]+章.*$", "", text)
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])", "", text)
    text = re.sub(r"(?<=[。；：，])\s+", "", text)
    text = text.strip(" ;；")
    return text.strip()


def extract_paren_groups(text: str) -> List[str]:
    groups: List[str] = []
    depth = 0
    start = -1
    for index, ch in enumerate(text):
        if ch == "(":
            if depth == 0:
                start = index + 1
            depth += 1
        elif ch == ")":
            if depth > 0:
                depth -= 1
                if depth == 0 and start != -1:
                    groups.append(text[start:index].strip())
    return [clean_answer_text(group) for group in groups if clean_answer_text(group)]


def replace_top_level_parens_with_blank(text: str) -> str:
    result: List[str] = []
    depth = 0
    for ch in text:
        if ch == "(":
            if depth == 0:
                result.append("____")
            depth += 1
            continue
        if ch == ")":
            if depth > 0:
                depth -= 1
            continue
        if depth == 0:
            result.append(ch)
    prompt = "".join(result)
    prompt = re.sub(r"____+", "____", prompt)
    prompt = re.sub(r"\s+", " ", prompt).strip()
    prompt = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])", "", prompt)
    return prompt


def clean_answer_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "").strip()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])", "", text)
    return text.strip(" ;；。")


def split_list_answers(text: str) -> List[str]:
    text = clean_answer_text(text)
    if not text:
        return []
    if any(mark in text for mark in ["。", "?", "？"]):
        return []
    parts = [clean_answer_text(part) for part in re.split(r"[、,，;；]", text)]
    parts = [part for part in parts if part]
    return parts


def build_list_prompt(label: str, answers: List[str]) -> str:
    blanks = "、".join(["____"] * len(answers))
    if label.endswith(("有", "包括", "分为", "是")):
        return f"{label}{blanks}。"
    return f"{label}是{blanks}。"


def build_short_question(item: SourceItem, sort_order: int) -> dict:
    prompt = item.text
    if not prompt.endswith(("。", "？", "?")):
        prompt = f"{prompt}。"
    return {
        "type": "SHORT",
        "content": prompt,
        "stem": [{"type": "text", "content": {"zh": prompt}}],
        "answer": item.text,
        "explanation": item.text,
        "analysis": [{"type": "text", "content": {"zh": item.text}}],
        "autoFullScore": True,
        "sortOrder": sort_order,
        "sourcePage": item.source_page,
        "sourceQuestionNo": sort_order,
    }


def build_blank_question(prompt: str, answers: List[str], item: SourceItem, sort_order: int) -> dict:
    prompt = prompt.strip()
    if not prompt.endswith(("。", "？", "?")):
        prompt = f"{prompt}。"
    return {
        "type": "BLANK",
        "content": prompt,
        "stem": [{"type": "text", "content": {"zh": prompt}}],
        "answer": answers,
        "explanation": item.text,
        "analysis": [{"type": "text", "content": {"zh": item.text}}],
        "sortOrder": sort_order,
        "sourcePage": item.source_page,
        "sourceQuestionNo": sort_order,
    }


def convert_item_to_question(item: SourceItem, sort_order: int) -> Tuple[dict, str]:
    text = item.text
    if not text:
        return build_short_question(item, sort_order), "empty-fallback"

    paren_answers = extract_paren_groups(text)
    if paren_answers:
        prompt = replace_top_level_parens_with_blank(text)
        if "____" in prompt and len(prompt) <= 220:
            return build_blank_question(prompt, paren_answers, item, sort_order), "paren-blank"

    if ":" in text or "：" in text:
        label, right = re.split(r"[:：]", text, maxsplit=1)
        label = clean_answer_text(label)
        right = clean_answer_text(right)
        list_answers = split_list_answers(right)
        if (
            1 <= len(list_answers) <= 8
            and len(right) <= 60
            and all(len(answer) <= 18 for answer in list_answers)
            and "定义" not in label
            and not any("包括" in answer or "在内" in answer for answer in list_answers)
        ):
            prompt = build_list_prompt(label, list_answers)
            return build_blank_question(prompt, list_answers, item, sort_order), "colon-list"
        if right and len(right) <= 20:
            prompt = f"{label}是____。"
            return build_blank_question(prompt, [right], item, sort_order), "colon-single"
        if right.startswith("即") and len(right[1:].strip("，,。")) <= 24:
            answer = clean_answer_text(right[1:].strip("，,。"))
            prompt = f"{label}是____。"
            return build_blank_question(prompt, [answer], item, sort_order), "colon-aka"

    match = re.match(r"^(.+?)是(.+)$", text)
    if match:
        subject = clean_answer_text(match.group(1))
        predicate = clean_answer_text(match.group(2))
        if predicate and len(predicate) <= 24 and all(mark not in predicate for mark in ["，", "。", "；", "、"]):
            prompt = f"{subject}是____。"
            return build_blank_question(prompt, [predicate], item, sort_order), "is-single"

    return build_short_question(item, sort_order), "short-fallback"


def validate_questions(questions: List[dict]) -> List[str]:
    errors: List[str] = []
    for index, question in enumerate(questions, 1):
        q_type = question.get("type")
        if q_type not in {"BLANK", "SHORT"}:
            errors.append(f"{index}: unsupported type {q_type}")
        if not str(question.get("content", "")).strip():
            errors.append(f"{index}: missing content")
        if q_type == "BLANK":
            answer = question.get("answer")
            if not isinstance(answer, list) or not answer or not all(str(item).strip() for item in answer):
                errors.append(f"{index}: invalid BLANK answer")
        if q_type == "SHORT":
            if not str(question.get("answer", "")).strip():
                errors.append(f"{index}: invalid SHORT answer")
    return errors


def main(pdf_path: Path = DEFAULT_PDF) -> None:
    if not pdf_path.exists():
        raise FileNotFoundError(f"Missing source PDF: {pdf_path}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    source_items = extract_items_from_pdf(pdf_path)

    questions: List[dict] = []
    mode_counter: Counter[str] = Counter()
    short_review_items: List[SourceItem] = []

    for index, item in enumerate(source_items, 1):
        question, mode = convert_item_to_question(item, index)
        questions.append(question)
        mode_counter[mode] += 1
        if question["type"] == "SHORT":
            short_review_items.append(item)

    validation_errors = validate_questions(questions)
    if validation_errors:
        raise ValueError("Validation failed:\n" + "\n".join(validation_errors[:20]))

    payload = {
        "meta": {
            "examName": "国际中文教师证书CTCSOL",
            "topicName": "中国文化要略",
            "sourceFile": SOURCE_LABEL,
            "generatedAt": datetime.now().isoformat(timespec="seconds"),
            "parser": "tools/build_china_culture_notes_import.py",
            "questionCount": len(questions),
            "typeStats": dict(Counter(question["type"] for question in questions)),
            "buildStats": dict(mode_counter),
            "notes": [
                "本文件根据《中国文化要略复习笔记》PDF 直接抽取并结构化生成，适合导入到专题训练中的“中国文化要略”专题。",
                "能明确抽出标准答案的条目优先转为 BLANK；结构过长或定义型说明暂转为 SHORT 参考题。",
                "所有 SHORT 题已标记为知识点参考题（autoFullScore=true），专题训练下无需作答即可提交并默认得分。",
                "如需更强交互性，可后续继续把 SHORT 题人工改造成单选或填空。"
            ]
        },
        "questions": questions,
        "reviewItems": [
            {
                "sortOrder": question["sortOrder"],
                "sourcePage": question["sourcePage"],
                "reason": "自动转换为 SHORT，建议人工复核题干表达或继续细化为 BLANK/SINGLE。",
                "content": question["content"]
            }
            for question in questions
            if question["type"] == "SHORT"
        ]
    }

    OUTPUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    review_lines = [
        "# 中国文化要略复习笔记导入复核清单",
        "",
        f"- 源文件：`{SOURCE_LABEL}`",
        f"- 生成脚本：`tools/build_china_culture_notes_import.py`",
        f"- 总题数：`{len(questions)}`",
        f"- BLANK：`{sum(1 for q in questions if q['type'] == 'BLANK')}`",
        f"- SHORT：`{sum(1 for q in questions if q['type'] == 'SHORT')}`",
        "",
        "## 导入建议",
        "",
        "- 后台导入时选择科目 `国际中文教师证书CTCSOL`。",
        "- 建议先在专题管理中创建 `中国文化要略` 专题，再用 JSON 追加导入到该专题。",
        "- 本批题目以知识点训练为主，不绑定试卷。",
        "",
        "## 需要优先抽样复核的内容",
        "",
        "- 所有 `SHORT` 题：已按知识点参考题处理并设置 `autoFullScore=true`，建议视需要继续拆成更标准的填空题。",
        "- 含多个并列答案的 `BLANK` 题：确认导入后前端填空顺序符合预期。",
        "",
        "## SHORT 题清单",
        "",
    ]

    if short_review_items:
        for item in short_review_items:
            review_lines.append(f"- 第 {item.item_no} 条 / 页 {item.source_page} / {item.chapter_title or item.chapter}：{item.text[:120]}")
    else:
        review_lines.append("- 本批无 SHORT 题。")

    OUTPUT_REVIEW.write_text("\n".join(review_lines), encoding="utf-8")


if __name__ == "__main__":
    main()
