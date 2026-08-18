#!/usr/bin/env python3
"""Extract hr_table MVP blocks (7×8) from Таблицы для HR.docx."""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NAME_TO_CODE = [
    (r"индивидуалист", "individualist"),
    (r"инноватор", "innovator"),
    (r"лидер мнений", "influencer"),
    (r"модник", "aesthete"),
    (r"консерватор", "conservative"),
    (r"чувствительный|эмпат", "empath"),
    (r"аналитик", "analyst"),
    (r"прагматик", "pragmatist"),
]

TABLE1_BASES = [7, 12, 17, 22, 27, 32, 37, 42]
TABLE2_BASES = [64, 69, 74, 79, 84, 89, 94, 99]

MOTIVATION_SLICES = {
    "influencer": (112, 114),
    "innovator": (115, 117),
    "pragmatist": (118, 120),
    "conservative": (121, 123),
    "empath": (124, 126),
    "analyst": (127, 129),
    "individualist": (130, 132),
    "aesthete": (133, 135),
}

SELL_BASES = [143, 149, 155, 161, 167, 173, 179, 185]
SELL_ORDER = [
    "influencer",
    "innovator",
    "pragmatist",
    "conservative",
    "empath",
    "analyst",
    "individualist",
    "aesthete",
]


def read_paragraphs(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    paras: list[str] = []
    for p in root.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
        parts: list[str] = []
        for t in p.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t"):
            if t.text:
                parts.append(t.text)
            if t.tail:
                parts.append(t.tail)
        line = "".join(parts).strip()
        if line:
            paras.append(line)
    return paras


def code_from_name(text: str) -> str | None:
    lower = text.lower()
    for pattern, code in NAME_TO_CODE:
        if re.search(pattern, lower):
            return code
    return None


def make_block(
    psychotype: str,
    block_key: str,
    template: str,
    title: str,
    content: str,
    sort_order: int,
) -> dict:
    return {
        "psychotype_code": psychotype,
        "mode": "hr_table",
        "block_key": block_key,
        "block_template": template,
        "title": title,
        "content_text": content,
        "sort_order": sort_order,
        "is_visible_default": True,
        "version": 1,
        "is_active": True,
    }


def motivation_table(do_text: str, avoid_text: str) -> str:
    return json.dumps(
        {
            "headers": ["Что говорить / предлагать", "Чего избегать"],
            "rows": [[do_text, avoid_text]],
        },
        ensure_ascii=False,
    )


def sell_table(lines: list[str]) -> str:
    if len(lines) < 6:
        return "\n".join(lines)
    return json.dumps(
        {
            "headers": [
                "Ведущие черты",
                "Что ценит в продавце",
                "Как продавать",
                "Ключевые фразы",
                "Чего избегать",
            ],
            "rows": [[lines[1], lines[2], lines[3], lines[4], lines[5]]],
        },
        ensure_ascii=False,
    )


def split_compatibility_entries(segment: str) -> list[str]:
    """Split on comma / «и» only outside parentheses."""
    entries: list[str] = []
    current: list[str] = []
    depth = 0
    i = 0
    n = len(segment)
    while i < n:
        ch = segment[i]
        if ch == "(":
            depth += 1
            current.append(ch)
            i += 1
        elif ch == ")":
            depth = max(0, depth - 1)
            current.append(ch)
            i += 1
        elif depth == 0 and segment.startswith(", ", i):
            entry = "".join(current).strip()
            if entry:
                entries.append(entry)
            current = []
            i += 2
        elif depth == 0 and segment.startswith(" и ", i):
            entry = "".join(current).strip()
            if entry:
                entries.append(entry)
            current = []
            i += 3
        else:
            current.append(ch)
            i += 1
    tail = "".join(current).strip()
    if tail:
        entries.append(tail)
    return entries


def parse_compatibility_rules(text: str, source_code: str) -> list[dict]:
    rules: list[dict] = []
    eff_match = re.search(
        r"Эффективно\s+с:\s*(.*?)(?:\.?\s*Конфликтует\s+с:|$)",
        text,
        re.S,
    )
    conflict_match = re.search(r"Конфликтует\s+с:\s*(.*)", text, re.S)
    if eff_match:
        segment = eff_match.group(1).strip(" .")
        for part in split_compatibility_entries(segment):
            target = code_from_name(part)
            if target and target != source_code:
                rules.append(
                    {
                        "type_a_code": source_code,
                        "type_b_code": target,
                        "compatibility_level": "effective",
                        "recommendation": part.strip(),
                    }
                )
    if conflict_match:
        segment = conflict_match.group(1).strip(" .")
        for part in split_compatibility_entries(segment):
            target = code_from_name(part)
            if target and target != source_code:
                rules.append(
                    {
                        "type_a_code": source_code,
                        "type_b_code": target,
                        "compatibility_level": "conflict",
                        "recommendation": part.strip(),
                    }
                )
    return rules


def main() -> None:
    path = Path(sys.argv[1])
    paras = read_paragraphs(path)
    blocks: list[dict] = []
    compatibility_rules: list[dict] = []

    for base in TABLE1_BASES:
        name_line = paras[base + 1]
        code = code_from_name(name_line)
        if not code:
            raise SystemExit(f"Unknown psychotype in table1: {name_line}")
        blocks.append(
            make_block(
                code,
                "negative_traits",
                "list_block",
                "Отрицательные черты",
                paras[base + 2],
                10,
            )
        )
        blocks.append(
            make_block(
                code,
                "behavioral_metrics",
                "text_block",
                "Поведенческие метрики",
                paras[base + 3],
                20,
            )
        )
        compat_text = paras[base + 4]
        blocks.append(
            make_block(
                code,
                "compatibility",
                "text_block",
                "Совместимость",
                compat_text,
                30,
            )
        )
        compatibility_rules.extend(parse_compatibility_rules(compat_text, code))

    for base in TABLE2_BASES:
        name_line = paras[base + 1]
        code = code_from_name(name_line)
        if not code:
            raise SystemExit(f"Unknown psychotype in table2: {name_line}")
        blocks.append(
            make_block(
                code,
                "stress_reaction",
                "text_block",
                "Поведение в стрессе",
                paras[base + 3],
                40,
            )
        )
        blocks.append(
            make_block(
                code,
                "how_to_calm",
                "text_block",
                "Как успокоить",
                paras[base + 4],
                50,
            )
        )

    for code, (do_idx, avoid_idx) in MOTIVATION_SLICES.items():
        blocks.append(
            make_block(
                code,
                "motivation_card",
                "table_block",
                "Карта мотивации",
                motivation_table(paras[do_idx], paras[avoid_idx]),
                60,
            )
        )

    for code, base in zip(SELL_ORDER, SELL_BASES):
        blocks.append(
            make_block(
                code,
                "how_to_sell",
                "table_block",
                "Как продавать",
                sell_table(paras[base : base + 6]),
                70,
            )
        )

    print(
        json.dumps(
            {"blocks": blocks, "compatibility_rules": compatibility_rules},
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
