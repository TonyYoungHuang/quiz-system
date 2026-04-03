import argparse
import json
import re
from datetime import datetime
from pathlib import Path

from pypdf import PdfReader


OPTION_KEYS = list("ABCDEFG")
QUESTION_SPLIT_RE = re.compile(r'(?<!\d)(\d{1,3})[\.．]\s*')
ANSWER_SEGMENT_RE = re.compile(r'(\d{3})-(\d{3})\s+([A-G\*\s]+?)(?=(?:\d{3}-\d{3})|$)')
ANSWER_PAGE_RE = re.compile(r'第.+?套.+?参考答案')
IMAGE_HINT_KEYWORDS = ["上图", "下图", "图中", "图片", "图示", "如图", "看图"]


def normalize_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = text.replace("\u3000", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def load_pages(pdf_path: Path):
    reader = PdfReader(str(pdf_path))
    pages = []
    for index, page in enumerate(reader.pages, start=1):
        text = normalize_text(page.extract_text() or "")
        pages.append({
            "page": index,
            "text": text
        })
    return pages


def parse_answer_map(answer_text: str):
    result = {}
    for match in ANSWER_SEGMENT_RE.finditer(answer_text):
      start = int(match.group(1))
      end = int(match.group(2))
      letters = re.findall(r"[A-G]", match.group(3))
      expected = end - start + 1
      if len(letters) < expected:
          continue
      for offset in range(expected):
          result[start + offset] = letters[offset]
    return result


def find_answer_pages(pages):
    answer_pages = []
    for page in pages:
        text = page["text"]
        if "参考答案" in text and re.search(r"\d{3}-\d{3}", text):
            answer_pages.append({
                "page": page["page"],
                "title": text[:80],
                "answers": parse_answer_map(text)
            })
    return answer_pages


def split_numbered_blocks(page_text: str):
    cleaned = re.sub(r"^\d+\s+", "", page_text).strip()
    matches = list(QUESTION_SPLIT_RE.finditer(cleaned))
    blocks = []
    for idx, match in enumerate(matches):
        qno = int(match.group(1))
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(cleaned)
        body = cleaned[start:end].strip()
        if body:
            blocks.append((qno, body))
    return blocks


def find_option_markers(text: str):
    matches = []
    for match in re.finditer(r'(?<![A-Z])([A-G])(?:[\.．、]|\s)', text):
        key = match.group(1)
        if key in OPTION_KEYS:
            matches.append(match)
    return matches


def parse_inline_options(block_text: str):
    markers = find_option_markers(block_text)
    if len(markers) < 2:
        return None

    first_key = markers[0].group(1)
    if first_key != "A":
        return None

    stem = block_text[:markers[0].start()].strip()
    options = {}

    for idx, match in enumerate(markers):
        key = match.group(1)
        start = match.end()
        end = markers[idx + 1].start() if idx + 1 < len(markers) else len(block_text)
        value = block_text[start:end].strip(" ：:;；，, ")
        if key in options:
            break
        options[key] = value

    valid_option_keys = [key for key, value in options.items() if value]
    if not stem or len(valid_option_keys) < 2:
        return None

    return {
        "stem": stem,
        "options": {key: options[key] for key in valid_option_keys}
    }


def parse_simple_questions(pages, answer_map):
    questions = []
    review_items = []
    seen = set()

    for page in pages:
        text = page["text"]
        if not text:
            continue

        blocks = split_numbered_blocks(text)
        for qno, block_text in blocks:
            if qno in seen or qno not in answer_map:
                continue

            parsed = parse_inline_options(block_text)
            if not parsed:
                if any(keyword in block_text for keyword in IMAGE_HINT_KEYWORDS + ["帛画"]):
                    review_items.append({
                        "questionNo": qno,
                        "page": page["page"],
                        "reason": "原题涉及图片或图示，当前脚本未自动抽取图片资源",
                        "rawText": block_text[:500]
                    })
                elif len(block_text) < 20 or re.fullmatch(r"[A-G\s]+", block_text):
                    review_items.append({
                        "questionNo": qno,
                        "page": page["page"],
                        "reason": "题干依赖题组材料或共享选项，当前脚本未自动拆分",
                        "rawText": block_text[:500]
                    })
                continue

            answer = answer_map.get(qno)
            if answer not in parsed["options"]:
                review_items.append({
                    "questionNo": qno,
                    "page": page["page"],
                    "reason": "答案未命中解析出的选项，需人工复核",
                    "rawText": block_text[:500]
                })
                continue

            questions.append({
                "type": "SINGLE",
                "content": parsed["stem"],
                "options": parsed["options"],
                "answer": answer,
                "explanation": "",
                "sortOrder": qno,
                "sourcePage": page["page"],
                "sourceQuestionNo": qno,
                "needsMediaReview": any(keyword in parsed["stem"] for keyword in IMAGE_HINT_KEYWORDS),
                "mediaReviewReason": "该题题干提到图片/图示，但当前 PDF 自动导入未抽取原图，请在后台手动补图后再正式使用。"
            })
            seen.add(qno)

    return questions, review_items


def build_segments(pages, answer_pages):
    segments = []
    if not answer_pages:
        return segments

    start_page = 1
    for answer_page in answer_pages:
        end_page = answer_page["page"] - 1
        question_pages = [page for page in pages if start_page <= page["page"] <= end_page]
        segments.append({
            "answerPage": answer_page["page"],
            "title": answer_page["title"],
            "questionPages": question_pages,
            "answers": answer_page["answers"]
        })
        start_page = answer_page["page"] + 1
    return segments


def generate_output(pdf_path: Path):
    pages = load_pages(pdf_path)
    answer_pages = find_answer_pages(pages)
    segments = build_segments(pages, answer_pages)

    all_questions = []
    all_review_items = []
    set_summaries = []

    for idx, segment in enumerate(segments, start=1):
        questions, review_items = parse_simple_questions(segment["questionPages"], segment["answers"])
        all_questions.extend(questions)
        all_review_items.extend(review_items)
        set_summaries.append({
            "setIndex": idx,
            "answerPage": segment["answerPage"],
            "title": segment["title"],
            "parsedQuestions": len(questions),
            "reviewItems": len(review_items)
        })

    output = {
        "meta": {
            "sourcePdf": str(pdf_path),
            "generatedAt": datetime.now().isoformat(timespec="seconds"),
            "note": "本文件为 CTCSOL PDF 的首版自动抽题结果。questions 可直接作为后台 JSON 导入；reviewItems 需人工复核，尤其是图片题、题组题和共享选项题。",
            "totalPages": len(pages),
            "answerPages": [item["page"] for item in answer_pages]
        },
        "questions": all_questions,
        "reviewItems": all_review_items,
        "setSummaries": set_summaries
    }
    return output


def main():
    parser = argparse.ArgumentParser(description="将 CTCSOL PDF 解析为后台 JSON 导入草稿")
    parser.add_argument("pdf", help="PDF 文件路径")
    parser.add_argument("-o", "--output", help="输出 JSON 路径")
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        raise SystemExit(f"PDF 不存在: {pdf_path}")

    output_path = Path(args.output) if args.output else pdf_path.with_suffix(".import.json")
    result = generate_output(pdf_path)
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"已生成: {output_path}")
    print(f"可直接导入题目数: {len(result['questions'])}")
    print(f"待人工复核项: {len(result['reviewItems'])}")


if __name__ == "__main__":
    main()
