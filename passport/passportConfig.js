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

  // Mimic better-sqlite3 methods
  prepare(query) {
    return {
      run: async (...params) => {
        const result = await this.client.execute(query, params);
        return result;
      },
      get: async (...params) => {
        const result = await this.client.execute(query, params);
        return result.rows[0]; // return the first row if it exists
      },
      all: async (...params) => {
        const result = await this.client.execute(query, params);
        return result.rows; // return all rows
      },
    };
  }
}

const db = new Database(process.env.DATABASE_URL, process.env.AUTH_TOKEN);
export default db;
