import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { authenticate, authorizeAdmin } from './middleware/authMiddleware.js';

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
import orderRoute from "./routes/orderRoute.js";
import reviewRoute from "./routes/reviewRoute.js";
import productRoute from "./routes/productRoute.js";
import sellersRouter from"./routes/admin/sellers.js";
import productsRouter from "./routes/admin/products.js";
import manageUsersRouter from "./routes/admin/users.js";
import manageOrdersRouter from "./routes/admin/orders.js";
import managePayments from "./routes/paymentRoute.js";

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

// API to check server status
app.get('/api/status', (req, res) => {
  res.json({
    status: serverStatus ? 'Running' : 'Not Running',
    timestamp: new Date().toISOString(),
  });
});

app.use("/auth", authRoute);
app.use("/admin", adminRoute);
app.use("/", itemRoute);
app.use("/users", userRoute);
app.use ("/order", orderRoute);
app.use ("/items", reviewRoute);
app.use ("/products", productRoute);
app.use ("/create-payment-intent", managePayments);
// Protected Admin Routes
app.use("/admin", authenticate, authorizeAdmin, adminRoute);
app.use("/admin/sellers", authenticate, authorizeAdmin, sellersRouter);
app.use("/admin/products", authenticate, authorizeAdmin, productsRouter);
app.use("/admin/users", authenticate, authorizeAdmin, manageUsersRouter);
app.use("/admin/orders", authenticate, authorizeAdmin, manageOrdersRouter);
app.get("/", (req, res) => res.render("index", { user: req.user, req: req }));

app.listen(PORT, () => console.log(`App listening on port ${PORT}`));
