"use client";
import React, { useState, useRef, useEffect } from "react";
import { getCookie } from 'cookies-next';
import axios from 'axios';
import { AiFillLike, AiFillDislike } from 'react-icons/ai'; // Import icons

// Define the type for messages
interface Message {
  sender: "message" | "llm" | "loading";
  message: string;
  chatId?: string; // Optional chatId for LLM messages
  createdAt?: string; // For displaying chat history timestamps
  query?: string; // For storing the user's asked question
}

const ChatPage = () => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatboxRef = useRef<HTMLDivElement | null>(null); // Ref for chatbox

  // Fetch chat history on component load
  useEffect(() => {
    const fetchChatHistory = async () => {
      const uid = getCookie('JWT');
      if (uid) {
        try {
          const URL = `${process.env.NEXT_PUBLIC_LLM_API}/chathistory?uid=${uid}`;
          const response = await axios.get(URL);
          const chatHistory = response.data;

          // Convert chat history into the format needed for messages state
          const formattedHistory = chatHistory.map((chat: any) => ({
            sender: "llm",
            message: chat.llmGeneratedMessage,
            createdAt: chat.created_at,
            query: chat.query, // Add the user's query (asked question)
          }));

          // Set the chat history as the initial state
          setMessages(formattedHistory);
        } catch (error) {
          console.error('Error fetching chat history:', error);
        }
      }
    };

    fetchChatHistory();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const textarea = textareaRef.current;
    if (textarea) {
      const newMessage = textarea.value.trim();
      if (newMessage) {
        // Add user message to the chat
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "message", message: newMessage },
        ]);
        textarea.value = ""; // Clear the textarea
        textarea.style.height = "auto"; // Reset textarea height

        // Add loading message before API call
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "loading", message: "Generating response..." },
        ]);

        try {
          setLoading(true); // Set loading state to true
          const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/chatWithLLM`;
          const response = await axios.post(URL, { query: newMessage, uid: getCookie('JWT') });
          const llmResponse = response.data.llm_response;
          const chatId = response.data.chatId; // Capture chatId from response

          // Replace loading message with actual LLM response
          setMessages((prevMessages) => {
            // Remove the loading message and add the LLM response
            const updatedMessages = prevMessages.filter(msg => msg.sender !== "loading");
            return [
              ...updatedMessages,
              { sender: "llm", message: llmResponse, chatId, query: newMessage }, // Store chatId and query with the LLM response
            ];
          });
        } catch (error) {
          console.error('Error fetching LLM response:', error);
          setMessages((prevMessages) => [
            ...prevMessages,
            { sender: "llm", message: "An error occurred. Please try again." }
          ]);
        } finally {
          setLoading(false); // Reset loading state
        }
      }
    }
  };

  useEffect(() => {
    // Scroll to bottom whenever messages change
    const chatbox = chatboxRef.current;
    if (chatbox) {
      chatbox.scrollTop = chatbox.scrollHeight;
    }
  }, [messages]);

  return (
    <>
      <div className="chats relative flex flex-col min-h-screen max-h-screen w-full items-center ">
        <div ref={chatboxRef} className="chatbox flex flex-col p-2 gap-4 w-[70%] max-h-svh overflow-y-scroll noscroll">
          {messages.map((msg, index) => (
            <div key={index} className={`chat flex ${msg.sender === "llm" ? "justify-start" : "justify-end"}`}>
              <div className={`message rounded-xl px-4 text-white font-Montserrat ${msg.sender === "message" ? "bg-blue-500" : "bg-tone7"} animate-fadeIn`}>
                {msg.sender === "loading" ? (
                  <div className="flex items-center">
                    <span className="loader mr-2"></span> {/* Loader */}
                    <p>{msg.message}</p>
                  </div>
                ) : (
                  <>
                    {msg.query && (
                      <div className="my-3 p-2 rounded-xl bg-textTone1 text-lg">
                        <strong className="px-2 text-tone5">You :</strong> {msg.query}
                      </div>
                    )}
                    <div className="p-4 rounded-b-xl whitespace-pre-wrap">
                      {msg.message.split(/(```[a-z]*[\s\S]*?```)/g).map((part, i) =>
                        part.match(/```[a-z]*[\s\S]*?```/) ? (
                          <pre key={i} className="bg-slate-900 text-white p-2 rounded-lg overflow-x-auto">
                            <code >{part.replace(/```[a-z]*|```/g, "")}</code>
                          </pre>
                        ) : (
                          part
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ChatPage;
