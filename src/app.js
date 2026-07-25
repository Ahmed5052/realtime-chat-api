import express from "express";
import authRouter from "./modules/auth/auth.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import messagesRouter from './modules/messages/messages.routes.js';
import conversationsRouter from './modules/conversations/conversations.routes.js';

const app = express();

app.use(express.json());

app.use("/auth", authRouter);
app.use('/conversations', conversationsRouter);
app.use('/conversations', messagesRouter);

app.use(errorHandler)

export default app;