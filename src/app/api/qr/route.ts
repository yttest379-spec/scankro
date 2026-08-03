import { NextRequest, NextResponse } from "next/server";
import { getWorkspace, hasMinRole } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { absoluteUrl } from "@/lib/utils";
import { generateQrPdf, generateQrPng, generateQrSvg } from "@/lib/qr";
import { getPlanLimits } from "@/lib/plans";
import JSZip from "jszip";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const format = (req.nextUrl.searchParams.get("format") || "png") as
    | "png"
    | "svg"
    | "pdf";
  const table = req.nextUrl.searchParams.get("table");
  const branchParam = req.nextUrl.searchParams.get("branch");
  const bulk = req.nextUrl.searchParams.get("bulk") === "1";

  const ws = await getWorkspace(branchParam);
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limits = getPlanLimits(ws.plan);
  if (!limits.qrFormats.includes(format) && !bulk) {
    return NextResponse.json(
      { error: `Format ${format} requires a paid plan` },
      { status: 402 }
    );
  }

  const branch = await prisma.branch.findUnique({ where: { id: ws.branchId } });
  if (!branch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (bulk) {
    if (!limits.tableQrs)
      return NextResponse.json({ error: "Table QRs require Pro" }, { status: 402 });
    const tables = await prisma.tableQr.findMany({
      where: { branchId: branch.id },
      orderBy: { tableNumber: "asc" },
    });
    const zip = new JSZip();
    for (const t of tables) {
      const url = absoluteUrl(`/t/${branch.slug}/${t.tableNumber}`);
      const pdf = await generateQrPdf(url, {
        restaurantName: branch.name,
        subtitle: t.label || `Table ${t.tableNumber}`,
      });
      zip.file(`${branch.slug}-table-${t.tableNumber}.pdf`, pdf);
    }
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${branch.slug}-table-qrs.zip"`,
      },
    });
  }

  let url = absoluteUrl(`/${branch.slug}`);
  let subtitle: string | undefined;
  if (table) {
    if (!limits.tableQrs)
      return NextResponse.json({ error: "Table QRs require Pro" }, { status: 402 });
    url = absoluteUrl(`/t/${branch.slug}/${table}`);
    subtitle = `Table ${table}`;
  }

  if (format === "png") {
    const buf = await generateQrPng(url);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${branch.slug}.png"`,
      },
    });
  }
  if (format === "svg") {
    const svg = await generateQrSvg(url);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="${branch.slug}.svg"`,
      },
    });
  }
  const pdf = await generateQrPdf(url, {
    restaurantName: branch.name,
    subtitle,
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${branch.slug}.pdf"`,
    },
  });
}

const tableSchema = z.object({
  tableNumber: z.number().int().min(1).max(999),
  label: z.string().max(40).optional().nullable(),
  branchId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = tableSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const ws = await getWorkspace(parsed.data.branchId);
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(ws.role, "manager"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const limits = getPlanLimits(ws.plan);
  if (!limits.tableQrs)
    return NextResponse.json({ error: "Table QRs require Pro" }, { status: 402 });

  const table = await prisma.tableQr.upsert({
    where: {
      branchId_tableNumber: {
        branchId: ws.branchId,
        tableNumber: parsed.data.tableNumber,
      },
    },
    create: {
      branchId: ws.branchId,
      tableNumber: parsed.data.tableNumber,
      label: parsed.data.label || null,
    },
    update: { label: parsed.data.label || null },
  });

  return NextResponse.json({ table });
}

export async function DELETE(req: NextRequest) {
  const tableNumber = Number(req.nextUrl.searchParams.get("tableNumber"));
  const branchParam = req.nextUrl.searchParams.get("branch");
  const ws = await getWorkspace(branchParam);
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(ws.role, "manager"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.tableQr.deleteMany({
    where: { branchId: ws.branchId, tableNumber },
  });
  return NextResponse.json({ ok: true });
}
