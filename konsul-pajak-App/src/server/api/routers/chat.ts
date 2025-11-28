import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { answerTaxQuestion, type SourceCitation } from 'nvn/server/ai/chat-agent';
import { createTRPCRouter, protectedProcedure } from 'nvn/server/api/trpc';

const chatIdInput = z.object({
  chatId: z.string().uuid(),
});

export const chatRouter = createTRPCRouter({
  history: protectedProcedure.query(async ({ ctx }) => {
    const chats = await ctx.db.chat.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return chats;
  }),

  messages: protectedProcedure.input(chatIdInput).query(async ({ ctx, input }) => {
    const chat = await ctx.db.chat.findFirst({
      where: {
        id: input.chatId,
        userId: ctx.session.user.id,
      },
    });

    if (!chat) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat tidak ditemukan' });
    }

    const messages = await ctx.db.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' },
      include: {
        feedback: true, // Include feedback data
      },
    });

    return messages.map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      createdAt: msg.createdAt,
      sources: (msg.sources ?? undefined) as SourceCitation[] | undefined,
      feedback: msg.feedback ? { rating: msg.feedback.rating as 'suka' | 'tidak_suka' } : null,
    }));
  }),

  create: protectedProcedure.mutation(async ({ ctx }) => {
    const chat = await ctx.db.chat.create({
      data: {
        userId: ctx.session.user.id,
      },
    });

    return chat;
  }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        message: z.string().min(1, 'Pesan tidak boleh kosong').max(2000, 'Pesan terlalu panjang'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const chat = await ctx.db.chat.findFirst({
        where: { id: input.chatId, userId: ctx.session.user.id },
      });

      if (!chat) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat tidak ditemukan' });
      }

      const trimmedMessage = input.message.trim();

      // NEW: Fetch recent message history for conversational context (last 10 messages)
      const recentMessages = await ctx.db.message.findMany({
        where: { chatId: chat.id },
        orderBy: { createdAt: 'asc' },
        take: 10,
        select: {
          role: true,
          content: true,
        },
      });

      const userMessage = await ctx.db.message.create({
        data: {
          chatId: chat.id,
          role: 'user',
          content: trimmedMessage,
        },
      });

      if (chat.title === 'Percakapan Baru') {
        await ctx.db.chat.update({
          where: { id: chat.id },
          data: { title: trimmedMessage.slice(0, 60) },
        });
      }

      // NEW: Pass message history to AI for conversational context
      const messageHistory = recentMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      const { answer, sources } = await answerTaxQuestion(trimmedMessage, messageHistory);

      const assistantMessage = await ctx.db.message.create({
        data: {
          chatId: chat.id,
          role: 'assistant',
          content: answer,
          sources,
        },
      });

      return {
        userMessage: {
          id: userMessage.id,
          role: 'user' as const,
          content: userMessage.content,
          createdAt: userMessage.createdAt,
        },
        assistantMessage: {
          id: assistantMessage.id,
          role: 'assistant' as const,
          content: assistantMessage.content,
          createdAt: assistantMessage.createdAt,
          sources,
        },
      };
    }),

  submitFeedback: protectedProcedure
    .input(
      z.object({
        messageId: z.number().int().positive(),
        rating: z.enum(['suka', 'tidak_suka']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.message.findFirst({
        where: {
          id: input.messageId,
          chat: {
            userId: ctx.session.user.id,
          },
        },
      });

      if (!message) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pesan tidak ditemukan' });
      }

      const feedback = await ctx.db.feedback.upsert({
        where: { messageId: message.id },
        create: {
          messageId: message.id,
          userId: ctx.session.user.id,
          rating: input.rating,
        },
        update: {
          rating: input.rating,
        },
      });

      return feedback;
    }),

  deleteFeedback: protectedProcedure
    .input(
      z.object({
        messageId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.message.findFirst({
        where: {
          id: input.messageId,
          chat: {
            userId: ctx.session.user.id,
          },
        },
      });

      if (!message) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pesan tidak ditemukan' });
      }

      // Delete the feedback if it exists
      await ctx.db.feedback.deleteMany({
        where: {
          messageId: message.id,
          userId: ctx.session.user.id,
        },
      });

      return { success: true };
    }),

  deleteChat: protectedProcedure
    .input(chatIdInput)
    .mutation(async ({ ctx, input }) => {
      const chat = await ctx.db.chat.findFirst({
        where: {
          id: input.chatId,
          userId: ctx.session.user.id,
        },
      });

      if (!chat) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat tidak ditemukan' });
      }

      // Delete all messages and feedback for this chat
      await ctx.db.message.deleteMany({
        where: { chatId: chat.id },
      });

      // Delete the chat
      await ctx.db.chat.delete({
        where: { id: chat.id },
      });

      return { success: true };
    }),

  renameChat: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        title: z.string().min(1, 'Judul tidak boleh kosong').max(100, 'Judul terlalu panjang'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const chat = await ctx.db.chat.findFirst({
        where: {
          id: input.chatId,
          userId: ctx.session.user.id,
        },
      });

      if (!chat) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat tidak ditemukan' });
      }

      const updatedChat = await ctx.db.chat.update({
        where: { id: chat.id },
        data: { title: input.title.trim() },
      });

      return updatedChat;
    }),
});

