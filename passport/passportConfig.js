import passport from "passport"
import {Strategy as LocalStrategy} from "passport-local";
import db from "../prisma/database.js";
import bcrypt from "bcryptjs";

const getUserByEmailStmt = db.prepare('SELECT * FROM User WHERE email = ?');

passport.use(
    //telling Passport to use the LocalStrategy for authentication.
  new LocalStrategy({ usernameField: 'email', passwordField: 'password' },//email instead of username
    //verification logic here
    async (email, password, done) => {
    try {
      // Run the prepared statement to get the user
      const user = getUserByEmailStmt.get(email);

      if (!user) {
        return done(null, false, { message: "Incorrect email" });
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
      const user = db.prepare('SELECT * FROM User WHERE id = ?').get(id);
      done(null, user);
    } catch(err) {
      done(err);
    }
  });
  

export default passport;