"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { api, type RouterOutputs } from "nvn/trpc/react"

type ChatMessageData = RouterOutputs["chat"]["messages"][number]

interface ChatMessageProps {
  message: ChatMessageData
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<"suka" | "tidak_suka" | null>(null)

  const feedbackMutation = api.chat.submitFeedback.useMutation({
    onSuccess: (_, variables) => {
      setSelectedFeedback(variables.rating)
    },
  })

  const handleFeedback = (rating: "suka" | "tidak_suka") => {
    if (selectedFeedback === rating) return

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
    <div className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] space-y-2 ${message.role === 'user' ? 'order-2' : ''}`}>
        {/* Message Bubble */}
        <div
          className={`rounded-lg p-4 ${
            message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border'
          }`}
        >
          <div className="text-sm font-medium mb-2">
            {message.role === 'user' ? 'Anda' : 'Asisten Pajak'}
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* Feedback Buttons - Only for assistant messages */}
        {message.role === 'assistant' && (
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground">Apakah jawaban ini membantu?</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback('suka')}
              className={`h-8 px-2 ${
                selectedFeedback === 'suka'
                  ? 'bg-accent/20 text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 10v12"/>
                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback('tidak_suka')}
              className={`h-8 px-2 ${
                selectedFeedback === 'tidak_suka'
                  ? 'bg-destructive/20 text-destructive'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 14V2"/>
                <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/>
              </svg>
            </Button>
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
    </div>
  )
}
