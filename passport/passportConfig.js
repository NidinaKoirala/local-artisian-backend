import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import db from "../prisma/database.js";
import bcrypt from "bcryptjs";

passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        // Fetch the user by email using the `get` method
        const user = await db.prepare('SELECT * FROM User WHERE email = ?').get(email);

        if (!user) {
          console.warn("Login attempt with incorrect email:", email);
          return done(null, false, { message: "Incorrect email" });
        }

        // Compare the provided password with the stored hashed password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          console.warn("Login attempt with incorrect password for email:", email);
          return done(null, false, { message: "Incorrect password" });
        }

        return done(null, user);
      } catch (err) {
        console.error("Error during authentication:", err);
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // Fetch the user by ID
    const user = await db.prepare('SELECT * FROM User WHERE id = ?').get(id);
    done(null, user);
  } catch (err) {
    console.error("Error during deserialization:", err);
    done(err);
  }
});

export default passport;
