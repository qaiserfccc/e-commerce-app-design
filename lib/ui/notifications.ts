'use client'

export type NotificationLevel = 'error' | 'info' | 'warning'

export type AppNotification = {
  id: string
  level: NotificationLevel
  message: string
}

let notificationSequence = 0
const subscribers = new Set<(notification: AppNotification) => void>()
const pendingNotifications: AppNotification[] = []

export function notify(level: NotificationLevel, message: string) {
  if (!message.trim()) return
  const notification: AppNotification = {
    id: `${Date.now()}-${++notificationSequence}`,
    level,
    message: message.trim(),
  }
  if (subscribers.size) subscribers.forEach((subscriber) => subscriber(notification))
  else pendingNotifications.push(notification)
}

export function subscribeNotifications(subscriber: (notification: AppNotification) => void) {
  subscribers.add(subscriber)
  pendingNotifications.splice(0).forEach(subscriber)
  return () => subscribers.delete(subscriber)
}

export function reportError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof Error) console.error('[app] Operation failed', error)
  const message = error instanceof Error && error.message.trim() ? error.message : fallback
  notify('error', message)
  return message
}
