import { NextRequest, NextResponse } from "next/server";
import {
  ALLOWED_IMAGE_TYPES,
  createUploadUrl,
  MAX_IMAGE_BYTES,
  saveLocalUpload,
} from "@/lib/storage";
import { getWorkspace, hasMinRole } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  const ws = await getWorkspace(req.nextUrl.searchParams.get("branch"));
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(ws.role, "manager"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    // local form upload
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const key = req.nextUrl.searchParams.get("key") || form.get("key")?.toString();
    if (!file || !key)
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    if (!ALLOWED_IMAGE_TYPES.includes(file.type))
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    if (file.size > MAX_IMAGE_BYTES)
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    const publicUrl = await saveLocalUpload(key, buf);
    return NextResponse.json({ publicUrl });
  }

  const body = await req.json();
  const type = body.contentType as string;
  if (!ALLOWED_IMAGE_TYPES.includes(type))
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const result = await createUploadUrl(type, body.folder || "menu");
  return NextResponse.json(result);
}
