/* eslint-disable @typescript-eslint/no-explicit-any -- downstream libraries play nicer with any than unknown */
import type { z } from "zod"

/**
 * Configuration interface for creating a Tool
 * @template TParameters - The Zod schema type for the tool's parameters
 */
interface ToolConfig<TParameters extends z.ZodSchema = z.ZodSchema> {
  /** The name of the tool */
  name: string
  /** A description of what the tool does */
  description: string
  /** The Zod schema defining the tool's parameters */
  parameters: TParameters
}

/**
 * Abstract base class for creating tools with typed parameters and results
 * @template TParameters - The Zod schema type for the tool's parameters
 * @template TResult - The return type of the tool's execute method
 */
export abstract class ToolBase<
  TParameters extends z.ZodSchema = z.ZodSchema,
  TResult = any
> {
  /** The name of the tool */
  public readonly name: string
  /** A description of what the tool does */
  public readonly description: string
  /** The Zod schema defining the parameters, that will be passed to the tool's execute method */
  public readonly parameters: TParameters

  /**
   * Creates a new Tool instance
   * @param config - The configuration object for the tool
   */
  constructor(config: ToolConfig<TParameters>) {
    this.name = config.name
    this.description = config.description
    this.parameters = config.parameters
  }

  /**
   * Executes the tool with the provided parameters
   * @param parameters - The parameters for the tool execution, validated against the tool's schema
   * @returns The result of the tool execution
   */
  abstract execute(parameters: z.infer<TParameters>): TResult | Promise<TResult>
}

/**
 * Creates a new Tool instance with the provided configuration and execution function
 * @template TParameters - The Zod schema type for the tool's parameters
 * @template TResult - The return type of the tool's execute method
 * @param config - The configuration object for the tool
 * @param execute - The function to be called when the tool is executed
 * @returns A new Tool instance
 */

export function tool<TParameters extends z.ZodSchema, TResult = any>(
  config: ToolConfig<TParameters> & {
    execute: (parameters: z.infer<TParameters>) => TResult | Promise<TResult>
  }
) {
  return new (class extends ToolBase<TParameters, TResult> {
    execute(parameters: z.infer<TParameters>): TResult | Promise<TResult> {
      return config.execute(parameters)
    }
  })(config)
}

export function getToolMap(tools: ToolBase[]) {
  return new Map(tools.map((t) => [t.name, t]))
}
