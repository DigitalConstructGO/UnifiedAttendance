import { jsPDF } from "jspdf";

import { exactMoney } from "@/lib/client-presentation";

/**
 * Everything the PDF prints, and nothing else — the layout below is pure
 * geometry over this data, so a different organization (name, logo, TIN,
 * address) or invoice renders its own document with no code changes.
 */
export type InvoiceDocumentData = {
  organization: {
    name: string;
    logoUrl: string | null;
    tin: string | null;
    address: string | null;
  };
  invoice: {
    number: string;
    dueOn: string | null;
    draft: boolean;
    billTo: string;
    currency: string;
    totalAmount: string;
    rows: Array<{ name: string; description: string; amount: string; note: string }>;
  };
};

/** The document's look in one place, matched to the paper original. */
const THEME = {
  title: [176, 190, 60],
  label: [176, 190, 60],
  tableHead: [56, 80, 140],
  tableHeadText: [255, 255, 255],
  text: [35, 35, 35],
  muted: [95, 95, 95],
  line: [60, 60, 60],
} as const;

const PAGE = { margin: 16, width: 210 } as const;
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const COLUMNS = [
  { label: "Name", width: 40 },
  { label: "Description", width: 63 },
  { label: "Amount", width: 32 },
  { label: "Note", width: 43 },
] as const;

function setColor(doc: jsPDF, color: readonly [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

/** The logo travels as a data URL; a missing or unloadable logo is skipped. */
async function loadLogo(url: string): Promise<{ data: string; format: "PNG" | "JPEG" } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const format = blob.type.includes("png")
      ? "PNG"
      : blob.type.includes("jpeg") || blob.type.includes("jpg")
        ? "JPEG"
        : null;
    if (!format) return null;
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return { data, format };
  } catch {
    return null;
  }
}

function drawTable(doc: jsPDF, top: number, data: InvoiceDocumentData): number {
  const left = PAGE.margin;
  const headHeight = 12;
  doc.setFillColor(THEME.tableHead[0], THEME.tableHead[1], THEME.tableHead[2]);
  doc.rect(left, top, CONTENT_WIDTH, headHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  setColor(doc, THEME.tableHeadText);
  let x = left;
  for (const column of COLUMNS) {
    doc.text(column.label, x + column.width / 2, top + headHeight / 2 + 1.5, { align: "center" });
    x += column.width;
  }

  // The paper form keeps a couple of blank rows; mirror that.
  const rows = [...data.invoice.rows];
  while (rows.length < 3) rows.push({ name: "", description: "", amount: "", note: "" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setColor(doc, THEME.text);
  doc.setDrawColor(THEME.line[0], THEME.line[1], THEME.line[2]);
  doc.setLineWidth(0.3);

  let y = top + headHeight;
  for (const row of rows) {
    const cells = [row.name, row.description, row.amount, row.note].map((value, index) =>
      doc.splitTextToSize(value, COLUMNS[index]!.width - 6),
    );
    const lines = Math.max(1, ...cells.map((cell) => cell.length));
    const height = Math.max(14, lines * 4.5 + 7);
    x = left;
    cells.forEach((cell, index) => {
      const column = COLUMNS[index]!;
      doc.rect(x, y, column.width, height);
      const offset = (height - cell.length * 4.5) / 2 + 3.4;
      doc.text(cell, x + column.width / 2, y + offset, { align: "center" });
      x += column.width;
    });
    y += height;
  }
  return y;
}

export async function buildInvoicePdf(data: InvoiceDocumentData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { organization, invoice } = data;
  const right = PAGE.width - PAGE.margin;

  // Header — INVOICE title left; logo, name, number, TIN and address right.
  const logo = organization.logoUrl ? await loadLogo(organization.logoUrl) : null;
  let headerY = 20;
  if (logo) {
    const size = 16;
    doc.addImage(logo.data, logo.format, right - size, 14, size, size);
    headerY = 36;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  setColor(doc, THEME.title);
  doc.text("INVOICE", PAGE.margin, 34);

  doc.setFontSize(11);
  setColor(doc, THEME.text);
  doc.text(organization.name, right, headerY, { align: "right" });
  headerY += 6;

  doc.setFontSize(9.5);
  const headerLines: Array<[string, string]> = [
    ["Invoice No:", invoice.number],
    ...(organization.tin ? ([["Tin No:", organization.tin]] as Array<[string, string]>) : []),
  ];
  for (const [label, value] of headerLines) {
    doc.setFont("helvetica", "bold");
    const valueWidth = doc.getTextWidth(value) + 2;
    doc.text(label, right - valueWidth - doc.getTextWidth(label), headerY);
    doc.setFont("helvetica", "normal");
    doc.text(value, right, headerY, { align: "right" });
    headerY += 5;
  }
  if (organization.address) {
    doc.setFont("helvetica", "normal");
    setColor(doc, THEME.muted);
    const address = doc.splitTextToSize(organization.address.toUpperCase(), 58);
    doc.text(address, right, headerY + 1, { align: "right" });
    headerY += address.length * 4.5;
  }

  setColor(doc, THEME.label);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  if (invoice.dueOn) doc.text(`Due Date: ${invoice.dueOn}`, PAGE.margin, 46);
  doc.text("Bill to:", PAGE.margin, 56);
  doc.setFont("helvetica", "normal");
  setColor(doc, THEME.text);
  doc.text(invoice.billTo, PAGE.margin + 15, 56);
  if (invoice.draft) {
    doc.setFont("helvetica", "bold");
    setColor(doc, THEME.muted);
    doc.text("DRAFT", right, 56, { align: "right" });
  }

  const tableBottom = drawTable(doc, Math.max(64, headerY + 8), data);

  // Subtotal under the table, amount aligned with the Amount column.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setColor(doc, THEME.text);
  doc.text("Subtotal:", PAGE.margin + COLUMNS[0].width + COLUMNS[1].width - 2, tableBottom + 10, {
    align: "right",
  });
  doc.text(
    exactMoney(invoice.totalAmount, invoice.currency),
    PAGE.margin + COLUMNS[0].width + COLUMNS[1].width + COLUMNS[2].width + 8,
    tableBottom + 10,
    { align: "right" },
  );

  return doc;
}

export async function downloadInvoicePdf(data: InvoiceDocumentData) {
  const doc = await buildInvoicePdf(data);
  doc.save(`${data.invoice.number}.pdf`);
}
