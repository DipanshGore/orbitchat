import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { processOrbitBotCommand } from "../lib/bot.js";

const router = Router();
router.use(requireAuth);

const askAiSchema = z.object({
  prompt: z.string().min(1),
  channelId: z.string().optional(),
  conversationId: z.string().optional(),
});

// POST /api/ai/ask
router.post("/ask", async (req: Request, res: Response): Promise<void> => {
  try {
    const parse = askAiSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid prompt" });
      return;
    }

    const { prompt, channelId, conversationId } = parse.data;

    const result = await processOrbitBotCommand(`/ask ${prompt}`, {
      channelId,
      conversationId,
      userName: req.user!.displayName,
    });

    res.json({ reply: result.replyContent });
  } catch (error) {
    console.error("AI route error:", error);
    res.status(500).json({ error: "Failed to process AI query" });
  }
});

// POST /api/ai/summarize
router.post("/summarize", async (req: Request, res: Response): Promise<void> => {
  try {
    const { channelId, conversationId } = req.body;

    const result = await processOrbitBotCommand("/summarize", {
      channelId,
      conversationId,
      userName: req.user!.displayName,
    });

    res.json({ summary: result.replyContent });
  } catch (error) {
    console.error("AI summarize error:", error);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

export default router;

