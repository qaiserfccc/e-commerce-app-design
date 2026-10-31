import { NextRequest, NextResponse } from 'next/server'
import { consumePublicRateLimit } from '@/lib/auth/public-rate-limit'
import { answerChatbotMessage, getChatbotSettings } from '@/lib/data/chatbot'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!consumePublicRateLimit('chatbot-answer', ip, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Please wait a moment before asking another question.' }, { status: 429 })
  }
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
    }
    if (typeof body !== 'object' || body === null || !('message' in body) ||
        typeof body.message !== 'string' || !body.message.trim() || body.message.trim().length > 200) {
      return NextResponse.json({ error: 'Enter a question of 1–200 characters.' }, { status: 400 })
    }
    const settings = await getChatbotSettings()
    if (!settings.enabled) return NextResponse.json({ error: 'The store assistant is currently unavailable.' }, { status: 503 })
    const answer = await answerChatbotMessage(body.message.trim())
    return NextResponse.json({ data: answer }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[chatbot-api] Answer request failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'The assistant could not answer right now. Please try again or contact the store.' }, { status: 500 })
  }
}
