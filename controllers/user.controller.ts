import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import userModel, { IUser } from "../models/user.model";
import errorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt";
import { redis } from "../utils/redis";
import { getUserById } from "../services/user.service";

interface IRegister {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

interface IActivationToken {
  token: string;
  activationCode: string;
}

export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.ACTIVATION_SECRET as Secret,
    {
      expiresIn: "50m",
    }
  );

  return { activationCode, token };
};

export const userRegisteration = asyncHandler(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { name, email, password } = request.body;
      const isExistUser = await userModel.findOne({ email });
      if (isExistUser) {
        return next(new errorHandler("Email already exist", 400));
      }
      const user: IRegister = {
        name,
        email,
        password,
      };

      const activationToken = createActivationToken(user);
      const activationCode = activationToken.activationCode;
      const data = {
        user: {
          name: user.name,
        },
        activationCode,
      };
      const html = ejs.renderFile(
        path.join(__dirname, "../mails/activation.mail.ejs"),
        data
      );
      console.log(user);

      try {
        await sendMail({
          email: user.email,
          subject: "Activate your account",
          template: "activation.mail.ejs",
          data,
        });
        response.status(201).json({
          success: true,
          message: `Please check your email: ${user.email} to activate your account!`,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        console.log(error);

        return next(new errorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new errorHandler(error.message, 400));
    }
  }
);

interface ActivationRequest {
  activation_token: string;
  activation_code: string;
}

export const activateUser = asyncHandler(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } = <ActivationRequest>(
        request.body
      );

      console.log(typeof activation_code);

      const newUser: { user: IUser; activationCode: string } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as string
      ) as { user: IUser; activationCode: string };

      console.log(typeof newUser.activationCode);

      if (newUser.activationCode !== activation_code) {
        return next(new errorHandler("Invalid activation code", 400));
      }
      const { name, email, password } = newUser.user;
      const isExistUser = await userModel.findOne({ email });
      if (isExistUser) {
        return next(new errorHandler("Email already exist", 400));
      }

      await userModel.create({
        name,
        email,
        password,
      });

      response.status(200).json({
        success: true,
      });
    } catch (error: any) {
      return next(new errorHandler(error.message, 400));
    }
  }
);

export const loginUser = asyncHandler(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { email, password } = request.body;

      const user = await userModel.findOne({ email }).select("+password");

      if (!user) {
        return next(new errorHandler("Invalid email or password", 400));
      }

      const isPasswordMatch = await user.comparePassword(password);

      if (!isPasswordMatch) {
        return next(new errorHandler("Invalid email or password", 400));
      }

      sendToken(user, 200, response);
    } catch (error) {}
  }
);

export const logoutUser = asyncHandler(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      response.cookie("access_token", "", { maxAge: 1 });
      response.cookie("refresh_token", "", { maxAge: 1 });
      const userId = request.user?._id || "";

      redis.del(userId);
      response.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      console.log(error);

      return next(new errorHandler(error.message, 400));
    }
  }
);

export const updateAccessToken = asyncHandler(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const refresh_token = request.cookies.refresh_token as string;
      const message = "Could not refresh token";
      if (!refresh_token) {
        return next(new errorHandler(message, 400));
      }
      const decode = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as string
      ) as JwtPayload;
      if (!decode) {
        return next(new errorHandler(message, 400));
      }
      const session = await redis.get(decode.id as string);
      if (!session) {
        return next(new errorHandler(message, 400));
      }
      const user = JSON.parse(session);
      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as string,
        {
          expiresIn: "5m",
        }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as string,
        {
          expiresIn: "3d",
        }
      );

      request.user = user;

      response.cookie("access_token", accessToken, accessTokenOptions);
      response.cookie("refresh_token", refreshToken, refreshTokenOptions);

      response.status(200).json({
        success: true,
        accessToken,
      });
    } catch (error) {}
  }
);

export const getUserInfo = asyncHandler(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const userId = request.user?._id;
      await getUserById(userId, response);
    } catch (error: any) {
      return next(new errorHandler(error.message, 400));
    }
  }
);

interface ISocialAuthBody {
  email: string;
  name: string;
  avatar: string;
}

export const socialAuth = asyncHandler(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { email, name, avatar } = <ISocialAuthBody>request.body;
      const user = await userModel.findOne({ email });
      if (!user) {
        const newUser = await userModel.create({
          email,
          name,
          avatar,
        });
        sendToken(newUser, 200, response);
      } else {
        sendToken(user, 200, response);
      }
    } catch (error: any) {
      return next(new errorHandler(error.message, 400));
    }
  }
);

interface IUpdateUserInfo {
  name?: string;
  email?: string;
}

export const updateUserInfo = asyncHandler(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { name, email } = <IUpdateUserInfo>request.body;
      const userId = request.user?._id;
      const user = await userModel.findById(userId);
      if (email && user) {
        const isEmailExist = await userModel.findOne({ email });
        if (isEmailExist) {
          return next(new errorHandler("Email already exist", 400));
        }
        user.email = email;
      }
      if (name && user) {
        user.name = name;
      }

      await user?.save();

      await redis.set(userId, JSON.stringify(user));

      response.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new errorHandler(error.message, 400));
    }
  }
);

interface IUpdatePassword {
  oldPassword: string;
  newPassword: string;
}

export const updatePassword = asyncHandler(
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = <IUpdatePassword>request.body;
      const user = await userModel
        .findById(request.user?._id)
        .select("+password");
      if (user?.password === undefined) {
        return next(new errorHandler("Invalid user", 404));
      }
      const isPasswordMatch = await user.comparePassword(oldPassword);
      if (!isPasswordMatch) {
        return next(new errorHandler("Invalid old password", 400));
      }
      user.password = newPassword;
      await user.save();

      await redis.set(request.user?._id, JSON.stringify(user));
      response.status(200).json({
        success: true,
        user,
      });
    } catch (error) {}
  }
);
