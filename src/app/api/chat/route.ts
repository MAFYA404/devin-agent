import Anthropic from "@anthropic-ai/sdk";
import { toolDefinitions } from "@/lib/tools";
import { executeTool } from "@/lib/tool-executor";

export const maxDuration = 120;

const SYSTEM_PROMPT = `You are Devin, a software engineer using a real computer operating system. You are a real code-wiz: few programmers are as talented as you at understanding codebases, writing functional and clean code, and iterating on your changes until they are correct.

You have the following tools available:
- shell: Execute bash commands
- read_file: Read file contents
- write_file: Write/create files
- edit_file: Edit files by string replacement
- list_directory: List directory contents
- search_files: Search file contents with regex
- search_filenames: Search for files by name pattern

Guidelines:
- Do not add comments to code unless asked or the code is complex
- Mimic existing code style and conventions
- Never assume a library is available without checking
- Never expose or log secrets
- Be concise and action-focused in your responses
- Use tools to gather information before making assumptions
- When editing code, first understand the surrounding context`;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey });
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const processRequest = async () => {
    try {
      const { messages, mode = "standard" } = await request.json();

      const client = getClient();

      const systemPrompt =
        mode === "planning"
          ? SYSTEM_PROMPT +
            "\n\nYou are in PLANNING mode. Gather information, understand the codebase, and form a plan. Use search and read tools extensively before proposing changes."
          : SYSTEM_PROMPT +
            "\n\nYou are in STANDARD mode. Execute the plan and make changes. Use tools to implement the solution.";

      const anthropicMessages: Anthropic.MessageParam[] = messages.map(
        (msg: { role: string; content: string }) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })
      );

      let continueLoop = true;

      while (continueLoop) {
        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8096,
          system: systemPrompt,
          tools: toolDefinitions,
          messages: anthropicMessages,
        });

        const toolCalls: {
          id: string;
          name: string;
          input: Record<string, unknown>;
        }[] = [];
        let textContent = "";

        for (const block of response.content) {
          if (block.type === "text") {
            textContent += block.text;
          } else if (block.type === "tool_use") {
            toolCalls.push({
              id: block.id,
              name: block.name,
              input: block.input as Record<string, unknown>,
            });
          }
        }

        if (textContent) {
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({ type: "text", content: textContent })}\n\n`
            )
          );
        }

        if (toolCalls.length > 0) {
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({ type: "tool_calls", calls: toolCalls })}\n\n`
            )
          );

          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const call of toolCalls) {
            const result = await executeTool(call.name, call.input);

            await writer.write(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "tool_result",
                  callId: call.id,
                  name: call.name,
                  result: result.output,
                  isError: !result.success,
                })}\n\n`
              )
            );

            toolResults.push({
              type: "tool_result",
              tool_use_id: call.id,
              content: result.error
                ? `Error: ${result.error}\n${result.output}`
                : result.output,
              is_error: !result.success,
            });
          }

          anthropicMessages.push({
            role: "assistant",
            content: response.content,
          });
          anthropicMessages.push({
            role: "user",
            content: toolResults,
          });
        }

        if (response.stop_reason === "end_turn" || toolCalls.length === 0) {
          continueLoop = false;
        }
      }

      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({ type: "error", error: message })}\n\n`
        )
      );
    } finally {
      await writer.close();
    }
  };

  processRequest();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
