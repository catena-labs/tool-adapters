import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  server: {
    ANTHROPIC_API_KEY: z.string(),
    GOOGLE_API_KEY: z.string(),
    OPENAI_API_KEY: z.string()
  },
  runtimeEnv: process.env
})
