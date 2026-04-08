import { ZodSchema } from 'zod'
import { NextResponse } from 'next/server'

type ValidationSuccess<T> = { value: T }
type ValidationFailure = { error: NextResponse }

/**
 * Validates an unknown value against a Zod schema.
 * Returns { value } on success or { error: NextResponse(400) } on failure.
 *
 * @example
 * const v = validateBody(CreateToolSchema, body)
 * if ('error' in v) return v.error
 * const { name, toolType } = v.value
 */
export function validateBody<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationSuccess<T> | ValidationFailure {
  const result = schema.safeParse(data)
  if (!result.success) {
    const message = result.error.errors
      .map((e) => `${e.path.join('.') || 'body'}: ${e.message}`)
      .join(', ')
    return {
      error: NextResponse.json(
        { error: `Validation failed: ${message}` },
        { status: 400 }
      ),
    }
  }
  return { value: result.data }
}
