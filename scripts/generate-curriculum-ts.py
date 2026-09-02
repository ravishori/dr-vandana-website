#!/usr/bin/env python3
"""Generate curriculum TypeScript from extracted syllabus text. Run once during Phase 1 setup."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path("/workspace")
EXTRACTED = ROOT / "docs/curriculum/extracted"
OUT_DIR = ROOT / "src/data/ai/knowledge/curriculum"

SEM_FILES = {
    "I": EXTRACTED / "SEM_I_Syllabus_925b.txt",
    "II": EXTRACTED / "SEM_II_Sylabus_9976.txt",
    "III": EXTRACTED / "SEM_III_Sylabus_133b.txt",
    "IV": EXTRACTED / "SEM_IV_Sylabus_fdda.txt",
}

ROMAN_TO_ARABIC = {"I": "1", "II": "2", "III": "3", "IV": "4", "V": "5"}

# Known course codes from official syllabus credit-structure tables (Sem I–II).
COURSE_CODE_MAP: dict[tuple[str, str], str] = {
    ("I", "PERSONALITY PSYCHOLOGY"): "501 11",
    ("I", "PSYCHOLOGY OF COGNITION AND EMOTION"): "502 11",
    ("I", "STATISTICS FOR PSYCHOLOGY"): "503 11",
    ("I", "EXPERIMENTAL PSYCHOLOGY PRACTICAL"): "504 11",
    ("I", "Psychopathology across lifespan"): "505 11",
    ("I", "Counselling Across the Lifespan"): "505 12",
    ("I", "Organizational Behaviour (OB)"): "505 13",
    ("I", "Community and Social Psychology"): "505 14",
    ("I", "Research Methodology for Psychology"): "506 11",
    ("II", "EVOLUTIONARY PSYCHOLOGY"): "511 11",
    ("II", "Social Foundations of Human Behaviour"): "512 11",
    ("II", "Positive Psychology"): "513 11",
    ("II", "PSYCHOLOGICAL TESTING AND PSYCHOMETRICS PRACTICALS"): "514 11",
    ("II", "Psychodiagnostics"): "515 11",
    ("II", "Assessment in Counselling Psychology"): "515 12",
    ("II", "Competency Based Assessment in Organization"): "515 13",
    ("II", "Assessment in Social Psychology"): "515 14",
    ("II", "On the Job training in Different Psychology related Work Sectors"): "516 11",
}


def normalize_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def de_space_words(text: str) -> str:
    """Fix PDF artifacts like 'P e r s o n a l i t y'."""
    if re.search(r"[a-zA-Z] [a-zA-Z] [a-zA-Z]", text) and len(text) > 20:
        collapsed = re.sub(r"(?<=[a-zA-Z]) (?=[a-zA-Z])", "", text)
        return normalize_spaces(collapsed)
    return normalize_spaces(text)


def slugify(text: str, max_len: int = 55) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:max_len].rstrip("-")


def parse_page_markers(text: str) -> list[tuple[int, int]]:
    markers: list[tuple[int, int]] = []
    for match in re.finditer(r"Page (\d+) of \d+", text):
        markers.append((int(match.group(1)), match.start()))
    for match in re.finditer(r"NEP SYLLABUS PSYCHOLOGY SEM III & IV (\d+)", text):
        markers.append((int(match.group(1)), match.start()))
    markers.sort(key=lambda item: item[1])
    return markers


def page_range(start: int, end: int, markers: list[tuple[int, int]]) -> str | None:
    pages = [page for page, offset in markers if offset <= end]
    if not pages:
        return None
    start_page = next((page for page, offset in markers if offset <= start), pages[0])
    end_pages = [page for page, offset in markers if start <= offset <= end]
    end_page = end_pages[-1] if end_pages else start_page
    return str(start_page) if start_page == end_page else f"{start_page}–{end_page}"


def split_courses(text: str) -> list[tuple[str, int, int]]:
    pattern = re.compile(
        r"(?=(?:Subject Code:\s*[\d\s]+\s*\n|Subject Code:\s*[\d\s]+\s*Course Name:|\nM\.A \(Psychology\)\s*\n\(Under NEP|\nMA Psychology\s*\n\(Under NEP|Semester IV\s*\nType of course: Research Project))",
        re.M | re.I,
    )
    indices = [match.start() for match in pattern.finditer(text)]
    if not indices:
        pattern2 = re.compile(r"(?=\nCourse Name:\s*[A-Z])", re.M)
        indices = [match.start() for match in pattern2.finditer(text)]
    blocks: list[tuple[str, int, int]] = []
    for index, start in enumerate(indices):
        end = indices[index + 1] if index + 1 < len(indices) else len(text)
        blocks.append((text[start:end], start, end))
    return blocks


def extract_objectives(block: str) -> list[str]:
    match = re.search(
        r"(?:Course Objectives|Objectives)\s*:?\s*(.*?)(?=Course Outcomes|Course Outcomes \(CO\)|Unit [1IVX]|UNIT [1IVX]|Books for|$)",
        block,
        re.S | re.I,
    )
    if not match:
        return []
    objectives: list[str] = []
    for line in match.group(1).split("\n"):
        line = normalize_spaces(line)
        if not line or line.startswith("CO"):
            continue
        cleaned = re.sub(r"^[\d•\-]+[\.)]\s*", "", line)
        cleaned = re.sub(r"^[A-D][\.)]\s*", "", cleaned)
        if cleaned and len(cleaned) > 8:
            objectives.append(cleaned)
    return objectives


def extract_outcomes(block: str) -> list[str]:
    match = re.search(
        r"Course Outcomes.*?:?\s*(.*?)(?=Unit [1IVX]|UNIT [1IVX]|Books for|Guidelines for|Background:|Evaluation:|Process of|$)",
        block,
        re.S | re.I,
    )
    if not match:
        return []
    outcomes: list[str] = []
    for line in match.group(1).split("\n"):
        line = normalize_spaces(line)
        if re.match(r"^CO\d+:", line, re.I) or re.match(r"^Unit \d+:", line):
            outcomes.append(line)
    return outcomes


def parse_books(block: str, kind: str) -> list[dict[str, str]]:
    label = "Books for Study" if kind == "study" else "Books for Reference"
    pattern = rf"{label}\s*(.*?)(?=Evaluation:|Books for Reference|Books for Study|Page \d+|NEP SYLLABUS|$)"
    match = re.search(pattern, block, re.S | re.I)
    if not match:
        pattern = rf"Books for study\s*(.*?)(?=Evaluation:|Books for reference|Books for Reference|$)"
        match = re.search(pattern, block, re.S | re.I)
    if not match:
        return []
    books: list[dict[str, str]] = []
    ref_type = "STUDY_BOOK" if kind == "study" else "REFERENCE_BOOK"
    current = ""
    for raw_line in match.group(1).split("\n"):
        line = normalize_spaces(raw_line)
        if not line:
            continue
        if re.match(r"^[\d•\-]+[\.)]\s*", line) or line.startswith("•") or line.startswith(""):
            if current:
                books.append({"title": current, "reference_type": ref_type})
            current = re.sub(r"^[\d•\-]+[\.)]?\s*", "", line)
        elif current:
            current = normalize_spaces(f"{current} {line}")
    if current:
        books.append({"title": current, "reference_type": ref_type})
    return books


def parse_units(block: str) -> list[dict]:
    search_block = block
    # Prefer syllabus units after outcome sections.
    first_syllabus_unit = re.search(
        r"Unit[\s\-]*(?:\d+|[IVX]+)[\.:\s]+[A-Za-z].{8,}",
        block,
        re.I,
    )
    if first_syllabus_unit:
        search_block = block[first_syllabus_unit.start() :]

    units: list[dict] = []
    unit_pattern = re.compile(
        r"Unit[\s\-]*(?:(\d+)|([IVX]+))[\.:\s\-]*(.+?)(?=\n\s*Unit[\s\-]*(?:\d+|[IVX]+)[\.:\s\-]|Books for|Evaluation:|Subject Code:|Course Name:|$)",
        re.S | re.I,
    )
    for match in unit_pattern.finditer(search_block):
        unit_num = match.group(1) or ROMAN_TO_ARABIC.get(match.group(2), match.group(2))
        body = match.group(3).strip()
        lines = [de_space_words(line) for line in body.split("\n") if normalize_spaces(line)]
        if not lines:
            continue
        unit_title = lines[0]
        if re.match(r"^CO\d+:", unit_title, re.I):
            continue
        if re.match(r"^Students are able", unit_title, re.I):
            continue
        subtopics: list[str] = []
        for line in lines[1:]:
            if re.match(r"^[a-dA-D][\.)]\s", line) or re.match(r"^[A-D]\.", line):
                subtopics.append(line)
            elif line and not re.match(r"^CO\d+:", line, re.I):
                if not line.startswith("Page "):
                    subtopics.append(line)
        content_lines = [unit_title, *subtopics]
        units.append(
            {
                "unit_number": unit_num,
                "unit_title": unit_title,
                "subtopics": subtopics,
                "content": "\n".join(content_lines),
            }
        )

    seen: set[str] = set()
    filtered: list[dict] = []
    for unit in units:
        if unit["unit_number"] in seen:
            continue
        seen.add(unit["unit_number"])
        filtered.append(unit)
    return filtered


def infer_content_type(course_type: str, title: str) -> str:
    lower = f"{course_type} {title}".lower()
    if "ojt" in lower or "on the job" in lower or "field project" in lower or "field placement" in lower:
        return "ojt-field-placement"
    if "research project" in lower or "dissertation" in lower:
        return "research-project"
    if "practical" in lower or "practicum" in lower:
        return "practical"
    if "elective" in lower:
        return "elective"
    return "syllabus"


def parse_course(block: str, semester: str, markers: list[tuple[int, int]], start: int, end: int) -> dict | None:
    code_match = re.search(r"Subject Code:\s*([\d\s]+)", block)
    course_code = None
    if code_match and code_match.group(1).strip():
        course_code = normalize_spaces(code_match.group(1))
    # Fix PDF typo 501211 -> 502 11
    if course_code and course_code.replace(" ", "") == "501211":
        course_code = "502 11"

    name_match = re.search(
        r"Course Name:\s*(.+?)(?:\n|Type of course|Type of Course|SEMESTER|Course:)",
        block,
        re.I,
    )
    if not name_match:
        alt = re.search(
            r"Course:\s*(Research Project in Psychology II:.+?)(?:\n|Credits:)",
            block,
            re.I,
        )
        if alt:
            course_title = normalize_spaces(alt.group(1))
            course_type = "Research Project"
        else:
            return None
    else:
        course_title = normalize_spaces(name_match.group(1))

    if not course_code:
        course_code = COURSE_CODE_MAP.get((semester, course_title))
        if not course_code:
            course_code = COURSE_CODE_MAP.get((semester, course_title.upper()))

    if course_title.upper().startswith("SEM ") or "Credit Structure" in course_title:
        return None

    type_match = re.search(r"Type of [Cc]ourse:\s*(.+?)(?:\n|SEMESTER|Credits:)", block)
    course_type = normalize_spaces(type_match.group(1)) if type_match else "Mandatory"

    credit_match = re.search(r"Credit[s]?:\s*(\d+)", block, re.I)
    credits = int(credit_match.group(1)) if credit_match else None

    objectives = extract_objectives(block)
    outcomes = extract_outcomes(block)
    units = parse_units(block)
    study_books = parse_books(block, "study")
    reference_books = parse_books(block, "reference")

    if not units:
        body_match = re.search(
            r"(?:Guidelines for Implementation:|Background:|Process of research Project|Process of Research Project|Six experiments)(.*?)(?=Evaluation:|Books for|$)",
            block,
            re.S | re.I,
        )
        fallback = normalize_spaces(body_match.group(0)) if body_match else normalize_spaces(block[-1500:])
        if len(fallback) > 80:
            units = [
                {
                    "unit_number": "1",
                    "unit_title": course_title,
                    "subtopics": [],
                    "content": fallback[:4000],
                }
            ]

    if not units:
        return None

    return {
        "semester": semester,
        "course_code": course_code,
        "course_title": course_title,
        "course_type": course_type,
        "credits": credits,
        "course_objectives": objectives,
        "course_outcomes": outcomes,
        "units": units,
        "study_books": study_books,
        "reference_books": reference_books,
        "source_page": page_range(start, end, markers),
        "content_type": infer_content_type(course_type, course_title),
    }


def ts_string(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    return f'"{escaped}"'


def ts_array_strings(items: list[str], indent: int = 2) -> str:
    if not items:
        return "[]"
    pad = " " * indent
    lines = ["["]
    for item in items:
        lines.append(f"{pad}{ts_string(item)},")
    lines.append(" " * (indent - 2) + "]")
    return "\n".join(lines)


def ts_books(books: list[dict]) -> str:
    if not books:
        return "[]"
    lines = ["["]
    for book in books:
        lines.append(
            f'  {{ title: {ts_string(book["title"])}, reference_type: "{book["reference_type"]}" }},'
        )
    lines.append("]")
    return "\n".join(lines)


def generate_documents(courses: list[dict]) -> list[dict]:
    documents: list[dict] = []
    for course in courses:
        base_id = slugify(
            f"sem-{course['semester']}-{course.get('course_code') or course['course_title']}"
        )
        for unit in course["units"]:
            doc_id = f"curriculum-{base_id}-unit-{unit['unit_number']}"
            documents.append(
                {
                    "id": doc_id,
                    "course": course,
                    "unit": unit,
                }
            )
    return documents


def write_semester_file(semester: str, documents: list[dict]) -> None:
    sem_docs = [doc for doc in documents if doc["course"]["semester"] == semester]
    if not sem_docs:
        return

    lines = [
        'import { createAcademicCurriculumDocument } from "@/data/ai/knowledge/curriculum/helpers";',
        "",
        f"/** Semester {semester} — University of Mumbai M.A. Psychology (NEP 2020). */",
        f"export const semester{semester}CurriculumDocuments = [",
    ]

    for doc in sem_docs:
        course = doc["course"]
        unit = doc["unit"]
        lines.append("  createAcademicCurriculumDocument({")
        lines.append(f'    id: {ts_string(doc["id"])},')
        lines.append(f'    semester: {ts_string(course["semester"])},')
        if course.get("course_code"):
            lines.append(f'    course_code: {ts_string(course["course_code"])},')
        lines.append(f'    course_title: {ts_string(course["course_title"])},')
        lines.append(f'    course_type: {ts_string(course["course_type"])},')
        if course.get("credits") is not None:
            lines.append(f'    credits: {course["credits"]},')
        lines.append(f'    unit_number: {ts_string(unit["unit_number"])},')
        lines.append(f'    unit_title: {ts_string(unit["unit_title"])},')
        lines.append(f'    content_type: {ts_string(course["content_type"])},')
        if course.get("source_page"):
            lines.append(f'    source_page: {ts_string(course["source_page"])},')
        if course["course_objectives"]:
            lines.append(f"    course_objectives: {ts_array_strings(course['course_objectives'], 6)},")
        if course["course_outcomes"]:
            lines.append(f"    course_outcomes: {ts_array_strings(course['course_outcomes'], 6)},")
        lines.append(f'    content: {ts_string(unit["content"])},')
        if course["study_books"]:
            lines.append(f"    study_books: {ts_books(course['study_books'])},")
        if course["reference_books"]:
            lines.append(f"    reference_books: {ts_books(course['reference_books'])},")
        lines.append("  }),")

    lines.append("] as const;")
    lines.append("")

    out_path = OUT_DIR / f"semester-{semester.lower()}.ts"
    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out_path} ({len(sem_docs)} documents)")


def main() -> None:
    all_courses: list[dict] = []
    for semester, path in SEM_FILES.items():
        text = path.read_text(encoding="utf-8", errors="replace")
        markers = parse_page_markers(text)
        for block, start, end in split_courses(text):
            course = parse_course(block, semester, markers, start, end)
            if course:
                all_courses.append(course)

    documents = generate_documents(all_courses)
    (ROOT / "docs/curriculum/parsed-curriculum.json").write_text(
        json.dumps(all_courses, indent=2),
        encoding="utf-8",
    )

    stats = {
        "courses": len(all_courses),
        "documents": len(documents),
        "study_books": sum(len(c["study_books"]) for c in all_courses),
        "reference_books": sum(len(c["reference_books"]) for c in all_courses),
        "units": sum(len(c["units"]) for c in all_courses),
    }
    print(json.dumps(stats, indent=2))

    for semester in SEM_FILES:
        write_semester_file(semester, documents)


if __name__ == "__main__":
    main()
