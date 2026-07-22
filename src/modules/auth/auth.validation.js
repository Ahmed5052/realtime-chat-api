import z from "zod";

export const registerSchema = z.object({
    username: z.string().min(3, { message: "Username must be at least 3 characters long" }).max(30),
    email: z.email('Invalid email address'),
    password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
})

export const loginSchema = z.object({
    email: z.email('Invalid email address'),
    password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
})

export const refreshSchema = z.object({
    refreshToken: z.string(),
})
