import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail", // Since you're using Gmail with App Password
  auth: {
    user: process.env.GMAIL_USER, // your Gmail address
    pass: process.env.GMAIL_PASS, // your App Password
  },
});

export const sendEmail = async (to, subject, otp) => {
  const logoPath = path.join(process.cwd(), "images", "JOY.png");

  try {
    const info = await transporter.sendMail({
      from: `"Joy Spoon" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: `<div style="font-family:sans-serif; text-align:center;"> 
        <img src="cid:logo" style="width:150px; margin-bottom:20px;" /> 
        <h2>Your OTP for Food Order</h2> 
        <p style="font-size:20px; font-weight:bold;">${otp}</p> 
        <p>Use this OTP to confirm your delivery.</p> 
      </div>`,
      attachments: [
        {
          filename: "JOY.png",
          path: logoPath,
          cid: "logo", // must match cid in html img
        },
      ],
    });

    console.log("✅ Email sent:", info.messageId);
  } catch (err) {
    console.error("❌ Error sending email:", err);
  }
};

// Example call (remove in production)
// sendEmail("test@example.com", "Your OTP", "123456");
