import { createClient } from "@libsql/client";
import { config } from "dotenv";

config(); // Load environment variables

const dbClient = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.AUTH_TOKEN,
});

async function getUsers() {
  try {
    // Query to fetch all users from the 'user' table
    const query = `
      SELECT 
        id, 
        firstName, 
        middleName, 
        lastName, 
        username, 
        email, 
        phoneNumber, 
        addressLine1, 
        addressLine2, 
        city, 
        state, 
        postalCode, 
        country, 
        role, 
        createdAt 
      FROM user
    `;
    const result = await dbClient.execute(query);

    // Ensure result rows are present
    if (result.rows && result.rows.length > 0) {
      return { users: result.rows };
    } else {
      console.warn("No users found in the database.");
      return { users: [] };
    }
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users from the database");
  }
}

// New function to fetch a single user's details by ID
async function getUserById(userId) {
  try {
    const query = `
      SELECT 
        id, 
        firstName, 
        middleName, 
        lastName, 
        username, 
        email, 
        phoneNumber, 
        addressLine1, 
        addressLine2, 
        city, 
        state, 
        postalCode, 
        country, 
        role, 
        createdAt 
      FROM user
      WHERE id = ?
    `;
    const result = await dbClient.execute(query, [userId]);

    if (result.rows.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }

    return result.rows[0]; // Return the first (and only) row
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    throw new Error("Failed to fetch user by ID from the database");
  }
}

// New function to update a user's profile details
async function updateUser(userId, userDetails) {
  const {
    firstName,
    middleName,
    lastName,
    username,
    email,
    phoneNumber,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
  } = userDetails;

  try {
    const query = `
      UPDATE user
      SET 
        firstName = ?, 
        middleName = ?, 
        lastName = ?, 
        username = ?, 
        email = ?, 
        phoneNumber = ?, 
        addressLine1 = ?, 
        addressLine2 = ?, 
        city = ?, 
        state = ?, 
        postalCode = ?, 
        country = ?
      WHERE id = ?
    `;
    const params = [
      firstName,
      middleName || null, // Allow null for optional fields
      lastName,
      username,
      email,
      phoneNumber || null,
      addressLine1,
      addressLine2 || null,
      city,
      state,
      postalCode,
      country,
      userId,
    ];

    const result = await dbClient.execute(query, params);

    if (result.changes === 0) {
      throw new Error(`Failed to update user with ID ${userId}`);
    }

    console.log(`User with ID ${userId} updated successfully`);
    return { message: "User updated successfully" };
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error("Failed to update user in the database");
  }
}

export default { getUsers, getUserById, updateUser };
