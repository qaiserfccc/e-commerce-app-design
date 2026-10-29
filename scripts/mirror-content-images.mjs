#!/usr/bin/env node

console.warn('This script now restores site images into the database-backed media library.')
await import('./restore-content-images.mjs')
