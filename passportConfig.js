import passport from "passport"
import {Strategy as LocalStrategy} from "passport-local";
import db from "./database.js";
import bcrypt from "bcryptjs";

const getUserByUsernameStmt = db.prepare('SELECT * FROM users WHERE username = ?');

passport.use(
    //telling Passport to use the LocalStrategy for authentication.
  new LocalStrategy(async (username, password, done) => {
    try {
      // Run the prepared statement to get the user
      const user = getUserByUsernameStmt.get(username);

      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      }
      
      const match = await bcrypt.compare(password, user.password);
      if(!match){
        return done(null, false, {message: "Incorrect password"});
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

//Stores the user id in the session.
passport.serializeUser((user, done) => {
    done(null, user.id);
  });

//Retrieves the user from the database based on the id and makes it available on req.user.
  passport.deserializeUser((id, done) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
      done(null, user);
    } catch(err) {
      done(err);
    }
  });
  

export default passport;