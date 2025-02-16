"use client";
import React, { useState } from "react";
import axios from "axios";
import { useUser } from "@/app/user/userContext";
import { getCookie } from "cookies-next";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AiFillLike, AiFillDislike } from "react-icons/ai";

const Page = () => {
  const { userData } = useUser();
  const [URLUploaded, setURLUploaded] = useState(true);
  const [selectedURL, setSelectedURL] = useState("");
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState("");
  const [responseTimeData, setResponseTimeData] = useState("");
  const [responsechatIDData, setResponsechatIDData] = useState("");
  const [question, setQuestion] = useState("");
  const [modelName, setModelName] = useState("llama3.2:1b");
  const [generated, setGeneratedData] = useState(false);

  // Function to handle URL input change
  const handleURLChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedURL(event.target.value);
  };

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setModelName(event.target.value);
  };

  // Function to handle URL upload
  const handleURLUpload = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedURL) {
      toast.error("Please provide a URL.");
      return;
    }

    const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/uploadURL`;
    const requestData = {
      url: selectedURL,
      uid: getCookie("JWT"),
      fullName: userData.fullName,
    };

    try {
      setLoading(true);
      const response = await axios.post(URL, requestData);

      if (response.status === 200) {
        toast.success(response.data.message);
        setURLUploaded(false); // Prevent re-uploading
      } else {
        toast.error(response.data.error);
      }
    } catch (error) {
      console.error("Error uploading URL:", error);
      toast.error("URL upload failed.");
    } finally {
      setLoading(false);
    }
  };

  // Function to handle sending a question to the backend
  const handleQuestionSubmit = async () => {
    if (!question.trim()) {
      toast.error("Please enter a question.");
      return;
    }

    try {
      setLoading(true);
      setResponseData("");
      setResponseTimeData("");
      setGeneratedData(false);
      const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/chatWithurl`;
      const requestData = {
        query: question,
        uid: getCookie("JWT"),
        sourceUrl: selectedURL,
        modelName: modelName,
      };

      const response = await axios.post(URL, requestData);

      if (response.status === 200) {
        setResponseData(response.data.llm_response);
        setResponseTimeData(response.data.generationTime);
        setResponsechatIDData(response.data.chatId);
        setGeneratedData(true);
      } else {
        toast.error("Failed to get a response from the server.");
      }
    } catch (error) {
      console.error("Error fetching response:", error);
      toast.error("Failed to fetch the response.");
    } finally {
      setLoading(false);
    }
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

  return (
    <>
      <section className="flex h-full w-full flex-col items-center justify-start overflow-hidden overflow-y-scroll">
        <ToastContainer />
        {URLUploaded ? (
          <div className="w-full flex flex-col items-center">
            <h1 className="text-3xl my-6 text-white font-Poppins">
              Paste Your URL Link 📎
            </h1>
            <form
              onSubmit={handleURLUpload}
              className="w-[90%] flex items-center justify-center"
            >
              <div className="w-full border-2 border-tone3 rounded-md p-6">
                <input
                  className="w-full p-3 rounded-md border-2 border-tone3 focus:outline-none"
                  placeholder="Enter the URL"
                  type="url"
                  name="url"
                  id="url"
                  value={selectedURL}
                  onChange={handleURLChange}
                  required
                />
                <button
                  type="submit"
                  className="w-full text-white bg-tone5 rounded-md p-3 mt-6 font-Montserrat font-medium hover:bg-tone3"
                  disabled={loading}
                >
                  {loading ? "Fetching..." : "Fetch URL"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="w-[90%] h-full py-10 flex flex-col relative">
            <div className="absolute top-2 left-[-50px]">
              <select
                value={modelName}
                onChange={handleModelChange}
                className="bg-black text-white outline-none w-[150px] p-2 rounded-xl cursor-pointer"
              >
                <option value="llama3.2:1b">llama3.2:1b</option>
                <option value="llama3.2:3b">llama3.2:3b</option>
                <option value="llama3.1:8b">llama3.1:8b</option>
                <option value="deepseek-r1:1.5b">deepseek-r1:1.5b</option>
                <option value="qwen2.5:1.5b">qwen2.5:1.5b</option>
              </select>
            </div>
            <h1 className="text-3xl my-6 text-white font-Poppins">
              Chat With The Provided URL
            </h1>
            <textarea
              name="question"
              className="w-full min-h-20 p-3 rounded-md border-2 border-tone3 focus:outline-none"
              rows={3}
              placeholder="Type your question here..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button
              className="w-[300px] text-white bg-tone5 rounded-md p-3 mt-6 font-Montserrat font-medium hover:bg-tone3 cursor-pointer"
              onClick={handleQuestionSubmit}
              disabled={loading}
            >
              {loading ? "Generating..." : "Go"}
            </button>
            {generated && (
              <>
                <h1 className="text-2xl my-3 text-white font-Poppins">
                  Response:
                </h1>
                <div className="relative bg-navy text-white p-4 rounded-md shadow-lg max-w-full w-full">
                  <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-white"
                    onClick={() => navigator.clipboard.writeText(responseData)}
                  >
                    📋
                  </button>
                  <div
                    className="text-sm font-mono whitespace-pre-line break-words leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: responseData.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br />") }}
                  />

                </div>
                <div className="flex justify-end gap-3 py-3">
                  <button
                    className="like-btn"
                    onClick={() =>
                      handleFeedback(responsechatIDData as string, 1)
                    }
                  >
                    <AiFillLike size={20} />
                  </button>
                  <button
                    className="dislike-btn"
                    onClick={() =>
                      handleFeedback(responsechatIDData as string, 0)
                    }
                  >
                    <AiFillDislike size={20} />
                  </button>
                  <p className="text-xs py-2 text-gray-400 text-right">
                    {responseTimeData} s
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </>
  );
};

export default Page;
