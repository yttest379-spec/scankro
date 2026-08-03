import QRCode from "qrcode";
import PDFDocument from "pdfkit";

export async function generateQrPng(url: string, size = 512): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    width: size,
    margin: 2,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

export async function generateQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 2,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

export async function generateQrPdf(
  url: string,
  opts: { restaurantName: string; subtitle?: string }
): Promise<Buffer> {
  const png = await generateQrPng(url, 400);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A5", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc
      .fontSize(22)
      .fillColor("#0f172a")
      .text(opts.restaurantName, { align: "center" });

    if (opts.subtitle) {
      doc.moveDown(0.4);
      doc.fontSize(14).fillColor("#475569").text(opts.subtitle, { align: "center" });
    }

    doc.moveDown(1);
    doc.fontSize(12).fillColor("#64748b").text("Scan for menu", { align: "center" });
    doc.moveDown(0.8);

    const pageWidth = doc.page.width;
    const imgSize = 260;
    const x = (pageWidth - imgSize) / 2;
    doc.image(png, x, doc.y, { width: imgSize, height: imgSize });

    doc.moveDown(14);
    doc.fontSize(9).fillColor("#94a3b8").text(url, { align: "center" });
    doc.end();
  });
}
