"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { useChat } from "@ai-sdk/react";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup } from "@/components/ui/field";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { ArrowUp, Loader2, Square, Plus } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader, ChatHeaderBlock } from "@/app/parts/chat-header";

import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config";

import Image from "next/image";
import Link from "next/link";
import { UIMessage } from "ai";

type FormValues = {
  message: string;
};

const formSchema = z.object({
  message: z.string().min(1).max(2000),
});

const STORAGE_KEY = "chat-messages";

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

const loadMessagesFromStorage = (): StorageData => {
  if (typeof window === "undefined") return { messages: [], durations: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { messages: [], durations: {} };
    const parsed = JSON.parse(raw) as Partial<StorageData>;
    return {
      messages: parsed.messages ?? [],
      durations: parsed.durations ?? {},
    };
  } catch {
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (messages: UIMessage[], durations: Record<string, number>) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, durations }));
  } catch {}
};

export default function ChatPage() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const welcomeRef = useRef(false);

  const stored =
    typeof window !== "undefined"
      ? loadMessagesFromStorage()
      : { messages: [], durations: {} };

  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initialMessages,
  });

  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    try {
      setMessages(stored.messages);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isClient) return;
    saveMessagesToStorage(messages, durations);
  }, [messages, durations, isClient]);

  useEffect(() => {
    if (!isClient) return;
    if (initialMessages.length > 0) return;
    if (welcomeRef.current) return;

    const intro: UIMessage = {
      id: `welcome-${Date.now()}`,
      role: "assistant",
      parts: [
        {
          type: "text",
          text: `👋 Hello, I am **Hiteshi Sharma**!\n\nI can help you choose the right skincare products, explain ingredients in simple terms, and guide you toward glowing skin ✨\n\nWhat would you like to ask me today?`,
        },
      ],
    };

    try {
      setMessages([intro]);
      saveMessagesToStorage([intro], {});
    } catch {}

    welcomeRef.current = true;
  }, [isClient, initialMessages, setMessages]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  const onSubmit = (data: FormValues) => {
    const text = data.message.trim();
    if (!text) return;

    try {
      sendMessage({ text });
    } catch {}

    form.reset();
  };

  const clearChat = () => {
    try {
      setMessages([]);
      setDurations({});
      saveMessagesToStorage([], {});
      toast.success("Chat cleared!");
    } catch {}
  };

  return (
    <div className="flex h-screen justify-center font-sans bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100">
      <main className="w-full h-screen relative backdrop-blur-xl bg-white/10">

        {/* HEADER */}
        <div className="fixed top-0 left-0 right-0 z-50 border-b border-white/40 bg-gradient-to-r from-pink-200 via-purple-200 to-pink-200 shadow-lg backdrop-blur-xl">
          <ChatHeader>
            <ChatHeaderBlock />

            <ChatHeaderBlock className="justify-center items-center gap-3">
              <Avatar className="size-10 ring-2 ring-pink-300 shadow-md">
                <AvatarImage src="/logo.png" alt="logo" />
                <AvatarFallback>
                  <Image src="/logo.png" alt="Logo" width={36} height={36} />
                </AvatarFallback>
              </Avatar>

              <p className="tracking-tight font-semibold text-pink-700">
                {AI_NAME} — Skincare Assistant
              </p>
            </ChatHeaderBlock>

            <ChatHeaderBlock className="justify-end">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer bg-white/60 hover:bg-white/80 text-pink-700 border-pink-300"
                onClick={clearChat}
              >
                <Plus className="size-4" />
                <span className="ml-2">{CLEAR_CHAT_TEXT}</span>
              </Button>
            </ChatHeaderBlock>
          </ChatHeader>
        </div>

        {/* CHAT AREA */}
        <div className="h-screen overflow-y-auto px-5 w-full pt-[96px] pb-[170px]">
          <div className="flex flex-col items-center min-h-full">
            {isClient ? (
              <>
                <MessageWall
                  messages={messages}
                  status={status}
                  durations={durations}
                  onDurationChange={(k: string, v: number) =>
                    setDurations((d) => ({ ...d, [k]: v }))
                  }
                />

                {status === "submitted" && (
                  <div className="mt-3">
                    <Loader2 className="size-4 animate-spin text-pink-500" />
                  </div>
                )}
              </>
            ) : (
              <div className="mt-6">
                <Loader2 className="size-4 animate-spin text-pink-500" />
              </div>
            )}
          </div>
        </div>

        {/* INPUT */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-pink-100 via-purple-100 to-transparent backdrop-blur-2xl shadow-inner pt-3 pb-4 px-5">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <Controller
                  name="message"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <div className="relative">
                        <Input
                          {...field}
                          className="h-14 pl-5 pr-16 bg-white/80 backdrop-blur-xl border border-pink-200 rounded-2xl shadow-md focus:ring-pink-400 text-gray-800 placeholder:text-pink-400"
                          placeholder="Ask me anything about skincare..."
                          disabled={status === "streaming"}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              form.handleSubmit(onSubmit)();
                            }
                          }}
                        />

                        {/* SEND BTN */}
                        {(status === "ready" || status === "error") && (
                          <Button
                            type="submit"
                            size="icon"
                            disabled={!field.value?.trim()}
                            className="absolute right-3 top-2 bg-pink-500 hover:bg-pink-600 rounded-full text-white shadow"
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                        )}

                        {/* STOP BTN */}
                        {(status === "streaming" || status === "submitted") && (
                          <Button
                            size="icon"
                            onClick={() => stop()}
                            className="absolute right-3 top-2 bg-gray-500 hover:bg-gray-600 rounded-full text-white shadow"
                          >
                            <Square className="size-4" />
                          </Button>
                        )}
                      </div>
                    </Field>
                  )}
                />
              </FieldGroup>
            </form>

            <div className="text-center pt-3 text-xs text-pink-600">
              © {new Date().getFullYear()} {OWNER_NAME} · Powered by{" "}
              <Link href="https://ringel.ai/" className="underline">
                Ringel.AI
              </Link>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
