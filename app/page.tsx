"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Plus, Square, Sparkles } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader } from "@/app/parts/chat-header";
import { ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config";
import Image from "next/image";
import Link from "next/link";

const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
});

const STORAGE_KEY = "chat-messages";

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const welcomeMessageShownRef = useRef<boolean>(false);

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
    setMessages(stored.messages);
  }, []);

  useEffect(() => {
    if (isClient) {
      saveMessagesToStorage(messages, durations);
    }
  }, [durations, messages, isClient]);

  const handleDurationChange = (key: string, duration: number) => {
    setDurations((prev) => ({ ...prev, [key]: duration }));
  };

  useEffect(() => {
    if (
      isClient &&
      initialMessages.length === 0 &&
      !welcomeMessageShownRef.current
    ) {
      const welcomeMessage: UIMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: WELCOME_MESSAGE,
          },
        ],
      };
      setMessages([welcomeMessage]);
      saveMessagesToStorage([welcomeMessage], {});
      welcomeMessageShownRef.current = true;
    }
  }, [isClient, initialMessages.length, setMessages]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    sendMessage({ text: data.message });
    form.reset();
  }

  function clearChat() {
    const newMessages: UIMessage[] = [];
    const newDurations = {};
    setMessages(newMessages);
    setDurations(newDurations);
    saveMessagesToStorage(newMessages, newDurations);
    toast.success("Chat cleared");
  }

  return (
    <div className="flex h-screen items-center justify-center font-sans bg-gradient-to-br from-black via-gray-900 to-gray-800">
      <main className="w-full h-screen relative text-white">

        {/* HEADER — GLASS + GRADIENT */}
        <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/10 bg-white/5">
          <ChatHeader>
            <ChatHeaderBlock />

            <ChatHeaderBlock className="justify-center items-center gap-2">
              <Sparkles className="text-yellow-300" />
              <p className="text-lg tracking-tight bg-gradient-to-r from-pink-400 to-yellow-300 text-transparent bg-clip-text font-semibold">
                {AI_NAME}
              </p>
            </ChatHeaderBlock>

            <ChatHeaderBlock className="justify-end">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer backdrop-blur-xl border-white/20"
                onClick={clearChat}
              >
                <Plus className="size-4" />
                {CLEAR_CHAT_TEXT}
              </Button>
            </ChatHeaderBlock>
          </ChatHeader>
        </div>

        {/* CHAT AREA */}
        <div className="h-screen overflow-y-auto px-5 py-4 w-full pt-[100px] pb-[150px]">
          <div className="flex flex-col items-center justify-end min-h-full space-y-4">

            {isClient ? (
              <>
                <MessageWall
                  messages={messages}
                  status={status}
                  durations={durations}
                  onDurationChange={handleDurationChange}
                />

                {status === "submitted" && (
                  <div className="flex justify-start max-w-3xl w-full">
                    <Loader2 className="size-5 animate-spin text-gray-400" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center max-w-2xl w-full">
                <Loader2 className="size-5 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* INPUT BAR — SEXY GLASSMORPHIC */}
        <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t border-white/10 bg-white/5">
          <div className="w-full px-5 pt-5 pb-3 flex justify-center">
            <div className="max-w-3xl w-full">
              <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Controller
                    name="message"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="chat-form-message" className="sr-only">
                          Message
                        </FieldLabel>

                        <div className="relative h-14">
                          <Input
                            {...field}
                            id="chat-form-message"
                            className="h-14 pr-14 pl-5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-gray-300 backdrop-blur-lg"
                            placeholder="Tell me your skin concerns..."
                            disabled={status === "streaming"}
                            aria-invalid={fieldState.invalid}
                            autoComplete="off"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                form.handleSubmit(onSubmit)();
                              }
                            }}
                          />

                          {/* SEND BUTTON */}
                          {(status === "ready" || status === "error") && (
                            <Button
                              className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-pink-500 to-yellow-300 text-black"
                              type="submit"
                              disabled={!field.value.trim()}
                              size="icon"
                            >
                              <ArrowUp className="size-5" />
                            </Button>
                          )}

                          {/* STOP BUTTON */}
                          {(status === "streaming" || status === "submitted") && (
                            <Button
                              className="absolute right-3 top-3 rounded-full bg-white/20 border border-white/30 backdrop-blur-xl"
                              size="icon"
                              onClick={() => {
                                stop();
                              }}
                            >
                              <Square className="size-4 text-white" />
                            </Button>
                          )}
                        </div>
                      </Field>
                    )}
                  />
                </FieldGroup>
              </form>
            </div>
          </div>

          {/* FOOTER */}
          <div className="w-full px-5 py-2 flex justify-center text-xs text-gray-400">
            © {new Date().getFullYear()} {OWNER_NAME} — Powered by{" "}
            <Link href="https://ringel.ai/" className="underline ml-1">
              Ringel AI
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

/**********************
 * LOCAL STORAGE HELPERS
 **********************/

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

function loadMessagesFromStorage(): StorageData {
  if (typeof window === "undefined")
    return { messages: [], durations: {} };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { messages: [], durations: {} };
    return JSON.parse(stored);
  } catch (error) {
    return { messages: [], durations: {} };
  }
}

function saveMessagesToStorage(
  messages: UIMessage[],
  durations: Record<string, number>
) {
  if (typeof window === "undefined") return;
  try {
    const data: StorageData = { messages, durations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}
