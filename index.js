// // 1. Required packages
// const express = require("express");
// const dotenv = require("dotenv");
// const twilio = require("twilio");
// const path = require("path");

// // 2. Initialize Express app
// const app = express();

// // 3. Load environment variables from .env file
// dotenv.config();

// // 4. Setup Twilio client
// const client = new twilio(
//   process.env.TWILIO_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );

// // 5. Middleware to parse JSON
// app.use(express.json());

// // 6. Serve static files from 'public' folder (for your HTML/JS frontend)
// app.use(express.static(path.join(__dirname, "public")));

// // 7. Default route (optional)
// app.get("/", (req, res) => {
//   res.send("✅ Fan Alert System is running.");
// });

// // 8. Route to send SMS and Call
// app.post("/send-failure-alert", async (req, res) => {
//   try {
//     const sms = await client.messages.create({
//       body: "🚨 Fan 1 in Pond A has stopped working!",
//       from: process.env.TWILIO_PHONE,
//       to: process.env.PHONE_NUMBER,
//     });

//     const call = await client.calls.create({
//       url: "http://demo.twilio.com/docs/voice.xml",
//       from: process.env.TWILIO_PHONE,
//       to: process.env.PHONE_NUMBER,
//     });

//     res.json({
//       success: true,
//       message: "📩 SMS and 📞 Call sent successfully.",
//     });
//   } catch (err) {
//     console.error("❌ Error:", err.message);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

// // 9. Start the server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running at http://localhost:${PORT}`);
// });

// index.js

// index.js
// Full, defensive Node + Express + Twilio example for sending SMS + voice call
// Usage: node index.js

const express = require("express");
const dotenv = require("dotenv");
const twilio = require("twilio");
const path = require("path");

// Load env
dotenv.config();

// Create app and middleware
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Read env vars (use canonical names)
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  TWILIO_MESSAGING_SERVICE_SID,
  TO_NUMBER,
  PORT,
} = process.env;

// Basic masking helper for logs
function mask(v) {
  if (!v) return "undefined";
  const s = String(v);
  if (s.length <= 8) return s;
  return s.slice(0, 4) + "..." + s.slice(-4);
}

// Validate Twilio credentials presence for runtime guidance (do not exit automatically)
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.warn(
    "⚠️ Twilio credentials not found. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env"
  );
}

console.log("TWILIO_ACCOUNT_SID:", mask(TWILIO_ACCOUNT_SID));
console.log("TWILIO_PHONE_NUMBER:", TWILIO_PHONE_NUMBER || "undefined");
console.log(
  "TWILIO_MESSAGING_SERVICE_SID:",
  TWILIO_MESSAGING_SERVICE_SID || "undefined"
);
console.log("Default TO_NUMBER:", TO_NUMBER || "undefined");

// Create Twilio client (if credentials present)
let client = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

// Health check
app.get("/", (req, res) => {
  res.send("✅ Fan Alert System is running.");
});

/**
 * POST /send-failure-alert
 * Body (JSON):
 * {
 *   "to": "+91XXXXXXXXXX",     // optional if TO_NUMBER env provided
 *   "body": "Custom message"   // optional
 * }
 *
 * Behavior:
 * - uses req.body.to or env TO_NUMBER
 * - uses TWILIO_MESSAGING_SERVICE_SID if provided; otherwise uses TWILIO_PHONE_NUMBER as from.
 */
app.post("/send-failure-alert", async (req, res) => {
  try {
    if (!client) {
      return res.status(500).json({
        success: false,
        error:
          "Twilio client not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env",
      });
    }

    // Accept from request or env
    const toNumber = req.body?.to || TO_NUMBER;
    const smsBody = req.body?.body || "🚨 Fan 1 in Pond A has stopped working!";

    if (!toNumber) {
      return res.status(400).json({
        success: false,
        error:
          "Missing 'to' number. Provide in JSON body { to: '+91...' } or set TO_NUMBER in .env",
      });
    }

    // Build message payload - prefer Messaging Service SID if provided
    const messagePayload = {
      body: smsBody,
      to: toNumber,
    };

    if (TWILIO_MESSAGING_SERVICE_SID) {
      messagePayload.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
    } else if (TWILIO_PHONE_NUMBER) {
      messagePayload.from = TWILIO_PHONE_NUMBER;
    } else {
      return res.status(500).json({
        success: false,
        error:
          "Missing 'from' configuration. Set TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID in .env",
      });
    }

    // Send SMS
    const sms = await client.messages.create(messagePayload);

    // Make a voice call (optional). Use same 'to' and 'from' (or messagingService not allowed for calls)
    // For calls, Twilio requires a 'from' (phone number). If you used messagingServiceSid for SMS, ensure TWILIO_PHONE_NUMBER exists for calls.
    if (!TWILIO_PHONE_NUMBER) {
      // skip call if no from number available
      console.warn(
        "Skipping call: TWILIO_PHONE_NUMBER not set (required for call 'from')."
      );
      return res.json({
        success: true,
        message: "SMS sent (call skipped - no TWILIO_PHONE_NUMBER configured).",
        smsSid: sms.sid,
      });
    }

    const call = await client.calls.create({
      url: "http://demo.twilio.com/docs/voice.xml",
      from: TWILIO_PHONE_NUMBER,
      to: toNumber,
    });

    return res.json({
      success: true,
      message: "SMS and Call sent successfully.",
      smsSid: sms.sid,
      callSid: call.sid,
    });
  } catch (err) {
    console.error(
      "❌ Error sending SMS/Call:",
      err && err.message ? err.message : err
    );
    return res
      .status(500)
      .json({ success: false, error: err?.message || String(err) });
  }
});

// Start server
const portToUse = parseInt(PORT, 10) || 3000;
app.listen(portToUse, () => {
  console.log(`🚀 Server running at http://localhost:${portToUse}`);
});
