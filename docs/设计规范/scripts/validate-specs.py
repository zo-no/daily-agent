#!/usr/bin/env python3
"""Validate Log Note design documentation structure and local Markdown links."""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
LIBRARY = ROOT / "docs/设计规范"
REQUIRED = [
    ROOT / "DESIGN.md",
    LIBRARY / "AGENTS.md",
    LIBRARY / "index.md",
    LIBRARY / "规范/基础/视觉系统规范.md",
    LIBRARY / "规范/交互/拖拽与排序交互规范.md",
    LIBRARY / "规范/交互/反馈与动效规范.md",
    LIBRARY / "规范/组件/层级列表与编辑抽屉规范.md",
    LIBRARY / "规范/页面/记录与结构管理页面规范.md",
    LIBRARY / "指南/设计规范编写指南.md",
    LIBRARY / "模板/Design 规范模板.md",
    LIBRARY / "调研/记录工具与拖拽社区实践调研.md",
]
LINK_RE = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")
META_KEYS = ("title", "status", "owner", "updated")


def local_target(source: Path, raw: str) -> Path | None:
    target = raw.split("#", 1)[0].strip()
    if not target or "://" in target or target.startswith("mailto:"):
        return None
    return (source.parent / target).resolve()


def main() -> int:
    failures: list[str] = []
    for path in REQUIRED:
        if not path.is_file():
            failures.append(f"missing required file: {path.relative_to(ROOT)}")

    for path in sorted(LIBRARY.rglob("*.md")) + [ROOT / "DESIGN.md"]:
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        if not re.search(r"^# .+", text, re.MULTILINE):
            failures.append(f"missing H1: {path.relative_to(ROOT)}")
        if path.is_relative_to(LIBRARY / "规范"):
            if not text.startswith("---\n"):
                failures.append(f"missing front matter: {path.relative_to(ROOT)}")
            else:
                front_matter = text.split("---", 2)[1]
                for key in META_KEYS:
                    if not re.search(rf"^{key}:\s*\S+", front_matter, re.MULTILINE):
                        failures.append(f"missing {key} metadata: {path.relative_to(ROOT)}")
        for raw_link in LINK_RE.findall(text):
            target = local_target(path, raw_link)
            if target is not None and not target.exists():
                failures.append(f"broken link in {path.relative_to(ROOT)}: {raw_link}")

    index = (LIBRARY / "index.md").read_text(encoding="utf-8") if (LIBRARY / "index.md").exists() else ""
    for path in REQUIRED[3:8]:
        if path.name not in index:
            failures.append(f"index does not route to: {path.name}")

    if failures:
        print("Design specification validation failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1
    print(f"Design specification validation passed ({len(REQUIRED)} required files).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
