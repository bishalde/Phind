"use client";
import React, { useState, useRef, useEffect } from "react";
import { getCookie } from "cookies-next";
import axios from "axios";

interface Message {
  sender: "message" | "llm" | "loading";
  message: string;
}

const ChatPage = () => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatboxRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const textarea = textareaRef.current;
    if (textarea) {
      const userMessage = textarea.value.trim();
      if (userMessage) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "message", message: userMessage },
        ]);
        textarea.value = "";
        textarea.style.height = "auto";

        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "loading", message: "Generating response..." },
        ]);

        try {
          setLoading(true);
          const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/chatWithopenai`;
          const response = await axios.post(URL, {
            query: userMessage,
            uid: getCookie("JWT"),
          });
          const llmResponse = response.data.llm_response;

          setMessages((prevMessages) => {
            const updatedMessages = prevMessages.filter(
              (msg) => msg.sender !== "loading"
            );
            return [
              ...updatedMessages,
              { sender: "llm", message: llmResponse },
            ];
          });
        } catch (error) {
          console.error("Error fetching LLM response:", error);
          setMessages((prevMessages) => [
            ...prevMessages,
            { sender: "llm", message: "An error occurred. Please try again." },
          ]);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  };

  useEffect(() => {
    const chatbox = chatboxRef.current;
    if (chatbox) {
      chatbox.scrollTop = chatbox.scrollHeight;
    }
  }, [messages]);

  return (
    <>
      <div className="chats relative flex flex-col min-h-screen max-h-screen w-full items-center">
        {messages.length === 0 ? (
          <div className="w-full min-h-screen flex flex-col items-center justify-center">
            <h1 className="text-3xl text-white font-Poppins text-center py-2">
              Welcome to OpenAI Chat Model
            </h1>
            <h2 className="text-2xl text-tone3 font-Poppins">
              Ask your document based queries!
            </h2>
          </div>
        ) : (
          <div
            ref={chatboxRef}
            className="chatbox noscroll flex flex-col p-2 gap-4 w-[70%] max-h-[calc(100vh-100px)] overflow-y-scroll"
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`chat flex ${
                  msg.sender === "llm" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`message rounded-xl px-4 py-2 text-white font-Montserrat ${
                    msg.sender === "message" ? "bg-blue-500" : "bg-tone7"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            ))}
          </div>
        )}

        <form className="flex justify-center items-center w-full" onSubmit={handleSubmit}>
          <div className="absolute bottom-3 flex flex-row items-center justify-center w-2/3 rounded-3xl text-textTone1 bg-[#2E2E2F] overflow-hidden">
            <textarea
              className="noscroll w-full h-full bg-[#2E2E2F] resize-none px-4 p-4 outline-none focus:outline-none"
              placeholder="Ask Queries to OpenAI Chat Model"
              onInput={handleInput}
              ref={textareaRef}
              rows={1}
              style={{ maxHeight: "150px" }}
            ></textarea>
            <button
              type="submit"
              className="bg-[#666667] mx-3 px-4 py-2 rounded-3xl"
              disabled={loading}
            >
              {loading ? "Generating" : "Go"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ChatPage;
