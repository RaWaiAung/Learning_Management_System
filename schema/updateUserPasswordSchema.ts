import * as yup from "yup";

export const updatePasswordSchema = yup.object({
  body: yup.object({
    newPassword: yup.string().required("New password is required"),
    oldPassword: yup.string().required("Old password is required."),
  }),
});
