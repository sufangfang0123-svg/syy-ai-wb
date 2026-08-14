from __future__ import annotations

import csv
import hashlib
import io
import os
from pathlib import Path, PurePath

from pypdf import PdfReader

MAX_FILE_BYTES = 5 * 1024 * 1024
ALLOWED_TYPES = {
    ".txt": {"text/plain"},
    ".md": {"text/markdown", "text/plain"},
    ".csv": {"text/csv", "application/csv", "text/plain"},
    ".pdf": {"application/pdf"},
}


def extract_upload(filename: str, declared_mime: str | None, data: bytes) -> dict[str, str | int]:
    if not filename or PurePath(filename).name != filename or "/" in filename or "\\" in filename:
        raise ValueError("文件名包含非法路径")
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_TYPES:
        raise ValueError("仅支持 txt、md、csv 和文本型 PDF")
    mime = (declared_mime or "").split(";", 1)[0].lower()
    if mime not in ALLOWED_TYPES[suffix]:
        raise ValueError("文件扩展名与 MIME 类型不匹配")
    if not data or len(data) > MAX_FILE_BYTES:
        raise ValueError("文件必须大于 0 且不超过 5MB")
    digest = hashlib.sha256(data).hexdigest()
    if suffix == ".pdf":
        if not data.startswith(b"%PDF-"):
            raise ValueError("PDF 文件签名无效")
        try:
            reader = PdfReader(io.BytesIO(data))
            if reader.is_encrypted:
                raise ValueError("不接受加密 PDF")
            text = "\n\n".join((page.extract_text() or "").strip() for page in reader.pages).strip()
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError("PDF 解析失败") from exc
        if not text:
            raise ValueError("PDF 无可提取文本；当前不支持扫描件 OCR")
    else:
        if b"\x00" in data:
            raise ValueError("文本文件包含二进制空字符")
        try:
            decoded = data.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ValueError("文本文件必须使用 UTF-8 编码") from exc
        if suffix == ".csv":
            rows = list(csv.reader(io.StringIO(decoded)))
            if not rows:
                raise ValueError("CSV 为空")
            text = "\n".join(" | ".join(cell.strip() for cell in row) for row in rows)
        else:
            text = decoded.strip()
        if not text:
            raise ValueError("文件没有可导入文本")
    if len(text) > 1_000_000:
        raise ValueError("提取文本超过 100 万字符")
    return {"raw_text": text, "sha256": digest, "mime_type": mime, "size_bytes": len(data), "suffix": suffix}


def store_snapshot(project_id: str, digest: str, suffix: str, data: bytes) -> str:
    data_root = Path(os.getenv("NDG_DATA_DIR", Path(__file__).resolve().parents[2] / "data")).resolve()
    upload_root = (data_root / "uploads" / project_id).resolve()
    if data_root not in upload_root.parents:
        raise ValueError("快照路径越界")
    upload_root.mkdir(parents=True, exist_ok=True)
    target = (upload_root / f"{digest}{suffix}.snapshot").resolve()
    if upload_root not in target.parents:
        raise ValueError("快照路径越界")
    if not target.exists():
        with target.open("xb") as handle:
            handle.write(data)
    return target.relative_to(data_root).as_posix()
