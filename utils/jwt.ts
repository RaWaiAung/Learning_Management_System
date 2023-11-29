import { Response } from "express";
import { IUser } from "../models/user.model";
import { redis } from "./redis";

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none" | undefined;
  secure?: boolean;
}

export const accessTokenExpired = parseInt(
  process.env.ACCESS_TOKEN_EXPIRED || "300",
  10
);

export const refreshTokenExpired = parseInt(
  process.env.REFRESH_TOKEN_EXPIRED || "1200",
  10
);

export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpired * 60 * 60 * 1000),
  maxAge: accessTokenExpired * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "lax",
};

export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpired * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpired * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "lax",
};
export const sendToken = (
  user: IUser,
  statusCode: number,
  response: Response
) => {
  const accessToken = user.SignAccessToken();
  const refreshToken = user.SignRefreshToken();

  redis.set(user._id, JSON.stringify(user) as any);
  if (process.env.NODE_ENV === "production") {
    accessTokenOptions.secure = true;
  }

  response.cookie("access_token", accessToken, accessTokenOptions);
  response.cookie("refresh_token", refreshToken, refreshTokenOptions);

  response.status(statusCode).json({
    success: true,
    accessToken,
    user,
  });
};
