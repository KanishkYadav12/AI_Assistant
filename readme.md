AI Assistant Backend (Node.js + Express + MongoDB)

A production-grade backend API for an AI-powered virtual assistant with user authentication, custom assistant profiles, command handling, and integration with Gemini (LLM).
Built with Node.js, Express, MongoDB, JWT, Cloudinary, and bcrypt.

🚀 Features
🔐 Authentication

User signup, login, logout

Secure JWT stored in HTTP-only cookies

Password hashing using bcrypt

Email uniqueness & validation

Auto-removes password from responses

🤖 AI Assistant

Each user gets a customizable AI assistant

Set assistant name and assistant image

Upload profile images via Cloudinary

Interacts with Gemini API for command responses

Supports multiple assistant command types:

get-date

get-time

get-day

get-month

google-search

youtube-search

youtube-play

general

calculator-open

instagram-open

facebook-open

weather-show

📝 User History

Maintains command history

Automatically timestamps history entries

History capped for safety (configurable)

🛠️ Tech Stack
Technology Purpose
Node.js + Express Backend API
MongoDB + Mongoose Database & modeling
JWT Authentication
bcryptjs Password hashing
Cloudinary Image upload
moment.js Date & time formatting
Gemini API AI assistant responses
📁 Project Structure
/project-root
│
├── config/
│ ├── cloudinary.js # Cloudinary upload logic
│ ├── token.js # JWT generation
│
├── controllers/
│ ├── authController.js # Signup, login, logout
│ ├── userController.js # Assistant logic, history, profile
│
├── models/
│ └── userModel.js # User schema with history & assistant
│
├── gemini.js # Gemini API integration
├── server.js # App entry point
└── README.md

📦 Installation & Setup
1️⃣ Clone Repository
git clone <your-repo-url>
cd project-folder

2️⃣ Install Dependencies
npm install

3️⃣ Create .env File
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NODE_ENV=development

4️⃣ Run Server
npm run dev

🔐 Authentication API
POST /api/auth/signup

Registers a new user.

Body:
{
"name": "John Doe",
"email": "john@gmail.com",
"password": "password123"
}

POST /api/auth/login

Logs in and sets JWT token in HTTP-only cookie.

Body:
{
"email": "john@gmail.com",
"password": "password123"
}

POST /api/auth/logout

Clears JWT cookie.

👤 User & Assistant API
GET /api/user/me

Returns current user (token required).

PUT /api/user/assistant

Updates assistant name / image.
Supports both file upload and URL.

POST /api/user/ask

Sends a command to Gemini.

Example Body:
{
"command": "what day is today?"
}

📘 User Model Overview
name: String,
email: String (unique, validated),
password: String (hashed),
assistantName: String,
assistantImage: String,
history: [
{ text: String, createdAt: Date }
]

🧠 Gemini Response Handling

Gemini returns text, but the backend extracts the first JSON object using:

{
"type": "get-time",
"userInput": "...",
"response": "..."
}

Backend routes based on type and returns appropriate data.

🛡️ Security Features

HTTP-only cookies prevent XSS token theft

Passwords hashed using bcrypt

Email normalized (trim + lowercase)

Validation for all sensitive fields

History capped in size

🏁 Next Steps / Optional Enhancements

Add Zod or Joi validation middleware

Add rate limiting (prevent spam)

Add refresh tokens for long-term login

Add roles (admin/user)

Add history retrieval API

Add email verification

✨ Credits

Backend logic written using best practices requested by the user—optimized for real-world production deployment.
