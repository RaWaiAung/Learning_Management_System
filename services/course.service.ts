import { Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import CourseModel from "../models/course.model";

export const createCourse = asyncHandler(async (data: any, res: Response) => {
    const course = await CourseModel.create(data);
    res.status(201).json({
        success: true,
        course
    })
})