import bcrypt from "bcryptjs";
import { db } from "./db.js";

export async function ensureDatabaseSeeded(): Promise<void> {
  try {
    const passwordHash = await bcrypt.hash("password123", 10);

    // 1. Ensure OrbitBot AI exists
    let bot = await db.user.findFirst({ where: { isBot: true } });
    if (!bot) {
      console.log("🤖 Seeding OrbitBot AI user...");
      bot = await db.user.upsert({
        where: { email: "bot@orbit.chat" },
        update: { isBot: true, status: "online", passwordHash },
        create: {
          email: "bot@orbit.chat",
          username: "orbitbot",
          displayName: "OrbitBot AI",
          passwordHash,
          avatar: "sun",
          status: "online",
          customStatus: "Orbital Intelligence Assistant 🤖",
          isBot: true,
          isGuest: false,
        },
      });
    }

    // 2. Ensure 4 Demo Users exist
    const demoCrew = [
      {
        email: "nova@orbit.chat",
        username: "nova",
        displayName: "Commander Nova",
        avatar: "mars",
        status: "online",
        customStatus: "Aligning telemetry vectors 🛰️",
      },
      {
        email: "leo@orbit.chat",
        username: "leo",
        displayName: "Dr. Leo Vance",
        avatar: "jupiter",
        status: "away",
        customStatus: "In deep orbit research 🔭",
      },
      {
        email: "maya@orbit.chat",
        username: "maya",
        displayName: "Maya Chen",
        avatar: "saturn",
        status: "busy",
        customStatus: "Debugging gravity anomalies ⚛️",
      },
      {
        email: "kai@orbit.chat",
        username: "kai",
        displayName: "Kai Thorne",
        avatar: "neptune",
        status: "online",
        customStatus: "Stargazing from observation deck ✨",
      },
    ];

    const users: any[] = [bot];
    for (const crew of demoCrew) {
      const u = await db.user.upsert({
        where: { email: crew.email },
        update: {
          username: crew.username,
          displayName: crew.displayName,
          passwordHash,
          avatar: crew.avatar,
          customStatus: crew.customStatus,
          status: crew.status,
        },
        create: {
          email: crew.email,
          username: crew.username,
          displayName: crew.displayName,
          passwordHash,
          avatar: crew.avatar,
          status: crew.status,
          customStatus: crew.customStatus,
          isGuest: false,
          isBot: false,
        },
      });
      users.push(u);
    }

    // 3. Ensure Default Channels exist
    const defaultChannels = [
      {
        name: "general-orbit",
        description: "The central hub for all orbital discussions, crew announcements, and station updates.",
        isPrivate: false,
      },
      {
        name: "engineering-core",
        description: "Quantum propulsion, telemetry pipelines, and orbital system architecture.",
        isPrivate: false,
      },
      {
        name: "deep-space-lounge",
        description: "Off-duty chatter, star charts, synthwave playlists, and zero-g coffee brewing.",
        isPrivate: false,
      },
    ];

    const channels: any[] = [];
    for (const ch of defaultChannels) {
      const channel = await db.channel.upsert({
        where: { name: ch.name },
        update: { description: ch.description },
        create: ch,
      });
      channels.push(channel);

      // Add all users to channel
      for (const u of users) {
        await db.channelMember.upsert({
          where: {
            channelId_userId: { channelId: channel.id, userId: u.id },
          },
          update: {},
          create: {
            channelId: channel.id,
            userId: u.id,
            role: u.username === "nova" ? "owner" : "member",
          },
        });
      }
    }

    // 4. Check if messages exist in general-orbit; if not, seed starter messages
    const generalChannel = channels.find((c) => c.name === "general-orbit");
    if (generalChannel) {
      const messageCount = await db.message.count({
        where: { channelId: generalChannel.id },
      });

      if (messageCount === 0) {
        const novaUser = users.find((u) => u.username === "nova");
        const leoUser = users.find((u) => u.username === "leo");
        const mayaUser = users.find((u) => u.username === "maya");

        if (novaUser && leoUser && mayaUser && bot) {
          const msg1 = await db.message.create({
            data: {
              channelId: generalChannel.id,
              senderId: novaUser.id,
              content: "Welcome aboard OrbitChat station, crew! All orbital relays are green.",
              type: "text",
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
            },
          });

          await db.message.create({
            data: {
              channelId: generalChannel.id,
              senderId: leoUser.id,
              content: "Solar telemetry sync is running at 99.8% precision. Ready for phase 2.",
              type: "text",
              replyToId: msg1.id,
              createdAt: new Date(Date.now() - 1000 * 60 * 45),
            },
          });

          await db.message.create({
            data: {
              channelId: generalChannel.id,
              senderId: mayaUser.id,
              content: "```typescript\nasync function syncOrbitRelay(stationId: string) {\n  const beacon = await connectSatellite(stationId);\n  return beacon.ping({ frequency: '1420MHz' });\n}\n```",
              type: "code",
              createdAt: new Date(Date.now() - 1000 * 60 * 20),
            },
          });

          await db.message.create({
            data: {
              channelId: generalChannel.id,
              senderId: bot.id,
              content: "Greetings explorers! Type /help, /ask, or /summarize at any time to invoke OrbitBot AI capabilities.",
              type: "text",
              createdAt: new Date(Date.now() - 1000 * 60 * 10),
            },
          });
        }
      }
    }

    console.log("✅ OrbitChat database verified & seeded successfully!");
  } catch (error) {
    console.error("⚠️ Failed to ensure database seed on startup:", error);
  }
}
