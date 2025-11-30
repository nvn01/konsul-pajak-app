"use client"

import { useEffect, useState } from "react"

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
}

export function ChatMessage({ message }: ChatMessageProps) {
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
          <div className="leading-relaxed whitespace-pre-wrap">{message.content}</div>
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

        {/* Sources - Only for assistant messages with sources */}
        {message.role === "assistant" && message.sources && message.sources.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <div className="text-sm font-semibold mb-2 text-primary">Sumber Referensi (UU Pajak):</div>
            <ul className="space-y-1">
              {message.sources.map((source, idx) => (
                <li key={idx} className="text-sm text-muted-foreground space-y-1">
                  <div>• {source.source}{source.page ? `, Halaman ${source.page}` : ""}</div>
                  {source.snippet && (
                    <p className="text-xs text-muted-foreground/80 leading-relaxed">
                      {source.snippet}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
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
