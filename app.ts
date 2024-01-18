require("dotenv").config();
import express, { NextFunction, Request, Response } from "express";
export const app = express();
import cors from "cors";
import cookieParser from "cookie-parser";
import { ErrorMiddleware } from "./middlewares/error";
import userRouter from "./routes/user.route";
import courseRouter from "./routes/course.route";
import orderRouter from "./routes/order.route";
// body parser
app.use(express.json({ limit: "50mb" }));

// cookie parser
app.use(cookieParser());

// cors

app.use(
  cors({
    origin: process.env.ORIGIN,
  })
);

// routes

app.use("/api/v1", userRouter);
app.use("/api/v1", courseRouter);
app.use("/api/v1", orderRouter);

// testing api

app.use("/test", (request: Request, response: Response, next: NextFunction) => {
  response.status(200).json({
    success: true,
    message: "API running",
  });
});

app.all("*", (request: Request, response: Response, next: NextFunction) => {
  const err: any = new Error(`Route ${request.originalUrl} not found`);
  err.statusCode = 404;
  next(err);
});

app.use(ErrorMiddleware);
