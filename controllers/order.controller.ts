import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import errorHandler from "../utils/ErrorHandler";
import { IOrder } from "../models/order.model";
import userModel from "../models/user.model";
import CourseModel from "../models/course.model";
import { newOrder } from "../services/order.service";
import path from "path";
import ejs from "ejs";
import sendMail from "../utils/sendMail";
import NotificationModel from "../models/notification.model";

export const createOrder = asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
    try {
        const { courseId, userId, payment_info }: IOrder = request.body;
        const user = await userModel.findById(userId);
        const courseExistInUser = user?.courses.some((course: any) => course._id.toString() === courseId);

        if (courseExistInUser) {
            return next(new errorHandler("You have already purchased this course", 400));
        }

        const course = await CourseModel.findById(courseId);

        if (!course) {
            return next(new errorHandler("Course not found", 404));
        }

        const data: any = {
            courseId: course._id,
            userId: user?._id
        }

        newOrder(data, response, next);

        const mailData = {
            order: {
                _id: course._id.slice(0, 6),
                name: course.name,
                price: course.price,
                date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
            }
        }

        await ejs.renderFile(path.join(__dirname, "../mails/order-confirmation.ejs"), { order: mailData });

        try {
            if (user) {
                await sendMail({
                    email: user.email,
                    subject: "Order Confirmation",
                    template: "order-confirmation.ejs",
                    data: mailData
                })
            }
        } catch (error: any) {
            return next(new errorHandler(error.message, 500))
        }

        user?.courses.push(course._id);

        await user?.save();

        await NotificationModel.create({
            user: user?._id,
            title: "New Order",
            message: `You have a new order from ${course.name}`
        });

        response.status(201).json({
            success: true,
            order: course
        });
    } catch (error: any) {
        return next(new errorHandler(error.message, 500));
    }
})