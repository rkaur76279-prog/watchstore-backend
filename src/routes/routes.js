import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOTPEmail(to, otp) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: "Your OTP Login Code",
    text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Login OTP</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP will expire in 5 minutes.</p>
        <p>If you did not request this OTP, ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export default sendOTPEmail;
