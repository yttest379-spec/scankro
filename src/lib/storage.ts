import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error("R2_ACCOUNT_ID missing");
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });
}

export async function createUploadUrl(contentType: string, folder = "menu") {
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "bin";
  const key = `${folder}/${nanoid()}.${ext}`;

  if (process.env.STORAGE_PROVIDER === "r2") {
    const client = getR2Client();
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });
    const publicUrl = `${process.env.R2_PUBLIC_URL?.replace(/\/$/, "")}/${key}`;
    return { uploadUrl, publicUrl, key, mode: "presigned" as const };
  }

  // Local: client posts to our API with FormData
  return {
    uploadUrl: `/api/uploads?key=${encodeURIComponent(key)}`,
    publicUrl: `/uploads/${key}`,
    key,
    mode: "local" as const,
  };
}

export async function saveLocalUpload(key: string, data: Buffer) {
  const safeKey = key.replace(/\.\./g, "").replace(/^\/+/, "");
  const filePath = path.join(process.cwd(), "public", "uploads", safeKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
  return `/uploads/${safeKey}`;
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
