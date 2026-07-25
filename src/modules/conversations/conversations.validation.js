import z from 'zod';

export const createConversationSchema = z.object({
    participantIds: z.array(z.uuid()).min(1, 'At least one participant is required'),
    isGroup: z.boolean().default(false),
    name: z.string().min(1).max(100).optional(),
});