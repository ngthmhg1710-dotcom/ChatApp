import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);

export default app;
