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
  generationTime?:any;
}

const ChatPage = () => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeComment, setActiveComment] = useState<number | null>(null);
  const [modelName, setModelName] = useState("llama3.2:latest"); 
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatboxRef = useRef<HTMLDivElement | null>(null);

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
          const response = await axios.post(URL, { query: newMessage, uid: getCookie('JWT'), modelName: modelName }); // Include modelName in the request
          const llmResponse = response.data.llm_response;
          console.log(llmResponse)
          const chatId = response.data.chatId;

          setMessages((prevMessages) => {
            const updatedMessages = prevMessages.filter(msg => msg.sender !== "loading");
            return [
              ...updatedMessages,
              { sender: "llm", message: llmResponse, chatId,generationTime:response.data.generationTime },
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
      alert(comments === 1 ? "Liked!" : "Disliked!");
    } catch (error) {
      console.error("Error sending feedback:", error);
      alert("An error occurred while sending feedback.");
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
      alert("Comment submitted successfully!");
    } catch (error) {
      console.error("Error submitting comment:", error);
      alert("An error occurred while submitting the comment.");
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
        {/* Model selection dropdown */}
        <div className="absolute top-4 left-4">
          <select
            value={modelName}
            onChange={handleModelChange}
            className="bg-gray-800 text-white outline-none w-[150px] p-2 rounded-xl cursor-pointer"
          >
            <option value="llama3.2:latest" selected>llama3.2-3B</option>
            <option value="llama3.1:latest">llama3.1-8B</option>
            <option value="mistral:latest">mistral-7B</option>
          </select>
        </div>

        {messages.length === 0 ? (
          <div className="w-full min-h-screen flex flex-col items-center justify-center">
            <h1 className="text-3xl text-white font-Poppins text-center py-2 animate-fadeIn">
              Welcome to 3GPP Chat
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
                  className={`message rounded-xl px-4 text-white font-Montserrat ${msg.sender === "message" ? "bg-blue-500" : "bg-tone7"} animate-fadeIn`}
                >
                  {msg.sender === "loading" ? (
                    <div className="flex items-center">
                      <span className="loader mr-2"></span>
                      <p>{msg.message}</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl whitespace-pre-wrap">
                      {msg.message.split(/(<[^>]*>)/g).map((part, index) =>
                        part.match(/<[^>]*>/) ? (
                          <strong key={index}>{part}</strong>
                        ) : (
                          part
                        )
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
                        className="w-full p-2 rounded bg-gray-700 text-white"
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
              placeholder="Ask Queries to 3GPP Chat"
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
