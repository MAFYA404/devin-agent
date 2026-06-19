import { searchFiles, searchFilenames } from "@/lib/file-manager";

export async function POST(request: Request) {
  try {
    const { path: dirPath, pattern, glob, type = "content", maxResults = 50 } = await request.json();

    if (!dirPath) {
      return Response.json({ error: "path is required" }, { status: 400 });
    }

    if (type === "filename") {
      if (!glob) {
        return Response.json(
          { error: "glob is required for filename search" },
          { status: 400 }
        );
      }
      const results = await searchFilenames(dirPath, glob);
      return Response.json({ results });
    } else {
      if (!pattern) {
        return Response.json(
          { error: "pattern is required for content search" },
          { status: 400 }
        );
      }
      const results = await searchFiles(dirPath, pattern, maxResults);
      return Response.json({ results });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
