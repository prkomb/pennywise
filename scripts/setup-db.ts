import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "hackaton";

if (!uri) {
  throw new Error("MONGODB_URI is not set");
}

const validators = {
  transactions: {
    bsonType: "object",
    required: ["amount", "type", "category", "date", "createdAt", "updatedAt"],
    properties: {
      amount: { bsonType: ["double", "int", "long", "decimal"] },
      type: { enum: ["income", "expense"] },
      category: { bsonType: "string" },
      description: { bsonType: "string" },
      date: { bsonType: "date" },
      goalId: { bsonType: "objectId" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  goals: {
    bsonType: "object",
    required: ["name", "targetAmount", "currentAmount", "status", "createdAt", "updatedAt"],
    properties: {
      name: { bsonType: "string" },
      targetAmount: { bsonType: ["double", "int", "long", "decimal"] },
      currentAmount: { bsonType: ["double", "int", "long", "decimal"] },
      deadline: { bsonType: "date" },
      status: { enum: ["active", "completed", "archived"] },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
  settings: {
    bsonType: "object",
    required: ["key", "value", "updatedAt"],
    properties: {
      key: { bsonType: "string" },
      updatedAt: { bsonType: "date" },
    },
  },
};

async function main() {
  const client = await new MongoClient(uri!).connect();
  const db = client.db(dbName);
  const existing = new Set(
    (await db.listCollections().toArray()).map((c) => c.name),
  );

  for (const [name, $jsonSchema] of Object.entries(validators)) {
    if (existing.has(name)) {
      await db.command({ collMod: name, validator: { $jsonSchema } });
    } else {
      await db.createCollection(name, { validator: { $jsonSchema } });
    }
  }

  await db.collection("transactions").createIndexes([
    { key: { date: -1 } },
    { key: { category: 1, date: -1 } },
    { key: { goalId: 1 }, sparse: true },
  ]);
  await db.collection("goals").createIndexes([
    { key: { status: 1, deadline: 1 } },
  ]);
  await db.collection("uploads").createIndex({ hash: 1 }, { unique: true });
  await db.collection("settings").createIndex({ key: 1 }, { unique: true });

  console.log(`Collections ready in "${dbName}": ${Object.keys(validators).join(", ")}`);
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
