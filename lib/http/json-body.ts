export class JsonBodyError extends Error {
  constructor(message: string, readonly status: 400 | 413) {
    super(message)
    this.name = 'JsonBodyError'
  }
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const reader = request.body?.getReader()
  if (!reader) throw new JsonBodyError('A JSON request body is required.', 400)

  const chunks: Uint8Array[] = []
  let totalBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > maxBytes) {
      await reader.cancel()
      throw new JsonBodyError('The request body is too large.', 413)
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown
  } catch {
    throw new JsonBodyError('The request body is not valid JSON.', 400)
  }
}
