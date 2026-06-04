import { Client, Databases } from "node-appwrite";
import * as fs from "fs";
import * as path from "path";

// Manually parse .env
const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf8");
const parsedEnv: Record<string, string> = {};

for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
        }
        parsedEnv[key] = val;
    }
}

const endpoint = parsedEnv.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const project = parsedEnv.NEXT_PUBLIC_APPWRITE_PROJECT;
const key = parsedEnv.NEXT_APPWRITE_KEY;
const databaseId = parsedEnv.APPWRITE_DATABASE_ID;
const collectionId = "automations";

async function run() {
    console.log("=== Creating Appwrite Automations Collection ===");
    console.log("Endpoint:", endpoint);
    console.log("Project:", project);
    console.log("Database ID:", databaseId);
    console.log("Collection ID:", collectionId);

    const client = new Client()
        .setEndpoint(endpoint)
        .setProject(project)
        .setKey(key)
        .setSelfSigned(true);

    const database = new Databases(client);

    try {
        // Delete existing collection if it exists to start fresh
        try {
            console.log("Deleting existing collection 'automations' to start fresh...");
            await database.deleteCollection(databaseId, collectionId);
            console.log("✅ Existing collection deleted.");
            await new Promise((r) => setTimeout(r, 2000));
        } catch (e: any) {
            console.log("No existing collection to delete.");
        }

        // Create the collection
        const collection = await database.createCollection(
            databaseId,
            collectionId,
            "Automations",
            undefined,
            undefined
        );
        console.log("✅ Collection created successfully:", collection.$id);

        // Wait a bit
        await new Promise((r) => setTimeout(r, 1000));

        // Create attributes
        console.log("Creating attributes...");
        
        await database.createStringAttribute(databaseId, collectionId, "userId", 100, true);
        console.log("userId attribute created");
        await new Promise((r) => setTimeout(r, 800));

        await database.createStringAttribute(databaseId, collectionId, "actionType", 100, true);
        console.log("actionType attribute created");
        await new Promise((r) => setTimeout(r, 800));

        await database.createIntegerAttribute(databaseId, collectionId, "amount", true);
        console.log("amount attribute created");
        await new Promise((r) => setTimeout(r, 800));

        await database.createStringAttribute(databaseId, collectionId, "destinationFund", 100, true);
        console.log("destinationFund attribute created");
        await new Promise((r) => setTimeout(r, 800));

        await database.createStringAttribute(databaseId, collectionId, "cronExpression", 100, true);
        console.log("cronExpression attribute created");
        await new Promise((r) => setTimeout(r, 800));

        // Set required=false and default=true for isActive to avoid validation errors
        await database.createBooleanAttribute(databaseId, collectionId, "isActive", false, true);
        console.log("isActive attribute created");
        await new Promise((r) => setTimeout(r, 800));

        await database.createStringAttribute(databaseId, collectionId, "lastRun", 100, false);
        console.log("lastRun attribute created");
        await new Promise((r) => setTimeout(r, 800));

        await database.createStringAttribute(databaseId, collectionId, "executionHistory", 10000, false);
        console.log("executionHistory attribute created");
        
        console.log("Waiting for attributes to be indexed...");
        await new Promise((r) => setTimeout(r, 10000));

        // Create Index for userId
        console.log("Creating index for userId...");
        await database.createIndex(
            databaseId,
            collectionId,
            "userId_idx",
            "key",
            ["userId"],
            ["asc"]
        );
        console.log("✅ Index created successfully!");

        console.log("🎉 Done! Appwrite automations collection is fully configured.");
    } catch (error: any) {
        console.error("❌ Error setting up Appwrite collection:", error.message || error);
    }
}

run();
