import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import formidable, { Files, File } from "formidable";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Readable } from "stream";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper: Convert a buffer to a readable stream (for formidable)
function bufferToStream(buffer: Buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId } = params;
  if (!courseId) {
    return NextResponse.json({ error: "Missing courseId in params" }, { status: 400 });
  }

  // Only run on Node.js runtime (not edge)
  if (!process || !process.cwd) {
    return NextResponse.json({ error: "This API only works in Node.js runtime." }, { status: 500 });
  }

  // Read the raw request body as a buffer
  const body = Buffer.from(await req.arrayBuffer());

  // Create a mock IncomingMessage for formidable
  const mockReq = Object.assign(bufferToStream(body), {
    headers: Object.fromEntries(req.headers.entries()),
    method: req.method,
    url: req.url,
  });

  const form = formidable({ multiples: false, uploadDir: "/tmp", keepExtensions: true });

  return await new Promise<NextResponse>((resolve) => {
    form.parse(
      mockReq as unknown as import("http").IncomingMessage,
      async (err: Error | null, _fields: Record<string, unknown>, files: Files) => {
        if (err) {
          resolve(NextResponse.json({ error: "Upload error" }, { status: 500 }));
          return;
        }
        const fileData = files.file as File | File[] | undefined;
        if (!fileData) {
          resolve(NextResponse.json({ error: "No file uploaded" }, { status: 400 }));
          return;
        }
        const fileObj = Array.isArray(fileData) ? fileData[0] : fileData;
        const originalFilename = fileObj.originalFilename;
        const filepath = fileObj.filepath;

        const uploadDir = path.join(process.cwd(), "public", "upload", courseId);
        await fs.mkdir(uploadDir, { recursive: true });
        const destPath = path.join(uploadDir, originalFilename!);
        await fs.copyFile(filepath, destPath);

        const fileUrl = `/upload/${courseId}/${originalFilename}`;
        resolve(NextResponse.json({ url: fileUrl }));
      }
    );
  });
}