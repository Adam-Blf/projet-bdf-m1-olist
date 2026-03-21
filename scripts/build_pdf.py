"""Render docs/rapport.md to docs/rapport.pdf using ReportLab.

Linear single-pass parser: each iteration consumes >= 1 line, so it cannot loop.
Supports: H1/H2/H3, paragraphs, bullet/numbered lists, fenced code blocks,
blockquotes, GFM pipe tables, inline `code`, **bold**, *italic*, links.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, PageBreak, Paragraph, Preformatted,
    Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
SRC  = ROOT / "docs" / "rapport.md"
OUT  = ROOT / "docs" / "rapport.pdf"

# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------
ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Heading1"], fontName="Helvetica-Bold",
                    fontSize=22, leading=26, spaceBefore=18, spaceAfter=10,
                    textColor=colors.HexColor("#000091"))
H2 = ParagraphStyle("H2", parent=ss["Heading2"], fontName="Helvetica-Bold",
                    fontSize=15, leading=18, spaceBefore=14, spaceAfter=6,
                    textColor=colors.HexColor("#000091"))
H3 = ParagraphStyle("H3", parent=ss["Heading3"], fontName="Helvetica-Bold",
                    fontSize=12, leading=15, spaceBefore=10, spaceAfter=4,
                    textColor=colors.HexColor("#00897B"))
BODY = ParagraphStyle("Body", parent=ss["BodyText"], fontName="Helvetica",
                      fontSize=10, leading=14, spaceAfter=6, alignment=TA_LEFT,
                      textColor=colors.HexColor("#1f2937"))
QUOTE = ParagraphStyle("Quote", parent=BODY, leftIndent=18,
                       textColor=colors.HexColor("#475569"),
                       fontName="Helvetica-Oblique")
LIST = ParagraphStyle("List", parent=BODY, leftIndent=14, bulletIndent=4,
                      spaceAfter=2)
CODE = ParagraphStyle("Code", parent=ss["Code"], fontName="Courier",
                      fontSize=8.5, leading=11,
                      textColor=colors.HexColor("#0f172a"),
                      backColor=colors.HexColor("#f1f5f9"),
                      borderColor=colors.HexColor("#cbd5e1"),
                      borderWidth=0.5, borderPadding=6,
                      leftIndent=4, rightIndent=4, spaceAfter=8)


def inline_md(text: str) -> str:
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"`([^`]+)`",
                  r'<font face="Courier" color="#0f172a">\1</font>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\*([^*]+)\*",     r"<i>\1</i>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)",
                  r'<link href="\2" color="#000091">\1</link>', text)
    return text


SEP_RE = re.compile(r"^\s*\|?\s*[:\-]+\s*(\|\s*[:\-]+\s*)+\|?\s*$")
H_RE   = re.compile(r"^(#{1,3})\s+(.*)$")
HR_RE  = re.compile(r"^---+\s*$")
NUM_RE = re.compile(r"^\s*(\d+)\.\s+(.*)$")
BUL_RE = re.compile(r"^\s*[-*]\s+(.*)$")


def split_pipe(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def make_table(head: list[str], rows: list[list[str]]):
    n = len(head)
    rows = [r + [""] * (n - len(r)) if len(r) < n else r[:n] for r in rows]
    data = [[Paragraph(inline_md(c), BODY) for c in head]]
    for r in rows:
        data.append([Paragraph(inline_md(c), BODY) for c in r])
    tbl = Table(data, colWidths=[16 * cm / n] * n, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#000091")),
        ("TEXTCOLOR",  (0, 0), (-1, 0), colors.whitesmoke),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 8.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1),
         [colors.whitesmoke, colors.HexColor("#f8fafc")]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return tbl


def parse(md: str):
    lines = md.splitlines()
    flow = []
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]

        if not line.strip():
            i += 1
            continue

        if line.strip().startswith("```"):
            buf = []
            i += 1
            while i < n and not lines[i].strip().startswith("```"):
                buf.append(lines[i])
                i += 1
            i += 1
            flow.append(Preformatted("\n".join(buf), CODE))
            continue

        if HR_RE.match(line):
            flow.append(Spacer(1, 4))
            flow.append(Table([[""]], colWidths=[16 * cm], rowHeights=[0.5],
                              style=TableStyle([("LINEBELOW", (0, 0), (-1, -1),
                                                 0.5, colors.HexColor("#cbd5e1"))])))
            flow.append(Spacer(1, 4))
            i += 1
            continue

        m = H_RE.match(line)
        if m:
            level = len(m.group(1))
            flow.append(Paragraph(inline_md(m.group(2)), [H1, H2, H3][level - 1]))
            i += 1
            continue

        if line.startswith(">"):
            buf = [line.lstrip(">").lstrip()]
            i += 1
            while i < n and lines[i].startswith(">"):
                buf.append(lines[i].lstrip(">").lstrip())
                i += 1
            flow.append(Paragraph(inline_md(" ".join(buf)), QUOTE))
            continue

        if "|" in line and i + 1 < n and SEP_RE.match(lines[i + 1]):
            head = split_pipe(line)
            i += 2
            rows = []
            while i < n and "|" in lines[i] and lines[i].strip():
                rows.append(split_pipe(lines[i]))
                i += 1
            flow.append(Spacer(1, 4))
            flow.append(make_table(head, rows))
            flow.append(Spacer(1, 8))
            continue

        m = BUL_RE.match(line)
        if m:
            while i < n:
                m2 = BUL_RE.match(lines[i])
                if not m2:
                    break
                flow.append(Paragraph(inline_md(m2.group(1)), LIST,
                                      bulletText="•"))
                i += 1
            flow.append(Spacer(1, 4))
            continue

        m = NUM_RE.match(line)
        if m:
            while i < n:
                m2 = NUM_RE.match(lines[i])
                if not m2:
                    break
                flow.append(Paragraph(inline_md(m2.group(2)), LIST,
                                      bulletText=f"{m2.group(1)}."))
                i += 1
            flow.append(Spacer(1, 4))
            continue

        # paragraph: collect lines until blank / heading / list / fence / quote
        buf = [line]
        i += 1
        while i < n:
            cur = lines[i]
            if not cur.strip(): break
            if H_RE.match(cur): break
            if HR_RE.match(cur): break
            if cur.strip().startswith("```"): break
            if cur.startswith(">"): break
            if BUL_RE.match(cur): break
            if NUM_RE.match(cur): break
            if "|" in cur and i + 1 < n and SEP_RE.match(lines[i + 1]): break
            buf.append(cur)
            i += 1
        flow.append(Paragraph(inline_md(" ".join(buf)), BODY))

    return flow


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawString(2 * cm, 1 * cm,
                      "Olist Data Platform · BDF M1 DE&IA EFREI · "
                      "Adam Beloucif & Emilien Morice · 2026-03-22")
    canvas.drawRightString(19 * cm, 1 * cm, f"page {doc.page}")
    canvas.restoreState()


def cover():
    return [
        Spacer(1, 5 * cm),
        Paragraph("Olist Data Platform",
                  ParagraphStyle("Cover", fontName="Helvetica-Bold",
                                 fontSize=34, leading=40,
                                 textColor=colors.HexColor("#000091"))),
        Spacer(1, 4),
        Paragraph("Architecture médaillon Hadoop · Spark · Hive · Postgres",
                  ParagraphStyle("Sub", fontName="Helvetica", fontSize=14,
                                 leading=18, textColor=colors.HexColor("#00897B"))),
        Spacer(1, 1.4 * cm),
        Paragraph("<b>Module</b> · Big Data Frameworks (M1-XDE709-M1-DE2-2025-2026-A)<br/>"
                  "<b>Encadrant</b> · Steve ELANGA<br/>"
                  "<b>Auteurs</b> · Adam BELOUCIF (adam.beloucif@efrei.net) · "
                  "Emilien MORICE (emilien.morice@efrei.net)<br/>"
                  "<b>Période de réalisation</b> · 18 → 22 mars 2026<br/>"
                  "<b>Date du rendu</b> · 22 mars 2026",
                  ParagraphStyle("Meta", fontName="Helvetica", fontSize=11,
                                 leading=16, textColor=colors.HexColor("#1f2937"))),
        Spacer(1, 0.6 * cm),
        Paragraph("EFREI · M1 Data Engineering & IA · 2025-2026",
                  ParagraphStyle("Meta2", fontName="Helvetica-Oblique",
                                 fontSize=10, textColor=colors.HexColor("#64748b"))),
        PageBreak(),
    ]


def main():
    md = SRC.read_text(encoding="utf-8")
    doc = BaseDocTemplate(
        str(OUT), pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=1.6 * cm, bottomMargin=1.6 * cm,
        title="Olist Data Platform - Rapport projet",
        author="Adam Beloucif, Emilien Morice",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height,
                  id="body")
    doc.addPageTemplates([PageTemplate(id="all", frames=[frame],
                                       onPage=header_footer)])
    flow = cover() + parse(md)
    doc.build(flow)
    print(f"Wrote {OUT} ({OUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
