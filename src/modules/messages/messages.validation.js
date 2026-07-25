import z from 'zod';

export const sendMessageSchema = z.object({
    content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
});

export const getMessagesQuerySchema = z.object({
    cursor: z.iso.datetime().optional(),
});

export const editMessageSchema = z.object({
    content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
});