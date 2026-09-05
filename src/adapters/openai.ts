import zodToJsonSchema from "zod-to-json-schema"
import { getToolMap } from "../tool"
import type { ToolBase } from "../tool"
import type OpenAI from "openai"

export function toChatCompletionTools(
  tools: ToolBase[]
): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.parameters)
    }
  }))
}

export async function handleChatCompletionToolCalls(
  message: OpenAI.Chat.ChatCompletionMessage,
  tools: ToolBase[]
): Promise<OpenAI.Chat.ChatCompletionToolMessageParam[]> {
  const toolCalls = message.tool_calls ?? []

  const toolMap = getToolMap(tools)

  const results = await Promise.all(
    toolCalls.map(async (toolCall) => {
      const tool = toolMap.get(toolCall.function.name)
      if (!tool) {
        return
      }

      const args: unknown = tool.parameters.parse(
        JSON.parse(toolCall.function.arguments)
      )
      const response = (await tool.execute(args)) as unknown

      return {
        role: "tool" as const,
        tool_call_id: toolCall.id,
        content: JSON.stringify(response)
      }
    })
  )

  return results.filter((r) => !!r)
}

/**
 * Recursively enforces OpenAI strict-mode requirements on a converted JSON
 * Schema: every object must declare `additionalProperties: false` and must
 * list every property in `properties` under `required`. Zod optional fields
 * only appear in `required` when non-optional, so an object whose fields are
 * all optional (or an empty object) omits `required` entirely — which strict
 * mode rejects with a 400.
 */
function enforceStrictRequirements(schema: unknown): void {
  if (Array.isArray(schema)) {
    for (const item of schema) {
      enforceStrictRequirements(item)
    }
    return
  }
  if (typeof schema !== "object" || schema === null) {
    return
  }
  const node = schema as Record<string, unknown>
  if (
    node.type === "object" &&
    typeof node.properties === "object" &&
    node.properties !== null
  ) {
    const properties = Object.keys(node.properties)
    node.additionalProperties = false
    const required = new Set(
      Array.isArray(node.required) ? (node.required as unknown[]) : []
    )
    for (const property of properties) {
      required.add(property)
    }
    node.required = [...required]
  }
  for (const value of Object.values(node)) {
    enforceStrictRequirements(value)
  }
}

export function toResponsesTools(
  tools: ToolBase[]
): OpenAI.Responses.FunctionTool[] {
  return tools.map((tool) => {
    const parameters = zodToJsonSchema(tool.parameters) as Record<
      string,
      unknown
    >
    enforceStrictRequirements(parameters)
    return {
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters,
      strict: true
    }
  })
}

export async function handleResponsesToolCalls(
  response: OpenAI.Responses.Response,
  tools: ToolBase[]
): Promise<OpenAI.Responses.ResponseInputItem.FunctionCallOutput[]> {
  const toolCalls = response.output.filter(
    (item) => item.type === "function_call"
  )

  const toolMap = getToolMap(tools)

  const results = await Promise.all(
    toolCalls.map(async (toolCall) => {
      const tool = toolMap.get(toolCall.name)
      if (!tool) {
        return
      }

      const args: unknown = tool.parameters.parse(
        JSON.parse(toolCall.arguments)
      )
      const response = (await tool.execute(args)) as unknown

      return {
        type: "function_call_output" as const,
        call_id: toolCall.call_id,
        output: JSON.stringify(response)
      }
    })
  )

  return results.filter((r) => !!r)
}
