import { Db, MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "hackaton";

if (!uri) {
  throw new Error("MONGODB_URI is not set");
}

// Reuse the client across hot reloads in dev.
const globalForMongo = globalThis as unknown as {
  _mongoClient?: Promise<MongoClient>;
};

const clientPromise =
  globalForMongo._mongoClient ?? new MongoClient(uri).connect();

if (process.env.NODE_ENV !== "production") {
  globalForMongo._mongoClient = clientPromise;
}

export async function getDb(): Promise<Db> {
  return (await clientPromise).db(dbName);
}
