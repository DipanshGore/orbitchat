"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "../../../store/authStore";
import { useChatStore } from "../../../store/chatStore";
import { Sidebar } from "../../../components/layout/Sidebar";
import { Navbar } from "../../../components/layout/Navbar";
import { MessageList } from "../../../components/chat/MessageList";
import { MessageComposer } from "../../../components/chat/MessageComposer";
import { MembersPanel } from "../../../components/layout/MembersPanel";
import { MessageSummary } from "../../../types";
import { Loader2 } from "lucide-react";

export default function DirectMessagePage() {
  const params = useParams();
  const convId = params?.id as string;
  const router = useRouter();

  const { user, isLoading: isAuthLoading } = useAuthStore();
  const {
    setActiveChat,
    activeConversation,
    messages,
    isMembersPanelOpen,
    setMembersPanelOpen,
  } = useChatStore();

  const [replyingTo, setReplyingTo] = useState<MessageSummary | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    if (convId && user) {
      setActiveChat(convId, "dm");
    }
  }, [convId, user, setActiveChat]);

  if (isAuthLoading || !user) {
    return (
      <div className="h-dvh flex items-center justify-center bg-bg">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-dvh w-full max-w-[1800px] mx-auto p-0 md:p-3 flex gap-3 overflow-hidden">
      {/* Sidebar: Visible on desktop (md+), hidden on mobile inside active chat */}
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>

      {/* Main Chat Area */}
      <main className="flex-1 glass-panel flex flex-col h-full overflow-hidden relative">
        <Navbar />

        <MessageList
          messages={messages}
          onReply={(msg) => setReplyingTo(msg)}
          chatId={convId}
          chatType="dm"
        />

        <MessageComposer
          replyingTo={replyingTo}
          onClearReply={() => setReplyingTo(null)}
        />
      </main>

      {/* Partner Info Sheet / Panel */}
      {isMembersPanelOpen && (
        <>
          <div className="hidden xl:block shrink-0 h-full">
            <MembersPanel />
          </div>

          <div
            className="xl:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex justify-end"
            onClick={() => setMembersPanelOpen(false)}
          >
            <div
              className="w-full max-w-sm h-full p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <MembersPanel isMobileDrawer />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

