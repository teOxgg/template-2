"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "ai/react";
import { PaperClipIcon, GlobeAltIcon, Cog6ToothIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { IconMicrophone } from "./components/Icons";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ProfileButton } from "./components/ProfileButton";
import { ChatHistory } from "./components/ChatHistory";
import { useAuth } from "@/lib/contexts/AuthContext";
import { addMessageToThread, getThreadMessages, createEmptyThread, addFirstMessage } from "@/lib/firebase/firestore";
import { Message } from "ai";

const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant.";

export default function Home() {
  const [attachmentMode, setAttachmentMode] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [systemPrompt, setSystemPrompt] = useState<string>(DEFAULT_SYSTEM_PROMPT);
  const [currentThreadId, setCurrentThreadId] = useState<string>();
  const [shouldRefreshThreads, setShouldRefreshThreads] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const [pendingUserMessage, setPendingUserMessage] = useState<Message | null>(null);
  
  const { messages, input, handleInputChange, handleSubmit: originalHandleSubmit, isLoading, setMessages } = useChat({
    api: "/api/chat",
    initialMessages: [
      {
        id: "system",
        role: "system",
        content: systemPrompt,
      },
    ],
    onFinish: async (aiMessage) => {
      if (!user) return;

      try {
        if (!currentThreadId) {
          // Should never happen as thread is created in handleSubmit
          console.error("No thread ID when receiving AI response");
          return;
        }
        
        // Store AI message immediately
        await addMessageToThread(currentThreadId, aiMessage);
        setShouldRefreshThreads(prev => !prev);
      } catch (error) {
        console.error("Error storing AI message:", error);
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    try {
      // Create the user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input.trim(),
      };

      if (!currentThreadId) {
        // Create new thread immediately for the first message
        const threadId = await createEmptyThread(user.uid);
        setCurrentThreadId(threadId);
        await addMessageToThread(threadId, userMessage);
      } else {
        // Add message to existing thread
        await addMessageToThread(currentThreadId, userMessage);
      }
      
      // Submit to get AI response
      await originalHandleSubmit(e);
      setShouldRefreshThreads(prev => !prev);
    } catch (error) {
      console.error("Error handling chat submission:", error);
    }
  };

  const loadThread = async (threadId: string | undefined) => {
    if (!threadId) {
      // Start new thread
      setCurrentThreadId(undefined);
      setMessages([
        { id: "system", role: "system", content: systemPrompt },
      ]);
      return;
    }

    if (!user) return;
    
    try {
      // Get all messages for this thread
      const threadMessages = await getThreadMessages(threadId);
      
      // Ensure messages are properly sorted by timestamp
      const sortedMessages = threadMessages.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateA.getTime() - dateB.getTime();
      });

      // Update current thread and messages
      setCurrentThreadId(threadId);
      setMessages([
        { id: "system", role: "system", content: systemPrompt },
        ...sortedMessages,
      ]);
    } catch (error) {
      console.error("Error loading thread:", error);
      // Reset to empty thread on error
      setCurrentThreadId(undefined);
      setMessages([
        { id: "system", role: "system", content: systemPrompt },
      ]);
    }
  };

  const handleNewThread = async () => {
    if (user) {
      // Create an empty thread immediately
      const threadId = await createEmptyThread(user.uid);
      setCurrentThreadId(threadId);
      setShouldRefreshThreads(prev => !prev);
      // Reset messages to just system prompt
      setMessages([
        { id: "system", role: "system", content: systemPrompt },
      ]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSystemPromptChange = () => {
    const newPrompt = textareaRef.current?.value || DEFAULT_SYSTEM_PROMPT;
    setSystemPrompt(newPrompt);
    setShowSettings(false);
    setMessages([
      { id: "system", role: "system", content: newPrompt },
    ]);
    setCurrentThreadId(undefined);
  };

  return (
    <main className="flex h-screen bg-white">
      {user && (
        <ChatHistory 
          onSelectThread={loadThread} 
          currentThreadId={currentThreadId}
          onNewThread={handleNewThread}
          shouldRefresh={shouldRefreshThreads}
          isLoading={isLoading}
        />
      )}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex-none border-b bg-white px-4">
          <div className="flex justify-between items-center h-14">
            <h1 className="text-xl font-semibold text-gray-800">What can I help with?</h1>
            <ProfileButton />
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
            {messages.filter(m => m.role !== "system").map((message, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-4 text-sm",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white">
                    AI
                  </div>
                )}
                <div className={cn(
                  "rounded-lg px-4 py-2 max-w-[85%]",
                  message.role === "user" 
                    ? "bg-blue-500 text-white" 
                    : "bg-gray-100 text-gray-800"
                )}>
                  {message.role === "assistant" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      className="prose prose-sm max-w-none [&_p]:mb-4 [&_p:last-child]:mb-0 prose-headings:text-gray-800 prose-p:text-gray-800 prose-strong:text-gray-800 prose-ul:text-gray-800 prose-ol:text-gray-800 prose-code:text-gray-800 prose-pre:bg-gray-50"
                      components={{
                        pre: ({ node, ...props }) => (
                          <div className="overflow-auto w-full my-2 bg-gray-50 p-2 rounded-lg">
                            <pre {...props} />
                          </div>
                        ),
                        code: ({ node, className, children, ...props }) => (
                          <code
                            className={cn(
                              "px-1 py-0.5 rounded-md text-gray-800 bg-gray-50",
                              className
                            )}
                            {...props}
                          >
                            {children}
                          </code>
                        ),
                        ul: ({ ...props }) => (
                          <ul className="list-disc pl-4 space-y-1 my-4 text-gray-800" {...props} />
                        ),
                        ol: ({ ...props }) => (
                          <ol className="list-decimal pl-4 space-y-1 my-4 text-gray-800" {...props} />
                        ),
                        li: ({ ...props }) => (
                          <li className="leading-relaxed text-gray-800" {...props} />
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    message.content
                  )}
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    U
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700 mb-1">
                    System Prompt
                  </label>
                  <textarea
                    ref={textareaRef}
                    id="systemPrompt"
                    defaultValue={systemPrompt}
                    rows={6}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowSettings(false)}
                    type="button"
                    className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSystemPromptChange}
                    type="button"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Form - Fixed at bottom */}
        <div className="flex-none border-t bg-white">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex items-center gap-2 rounded-lg border bg-white p-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Cog6ToothIcon className="h-6 w-6" />
                </button>
                {attachmentMode && (
                  <div className="absolute bottom-full left-0 mb-4 w-full rounded-lg border bg-white p-4 shadow-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <button className="flex items-center gap-2 rounded-lg border p-4 hover:bg-gray-50">
                        <PaperClipIcon className="h-6 w-6" />
                        <span>Upload file</span>
                      </button>
                      <button className="flex items-center gap-2 rounded-lg border p-4 hover:bg-gray-50">
                        <IconMicrophone className="h-6 w-6" />
                        <span>Voice message</span>
                      </button>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setAttachmentMode(!attachmentMode)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <PaperClipIcon className="h-6 w-6" />
                </button>
                <input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Message FreeGPT..."
                  className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-500"
                />
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700"
                >
                  <GlobeAltIcon className="h-6 w-6" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
