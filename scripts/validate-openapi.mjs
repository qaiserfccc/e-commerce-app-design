import { readdir, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const specification = JSON.parse(await readFile(join(root, 'openapi.json'), 'utf8'))
const failures = []

if (specification.openapi !== '3.1.0' || !specification.info?.version) {
  failures.push('The API document must declare an OpenAPI version and API version.')
}

function resolveReference(reference) {
  if (!reference.startsWith('#/')) return true
  return reference.slice(2).split('/').reduce((value, part) => value?.[part.replaceAll('~1', '/').replaceAll('~0', '~')], specification) !== undefined
}

function checkReferences(value) {
  if (!value || typeof value !== 'object') return
  if (typeof value.$ref === 'string' && !resolveReference(value.$ref)) {
    failures.push(`Unresolved OpenAPI reference: ${value.$ref}`)
  }
  for (const child of Object.values(value)) checkReferences(child)
}

checkReferences(specification)

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      await visit(path)
      continue
    }
    if (entry.name !== 'route.ts') continue

    const route = relative(join(root, 'app'), directory).split(sep).filter(Boolean)
    const openApiPath = route.length
      ? `/${route.map((segment) => segment.replace(/^\[\.\.\.(.+)\]$/, '{$1}').replace(/^\[(.+)\]$/, '{$1}')).join('/')}`
      : '/'
    const source = await readFile(path, 'utf8')
    const methods = new Set([...source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)].map((match) => match[1].toLowerCase()))
    const documentedMethods = new Set(Object.keys(specification.paths[openApiPath] ?? {}).filter((method) => ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)))
    for (const method of methods) {
      if (!documentedMethods.has(method)) failures.push(`Missing OpenAPI operation: ${method.toUpperCase()} ${openApiPath} (${path})`)
    }
  }
}

await visit(join(root, 'app', 'api'))

if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log(`OpenAPI ${specification.info.version}: JSON, references, and all API route methods are valid.`)
}
