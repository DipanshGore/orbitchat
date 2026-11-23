import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding OrbitChat database...");

  // Clean existing data
  await prisma.lastRead.deleteMany();
  await prisma.message.deleteMany();
  await prisma.channelMember.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create OrbitBot
  const bot = await prisma.user.create({
    data: {
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

  // 2. Create 4 demo users
  const nova = await prisma.user.create({
    data: {
      email: "nova@orbit.chat",
      username: "nova",
      displayName: "Commander Nova",
      passwordHash,
      avatar: "mars",
      status: "online",
      customStatus: "Aligning telemetry vectors 🛰️",
      isGuest: false,
    },
  });

  const leo = await prisma.user.create({
    data: {
      email: "leo@orbit.chat",
      username: "leo",
      displayName: "Dr. Leo Vance",
      passwordHash,
      avatar: "jupiter",
      status: "away",
      customStatus: "In deep orbit research 🔭",
      isGuest: false,
    },
  });

  const maya = await prisma.user.create({
    data: {
      email: "maya@orbit.chat",
      username: "maya",
      displayName: "Maya Chen",
      passwordHash,
      avatar: "saturn",
      status: "busy",
      customStatus: "Debugging gravity anomalies ⚛️",
      isGuest: false,
    },
  });

  const kai = await prisma.user.create({
    data: {
      email: "kai@orbit.chat",
      username: "kai",
      displayName: "Kai Thorne",
      passwordHash,
      avatar: "neptune",
      status: "online",
      customStatus: "Stargazing from observation deck ✨",
      isGuest: false,
    },
  });

  const allUsers = [nova, leo, maya, kai, bot];

  // 3. Create 3 channels
  const general = await prisma.channel.create({
    data: {
      name: "general-orbit",
      description: "The central hub for all orbital discussions, crew announcements, and station updates.",
      isPrivate: false,
    },
  });

  const engineering = await prisma.channel.create({
    data: {
      name: "engineering-core",
      description: "Quantum propulsion, telemetry pipelines, and orbital system architecture.",
      isPrivate: false,
    },
  });

  const lounge = await prisma.channel.create({
    data: {
      name: "deep-space-lounge",
      description: "Off-duty chatter, star charts, synthwave playlists, and zero-g coffee brewing.",
      isPrivate: false,
    },
  });

  // Add all users to all 3 channels
  for (const channel of [general, engineering, lounge]) {
    for (const u of allUsers) {
      await prisma.channelMember.create({
        data: {
          channelId: channel.id,
          userId: u.id,
          role: u.id === nova.id ? "owner" : "member",
        },
      });
    }
  }

  // 4. Seed initial messages in channels
  const msg1 = await prisma.message.create({
    data: {
      channelId: general.id,
      senderId: nova.id,
      content: "Welcome aboard OrbitChat station, crew! All orbital relays are green.",
      type: "text",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    },
  });

  const msg2 = await prisma.message.create({
    data: {
      channelId: general.id,
      senderId: leo.id,
      content: "Solar telemetry sync is running at 99.8% precision. Ready for phase 2.",
      type: "text",
      replyToId: msg1.id,
      createdAt: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
    },
  });

  await prisma.message.create({
    data: {
      channelId: general.id,
      senderId: maya.id,
      content: "Here is the quantum handshake script for anyone running the node cluster:",
      type: "text",
      createdAt: new Date(Date.now() - 1000 * 60 * 30),
    },
  });

  await prisma.message.create({
    data: {
      channelId: general.id,
      senderId: maya.id,
      content: "```typescript\nasync function syncOrbitRelay(stationId: string) {\n  const beacon = await connectSatellite(stationId);\n  return beacon.ping({ frequency: '1420MHz' });\n}\n```",
      type: "code",
      createdAt: new Date(Date.now() - 1000 * 60 * 29),
    },
  });

  await prisma.message.create({
    data: {
      channelId: general.id,
      senderId: bot.id,
      content: "Greetings explorers! Type /help, /ask, or /summarize at any time to invoke OrbitBot AI capabilities.",
      type: "text",
      createdAt: new Date(Date.now() - 1000 * 60 * 15),
    },
  });

  await prisma.message.create({
    data: {
      channelId: engineering.id,
      senderId: kai.id,
      content: "The ion thruster test was successful. Next scheduled burn in 3 orbits.",
      type: "text",
      createdAt: new Date(Date.now() - 1000 * 60 * 120),
    },
  });

  await prisma.message.create({
    data: {
      channelId: lounge.id,
      senderId: leo.id,
      content: "Who brought the Martian coffee beans to the galley? Outstanding aroma.",
      type: "text",
      createdAt: new Date(Date.now() - 1000 * 60 * 80),
    },
  });

  // 5. Seed a 1:1 direct conversation between Nova and Leo
  const sortedUserIds = [nova.id, leo.id].sort();
  const dm = await prisma.conversation.create({
    data: {
      user1Id: sortedUserIds[0],
      user2Id: sortedUserIds[1],
    },
  });

  await prisma.message.create({
    data: {
      conversationId: dm.id,
      senderId: leo.id,
      content: "Commander, did you check the sensor sweep on Sector 7?",
      type: "text",
      createdAt: new Date(Date.now() - 1000 * 60 * 20),
    },
  });

  await prisma.message.create({
    data: {
      conversationId: dm.id,
      senderId: nova.id,
      content: "Yes, Leo. Clean spectrum. Let's proceed with deployment.",
      type: "text",
      createdAt: new Date(Date.now() - 1000 * 60 * 10),
    },
  });

  // Set last reads for Leo so Nova has unread messages if she hasn't read them or vice-versa
  // Leo has read dm up to now
  await prisma.lastRead.create({
    data: {
      userId: leo.id,
      conversationId: dm.id,
      lastReadAt: new Date(),
    },
  });

  // Nova read general channel 20 mins ago (so bot message is unread for Nova!)
  await prisma.lastRead.create({
    data: {
      userId: nova.id,
      channelId: general.id,
      lastReadAt: new Date(Date.now() - 1000 * 60 * 20),
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

