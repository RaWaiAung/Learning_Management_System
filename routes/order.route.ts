import express from "express";
import { isAutheticated } from "../middlewares/auth";
import { createOrder } from "../controllers/order.controller";
const orderRouter = express.Router();

orderRouter.post("/create-order", isAutheticated, createOrder);

export default orderRouter;