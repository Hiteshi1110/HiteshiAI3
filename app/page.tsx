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

import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME } from "@/config";

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
    const parsed = JSON.parse(raw) as Partial<StorageData> | null;
    return {
      messages: parsed?.messages ?? [],
      durations: parsed?.durations ?? {},
    };
  } catch (e) {
    console.warn("Failed to parse stored messages", e);
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (messages: UIMessage[], durations: Record<string, number>) => {
  if (typeof window === "undefined") return;
  try {
    const payload: StorageData = { messages, durations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("Failed to save messages to storage", e);
  }
};

export default function ChatPage(): JSX.Element {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const welcomeRef = useRef(false);

  const stored = typeof window !== "undefined" ? loadMessagesFromStorage() : { messages: [], durations: {} };
  const [initialMessages] = useState<UIMessage[]>(stored.messages ?? []);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initialMessages,
  });

  // hydration: set client flag and initialize durations/messages safely
  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations ?? {});
    // setMessages might be a stable function from useChat; guard it
    try {
      if (typeof setMessages === "function") {
        setMessages(stored.messages ?? []);
      }
    } catch (e) {
      console.warn("Could not set initial messages", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // persist
  useEffect(() => {
    if (!isClient) return;
    saveMessagesToStorage(messages ?? [], durations ?? {});
  }, [messages, durations, isClient]);

  // welcome intro inside chat (first message)
  useEffect(() => {
    if (!isClient) return;
    if ((initialMessages?.length ?? 0) > 0) return;
    if (welcomeRef.current) return;

    const intro: UIMessage = {
      id: `welcome-${Date.now()}`,
      role: "assistant",
      parts: [
        {
          type: "text",
          text: `Hello, I am **Hiteshi Sharma** 💗\nI'm here to help you choose the *right skincare products*, explain ingredients clearly, and solve your skin concerns with simple, science-backed advice. How can I help you glow today? ✨`,
        },
      ],
    };

    try {
      if (typeof setMessages === "function") {
        setMessages([intro]);
        saveMessagesToStorage([intro], {});
      }
    } catch (e) {
      console.warn("Failed to set welcome message", e);
    }
    welcomeRef.current = true;
  }, [isClient, initialMessages, setMessages]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  const onSubmit = (data: FormValues) => {
    // trim and guard
    const text = (data.message ?? "").trim();
    if (!text) return;
    try {
      sendMessage({ text });
    } catch (e) {
      console.warn("sendMessage error", e);
    }
    form.reset();
  };

  const clearChat = () => {
    try {
      if (typeof setMessages === "function") setMessages([]);
      setDurations({});
      saveMessagesToStorage([], {});
      toast.success("Chat cleared!");
    } catch (e) {
      console.warn("clearChat error", e);
    }
  };

  return (
    <div className="flex h-screen justify-center font-sans bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50">
      <main className="w-full h-screen relative backdrop-blur-xl bg-white/10">

        {/* HEADER */}
        <div className="fixed top-0 left-0 right-0 z-50 border-b border-white/40 bg-gradient-to-r from-pink-200 via-purple-200 to-pink-200 shadow-lg bg-opacity-70 backdrop-blur-xl">
          <ChatHeader>
            <ChatHeaderBlock />

            <ChatHeaderBlock className="justify-center items-center gap-3">
              <Avatar className="size-10 ring-2 ring-pink-300 shadow-md">
                {/* AvatarImage is okay to use with a URL string */}
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

        {/* MESSAGES AREA */}
        <div className="h-screen overflow-y-auto px-5 w-full pt-[96px] pb-[170px]">
          <div className="flex flex-col items-center min-h-full">
            {isClient ? (
              <>
                <MessageWall
                  messages={messages ?? []}
                  status={status}
                  durations={durations}
                  onDurationChange={(k: string, v: number) =>
                    setDurations((d: Record<string, number>) => ({ ...d, [k]: v }))
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

        {/* INPUT BAR */}
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
