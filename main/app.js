import express from "express";
import session from "express-session";
import passport from "../passport/passportConfig.js";
import authorize from "./rbac.js";
import authRoute from "./routes/authRoute.js";
import adminRoute from "./routes/adminRoute.js";
import itemRoute from "./routes/itemRoute.js"
const PORT = 5173;

const app = express();
app.set("view engine", "ejs");

app.use(session({ secret: "cats", resave: false, saveUninitialized: false }));
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use("/auth", authRoute);
app.use("/admin", adminRoute);
app.use("/", itemRoute);

app.get("/", (req, res) => res.render("index", { user: req.user, req: req }));
app.get("/books", authorize(['see_item', 'chat']), (req,res)=> res.json({name:'harry potter'}));

app.listen(PORT, () => console.log(`app listening on port ${PORT}`));
