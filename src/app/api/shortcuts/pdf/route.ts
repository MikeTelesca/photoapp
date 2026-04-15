import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

export const runtime = "nodejs";

interface Shortcut {
  keys: string[];
  action: string;
}

interface Section {
  title: string;
  shortcuts: Shortcut[];
}

const SECTIONS: Section[] = [
  {
    title: "Global",
    shortcuts: [
      { keys: ["Cmd", "N"], action: "New job" },
      { keys: ["Cmd", ","], action: "Settings" },
      { keys: ["Cmd", "S"], action: "Save current form" },
      { keys: ["Cmd", "K"], action: "Open command palette" },
      { keys: ["?"], action: "Show shortcuts cheatsheet" },
      { keys: ["Esc"], action: "Close modal / overlay" },
    ],
  },
  {
    title: "Dashboard / Navigation",
    shortcuts: [
      { keys: ["G", "D"], action: "Go to dashboard" },
      { keys: ["G", "N"], action: "Go to new job" },
      { keys: ["G", "S"], action: "Go to search" },
    ],
  },
  {
    title: "Review / Gallery",
    shortcuts: [
      { keys: ["A"], action: "Approve photo" },
      { keys: ["Y"], action: "Approve & advance to next" },
      { keys: ["R"], action: "Reject photo" },
      { keys: ["N"], action: "Reject & advance to next" },
      { keys: ["E"], action: "Re-enhance photo" },
      { keys: ["F"], action: "Favorite photo" },
      { keys: ["T"], action: "Flag photo for review" },
      { keys: ["S"], action: "Toggle slider view" },
      { keys: ["Z"], action: "Toggle zoom" },
      { keys: ["1"], action: "Zoom to fit" },
      { keys: ["2 / 3 / 4"], action: "Zoom 2x / 3x / 4x" },
      { keys: ["< / >"], action: "Navigate photos" },
      { keys: ["PgUp / PgDn"], action: "Jump 10 photos at a time" },
      { keys: ["Home"], action: "Jump to first photo" },
      { keys: ["End"], action: "Jump to last photo" },
      { keys: ["Space"], action: "Pause/play slideshow" },
    ],
  },
  {
    title: "Notes & Forms",
    shortcuts: [{ keys: ["Cmd", "/"], action: "Insert snippet (in note fields)" }],
  },
];

// ATH branding cyan
const ATH_CYAN = "#06b6d4";
const TEXT_DARK = "#1f2937";
const TEXT_MUTED = "#6b7280";
const BORDER = "#e5e7eb";

export async function GET() {
  const doc = new PDFDocument({ size: "LETTER", margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // Title
  doc
    .fillColor(ATH_CYAN)
    .fontSize(22)
    .font("Helvetica-Bold")
    .text("ATH Keyboard Shortcuts", { align: "left" });
  doc
    .fillColor(TEXT_MUTED)
    .fontSize(9)
    .font("Helvetica")
    .text("Printable reference card — ath.media", { align: "left" });
  doc.moveDown(0.6);

  // Accent divider
  const dividerY = doc.y;
  doc
    .strokeColor(ATH_CYAN)
    .lineWidth(2)
    .moveTo(40, dividerY)
    .lineTo(572, dividerY)
    .stroke();
  doc.moveDown(0.6);

  // Two-column layout
  const pageWidth = 612 - 80; // letter width minus margins
  const colGap = 20;
  const colWidth = (pageWidth - colGap) / 2;
  const leftX = 40;
  const rightX = 40 + colWidth + colGap;
  const topY = doc.y;

  // Split sections into two columns, balanced by row count
  const totalRows = SECTIONS.reduce(
    (sum, s) => sum + s.shortcuts.length + 2,
    0
  );
  let running = 0;
  const leftSections: Section[] = [];
  const rightSections: Section[] = [];
  for (const s of SECTIONS) {
    if (running < totalRows / 2) {
      leftSections.push(s);
    } else {
      rightSections.push(s);
    }
    running += s.shortcuts.length + 2;
  }

  function renderColumn(x: number, y: number, sections: Section[]) {
    let cursorY = y;
    for (const section of sections) {
      // Section heading
      doc
        .fillColor(ATH_CYAN)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(section.title.toUpperCase(), x, cursorY, { width: colWidth });
      cursorY = doc.y + 2;

      // Underline
      doc
        .strokeColor(ATH_CYAN)
        .lineWidth(0.5)
        .moveTo(x, cursorY)
        .lineTo(x + colWidth, cursorY)
        .stroke();
      cursorY += 4;

      // Shortcuts rows
      for (const sc of section.shortcuts) {
        const keyText = sc.keys.join(" + ");
        const rowH = 14;

        // Action (left side)
        doc
          .fillColor(TEXT_DARK)
          .font("Helvetica")
          .fontSize(9)
          .text(sc.action, x, cursorY, {
            width: colWidth * 0.6,
            ellipsis: true,
          });

        // Key (right side, monospaced, in a subtle bordered pill)
        const keyW = colWidth * 0.38;
        const keyX = x + colWidth - keyW;
        doc
          .fillColor(TEXT_DARK)
          .font("Courier-Bold")
          .fontSize(8)
          .text(keyText, keyX, cursorY + 1, {
            width: keyW,
            align: "right",
            ellipsis: true,
          });

        cursorY += rowH;

        // Thin separator
        doc
          .strokeColor(BORDER)
          .lineWidth(0.3)
          .moveTo(x, cursorY - 2)
          .lineTo(x + colWidth, cursorY - 2)
          .stroke();
      }
      cursorY += 10;
    }
  }

  renderColumn(leftX, topY, leftSections);
  const leftEnd = doc.y;
  renderColumn(rightX, topY, rightSections);
  const rightEnd = doc.y;

  // Footer
  const footerY = Math.max(leftEnd, rightEnd, 720);
  doc
    .fillColor(TEXT_MUTED)
    .font("Helvetica-Oblique")
    .fontSize(8)
    .text(
      "Tip: press ? anywhere in the app to open this cheatsheet on screen.",
      40,
      footerY,
      { width: pageWidth, align: "center" }
    );

  doc.end();
  const pdfBuffer = await pdfPromise;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="ath-shortcuts.pdf"',
    },
  });
}
