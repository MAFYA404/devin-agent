import fs from "fs/promises";
import path from "path";

const ENV_PATH = path.join(process.cwd(), ".env.local");

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return Response.json({ error: "apiKey is required" }, { status: 400 });
    }

    let envContent = "";
    try {
      envContent = await fs.readFile(ENV_PATH, "utf-8");
    } catch {
      // file doesn't exist yet
    }

    const lines = envContent.split("\n").filter((l) => !l.startsWith("ANTHROPIC_API_KEY="));
    lines.push(`ANTHROPIC_API_KEY=${apiKey}`);

    await fs.writeFile(ENV_PATH, lines.filter(Boolean).join("\n") + "\n");

    process.env.ANTHROPIC_API_KEY = apiKey;

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  return Response.json({ configured: hasKey });
}
