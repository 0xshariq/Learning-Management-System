import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import formidable, { Fields, Files, File } from "formidable";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const config = {
  api: {
    bodyParser: false,
  },
};

function getNodeRequest(req: NextRequest): import("http").IncomingMessage {
  // NextRequest is not compatible with formidable, so we extract the raw Node.js request

  interface NextRequestWithNode extends NextRequest {
    req: import("http").IncomingMessage;
  }
  return (req as NextRequestWithNode).req;
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

  const form = formidable({ multiples: false, uploadDir: "/tmp", keepExtensions: true });

  return new Promise<NextResponse>(resolve => {
    form.parse(
      getNodeRequest(req),
      async (err: Error | null, fields: Fields, files: Files) => {
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