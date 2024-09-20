import Database from "better-sqlite3";
const db = new Database('./sql.db');
export default db;