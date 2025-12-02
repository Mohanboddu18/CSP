// 1. Required packages
const express = require("express");
const dotenv = require("dotenv");
const twilio = require("twilio");
const path = require("path");

// 2. Initialize Express app
const app = express();

// 3. Load environment variables from .env file
dotenv.config();

// 4. Setup Twilio client
const client = new twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// 5. Middleware to parse JSON
app.use(express.json());

// 6. Serve static files from 'public' folder (for your HTML/JS frontend)
app.use(express.static(path.join(__dirname, "public")));

// 7. Default route (optional)
app.get("/", (req, res) => {
  res.send("✅ Fan Alert System is running.");
});

// 8. Route to send SMS and Call
app.post("/send-failure-alert", async (req, res) => {
  try {
    const sms = await client.messages.create({
      body: "🚨 Fan 1 in Pond A has stopped working!",
      from: process.env.TWILIO_PHONE,
      to: process.env.PHONE_NUMBER,
    });

    const call = await client.calls.create({
      url: "http://demo.twilio.com/docs/voice.xml",
      from: process.env.TWILIO_PHONE,
      to: process.env.PHONE_NUMBER,
    });

    res.json({
      success: true,
      message: "📩 SMS and 📞 Call sent successfully.",
    });
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
