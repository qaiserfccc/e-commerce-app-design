const MEDIA_ROUTE_PREFIX = '/api/media/'

function validPath(pathname) {
  return typeof pathname === 'string' &&
    pathname.length > 0 &&
    pathname.length <= 1024 &&
    !pathname.startsWith('/') &&
    /^[a-zA-Z0-9._/-]+$/.test(pathname) &&
    pathname.split('/').every((segment) => segment && segment !== '.' && segment !== '..')
}

export function isManagedMediaUrl(value) {
  if (typeof value !== 'string' || !value.startsWith(MEDIA_ROUTE_PREFIX) || value.includes('?') || value.includes('#')) {
    return false
  }
  return mediaPathFromUrl(value) !== null
}

export function mediaPathFromUrl(value) {
  if (typeof value !== 'string' || !value.startsWith(MEDIA_ROUTE_PREFIX) || value.includes('?') || value.includes('#')) {
    return null
  }
  let pathname
  try {
    pathname = value.slice(MEDIA_ROUTE_PREFIX.length)
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .join('/')
  } catch {
    return null
  }
  return validPath(pathname) ? pathname : null
}

export function publicMediaUrl(pathname) {
  if (!validPath(pathname)) throw new Error('Media path is invalid.')
  return MEDIA_ROUTE_PREFIX + pathname.split('/').map((segment) => encodeURIComponent(segment)).join('/')
}
