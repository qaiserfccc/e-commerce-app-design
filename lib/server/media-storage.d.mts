export function assertMediaStorageConfigured(): void
export function mediaStorageConfigured(): boolean
export function isOwnedMediaUrl(value: unknown): value is string
export function mediaPathFromOwnedUrl(value: unknown): string | null
export function getMediaPublicUrl(pathname: string): string
export function uploadMedia(
  pathname: string,
  body: Uint8Array,
  contentType: string,
): Promise<{ pathname: string; url: string }>
export function deleteMedia(pathname: string): Promise<void>
export function mediaObjectExists(pathname: string): Promise<boolean>
export function readMedia(pathname: string): Promise<{
  content_type: string
  byte_length: number
  content: Buffer
  etag: string
} | null>
