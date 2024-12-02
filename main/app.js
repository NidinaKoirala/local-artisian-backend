import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Define __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const allowedOrigins = [
  "https://nidinakoirala.github.io",
  "https://dinesh16adh.github.io",
  "http://localhost:5173"
];

// Your existing code
import express from "express";
import session from "express-session";
import cors from "cors";
import passport from "../passport/passportConfig.js";
import authorize from "./rbac.js";
import authRoute from "./routes/authRoute.js";
import adminRoute from "./routes/adminRoute.js";
import itemRoute from "./routes/itemRoute.js";
import userRoute from "./routes/userRoute.js";
import orderRoute from "./routes/orderRoute.js"

const PORT = 80;
const app = express();


app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin, like mobile apps or curl requests
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allows cookies and sessions to be sent with requests
}));

app.set("views", __dirname + "/../views");
app.set("view engine", "ejs");

app.use(session({ secret: "cats", resave: false, saveUninitialized: false }));
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Routes
app.use("/auth", authRoute);
app.use("/admin", adminRoute);
app.use("/", itemRoute);
app.use("/users", userRoute);
app.use ("/order", orderRoute);
app.get("/", (req, res) => res.render("index", { user: req.user, req: req }));
app.get("/books", authorize(['see_item', 'chat']), (req, res) => res.json({ name: 'harry potter' }));

app.listen(PORT, () => console.log(`App listening on port ${PORT}`));
