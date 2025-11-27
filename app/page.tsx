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

const formSchema = z.object({
  message: z.string().min(1).max(2000),
});

const STORAGE_KEY = "chat-messages";

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

const loadMessagesFromStorage = () => {
  if (typeof window === "undefined")
    return { messages: [], durations: {} };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { messages: [], durations: {} };
    const parsed = JSON.parse(stored);
    return {
      messages: parsed.messages || [],
      durations: parsed.durations || {},
    };
  } catch {
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (
  messages: UIMessage[],
  durations: Record<string, number>
) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, durations }));
};

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const welcomeRef = useRef(false);

  const stored = loadMessagesFromStorage();
  const [initialMessages] = useState(stored.messages);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initialMessages,
  });

  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    setMessages(stored.messages);
  }, []);

  useEffect(() => {
    if (isClient) saveMessagesToStorage(messages, durations);
  }, [messages, durations, isClient]);

  // BEAUTIFUL INTRO MESSAGE (HUMAN TOUCH)
  useEffect(() => {
    if (!isClient || initialMessages.length !== 0 || welcomeRef.current) return;

    const intro: UIMessage = {
      id: `welcome-${Date.now()}`,
      role: "assistant",
      parts: [
        {
          type: "text",
          text: `Hello, I am **Hiteshi Sharma** 💗  
I'm here to help you choose the *right skincare products*, guide you through *ingredients*, and solve your *skin concerns* with science-backed clarity.  
How can I help you glow today? ✨`,
        },
      ],
    };

    setMessages([intro]);
    saveMessagesToStorage([intro], {});
    welcomeRef.current = true;
  }, [isClient, initialMessages.length, setMessages]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  const onSubmit = (data: any) => {
    sendMessage({ text: data.message });
    form.reset();
  };

  const clearChat = () => {
    setMessages([]);
    setDurations({});
    saveMessagesToStorage([], {});
    toast.success("Chat cleared!");
  };

  return (
    <div className="flex h-screen justify-center font-sans bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50">
      <main className="w-full h-screen relative backdrop-blur-xl bg-white/30">

        {/* HEADER */}
        <div className="fixed top-0 left-0 right-0 z-50 border-b border-white/40 bg-gradient-to-r from-pink-200 via-purple-200 to-pink-200 shadow-lg bg-opacity-60 backdrop-blur-xl">
          <ChatHeader>
            <ChatHeaderBlock />

            <ChatHeaderBlock className="justify-center items-center">
              <Avatar className="size-10 ring-2 ring-pink-300 shadow-md">
                <AvatarImage src="/logo.png" />
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
                {CLEAR_CHAT_TEXT}
              </Button>
            </ChatHeaderBlock>
          </ChatHeader>
        </div>

        {/* MESSAGES AREA */}
        <div className="h-screen overflow-y-auto px-5 w-full pt-[90px] pb-[150px]">
          <div className="flex flex-col items-center min-h-full">
            {isClient ? (
              <>
                <MessageWall
                  messages={messages}
                  status={status}
                  durations={durations}
                  onDurationChange={(k: string, v: number) =>
                    setDurations((d: Record<string, number>) => ({
                      ...d,
                      [k]: v,
                    }))
                  }
                />

                {status === "submitted" && (
                  <Loader2 className="size-4 animate-spin text-pink-500" />
                )}
              </>
            ) : (
              <Loader2 className="size-4 animate-spin text-pink-500" />
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
                          className="h-14 pl-5 pr-16 bg-white/70 backdrop-blur-xl border border-pink-200 rounded-2xl shadow-md focus:ring-pink-400 text-gray-700 placeholder:text-pink-400"
                          placeholder="Ask me anything about skincare..."
                          disabled={status === "streaming"}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              form.handleSubmit(onSubmit)();
                            }
                          }}
                        />

                        {/* Send Button */}
                        {(status === "ready" || status === "error") && (
                          <Button
                            type="submit"
                            size="icon"
                            disabled={!field.value.trim()}
                            className="absolute right-3 top-2 bg-pink-500 hover:bg-pink-600 rounded-full text-white shadow"
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                        )}

                        {/* Stop Button */}
                        {(status === "streaming" || status === "submitted") && (
                          <Button
                            size="icon"
                            onClick={stop}
                            className="absolute right-3 top-2 bg
