import shellManager from "@/lib/shell-manager";

export async function POST(request: Request) {
  try {
    const { command, sessionId = "default" } = await request.json();

    if (!command) {
      return Response.json({ error: "command is required" }, { status: 400 });
    }

    shellManager.createSession(sessionId);
    const result = await shellManager.executeCommand(sessionId, command);

    return Response.json({
      output: result.output,
      exitCode: result.exitCode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { sessionId } = await request.json();
    const killed = shellManager.killSession(sessionId);
    return Response.json({ success: killed });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ sessions: shellManager.listSessions() });
}
