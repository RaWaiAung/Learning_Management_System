import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "./asyncHandler";
import errorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";
import { IUser } from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const isAutheticated = asyncHandler(
  async (request: Request, response: Response, next: NextFunction) => {
    const access_token = request.cookies.access_token;
    console.log(access_token);

    if (!access_token) {
      return next(
        new errorHandler("Please login to access this resource", 400)
      );
    }

    const decode = jwt.verify(
      access_token,
      process.env.ACCESS_TOKEN as string
    ) as JwtPayload;

    if (!decode) {
      return next(new errorHandler("access token is not valid", 400));
    }

    const user = await redis.get(decode.id);

    if (!user) {
      return next(new errorHandler("user not found", 400));
    }

    request.user = JSON.parse(user);

    next();
  }
);

export const role = (...roles: string[]) => {
  return (request: Request, response: Response, next: NextFunction) => {
    if (roles.includes(request.user?.role || "")) {
      return next(
        new errorHandler(
          `Role ${request.user?.role} is not allowed to access`,
          403
        )
      );
    }
    next();
  };
};
