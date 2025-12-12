import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import connectDB from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import cookieParser from "cookie-parser";

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
const port = process.env.PORT || 5000;
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("AI Virtual Assistant Backend is running");
});

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
connectDB();
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
