import dotenv from "dotenv";
import { sendEmail } from "./utils/sendEmail.js";

dotenv.config();

(async () => {
  try {
    await sendEmail("nagappansabari824@gmail.com", "Test Email", "Hello! This is a test.");
    console.log("Email sent successfully!");
  } catch (err) {
    console.error("Email failed:", err);
  }
})();