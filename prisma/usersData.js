import { createClient } from "@libsql/client";
import { config } from "dotenv";

config(); // Load environment variables

const dbClient = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.AUTH_TOKEN,
});


async function getUsers() {
  try {
    // Fetch all users from the 'user' table
    const query = "SELECT * FROM user";
    const result = await dbClient.execute(query);

    // Map the result rows to return as an object
    const users = result.rows;
    return { users };
  } catch (error) {
    console.error("Error fetching users:", error);
  } finally {
    // No explicit disconnect needed with dbClient, as it’s managed internally
  }
}

export default getUsers;
