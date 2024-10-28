import express from "express";
import bcrypt from "bcryptjs";
import db from "../../prisma/database.js";
import passport from "../../passport/passportConfig.js";
const router = express.Router();

router.get("/sign-up", (req, res) => res.render("sign-up-form"));

const insertUserStmt = db.prepare(
  "INSERT INTO User (username,email, password) VALUES (?, ?, ?)"
);

//using bcrypt
router.post("/sign-up", (req, res, next) => {
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

router.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/auth/sign-up",
  })
);

router.post("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

export default router;
