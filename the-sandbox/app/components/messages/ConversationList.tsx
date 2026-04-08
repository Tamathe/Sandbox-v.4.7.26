'use client'

import { useCallback, useRef } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { Loader2, MessageSquare } from 'lucide-react'
import type { Conversation } from '../../messages/layout'

interface ConversationListProps {
  conversations: Conversation[]
  selectedGroupId: string | null
  currentUserId?: string
  onSelectConversation: (groupId: string) => void
  onLoadMore: () => void
  hasMore: boolean
  loading?: boolean
}

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || 'SB'
  )
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '...' : text
}

function ConversationAvatar({ conv, currentUserId }: { conv: Conversation; currentUserId?: string }) {
  // DM: show the other person's avatar
  if (conv.memberCount === 2 && currentUserId) {
    const other = conv.memberAvatars.find((m) => m.name !== currentUserId) ?? conv.memberAvatars[0]
    if (other) {
      return (
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0033A0] text-xs font-semibold text-white"
          title={other.name}
        >
          {other.avatarUrl ? (
            <Image src={other.avatarUrl} alt={other.name} width={32} height={32} className="size-full rounded-full object-cover" />
          ) : (
            getInitials(other.name)
          )}
        </div>
      )
    }
  }

  // Group: show first letter of group name
  return (
    <div
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0033A0] text-xs font-bold text-white"
      title={conv.name}
    >
      {conv.name.charAt(0).toUpperCase()}
    </div>
  )
}

export default function ConversationList({
  conversations,
  selectedGroupId,
  currentUserId,
  onSelectConversation,
  onLoadMore,
  hasMore,
  loading,
}: ConversationListProps) {
  const listRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, groupId: string, index: number) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelectConversation(groupId)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const next = listRef.current?.querySelector(`[data-index="${index + 1}"]`) as HTMLElement
        next?.focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = listRef.current?.querySelector(`[data-index="${index - 1}"]`) as HTMLElement
        prev?.focus()
      }
    },
    [onSelectConversation],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading conversations...
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <MessageSquare className="mx-auto mb-3 size-10 text-gray-200" />
        <p className="text-sm font-semibold text-gray-600">No conversations yet.</p>
      </div>
    )
  }

  return (
    <div ref={listRef} className="max-h-[calc(70vh-60px)] overflow-y-auto" role="listbox" aria-label="Conversations">
      {conversations.map((conv, index) => {
        const isSelected = conv.groupId === selectedGroupId
        const hasUnread = conv.unreadCount > 0 && conv.notificationLevel !== 'NONE'

        return (
          <div
            key={conv.groupId}
            role="option"
            aria-selected={isSelected}
            tabIndex={0}
            data-index={index}
            onClick={() => onSelectConversation(conv.groupId)}
            onKeyDown={(e) => handleKeyDown(e, conv.groupId, index)}
            className={`relative cursor-pointer border-b border-gray-100 px-5 py-4 transition-colors last:border-b-0 ${
              isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
            } ${conv.isArchived ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start gap-3">
              <ConversationAvatar conv={conv} currentUserId={currentUserId} />

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span
                    className={`truncate text-sm ${
                      hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-900'
                    }`}
                  >
                    {conv.name}
                  </span>
                  {conv.lastMessage && (
                    <span className="shrink-0 text-[11px] text-gray-400">
                      {formatDistanceToNow(new Date(conv.lastMessage.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>

                {conv.lastMessage && (
                  <p className="truncate text-sm text-gray-500">
                    <span className="font-medium">{conv.lastMessage.authorName}:</span>{' '}
                    {truncate(conv.lastMessage.content, 60)}
                  </p>
                )}
              </div>

              {/* Unread badge */}
              {hasUnread && (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0033A0] text-[10px] font-bold text-white">
                  {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                </span>
              )}
            </div>
          </div>
        )
      })}

      {hasMore && (
        <div className="border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onLoadMore}
            className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
