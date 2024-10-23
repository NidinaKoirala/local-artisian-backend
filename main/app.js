import express from "express";
import session from "express-session";
import db from "../prisma/database.js";
import passport from "../passport/passportConfig.js";
import bcrypt from "bcryptjs";
const PORT = 5173;

const app = express();
app.set("view engine", "ejs");

app.use(session({ secret: "cats", resave: false, saveUninitialized: false }));
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/", (req, res) => res.render("index", { user: req.user, req: req }));
app.get("/sign-up", (req, res) => res.render("sign-up-form"));
app.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

const insertUserStmt = db.prepare(
  "INSERT INTO User (username,email, password) VALUES (?, ?, ?)"
);

//using bcrypt
app.post("/sign-up", (req, res, next) => {
  try {
    bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
      if (err) {
        return next(err);
      }

      try {
        insertUserStmt.run(req.body.username, req.body.email, hashedPassword);
        res.redirect("/");
      } catch (err) {
        return next(err);
      }
    });
  } catch (err) {
    return next(err);
  }
});

app.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/sign-up",
  })
);

app.listen(PORT, () => console.log(`app listening on port ${PORT}`));
