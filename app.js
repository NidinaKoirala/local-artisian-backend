import express from "express";
import session from "express-session"
import fs from "fs";
import db from "./database.js";
import passport from "./passportConfig.js";
import bcrypt from "bcryptjs";

const app = express();
app.set("view engine", "ejs");
const schema = fs.readFileSync('./schema.sql', 'utf8');
db.exec(schema);

app.use(session({ secret: "cats", resave: false, saveUninitialized: false }));
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => res.render("index", {user: req.user}));
app.get("/sign-up", (req, res) => res.render("sign-up-form"));
app.get("/log-out", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
  });

const insertUserStmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');

//using bcrypt
app.post('/sign-up', (req, res, next) => {
  try{
    bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
      if (err){
        return next(err);
      }

      try{
        insertUserStmt.run(req.body.username, hashedPassword);
        res.redirect('/');
      } catch(err) {
        return next(err);
      }
    })
  }
  catch (err){
    return next(err);
  }
})

app.post(
    "/log-in",
    passport.authenticate("local", {
      successRedirect: "/",
      failureRedirect: "/sign-up"
    })
  );
  


app.listen(5173, () => console.log("app listening on port 5173")); 
