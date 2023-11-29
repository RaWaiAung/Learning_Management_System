import express from "express";
import {
  activateUser,
  getUserInfo,
  loginUser,
  logoutUser,
  socialAuth,
  updateAccessToken,
  updatePassword,
  updateUserInfo,
  userRegisteration,
} from "../controllers/user.controller";
import { validationMiddleware } from "../middlewares/validationMiddleware";
import { createUserSchema } from "../schema/createUserSchema";
import { isAutheticated } from "../middlewares/auth";
import { updatePasswordSchema } from "../schema/updateUserPasswordSchema";
const userRouter = express.Router();

userRouter.post("/register", userRegisteration);
userRouter.post("/activate-user", activateUser);
userRouter.post(
  "/login-user",
  validationMiddleware(createUserSchema),
  loginUser
);
userRouter.post("/logout-user", isAutheticated, logoutUser);
userRouter.get("/refresh", updateAccessToken);
userRouter.get("/me", isAutheticated, getUserInfo);
userRouter.post("/social-auth", socialAuth);
userRouter.put("/update-user-info", isAutheticated, updateUserInfo);
userRouter.put(
  "/update-user-password",
  isAutheticated,
  validationMiddleware(updatePasswordSchema),
  updatePassword
);

export default userRouter;
