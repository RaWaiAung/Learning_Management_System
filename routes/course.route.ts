import express from 'express';
import { addQuestion, editCourse, getAllCourses, getCourseByUser, getSingleCourse, updateCourse } from '../controllers/course.controller';
import { isAutheticated, role } from '../middlewares/auth';
const courseRouter = express.Router();

courseRouter.post("/create-course", isAutheticated, role("admin"), updateCourse);
courseRouter.put("/edit-course/:id", isAutheticated, role("admin"), editCourse);
courseRouter.get("/get-course/:id", getSingleCourse);
courseRouter.get("/get-courses", getAllCourses);
courseRouter.get("/get-course-content/:id", isAutheticated, getCourseByUser);
courseRouter.put("/add-question", isAutheticated, addQuestion);
export default courseRouter;