async function main() {
    try {
        console.log("Attempting to load env...");
        // @ts-ignore
        const { env } = await import("./src/env.js");
        console.log("Env loaded successfully");

        const { db } = await import("./src/server/db.js");
        console.log("Connecting to database...");
        const userCount = await db.user.count();
        console.log(`Database connected. User count: ${userCount}`);

    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

main();
