import { NextFunction, Request, Response } from "express";
import cloudinary from 'cloudinary';
import { asyncHandler } from "../middlewares/asyncHandler";
import errorHandler from "../utils/ErrorHandler";
import { createCourse } from "../services/course.service";
import CourseModel from "../models/course.model";

export const updateCourse = asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
    try {
        const data = request.body;
        const thumbnail = data.thumbnail;
        if (thumbnail) {
            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: 'courses'
            });

            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }
        }

        createCourse(data, response, next);
    } catch (error: any) {
        return next(new errorHandler(error.message, 500))
    }
});

export const editCourse = asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
    try {
        const data = request.body;
        const thumbnail = data.thumbnail;
        if (thumbnail) {
            await cloudinary.v2.uploader.destroy(thumbnail.public_id);

            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses"
            });

            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }
        }
        const courseId = request.params.id;
        const course = await CourseModel.findByIdAndUpdate(courseId, {
            $set: data
        },
            {
                new: true
            });

        response.status(200).json({
            success: true,
            course
        })
    } catch (error: any) {
        return next(new errorHandler(error.message, 500))
    }
})