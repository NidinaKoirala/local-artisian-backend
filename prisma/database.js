import Database from "better-sqlite3";
const db = new Database('prisma/dev.db');
export default db;