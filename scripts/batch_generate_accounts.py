#!/usr/bin/env python3
"""Batch-generate guild accounts and 8-char initial passwords from employee IDs.

Supported input formats:
- CSV (.csv)
- Excel (.xlsx, requires openpyxl)

Input file must include an employee-id column (default: employee_no).
"""

from __future__ import annotations

import argparse
import csv
import secrets
import string
import sys
from pathlib import Path
from typing import Iterable


LOWER = string.ascii_lowercase
UPPER = string.ascii_uppercase
DIGITS = string.digits
POOL = LOWER + UPPER + DIGITS


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Read employee IDs and generate account + 8-char random password "
            "(must contain lower/upper/digit)."
        )
    )
    parser.add_argument(
        "-i",
        "--input",
        required=True,
        help="Path to input file (.csv or .xlsx).",
    )
    parser.add_argument(
        "-o",
        "--output-dir",
        default="output",
        help="Directory for generated files. Default: ./output",
    )
    parser.add_argument(
        "--employee-column",
        default="employee_no",
        help="Column name containing employee IDs. Default: employee_no",
    )
    parser.add_argument(
        "--account-prefix",
        default="gh_",
        help="Account prefix. Final format: <prefix><employee_id>. Default: gh_",
    )
    parser.add_argument(
        "--password-length",
        type=int,
        default=8,
        help="Password length (>=8 recommended). Default: 8",
    )
    return parser


def read_employee_ids(path: Path, column_name: str) -> list[str]:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return _read_employee_ids_from_csv(path, column_name)
    if suffix == ".xlsx":
        return _read_employee_ids_from_xlsx(path, column_name)
    raise ValueError(f"Unsupported input format: {path.suffix}. Use .csv or .xlsx.")


def _read_employee_ids_from_csv(path: Path, column_name: str) -> list[str]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError("Input CSV has no header row.")
        if column_name not in reader.fieldnames:
            raise ValueError(
                f"Column '{column_name}' not found. Available columns: {reader.fieldnames}"
            )
        rows = [_normalize_employee_no(row.get(column_name, "")) for row in reader]
    return _validate_employee_ids(rows)


def _read_employee_ids_from_xlsx(path: Path, column_name: str) -> list[str]:
    try:
        from openpyxl import load_workbook
    except ImportError as exc:
        raise RuntimeError(
            "Reading .xlsx requires openpyxl. Install with: pip install openpyxl"
        ) from exc

    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb.active

    header_cells = next(ws.iter_rows(min_row=1, max_row=1, values_only=True), None)
    if not header_cells:
        raise ValueError("Input Excel is empty.")

    header = [str(cell).strip() if cell is not None else "" for cell in header_cells]
    if column_name not in header:
        raise ValueError(
            f"Column '{column_name}' not found. Available columns: {header}"
        )
    idx = header.index(column_name)

    rows: list[str] = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        value = row[idx] if idx < len(row) else ""
        rows.append(_normalize_employee_no(value))
    wb.close()
    return _validate_employee_ids(rows)


def _normalize_employee_no(value: object) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.endswith(".0") and text.replace(".", "", 1).isdigit():
        # Avoid Excel numeric IDs such as 10001.0
        text = text[:-2]
    return text


def _validate_employee_ids(raw_ids: Iterable[str]) -> list[str]:
    ids = [x for x in raw_ids if x]
    if not ids:
        raise ValueError("No valid employee IDs found.")

    seen: set[str] = set()
    duplicates: set[str] = set()
    for emp_id in ids:
        if emp_id in seen:
            duplicates.add(emp_id)
        seen.add(emp_id)
    if duplicates:
        dup_list = ", ".join(sorted(duplicates))
        raise ValueError(f"Duplicate employee IDs found: {dup_list}")
    return ids


def generate_password(length: int) -> str:
    if length < 8:
        raise ValueError("Password length must be >= 8 for minimum security.")

    while True:
        pwd = "".join(secrets.choice(POOL) for _ in range(length))
        if (
            any(c in LOWER for c in pwd)
            and any(c in UPPER for c in pwd)
            and any(c in DIGITS for c in pwd)
        ):
            return pwd


def write_csv(path: Path, header: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=header)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    input_path = Path(args.input).expanduser().resolve()
    output_dir = Path(args.output_dir).expanduser().resolve()

    if not input_path.exists():
        print(f"ERROR: Input file does not exist: {input_path}", file=sys.stderr)
        return 1

    try:
        employee_ids = read_employee_ids(input_path, args.employee_column)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    output_dir.mkdir(parents=True, exist_ok=True)

    import_rows: list[dict[str, str]] = []
    dispatch_rows: list[dict[str, str]] = []

    for emp_id in employee_ids:
        account = f"{args.account_prefix}{emp_id}"
        password = generate_password(args.password_length)
        row = {
            "employee_no": emp_id,
            "account": account,
            "initial_password": password,
            "force_reset_password": "1",
        }
        import_rows.append(row)
        dispatch_rows.append(
            {
                "employee_no": emp_id,
                "account": account,
                "initial_password": password,
            }
        )

    import_file = output_dir / "accounts_for_import.csv"
    dispatch_file = output_dir / "password_dispatch.csv"

    write_csv(
        import_file,
        ["employee_no", "account", "initial_password", "force_reset_password"],
        import_rows,
    )
    write_csv(dispatch_file, ["employee_no", "account", "initial_password"], dispatch_rows)

    print(f"Generated: {len(employee_ids)} accounts")
    print(f"Import file: {import_file}")
    print(f"Dispatch file: {dispatch_file}")
    print("Security reminder: distribute passwords via a protected, one-time channel.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
