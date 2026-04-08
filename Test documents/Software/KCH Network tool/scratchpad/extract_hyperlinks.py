"""
Extract all hyperlinks (display text + URL) from a .docx file.

python-docx does not expose hyperlinks through its public API, so we
parse the underlying Open XML directly.
"""

from docx import Document

DOCX_PATH = r"c:\Users\tamat\OneDrive - University of Kentucky\!Code\KCH Network tool\scratchpad\temp_handbook.docx"

# Namespaces used inside the Open XML word/document.xml
NSMAP = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def qn(tag):
    """Turn a namespace-prefixed tag like 'w:hyperlink' into Clark notation."""
    prefix, local = tag.split(":")
    return f"{{{NSMAP[prefix]}}}{local}"


def iter_hyperlinks(document):
    """
    Yield (display_text, url_or_anchor, kind) for every hyperlink found
    in the document body.
    """
    rels = document.part.rels

    body = document.element.body

    for hyperlink in body.iter(qn("w:hyperlink")):
        # ---- display text ----
        texts = []
        for t_elem in hyperlink.iter(qn("w:t")):
            if t_elem.text:
                texts.append(t_elem.text)
        display_text = "".join(texts).strip()

        # ---- target URL or anchor ----
        r_id = hyperlink.get(qn("r:id"))
        anchor = hyperlink.get(qn("w:anchor"))

        if r_id and r_id in rels:
            rel = rels[r_id]
            target = rel._target
            yield (display_text, str(target), "external")
        elif anchor:
            yield (display_text, f"#{anchor}", "anchor")
        else:
            yield (display_text, "(no target found)", "unknown")


def main():
    print(f"Opening: {DOCX_PATH}\n")

    # Open as file object to avoid path issues with python-docx
    with open(DOCX_PATH, "rb") as f:
        doc = Document(f)

    links = list(iter_hyperlinks(doc))

    if not links:
        print("No hyperlinks found in the document.")
        return

    print(f"Found {len(links)} hyperlink(s):\n")
    print("-" * 100)

    for i, (text, target, kind) in enumerate(links, 1):
        print(f"  [{i:3d}]  Type   : {kind}")
        print(f"         Text   : {text!r}")
        print(f"         Target : {target}")
        print("-" * 100)

    # Summary counts
    external = sum(1 for _, _, k in links if k == "external")
    anchors  = sum(1 for _, _, k in links if k == "anchor")
    unknown  = sum(1 for _, _, k in links if k == "unknown")
    print(f"\nSummary:  {external} external  |  {anchors} anchor/bookmark  |  {unknown} unknown")


if __name__ == "__main__":
    main()
