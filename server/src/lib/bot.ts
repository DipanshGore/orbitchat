import { db } from "./db.js";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const PRIMARY_KEY = process.env.OPENROUTER_API_KEY || "";
const BACKUP_KEY = process.env.OPENROUTER_BACKUP_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "openai/gpt-4o-mini";

function getOpenRouterProvider(apiKey: string) {
  return createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });
}

export interface BotProcessResult {
  isBotCommand: boolean;
  replyContent: string;
}

export async function processOrbitBotCommand(
  rawContent: string,
  context: {
    channelId?: string;
    conversationId?: string;
    userName: string;
    isDirectWithBot?: boolean;
    isMention?: boolean;
    isReplyToBot?: boolean;
    replyToContent?: string;
  }
): Promise<BotProcessResult> {
  const trimmed = rawContent.trim();
  const lower = trimmed.toLowerCase();

  const isCommand =
    lower.startsWith("/help") ||
    lower.startsWith("/ask") ||
    lower.startsWith("/ai") ||
    lower.startsWith("/bot") ||
    lower.startsWith("/summarize");

  const isBotTargeted =
    isCommand ||
    context.isDirectWithBot ||
    context.isMention ||
    context.isReplyToBot ||
    lower.includes("@orbitbot") ||
    lower.includes("@bot") ||
    lower.startsWith("orbitbot");

  if (!isBotTargeted) {
    return { isBotCommand: false, replyContent: "" };
  }

  // 1. /help command
  if (lower === "/help" || lower.startsWith("/help ")) {
    return {
      isBotCommand: true,
      replyContent:
        `🛰️ **OrbitBot Orbital Intelligence System**\n\n` +
        `I am your interactive AI assistant aboard OrbitChat Station!\n\n` +
        `**Ways to interact:**\n` +
        `• **1:1 Direct Orbit**: Start a DM with me and chat naturally about anything!\n` +
        `• **Mention in Channels**: Type \`@orbitbot <your question>\` or reply to any of my messages.\n` +
        `• **/ask <question>**: Ask me code questions, cosmic physics, or mission advice.\n` +
        `• **/summarize**: Synthesizes the latest 25 transmissions in this channel.\n` +
        `• **/help**: Displays this mission operational manual.\n\n` +
        `*Powered by OpenRouter GPT-4o-mini neural core with multi-turn memory.*`,
    };
  }

  // 2. /summarize command
  if (lower.startsWith("/summarize")) {
    try {
      const recentMessages = await db.message.findMany({
        where: context.channelId
          ? { channelId: context.channelId, isDeleted: false }
          : { conversationId: context.conversationId, isDeleted: false },
        take: 25,
        orderBy: { createdAt: "desc" },
        include: { sender: { select: { displayName: true } } },
      });

      if (recentMessages.length <= 1) {
        return {
          isBotCommand: true,
          replyContent: "🌌 Not enough orbital transmissions in this frequency yet to synthesize a summary.",
        };
      }

      const formattedHistory = recentMessages
        .reverse()
        .map((m) => `${m.sender.displayName}: ${m.content}`)
        .join("\n");

      const summaryPrompt = `Summarize these recent messages concisely in 3-4 bullet points with a space/orbital flair. Highlight key decisions, questions, or action items:\n\n${formattedHistory}`;

      const aiReply = await callOpenRouterWithFallback(
        summaryPrompt,
        "You are OrbitBot, an orbital station AI. Summarize the chat transcript concisely and highlight key takeaways with space terminology."
      );

      if (aiReply) {
        return {
          isBotCommand: true,
          replyContent: `🛰️ **Orbital Channel Summary**:\n\n${aiReply}`,
        };
      }

      // Rule-based fallback summary
      const senders = Array.from(new Set(recentMessages.map((m) => m.sender.displayName)));
      return {
        isBotCommand: true,
        replyContent:
          `🛰️ **Orbital Channel Summary (Rule-Based Synthesis)**:\n\n` +
          `• **Activity Volume:** ${recentMessages.length} recent transmissions analyzed.\n` +
          `• **Active Crew Members:** ${senders.join(", ")}.\n` +
          `• **Recent Focus:** Collaborative exchanges across orbital station channels.\n` +
          `• **Status:** All crew relays operational. Type **/ask <topic>** for deeper analysis.`,
      };
    } catch (err) {
      console.error("Error summarizing:", err);
      return {
        isBotCommand: true,
        replyContent: "⚠️ OrbitBot encountered solar interference while parsing telemetry.",
      };
    }
  }

  // 3. Conversational / Direct Message / @orbitbot / /ask / /ai / /bot
  let userQuery = trimmed;
  if (lower.startsWith("/ask")) {
    userQuery = trimmed.slice(4).trim();
  } else if (lower.startsWith("/ai")) {
    userQuery = trimmed.slice(3).trim();
  } else if (lower.startsWith("/bot")) {
    userQuery = trimmed.slice(4).trim();
  }

  // Strip mentions or leading "orbitbot" prefix
  userQuery = userQuery
    .replace(/@orbitbot\b/gi, "")
    .replace(/@bot\b/gi, "")
    .replace(/^orbitbot[:,\s]*/gi, "")
    .trim();

  if (!userQuery) {
    return {
      isBotCommand: true,
      replyContent: `Greetings, ${context.userName}! How can OrbitBot assist your mission today? Ask me any code questions, cosmic calculations, or station operations! 🚀`,
    };
  }

  // Gather conversational history if in DM or if replying
  let conversationHistoryText = "";
  try {
    const recentConvo = await db.message.findMany({
      where: context.conversationId
        ? { conversationId: context.conversationId, isDeleted: false }
        : context.channelId
        ? { channelId: context.channelId, isDeleted: false }
        : undefined,
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { sender: { select: { displayName: true, isBot: true } } },
    });

    if (recentConvo.length > 0) {
      conversationHistoryText = recentConvo
        .reverse()
        .map((m) => `${m.sender.isBot ? "OrbitBot" : m.sender.displayName}: ${m.content}`)
        .join("\n");
    }
  } catch (historyErr) {
    console.warn("Could not load conversation history:", historyErr);
  }

  const systemPrompt =
    `You are OrbitBot, an intelligent, helpful, and friendly AI companion aboard the OrbitChat space station. ` +
    `You are chatting directly with crew member "${context.userName}". ` +
    `You excel at programming (TypeScript, React, Python, algorithms), system architecture, cosmic science, and mission operations. ` +
    `Keep your answers clear, helpful, accurate, and concise. Format code blocks using markdown syntax highlighting. ` +
    `Infuse occasional friendly space/orbital flavor (e.g. 🛰️, 🚀, telemetry, quantum relays) without being over-the-top.`;

  const fullPrompt = conversationHistoryText
    ? `Recent Transmissions History:\n${conversationHistoryText}\n\nLatest message from ${context.userName}: ${userQuery}\n\nOrbitBot Reply:`
    : `Message from ${context.userName}: ${userQuery}\n\nOrbitBot Reply:`;

  const aiReply = await callOpenRouterWithFallback(fullPrompt, systemPrompt);

  if (aiReply) {
    return {
      isBotCommand: true,
      replyContent: aiReply,
    };
  }

  // Rule-based fallback if all API calls fail
  return {
    isBotCommand: true,
    replyContent: generateRuleBasedReply(userQuery, context.userName),
  };
}

async function callOpenRouterWithFallback(prompt: string, system: string): Promise<string | null> {
  // Try Key 1
  if (PRIMARY_KEY) {
    try {
      const openrouter1 = getOpenRouterProvider(PRIMARY_KEY);
      const { text } = await generateText({
        model: openrouter1(AI_MODEL),
        system,
        prompt,
        abortSignal: AbortSignal.timeout(12000),
      });
      if (text) return text;
    } catch (err1) {
      console.warn("OpenRouter Key 1 failed, trying Backup Key 2:", err1);
    }
  }

  // Try Key 2
  if (BACKUP_KEY) {
    try {
      const openrouter2 = getOpenRouterProvider(BACKUP_KEY);
      const { text } = await generateText({
        model: openrouter2(AI_MODEL),
        system,
        prompt,
        abortSignal: AbortSignal.timeout(12000),
      });
      if (text) return text;
    } catch (err2) {
      console.warn("OpenRouter Backup Key 2 failed:", err2);
    }
  }

  return null;
}

function generateRuleBasedReply(question: string, userName: string): string {
  const q = question.toLowerCase();

  if (q.includes("quantum") || q.includes("relay") || q.includes("telemetry")) {
    return `🤖 **OrbitBot Telemetry Engine:**\n\nQuantum relays operate through entangled photonic pairs across geostationary orbital nodes. Telemetry is encoded in superposition states, ensuring sub-millisecond transmission lag across all OrbitChat channels.`;
  }

  if (q.includes("station") || q.includes("orbit") || q.includes("ship")) {
    return `🤖 **OrbitBot Station Log:**\n\nOrbitChat Station maintains a stable low Earth orbit at 420km altitude, traveling at 7.66 km/s. Atmospheric scrubbers and radiation shields are operating within normal parameters, ${userName}.`;
  }

  if (q.includes("code") || q.includes("bug") || q.includes("typescript") || q.includes("next")) {
    return `🤖 **OrbitBot Engineering Advisory:**\n\nFor orbital code resilience:\n1. Ensure strict TypeScript types with no \`any\`.\n2. Utilize optimistic UI dispatch with resilient retry states.\n3. Validate all payloads with Zod before transmission into the event horizon.`;
  }

  return `🤖 **OrbitBot:**\n\nTransmission received from ${userName}: "*${question}*".\n\nAll orbital systems are operational. I am connected and ready for your next instruction!`;
}
