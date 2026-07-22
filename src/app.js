import express from "express";
import authRouter from "./modules/auth/auth.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());

app.use("/auth", authRouter);

app.use(errorHandler)

export default app;