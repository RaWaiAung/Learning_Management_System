import * as yup from "yup";

export const createUserSchema = yup.object({
  body: yup.object({
    email: yup
      .string()
      .required("Please provide correct email address.")
      .email("Please provide correct email address."),
    password: yup.string().required("Password is required"),
  }),
});
