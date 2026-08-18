#!/usr/bin/env python3
"""Extract stressless MVP blocks (13×8) from StressLess xlsx Базовая таблица."""
import json
import sys

import openpyxl

# Pure psychotype columns (skip dyad-only columns in xlsx)
PSYCHOTYPE_COLS: dict[str, int] = {
    "individualist": 2,
    "innovator": 3,
    "influencer": 5,
    "aesthete": 7,
    "conservative": 9,
    "empath": 11,
    "analyst": 12,
    "pragmatist": 14,
}

BLOCK_DEFS = [
    ("stress_portrait", "text_block", 9, "Психологический портрет в стрессе", 10),
    ("emergency_technique_1", "accordion_block", 13, "Экстренная техника 1", 20),
    ("emergency_technique_2", "accordion_block", 14, "Экстренная техника 2", 30),
    ("emergency_technique_3", "accordion_block", 15, "Экстренная техника 3", 40),
    ("emergency_technique_potential", "accordion_block", 16, "Потенциально эффективная техника", 50),
    ("quick_coping_1", "accordion_block", 18, "Быстрое совладание 1", 60),
    ("quick_coping_2", "accordion_block", 19, "Быстрое совладание 2", 70),
    ("quick_coping_3", "accordion_block", 20, "Быстрое совладание 3", 80),
    ("quick_coping_potential", "accordion_block", 21, "Потенциально эффективная техника", 90),
    ("long_term_strategy_1", "accordion_block", 23, "Долгосрочная стратегия 1", 100),
    ("long_term_strategy_2", "accordion_block", 24, "Долгосрочная стратегия 2", 110),
    ("long_term_strategy_3", "accordion_block", 25, "Долгосрочная стратегия 3", 120),
    ("long_term_strategy_4", "accordion_block", 26, "Долгосрочная стратегия 4", 130),
]


def main() -> None:
    path = sys.argv[1]
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb["Базовая таблица"]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()

    blocks = []
    for block_key, template, row_idx, title, sort_order in BLOCK_DEFS:
        if row_idx >= len(rows):
            raise SystemExit(f"Row {row_idx + 1} missing for {block_key}")
        row = rows[row_idx]
        for psychotype, col_idx in PSYCHOTYPE_COLS.items():
            if col_idx >= len(row):
                continue
            cell = row[col_idx]
            if cell is None:
                continue
            content = str(cell).strip()
            if not content or content.lower() == "none":
                continue
            blocks.append(
                {
                    "psychotype_code": psychotype,
                    "mode": "stressless",
                    "block_key": block_key,
                    "block_template": template,
                    "title": title,
                    "content_text": content,
                    "sort_order": sort_order,
                    "is_visible_default": True,
                    "version": 1,
                    "is_active": True,
                }
            )

    print(json.dumps({"blocks": blocks}, ensure_ascii=False))


if __name__ == "__main__":
    main()
