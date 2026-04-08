"""
Download all documents linked in the Pediatric Emergency Medicine Handbook.

Extracts Google Drive file IDs from the hyperlinks, then uses gdown to
download each one into the source/downloads/ folder, named after the
display text from the Word document.
"""

import re
import os
import sys
import shutil
from pathlib import Path
from urllib.parse import urlparse, parse_qs

from docx import Document
import gdown

# ── Paths ──
BASE_DIR = Path(r"c:\Users\tamat\OneDrive - University of Kentucky\!Code\KCH Network tool")
DOCX_PATH = BASE_DIR / "source" / "Pediatric Emergency Medicine Handbook.docx"
DOWNLOAD_DIR = BASE_DIR / "source" / "downloads"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ── XML namespaces for docx parsing ──
NSMAP = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def qn(tag):
    prefix, local = tag.split(":")
    return f"{{{NSMAP[prefix]}}}{local}"


def extract_hyperlinks(docx_path):
    """Extract (display_text, url) tuples from the docx."""
    # Try existing temp copy first (avoids OneDrive/Word lock issues)
    temp_path = BASE_DIR / "scratchpad" / "temp_handbook.docx"
    if not temp_path.exists():
        temp_path = DOWNLOAD_DIR.parent / "_temp_handbook.docx"
        try:
            shutil.copy2(docx_path, temp_path)
        except PermissionError:
            print("ERROR: Cannot access the docx file. Close it in Word and try again.")
            sys.exit(1)

    with open(temp_path, "rb") as f:
        doc = Document(f)

    rels = doc.part.rels
    body = doc.element.body
    links = []

    for hyperlink in body.iter(qn("w:hyperlink")):
        texts = []
        for t_elem in hyperlink.iter(qn("w:t")):
            if t_elem.text:
                texts.append(t_elem.text)
        display_text = "".join(texts).strip()

        r_id = hyperlink.get(qn("r:id"))
        if r_id and r_id in rels:
            target = str(rels[r_id]._target)
            links.append((display_text, target))

    temp_path.unlink(missing_ok=True)
    return links


def extract_gdrive_file_id(url):
    """Extract the Google Drive file ID from various URL formats."""
    # Format: drive.google.com/file/d/FILE_ID/...
    m = re.search(r"drive\.google\.com/file/d/([a-zA-Z0-9_-]+)", url)
    if m:
        return m.group(1)

    # Format: drive.google.com/open?id=FILE_ID
    m = re.search(r"drive\.google\.com/open\?id=([a-zA-Z0-9_-]+)", url)
    if m:
        return m.group(1)

    # Format: docs.google.com/document/d/FILE_ID/...
    m = re.search(r"docs\.google\.com/document/d/([a-zA-Z0-9_-]+)", url)
    if m:
        return m.group(1)

    # Format: safelinks URL with a nested Google Drive URL
    if "safelinks.protection.outlook.com" in url:
        parsed = urlparse(url)
        qs = parse_qs(parsed.query)
        if "url" in qs:
            return extract_gdrive_file_id(qs["url"][0])

    return None


def sanitize_filename(name):
    """Make a string safe for use as a filename."""
    # Replace problematic chars
    name = name.replace("\x96", "-")  # Windows-1252 en-dash
    name = re.sub(r'[<>:"/\\|?*]', '-', name)
    name = re.sub(r'\s+', ' ', name).strip()
    # Truncate to reasonable length
    if len(name) > 120:
        name = name[:120].strip()
    return name


def main():
    print(f"Extracting links from: {DOCX_PATH.name}")
    print(f"Download folder: {DOWNLOAD_DIR}\n")

    links = extract_hyperlinks(DOCX_PATH)
    print(f"Found {len(links)} hyperlinks\n")

    # Deduplicate by URL, keeping first display text
    seen_ids = {}  # file_id -> (display_text, url)
    non_gdrive = []

    for display_text, url in links:
        file_id = extract_gdrive_file_id(url)
        if file_id:
            if file_id not in seen_ids:
                seen_ids[file_id] = (display_text, url)
        else:
            non_gdrive.append((display_text, url))

    print(f"Unique Google Drive files: {len(seen_ids)}")
    if non_gdrive:
        print(f"Non-Google-Drive links ({len(non_gdrive)}):")
        for text, url in non_gdrive:
            print(f"  - {text}: {url}")
    print()

    # Download each file
    success = 0
    failed = []
    skipped = 0

    for i, (file_id, (display_text, url)) in enumerate(seen_ids.items(), 1):
        safe_name = sanitize_filename(display_text)
        print(f"[{i}/{len(seen_ids)}] {safe_name}")

        # Check if already downloaded (any extension)
        existing = list(DOWNLOAD_DIR.glob(f"{safe_name}.*"))
        if existing:
            print(f"  -> Already exists: {existing[0].name}, skipping")
            skipped += 1
            continue

        # Build gdown URL
        gdrive_url = f"https://drive.google.com/uc?id={file_id}"

        try:
            # gdown downloads to current dir by default; use output param
            # Use fuzzy=True to handle various Google Drive URL formats
            output_path = str(DOWNLOAD_DIR / safe_name)
            result = gdown.download(
                gdrive_url,
                output=output_path,
                quiet=False,
                fuzzy=False,
            )
            if result and os.path.exists(result):
                # gdown may append the real extension
                final_size = os.path.getsize(result)
                print(f"  -> OK ({final_size:,} bytes): {Path(result).name}")
                success += 1
            else:
                print(f"  -> FAILED (no file returned)")
                failed.append((display_text, url))
        except Exception as e:
            print(f"  -> ERROR: {e}")
            failed.append((display_text, url))

    # Summary
    print(f"\n{'='*60}")
    print(f"DONE: {success} downloaded, {skipped} skipped, {len(failed)} failed")
    if failed:
        print(f"\nFailed downloads:")
        for text, url in failed:
            print(f"  - {text}: {url}")


if __name__ == "__main__":
    main()
