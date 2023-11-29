import { NextFunction, Request, Response } from "express";
import errorHandler from "../utils/ErrorHandler";
export const ErrorMiddleware = (
  err: any,
  request: Request,
  response: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal server error";
  if (err.name === "CashError") {
    const message = `Resource not found. Invalid ${err.path}`;
    err = new errorHandler(message, 400);
  }

  if (err.code === 1100) {
    const message = `Duplicates ${Object.keys(err.keyValue)} entered`;
    err = new errorHandler(message, 400);
  }

  if (err.name === "JsonWebTokenError") {
    const message = `Json web token invalid. Try again!`;
    err = new errorHandler(message, 400);
  }

  if (err.name === "TokenExpiredError") {
    const message = `Json web token expired. Try again!`;
    err = new errorHandler(message, 400);
  }

  response.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};
