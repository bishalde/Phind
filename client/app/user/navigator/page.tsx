"use client";
import React, { useState, useRef, useEffect } from "react";
import axios from 'axios';

// Define the type for messages
interface Message {
  sender: "message" | "api";
  message: string;
  source?: string; // Optional source field for API messages
  page?: number;   // Optional page field for API messages
  content?: string; // Optional content field for API messages
}

const ChatPage = () => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]); // Use the Message type here

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatboxRef = useRef<HTMLDivElement | null>(null); // Ref for chatbox

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

        try {
          setLoading(true); // Set loading state to true
          const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/searchquery`;
          const response = await axios.post(URL, { query: newMessage });
          const apiResults = response.data.results;

          // Add API response to the chat
          if (apiResults.length > 0) {
            const apiMessages = apiResults.flatMap((embedding: any) =>
              embedding.results.map((result: any) => ({
                sender: "api",
                message: "",  // Message text will be empty for API messages, data comes from `source`, `page`, and `content`
                source: result.source,
                page: result.page,
                content: result.content
              }))
            );

            setMessages((prevMessages) => [
              ...prevMessages,
              ...apiMessages
            ]);
          } else {
            setMessages((prevMessages) => [
              ...prevMessages,
              { sender: "api", message: "No results found." }
            ]);
          }
        } catch (error) {
          console.error('Error fetching search results:', error);
          setMessages((prevMessages) => [
            ...prevMessages,
            { sender: "api", message: "An error occurred. Please try again." }
          ]);
        } finally {
          setLoading(false); // Reset loading state
        }
      }
    }
  };

  const handleInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto"; // Reset height
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`; // Adjust height, max height 150px
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
      <div className="chats relative flex flex-col min-h-screen max-h-screen w-full items-center">
        {messages.length === 0 ? (
          <div className="w-full min-h-screen flex flex-col items-center justify-center">
            <h1 className="text-3xl text-white font-Poppins text-center py-2 animate-fadeIn">
              Welcome to 3GPP Navigator
            </h1>
            <h2 className="text-2xl text-tone3 font-Poppins animate-fadeInDelay">
              Where Should we start?
            </h2>
          </div>
        ) : (
          <div
            ref={chatboxRef} // Attach ref to chatbox div
            className="chatbox noscroll flex flex-col p-2 gap-4 w-[70%] max-h-[calc(100vh-100px)] overflow-y-scroll"
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`chat flex ${
                  msg.sender === "api" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`message rounded-xl p-3 px-4 text-white font-Montserrat ${
                    msg.sender === "message" ? "bg-blue-500" : "bg-tone7"
                  } animate-fadeIn`}
                >
                  {msg.sender === "message" ? (
                    <p>{msg.message}</p>
                  ) : (
                    <div className="api-response">
                      <div className="w-full flex gap-5">
                      <p className="bg-textTone1 rounded-full my-2 px-4 py-1"><strong>Page:</strong> {msg.page}</p>
                      <p className="bg-[#666667] rounded-full my-2 px-4 py-1"><strong>Source:</strong> {msg.source}</p>
                      </div>
                      {/* <p><strong>Content:</strong></p>
                      <p className="bg-tone6 p-3 rounded-3xl">{msg.content}</p> */}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <form
          className="flex justify-center items-center w-full"
          onSubmit={handleSubmit}
        >
          <div className="absolute bottom-3 flex flex-row items-center justify-center w-2/3 rounded-3xl text-textTone1 bg-[#2E2E2F] overflow-hidden">
            <textarea
              className="noscroll w-full h-full bg-[#2E2E2F] resize-none px-4 p-4 outline-none focus:outline-none"
              name="query"
              id="query"
              placeholder="Message 3GPP Navigator"
              onInput={handleInput}
              ref={textareaRef}
              rows={1} // Initial row height
              style={{ maxHeight: "200px", overflowY: "auto" }}
            ></textarea>
            <button
              type="submit"
              className="bg-[#666667] mx-3 px-4 py-2 rounded-3xl"
              disabled={loading} // Disable button when loading
            >
              {loading ? (
                "Generating"// Loading spinner
              ) : (
                "Go"
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ChatPage;
