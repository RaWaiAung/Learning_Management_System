import express from 'express';
import { editCourse, updateCourse } from '../controllers/course.controller';
import { isAutheticated, role } from '../middlewares/auth';
const courseRouter = express.Router();

courseRouter.post("/create-course", isAutheticated, role("admin"), updateCourse);
courseRouter.put("/edit-course", isAutheticated, role("admin"), editCourse)
export default courseRouter;