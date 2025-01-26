"use client";

import { useEffect, useState } from "react";
import { ChatThread, getUserThreads, updateExistingThreadLabels } from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/contexts/AuthContext";
import { ChatBubbleLeftIcon, MagnifyingGlassIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface ChatHistoryProps {
  onSelectThread: (threadId: string | undefined) => void;
  currentThreadId?: string;
  onNewThread: () => void;
  shouldRefresh?: boolean;
  isLoading?: boolean;
}

export function ChatHistory({ onSelectThread, currentThreadId, onNewThread, shouldRefresh, isLoading }: ChatHistoryProps) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  const loadThreads = async () => {
    if (user) {
      try {
        // First, update any existing threads that might need label updates
        await updateExistingThreadLabels(user.uid);
        // Then load all threads
        const userThreads = await getUserThreads(user.uid);
        // Ensure all threads have a label
        const validThreads = userThreads.map(thread => ({
          ...thread,
          label: thread.label || thread.title || "Untitled Thread",
          lastMessage: thread.lastMessage || ""
        }));
        setThreads(validThreads);
      } catch (error) {
        console.error("Error loading chat threads:", error);
      }
    }
  };

  useEffect(() => {
    loadThreads();
  }, [user, shouldRefresh]); // Reload when user changes or shouldRefresh changes

  const filteredThreads = threads.filter(thread => {
    const searchLower = searchQuery.toLowerCase();
    const labelMatch = (thread.label || "").toLowerCase().includes(searchLower);
    const messageMatch = (thread.lastMessage || "").toLowerCase().includes(searchLower);
    return labelMatch || messageMatch;
  });

  const handleNewThread = () => {
    if (isLoading) return; // Prevent new thread while loading
    onNewThread();
    setSearchQuery(""); // Clear search when starting new thread
    setShowSearch(false); // Hide search when starting new thread
  };

  if (!user) return null;

  return (
    <div className="w-64 h-full bg-gray-50 border-r overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Chat History</h2>
          <div className="flex gap-2">
            <button
              onClick={() => !isLoading && setShowSearch(!showSearch)}
              className={cn(
                "p-1.5 rounded-lg text-gray-600",
                isLoading 
                  ? "opacity-50 cursor-not-allowed" 
                  : "hover:bg-gray-100"
              )}
              disabled={isLoading}
              title="Search conversations"
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleNewThread}
              className={cn(
                "p-1.5 rounded-lg text-gray-600",
                isLoading 
                  ? "opacity-50 cursor-not-allowed" 
                  : "hover:bg-gray-100"
              )}
              disabled={isLoading}
              title="New conversation"
            >
              <PencilSquareIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white"
              disabled={isLoading}
            />
          </div>
        )}

        <div className="space-y-2">
          {filteredThreads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => !isLoading && onSelectThread(thread.id)}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-colors",
                currentThreadId === thread.id
                  ? "bg-blue-100 text-blue-700"
                  : isLoading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-100 text-gray-700"
              )}
              disabled={isLoading}
            >
              <div className="flex items-center gap-3">
                <ChatBubbleLeftIcon className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-medium truncate">{thread.label || "Untitled Thread"}</div>
                  <div className="text-sm text-gray-500 truncate">
                    {thread.lastMessage || "No messages"}
                  </div>
                </div>
              </div>
            </button>
          ))}
          {filteredThreads.length === 0 && searchQuery && (
            <div className="text-center text-gray-500 py-4">
              No matching conversations found
            </div>
          )}
          {filteredThreads.length === 0 && !searchQuery && (
            <div className="text-center text-gray-500 py-4">
              No chat history yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 