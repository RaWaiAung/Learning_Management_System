import { NextFunction, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import OrderModel from "../models/order.model";

export const newOrder = asyncHandler(async (data: any, res: Response, next: NextFunction) => {
    const order = await OrderModel.create(data);
    next(order);
})