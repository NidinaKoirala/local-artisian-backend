import { config } from "dotenv";
import { createClient } from "@libsql/client";

// Load .env variables
config();

class Database {
  constructor(url, authToken) {
    this.client = createClient({
      url,
      authToken,
    });
  }

  // Mimic better-sqlite3 methods if necessary, such as `prepare` and `run`
  prepare(query) {
    return {
      run: async (...params) => {
        const result = await this.client.execute(query, params);
        return result;
      },
      // Additional methods as needed, such as `all`, `get`, etc.
    };
  }
}

// Use environment variables from OS or .env file
const db = new Database(process.env.DATABASE_URL, process.env.AUTH_TOKEN);
export default db;
