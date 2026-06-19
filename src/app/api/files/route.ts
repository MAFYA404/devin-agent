import {
  readFile,
  writeFile,
  listDirectory,
  deleteFile,
} from "@/lib/file-manager";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filePath = url.searchParams.get("path");
  const action = url.searchParams.get("action") || "read";

  if (!filePath) {
    return Response.json({ error: "path is required" }, { status: 400 });
  }

  try {
    if (action === "list") {
      const entries = await listDirectory(filePath);
      return Response.json({ entries });
    } else {
      const content = await readFile(filePath);
      return Response.json({ content, path: filePath });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { path: filePath, content } = await request.json();

    if (!filePath || content === undefined) {
      return Response.json(
        { error: "path and content are required" },
        { status: 400 }
      );
    }

    await writeFile(filePath, content);
    return Response.json({ success: true, path: filePath });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { path: filePath } = await request.json();

    if (!filePath) {
      return Response.json({ error: "path is required" }, { status: 400 });
    }

    await deleteFile(filePath);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
