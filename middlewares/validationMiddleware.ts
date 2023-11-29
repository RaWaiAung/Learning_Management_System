import { NextFunction, Request, Response } from "express";
import * as yup from "yup";

export const validationMiddleware = (schema: yup.ObjectSchema<any>) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await schema.validate(req);
      next();
    } catch (error: any) {
      res.status(400).json({ errors: error.errors });
    }
  };
};
