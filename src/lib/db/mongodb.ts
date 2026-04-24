import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

let clientPromise: Promise<MongoClient>;

// Cache the MongoClient promise across hot reloads in development
const globalForMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

if (!uri) {
  // During build time, MONGODB_URI may not be set. Create a rejected promise
  // but suppress the unhandled rejection — it will throw properly when awaited at runtime.
  clientPromise = Promise.reject(
    new Error("MONGODB_URI environment variable is not set")
  );
  clientPromise.catch(() => {});
} else if (process.env.NODE_ENV === "development") {
  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    globalForMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalForMongo._mongoClientPromise;
} else {
  const client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
