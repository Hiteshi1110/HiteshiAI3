"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Plus, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader, ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME } from "@/config";
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
  const welcomeMessageShown = useRef(false);

  // Load from storage
  const stored =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {
          messages: [],
          durations: {},
        }
      : { messages: [], durations: {} };

  const [durations, setDurations] = useState(stored.durations);
  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, stop, status, setMessages } = useChat({
    messages: initialMessages,
  });

  useEffect(() => {
    setIsClient(true);
    setMessages(stored.messages);
    setDurations(stored.durations);
  }, []);

  // Save
  useEffect(() => {
    if (!isClient) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        messages,
        durations,
      })
    );
  }, [messages, durations, isClient]);

  // Warm Beautiful Welcome Message
  useEffect(() => {
    if (!isClient) return;
    if (initialMessages.length === 0 && !welcomeMessageShown.current) {
      const welcome: UIMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: `👋 **Hello, I’m Hiteshi Sharma.**  
I’m here to help you with anything—whether it’s marketing strategy, career guidance, content creation, or making sense of something complex.  
Just tell me what you need, and I’ll assist you instantly.`,
          },
        ],
      };
      setMessages([welcome]);
      welcomeMessageShown.current = true;
    }
  }, [isClient]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  function onSubmit(data: any) {
    sendMessage({ text: data.message });
    form.reset();
  }

  function clearChat() {
    setMessages([]);
    setDurations({});
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Chat cleared");
  }

  return (
    <div className="flex h-screen items-center justify-center font-sans dark:bg-black">
      <main className="w-full dark:bg-black h-screen relative">

        {/* TOP HEADER */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
          <ChatHeader>
            <ChatHeaderBlock />
            <ChatHeaderBlock className="justify-center items-center space-x-2">
              <Avatar className="size-8">
                <AvatarImage src="/logo.png" />
                <AvatarFallback>
                  <Image src="/logo.png" alt="Logo" width={36} height={36} />
                </AvatarFallback>
              </Avatar>
              <p className="tracking-tight font-medium text-sm">
                Chat with {AI_NAME}
              </p>
            </ChatHeaderBlock>

            <ChatHeaderBlock className="justify-end pr-3">
              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                className="text-xs flex space-x-1"
              >
                <Plus className="size-4" />
                <span>{CLEAR_CHAT_TEXT}</span>
              </Button>
            </ChatHeaderBlock>
          </ChatHeader>
        </div>

        {/* MAIN CHAT AREA */}
        <div className="h-screen overflow-y-auto px-5 py-4 w-full pt-[90px] pb-[150px]">
          <div className="flex flex-col items-center justify-end min-h-full">

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
                  <div className="flex justify-start max-w-3xl w-full">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center max-w-2xl w-full">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* INPUT BOX */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-white/10">
          <div className="w-full px-5 pt-4 pb-3 flex justify-center">
            <div className="max-w-3xl w-full">
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Controller
                    name="message"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="sr-only">Message</FieldLabel>

                        <div className="relative">
                          <Input
                            {...field}
                            placeholder="Type your message…"
                            className="h-14 pl-5 pr-16 bg-white/10 border-white/20 text-white placeholder-white/40 rounded-2xl backdrop-blur-lg focus:ring-2 focus:ring-primary"
                            disabled={status === "streaming"}
                            autoComplete="off"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                form.handleSubmit(onSubmit)();
                              }
                            }}
                          />

                          {status === "ready" && (
                            <Button
                              className="absolute right-2 top-2 rounded-full"
                              type="submit"
                              size="icon"
                              disabled={!field.value.trim()}
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          )}

                          {(status === "streaming" ||
                            status === "submitted") && (
                            <Button
                              className="absolute right-2 top-2 rounded-full"
                              size="icon"
                              onClick={() => stop()}
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
            </div>
          </div>

          {/* FOOTER */}
          <div className="w-full text-center py-2 text-xs text-muted-foreground">
            © {new Date().getFullYear()} {OWNER_NAME} — Powered by{" "}
            <Link href="https://ringel.ai/" className="underline">
              Ringel.AI
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
