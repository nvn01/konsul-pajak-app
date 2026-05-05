"use client"

import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useTypewriter } from "nvn/utils/useTypewriter"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api, type RouterOutputs } from "nvn/trpc/react"

type ChatMessageData = RouterOutputs["chat"]["messages"][number]

interface ChatMessageProps {
  message: ChatMessageData
  /** Whether this message was just received (triggers typewriter animation) */
  isNew?: boolean
}

// Collapsible sources drawer component
function SourcesDrawer({ sources }: { sources: Array<{ source: string; page?: number; snippet?: string }> }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
          </svg>
          <span>Sumber Referensi ({sources.length})</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-4 pb-3 border-t border-border">
          <ul className="space-y-1.5 pt-2.5">
            {sources.map((source, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1 shrink-0 text-muted-foreground">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-primary hover:underline cursor-pointer"
                >
                  {source.source}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function ChatMessage({ message, isNew = false }: ChatMessageProps) {
  // Typewriter animation for new assistant messages
  const shouldAnimate = isNew && message.role === "assistant"
  const { displayText, isAnimating, skip } = useTypewriter(message.content, shouldAnimate)
  const [selectedFeedback, setSelectedFeedback] = useState<"suka" | "tidak_suka" | null>(
    message.feedback?.rating ?? null
  )

  // Update local state when message feedback changes (e.g., after refetch)
  useEffect(() => {
    setSelectedFeedback(message.feedback?.rating ?? null)
  }, [message.feedback])

  const feedbackMutation = api.chat.submitFeedback.useMutation({
    onSuccess: (_, variables) => {
      setSelectedFeedback(variables.rating)
    },
  })

  const deleteFeedbackMutation = api.chat.deleteFeedback.useMutation({
    onSuccess: () => {
      setSelectedFeedback(null)
    },
  })

  const handleFeedback = (rating: "suka" | "tidak_suka") => {
    // If clicking the same button, cancel the selection
    if (selectedFeedback === rating) {
      deleteFeedbackMutation.mutate(
        { messageId: message.id },
        {
          onError: (error) => {
            console.error("[Chat] Failed to delete feedback", error)
          },
        },
      )
      return
    }

    setSelectedFeedback(rating)

    feedbackMutation.mutate(
      {
        messageId: message.id,
        rating,
      },
      {
        onError: (error) => {
          console.error("[Chat] Failed to submit feedback", error)
          setSelectedFeedback(null)
        },
      },
    )
  }

  return (
    <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {/* AI Avatar - Left side for assistant */}
      {message.role === 'assistant' && (
        <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          AI
        </div>
      )}

      <div className="max-w-[80%] space-y-2">
        {/* Message Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${message.role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-card border border-border'
            }`}
        >
          {message.role === 'assistant' ? (
            <div className="prose-chat text-sm" onClick={isAnimating ? skip : undefined} style={isAnimating ? { cursor: 'pointer' } : undefined}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {shouldAnimate ? displayText : message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="leading-relaxed whitespace-pre-wrap">{message.content}</div>
          )}
        </div>

        {/* Feedback Buttons - Only for assistant messages */}
        {message.role === 'assistant' && (
          <div className="flex gap-2 items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback('suka')}
              className={`h-8 px-2 cursor-pointer ${selectedFeedback === 'suka'
                ? 'bg-accent/20 text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground'
                }`}
              title="Suka"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 10v12" />
                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback('tidak_suka')}
              className={`h-8 px-2 cursor-pointer ${selectedFeedback === 'tidak_suka'
                ? 'bg-destructive/20 text-destructive'
                : 'text-muted-foreground hover:text-foreground'
                }`}
              title="Tidak suka"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 14V2" />
                <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
              </svg>
            </Button>

            {/* Copy Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(message.content)
              }}
              className="h-8 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Salin"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            </Button>

            {/* More Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Lainnya"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer" onClick={() => {
                  // TODO: Implement feedback/report functionality
                  console.log('Report feedback for message:', message.id)
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" x2="4" y1="22" y2="15" />
                  </svg>
                  Saran atau laporkan kesalahan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Sources - Collapsible drawer (only shown after typewriter completes) */}
        {message.role === "assistant" && !isAnimating && (() => {
          const sourcesList = Array.isArray(message.sources) ? message.sources : [];
          if (sourcesList.length === 0) return null;

          return (
            <SourcesDrawer sources={sourcesList} />
          );
        })()}
      </div>

      {/* User Avatar - Right side for user */}
      {message.role === 'user' && (
        <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          U
        </div>
      )}
    </div>
  )
}
