import { NextFunction, Request, Response } from "express";
import cloudinary from 'cloudinary';
import { asyncHandler } from "../middlewares/asyncHandler";
import errorHandler from "../utils/ErrorHandler";
import { createCourse } from "../services/course.service";
import CourseModel from "../models/course.model";
import { redis } from "../utils/redis";
import mongoose from "mongoose";
import path from "path";
import ejs from "ejs";
import sendMail from "../utils/sendMail";

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
});

export const getSingleCourse = asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
    try {
        const courseId = request.params.id;

        const isCacheExist = await redis.get(courseId);

        if (isCacheExist) {
            const course = JSON.parse(isCacheExist);
            response.status(200).json({
                success: true,
                course
            });
        } else {
            const course = await CourseModel.findById(courseId).select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");

            await redis.set(courseId, JSON.stringify(course));

            response.status(200).json({
                success: true,
                course
            });
        }
    } catch (error: any) {
        return next(new errorHandler(error.message, 500))
    }
});

export const getAllCourses = asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
    try {
        const isCacheExist = await redis.get("allCourses");
        if (isCacheExist) {
            const courses = JSON.parse(isCacheExist);
            response.status(200).json({
                success: true,
                courses
            });
        } else {
            const courses = await CourseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
            await redis.set("allCourses", JSON.stringify(courses));
            response.status(200).json({
                success: true,
                courses
            });
        }
    } catch (error: any) {
        return next(new errorHandler(error.message, 500));
    }
});

export const getCourseByUser = asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
    try {
        const userCourseList = request.user?.courses;
        const courseId = request.params.id;

        const courseExists = userCourseList?.find((course: any) => course._id.toString() === courseId);
        console.log(userCourseList);

        if (!courseExists) {
            return next(new errorHandler("You are not eligible to access this course", 404));
        }

        const course = await CourseModel.findById(courseId);

        const content = course?.courseData;

        response.status(200).json({
            success: true,
            content
        });
    } catch (error: any) {
        return next(new errorHandler(error.message, 500));
    }
});

interface IAddQuestionData {
    question: string;
    courseId: string;
    contentId: string;
}

export const addQuestion = asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
    try {
        const { question, courseId, contentId }: IAddQuestionData = request.body;
        const course = await CourseModel.findById(courseId);

        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new errorHandler("Invalid content Id", 400));
        }

        const courseContent = course?.courseData.find((item: any) => item._id.equals(contentId));
        if (!courseContent) {
            return next(new errorHandler("Invalid content Id", 400));
        }

        const newQuestion: any = {
            user: request.user,
            question,
            questionReplies: []
        };

        courseContent.questions.push(newQuestion);

        await course?.save();

        response.status(200).json({
            success: true,
            course
        });

    } catch (error: any) {
        return next(new errorHandler(error.message, 500))
    }
});

interface IAddAnswerData {
    answer: string;
    courseId: string;
    contentId: string;
    questionId: string;
}

export const addAnswer = asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
    try {
        const { answer, questionId, courseId, contentId }: IAddAnswerData = request.body;
        const course = await CourseModel.findById(courseId);

        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new errorHandler("Invalid content Id", 400));
        }

        const courseContent = course?.courseData.find((item: any) => item._id.equals(contentId));
        if (!courseContent) {
            return next(new errorHandler("Invalid content Id", 400));
        }

        const question = courseContent.questions.find((question: any) => question._id.equals(questionId));


        if (!question) {
            return next(new errorHandler("Invalid question id", 400));
        }

        const newAnswer: any = {
            user: request.user,
            answer
        }

        question.questionReplies.push(newAnswer);

        await course?.save();

        if (request.user?._id === question.user._id) {
            // create notification
        } else {
            const data = {
                name: question.user.name,
                title: courseContent.title
            }

            const html = await ejs.renderFile(path.join(__dirname, "../mails/question-reply.ejs"), data);

            try {
                await sendMail({
                    email: question.user.email,
                    subject: "Question Reply",
                    template: "question-reply.ejs",
                    data
                });
            } catch (error: any) {
                return next(new errorHandler(error.message, 500));
            }
        }

        response.status(200).json({
            success: true,
            course
        });

    } catch (error: any) {
        return next(new errorHandler(error.message, 500))
    }
});

interface IAddReviewData {
    review: string,
    rating: number,
    userId: string
}

export const addReview = asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
    try {
        const userCourseList = request.user?.courses;
        const courseId = request.params.id;

        const courseExists = userCourseList?.some((course: any) => course._id.toString() === courseId.toString());

        if (!courseExists) {
            return next(new errorHandler("You are not eligible to access this course", 400));
        }

        const course = await CourseModel.findById(courseId);

        const { review, rating }: IAddReviewData = request.body;

        const reviewData: any = {
            user: request.user,
            comment: review,
            rating
        }

        course?.reviews.push(reviewData);

        let avg = 0;

        course?.reviews.forEach((review: any) => {
            avg += review.rating;
        });

        if (course) {
            course.rating = avg / course.reviews.length;
        }

        await course?.save();

        const notification = {
            title: "New Review Received",
            message: `${request.user?.name} has given a review in ${course?.name}`
        }

        response.status(200).json({
            success: true,
            course
        });

    } catch (error: any) {
        return next(new errorHandler(error.message, 500))
    }
});

interface IAddReviewReplyData {
    comment: string,
    courseId: string,
    reviewId: string
}
export const addReplyToReview = asyncHandler(async (request: Request, response: Response, next: NextFunction) => {
    try {
        const { comment, courseId, reviewId } = request.body as IAddReviewReplyData;

        const course = await CourseModel.findById(courseId);

        if (!course) {
            return next(new errorHandler("Course not found", 404));
        }

        const review = course.reviews.find((review: any) => review._id.toString() === reviewId);

        if (!review) {
            return next(new errorHandler("Review not found", 404))
        }

        const replyData: any = {
            user: request.user,
            comment
        }

        if (!review.commentReplies) {
            review.commentReplies = [];
        }

        review?.commentReplies.push(replyData);

        await course.save();

        response.status(200).json({
            success: true,
            course
        });

    } catch (error) {

    }
})

