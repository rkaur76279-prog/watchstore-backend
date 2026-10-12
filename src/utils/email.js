import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : "",
    pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim() : "",
  },
});

export async function sendOTPEmail(to, otp) {
  const mailOptions = {
    from: `"ROLLEX PRIVILEGE VAULT" <${process.env.EMAIL_USER?.trim()}>`,
    to: to,
    subject: `Your Rollex Vault Access Code: ${otp}`,
    text: `Your confidential Rollex one-time verification code is ${otp}. It will expire in 5 minutes.`,
    html: `
      <div style="background-color: #0d0f14; color: #f5f5f7; font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px 20px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #151821; border: 1px solid #C6A15B; border-radius: 12px; padding: 36px 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <div style="color: #C6A15B; font-size: 11px; letter-spacing: 0.2em; font-weight: bold; margin-bottom: 8px;">
            ROLLEX GENEVA • SUPERLATIVE CHRONOMETER
          </div>
          <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0; font-weight: 600;">
            Privilege Vault Access Code
          </h1>
          <p style="color: #8c93a0; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
            You requested a secure one-time passcode to sign in or register your client dossier. Use the keycode below to proceed:
          </p>
          <div style="background: rgba(198, 161, 91, 0.12); border: 1px dashed #C6A15B; border-radius: 8px; padding: 18px 10px; margin-bottom: 24px;">
            <span style="font-size: 34px; letter-spacing: 8px; font-weight: bold; color: #C6A15B;">
              ${otp}
            </span>
          </div>
          <p style="color: #6d7482; font-size: 12px; margin-bottom: 20px;">
            This security code is confidential and expires in <strong>5 minutes</strong>. If you did not request this code, please disregard this transmission.
          </p>
          <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 18px; color: #525866; font-size: 11px;">
            Geneva Manufacture • Superlative Chronometer Certification • 5-Year Guarantee
          </div>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] OTP ${otp} dispatched to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, error.message);
    // If mail fails (e.g. Gmail auth issue), don't break whole flow: log OTP in console for dev
    console.log(`[DEV FALLBACK] Your OTP for ${to} is: ${otp}`);
    return { success: false, error: error.message };
  }
}

export default sendOTPEmail;
