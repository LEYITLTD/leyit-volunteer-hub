import path from "path";
import { PDFDocument } from "pdf-lib";

let fontRegistered = false;

function ensureFont() {
  if (fontRegistered) return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GlobalFonts } = require("@napi-rs/canvas");
  const fontPath = path.join(process.cwd(), "public/fonts/GreatVibes-Regular.ttf");
  GlobalFonts.registerFromPath(fontPath, "GreatVibes");
  fontRegistered = true;
}

export async function generateCertificate(
  templateBuffer: Buffer,
  name: string,
  nameX: number,    // 0–1 fraction of image width
  nameY: number,    // 0–1 fraction of image height
  fontSize: number, // pixels at template resolution
  textColor: string,
): Promise<Buffer> {
  ensureFont();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createCanvas, loadImage } = require("@napi-rs/canvas");

  const img    = await loadImage(templateBuffer);
  const canvas = createCanvas(img.width, img.height);
  const ctx    = canvas.getContext("2d");

  ctx.drawImage(img, 0, 0);

  ctx.font         = `${fontSize}px GreatVibes`;
  ctx.fillStyle    = textColor;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(name, img.width * nameX, img.height * nameY);

  return canvas.toBuffer("image/png") as Buffer;
}

export async function pngToPdf(pngBuffer: Buffer): Promise<Buffer> {
  const pdf  = await PDFDocument.create();
  const img  = await pdf.embedPng(pngBuffer);
  const { width, height } = img.scale(1);
  const page = pdf.addPage([width, height]);
  page.drawImage(img, { x: 0, y: 0, width, height });
  return Buffer.from(await pdf.save());
}
