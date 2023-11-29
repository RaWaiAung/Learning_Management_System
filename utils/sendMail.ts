require("dotenv").config();
import nodemailer, { Transporter } from "nodemailer";
import path from "path";
import ejs from "ejs";
interface EmailOptions {
  email: string;
  subject: string;
  template: string;
  data: { [key: string]: any };
}

const sendMail = async (options: EmailOptions) => {
  const transporter: Transporter = nodemailer.createTransport({
    host: process.env.STMP_HOST,
    port: Number(process.env.STMP_PORT || 587),
    auth: {
      user: process.env.STMP_MAIL,
      pass: process.env.STMP_PASSWORD,
    },
  });

  const { email, subject, template, data } = options;
  const templatePath = path.join(__dirname, "../mails", template);
  const html: string = await ejs.renderFile(templatePath, data);
  const mailOptions = {
    from: process.env.STMP_MAIL,
    to: email,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};

export default sendMail;
