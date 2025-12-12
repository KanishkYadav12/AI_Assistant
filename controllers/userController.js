// controllers/userController.js
import uploadOnCloudinary from "../config/cloudinary.js";
import geminiResponse from "../gemini.js";
import User from "../models/userModel.js";
import moment from "moment"; // If you prefer, consider dayjs or native Date for new projects
import createError from "http-errors"; // optional, if you use it in your project

const MAX_HISTORY_ITEMS = 100;

/**
 * Parse the first JSON object found inside arbitrary text.
 * Returns the parsed object or null if none found / parse fails.
 */
function parseFirstJson(text) {
  if (typeof text !== "string") return null;
  // Find first { ... } block (non-greedy). This is defensive; adjust if Gemini returns structured output.
  const match = text.match(/{[\s\S]*}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (err) {
    return null;
  }
}

/**
 * GET current user (without password)
 */
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId).select("-password").lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    // log error for debugging (replace with your logger)
    console.error("getCurrentUser error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get current user" });
  }
};

/**
 * Update assistant name / image
 * Accepts either: - multipart file in req.file OR - imageUrl in body
 */
export const updateAssistant = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { assistantName, imageUrl } = req.body;

    // Basic validation / sanitization
    const update = {};
    if (assistantName !== undefined) {
      if (
        typeof assistantName !== "string" ||
        assistantName.trim().length === 0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message: "assistantName must be a non-empty string",
          });
      }
      if (assistantName.length > 40) {
        return res
          .status(400)
          .json({
            success: false,
            message: "assistantName too long (max 40 chars)",
          });
      }
      update.assistantName = assistantName.trim();
    }

    // Handle file upload (if provided)
    if (req.file) {
      try {
        // uploadOnCloudinary should throw if upload fails and return a URL string (or an object)
        const uploaded = await uploadOnCloudinary(req.file.path);
        // Accept either direct string or object with secure_url
        update.assistantImage =
          typeof uploaded === "string"
            ? uploaded
            : uploaded?.secure_url ?? imageUrl ?? null;
      } catch (err) {
        console.error("Cloudinary upload failed:", err);
        return res
          .status(502)
          .json({ success: false, message: "Image upload failed" });
      }
    } else if (imageUrl) {
      // Minimal validation for URL-like string
      update.assistantImage =
        typeof imageUrl === "string" ? imageUrl.trim() : imageUrl;
    }

    // If nothing to update
    if (Object.keys(update).length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "No valid fields provided to update",
        });
    }

    const user = await User.findByIdAndUpdate(userId, update, {
      new: true,
    }).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("updateAssistant error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update assistant" });
  }
};

/**
 * Ask the assistant a command. This:
 *  - stores the command in the user's history (bounded)
 *  - calls geminiResponse(command, assistantName, userName)
 *  - parses Gemini's response for JSON payload and routes by type
 */
export const askToAssistant = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { command } = req.body;
    if (
      !command ||
      typeof command !== "string" ||
      command.trim().length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing command" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Push to history (bounded)
    user.history = user.history || [];
    user.history.push({ text: command, createdAt: new Date() });
    // keep only last N items
    if (user.history.length > MAX_HISTORY_ITEMS) {
      user.history = user.history.slice(-MAX_HISTORY_ITEMS);
    }
    await user.save();

    // Prepare inputs for assistant
    const userName = user.name ?? "User";
    const assistantName = user.assistantName ?? "Assistant";

    // Call external LLM/service
    const rawResult = await geminiResponse(command, assistantName, userName);
    if (!rawResult || typeof rawResult !== "string") {
      console.warn("empty/invalid response from geminiResponse:", rawResult);
      return res
        .status(502)
        .json({
          success: false,
          message: "Assistant returned invalid response",
        });
    }

    // Parse first JSON object inside response text
    const gemResult = parseFirstJson(rawResult);
    if (!gemResult) {
      // return sanitized fallback message — keep user informed about original text for debugging
      return res.status(400).json({
        success: false,
        message: "Could not parse assistant response",
        raw: rawResult.substring(0, 1000), // limit size returned to client
      });
    }

    const type = gemResult.type || "general";
    const userInputFromGem = gemResult.userInput ?? command;
    const assistantTextResponse = gemResult.response ?? "";

    // Route by type (expand as needed)
    switch (type) {
      case "get-date":
        return res.status(200).json({
          success: true,
          type,
          userInput: userInputFromGem,
          response: `current date is ${moment().format("YYYY-MM-DD")}`,
        });

      case "get-time":
        return res.status(200).json({
          success: true,
          type,
          userInput: userInputFromGem,
          response: `current time is ${moment().format("hh:mm A")}`,
        });

      case "get-day":
        return res.status(200).json({
          success: true,
          type,
          userInput: userInputFromGem,
          response: `today is ${moment().format("dddd")}`,
        });

      case "get-month":
        return res.status(200).json({
          success: true,
          type,
          userInput: userInputFromGem,
          response: `this month is ${moment().format("MMMM")}`,
        });

      // types that pass through gemini's response directly
      case "google-search":
      case "youtube-search":
      case "youtube-play":
      case "general":
      case "calculator-open":
      case "instagram-open":
      case "facebook-open":
      case "weather-show":
        return res.status(200).json({
          success: true,
          type,
          userInput: userInputFromGem,
          response: assistantTextResponse,
        });

      default:
        return res.status(400).json({
          success: false,
          message: "Unrecognized assistant command type",
          type,
          response: assistantTextResponse,
        });
    }
  } catch (error) {
    console.error("askToAssistant error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Ask assistant failed" });
  }
};
