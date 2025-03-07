"use client";
import React, { useState, useRef, useEffect } from "react";
import { getCookie } from 'cookies-next';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AiFillLike, AiFillDislike, AiOutlineComment } from 'react-icons/ai';

interface Message {
  sender: "message" | "llm" | "loading";
  message: string;
  chatId?: string;
  comment?: string;
  generationTime?: any;
  suggestedAnswer?: string;
}

const ChatPage = () => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeComment, setActiveComment] = useState<number | null>(null);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Record<number, boolean>>({});
  const [modelName, setModelName] = useState("llama3.2:1b");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatboxRef = useRef<HTMLDivElement | null>(null);

  const formatMessage = (message: string) => {
    // Split the message into code and non-code parts
    const parts = message.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        // Extract language and code
        const match = part.match(/```(\w+)?\s*([\s\S]*?)```/);
        if (!match) return part;
        
        const language = match[1] || 'plaintext';
        const code = match[2];
        
        return (
          <div key={index} className="relative group">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                className="bg-gray-700 hover:bg-gray-600 text-xs px-2 py-1 rounded"
                onClick={() => navigator.clipboard.writeText(code)}
              >
                Copy
              </button>
            </div>
            <pre className="bg-gray-900 rounded-lg my-4 p-4 overflow-x-auto">
              <div className="absolute top-0 left-2 text-xs text-gray-500 px-2 py-1">
                {language}
              </div>
              <code className="block pt-6 font-mono text-sm text-blue-300">
                {code.split('\n').map((line, i) => (
                  <div key={i} className="relative group/line hover:bg-gray-800">
                    <span className="inline-block w-8 text-gray-600 select-none">
                      {i + 1}
                    </span>
                    <span className="text-gray-200">
                      {line || '\n'}
                    </span>
                  </div>
                ))}
              </code>
            </pre>
          </div>
        );
      }
      // Handle normal text with potential inline code
      return (
        <span key={index} className="whitespace-pre-wrap">
          {part.split(/(`[^`]+`)/g).map((text, i) => {
            if (text.startsWith('`') && text.endsWith('`')) {
              return (
                <code key={i} className="bg-gray-800 px-1 rounded font-mono text-blue-300">
                  {text.slice(1, -1)}
                </code>
              );
            }
            return text;
          })}
        </span>
      );
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const textarea = textareaRef.current;
    if (textarea) {
      const newMessage = textarea.value.trim();
      if (newMessage) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "message", message: newMessage },
        ]);
        textarea.value = "";
        textarea.style.height = "auto";

        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "loading", message: "Generating response..." },
        ]);

        try {
          setLoading(true);
          const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/chatWithLLM`;
          const response = await axios.post(URL, { query: newMessage, uid: getCookie('JWT'), modelName });
          const llmResponse = response.data.llm_response;
          const chatId = response.data.chatId;
          const suggestedAnswer = response.data.suggestedAnswer; // new field

          setMessages((prevMessages) => {
            const updatedMessages = prevMessages.filter(msg => msg.sender !== "loading");
            return [
              ...updatedMessages,
              { 
                sender: "llm", 
                message: llmResponse, 
                chatId, 
                generationTime: response.data.generationTime,
                suggestedAnswer 
              },
            ];
          });
        } catch (error) {
          console.error('Error fetching LLM response:', error);
          setMessages((prevMessages) => [
            ...prevMessages,
            { sender: "llm", message: "An error occurred. Please try again." }
          ]);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handleInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  };

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setModelName(event.target.value);
  };

  const handleFeedback = async (chatId: string, comments: number) => {
    const URL = `${process.env.NEXT_PUBLIC_LLM_API}/chatcomments?chatId=${chatId}&comment=${comments}`;
    try {
      await axios.get(URL);
      toast.success(comments === 1 ? "Liked!" : "Disliked!");
    } catch (error) {
      console.error("Error sending feedback:", error);
      toast.error("An error occurred while sending feedback.");
    }
  };

  const handleComment = (index: number) => {
    setActiveComment(activeComment === index ? null : index);
  };

  const submitComment = async (index: number, comment: string, chatId?: string) => {
    if (!chatId) {
      console.error("ChatId is undefined");
      return;
    }

    const URL = `${process.env.NEXT_PUBLIC_LLM_API}/chatcomments?chatId=${chatId}&comment=-1&userInput=${encodeURIComponent(comment)}`;
    try {
      await axios.get(URL);
      setMessages((prevMessages) => {
        const newMessages = [...prevMessages];
        newMessages[index] = { ...newMessages[index], comment };
        return newMessages;
      });
      setActiveComment(null);
      toast.success("Comment submitted successfully!");
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error("An error occurred while submitting the comment.");
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
        <div className="absolute top-4 left-4">
          <select
            value={modelName}
            onChange={handleModelChange}
            className="bg-black text-white outline-none w-[150px] p-2 rounded-xl cursor-pointer"
          >
            <option value="llama3.2:1b">llama3.2:1b</option>
            <option value="llama3.2:3b">llama3.2:3b</option>
            <option value="llama3.1:8b">llama3.1:8b</option>
            <option value="qwen2.5:latest">qwen2.5:7b</option>
            <option value="deepseek-r1:1.5b">deepseek-r1:1.5b</option>
            <option value="qwen2.5:1.5b">qwen2.5:1.5b</option>
          </select>
        </div>

        {messages.length === 0 ? (
          <div className="w-full min-h-screen flex flex-col items-center justify-center">
            <h1 className="text-3xl text-white font-Poppins text-center py-2 animate-fadeIn">
              Welcome to Phind Chat
            </h1>
            <h2 className="text-2xl text-tone3 font-Poppins animate-fadeInDelay">
              Ask your queries!
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
                className={`chat flex ${msg.sender === "llm" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`message rounded-xl px-4 text-white font-Montserrat ${
                    msg.sender === "message" ? "bg-blue-500" : "bg-tone7"
                  } animate-fadeIn max-w-[80%]`}
                >
                  {msg.sender === "loading" ? (
                    <div className="flex items-center">
                      <span className="loader mr-2"></span>
                      <p>{msg.message}</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl">
                      {formatMessage(msg.message)}
                      {msg.suggestedAnswer && (
                        <div className="mt-4">
                          <button
                            onClick={() =>
                              setExpandedSuggestions(prev => ({
                                ...prev,
                                [index]: !prev[index],
                              }))
                            }
                            className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded mb-2"
                          >
                            {expandedSuggestions[index]
                              ? "Hide Suggested Answer"
                              : "Show Suggested Answer"}
                          </button>
                          {expandedSuggestions[index] && (
                            <div className="p-2 bg-gray-800 rounded">
                              <strong>Suggested Answer:</strong>
                              <div>{formatMessage(msg.suggestedAnswer)}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {msg.sender === "llm" && msg.chatId && (
                    <div className="flex justify-end gap-3 py-3">
                      <button
                        className="like-btn"
                        onClick={() => handleFeedback(msg.chatId as string, 1)}
                      >
                        <AiFillLike size={20} />
                      </button>
                      <button
                        className="dislike-btn"
                        onClick={() => handleFeedback(msg.chatId as string, 0)}
                      >
                        <AiFillDislike size={20} />
                      </button>
                      <button
                        className="comment-btn"
                        onClick={() => handleComment(index)}
                      >
                        <AiOutlineComment size={20} />
                      </button>
                      <p className="text-xs py-2 text-gray-400 text-right">
                        {msg.generationTime} s
                      </p>
                    </div>
                  )}

                  {activeComment === index && msg.sender === "llm" && (
                    <div className="comment-input mt-2">
                      <textarea
                        className="w-full p-2 rounded bg-gray-700 text-black"
                        placeholder="Add a comment..."
                        rows={2}
                      ></textarea>
                      <button
                        className="mt-2 bg-blue-500 text-white px-3 py-1 rounded"
                        onClick={() => {
                          const commentText = (document.querySelector('.comment-input textarea') as HTMLTextAreaElement).value;
                          submitComment(index, commentText, msg.chatId);
                        }}
                      >
                        Submit Comment
                      </button>
                    </div>
                  )}

                  {msg.comment && msg.sender === "llm" && (
                    <div className="comment my-2 p-2 bg-gray-600 rounded">
                      <strong>Comment:</strong> {msg.comment}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <form className="flex justify-center items-center w-full" onSubmit={handleSubmit}>
          <div className="absolute bottom-3 flex flex-row items-center justify-center w-2/3 rounded-3xl text-textTone1 bg-[#2E2E2F] overflow-hidden">
            <textarea
              className="noscroll w-full h-full bg-[#2E2E2F] resize-none px-4 p-4 outline-none focus:outline-none"
              name="query"
              id="query"
              placeholder="Ask Queries to Phind Chat"
              onInput={handleInput}
              ref={textareaRef}
              rows={1}
              style={{ maxHeight: "200px", overflowY: "auto" }}
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

      <ToastContainer position="bottom-right" />

      <style jsx>{`
        .loader {
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid #fff;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .like-btn,
        .dislike-btn,
        .comment-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          transition: transform 0.2s, background-color 0.2s;
        }
        .like-btn:hover,
        .dislike-btn:hover,
        .comment-btn:hover {
          transform: scale(1.2);
        }
        .like-btn:hover { background-color: rgba(0, 255, 0, 0.1); }
        .dislike-btn:hover { background-color: rgba(255, 0, 0, 0.1); }
        .comment-btn:hover { background-color: rgba(0, 0, 255, 0.1); }
      `}</style>
    </>
  );
};

export default ChatPage;
