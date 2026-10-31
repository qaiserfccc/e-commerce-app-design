import { NextRequest, NextResponse } from 'next/server'
import { invalidateCache } from '@/lib/cache'
import { requireAdminSession } from '@/lib/auth/admin'
import { adminApiError } from '@/lib/auth/admin-api'
import { getChatbotSettings } from '@/lib/data/chatbot'
import { db } from '@/lib/db'
import { storeActivityEvents, storeSettings } from '@/lib/db/schema'
import { isSameOriginOrNativeRequest } from '@/lib/http/api-origin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json({ data: await getChatbotSettings() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[chatbot-settings-api] Settings read failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'Chatbot settings could not be loaded.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!isSameOriginOrNativeRequest(request)) {
    return NextResponse.json({ error: 'Cross-origin settings changes are not allowed.' }, { status: 403 })
  }
  try {
    await requireAdminSession('admin')
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
    }
    if (typeof body !== 'object' || body === null ||
        !('enabled' in body) || typeof body.enabled !== 'boolean' ||
        !('welcomeMessage' in body) || typeof body.welcomeMessage !== 'string' ||
        !body.welcomeMessage.trim() || body.welcomeMessage.trim().length > 180) {
      return NextResponse.json({ error: 'Choose whether the assistant is enabled and enter a welcome message (1–180 characters).' }, { status: 400 })
    }
    const value = { enabled: body.enabled, welcomeMessage: body.welcomeMessage.trim() }
    await db.insert(storeSettings)
      .values({ key: 'chatbot', value })
      .onConflictDoUpdate({ target: storeSettings.key, set: { value, updatedAt: new Date() } })
    await db.insert(storeActivityEvents).values({
      entityType: 'setting',
      entityId: 'chatbot',
      eventType: 'setting.updated',
      payload: { enabled: value.enabled },
    })
    await invalidateCache('content')
    return NextResponse.json({ data: value }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return adminApiError(error)
  }
}
