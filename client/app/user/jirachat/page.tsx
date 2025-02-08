'use client';
import React, { useState } from 'react';
import axios from 'axios';
import { useUser } from '@/app/user/userContext';
import { getCookie } from 'cookies-next';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AiFillLike, AiFillDislike } from 'react-icons/ai';

const Page = () => {
    const { userData } = useUser();
    const [fileUploaded, setFileUploaded] = useState(true);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [responseData, setResponseData] = useState('');
    const [responseTimeData, setResponseTimeData] = useState('');
    const [responsechatIDData, setResponsechatIDData] = useState('');
    const [question, setQuestion] = useState('');
    const [modelName, setModelName] = useState("llama3.2:latest");
    const [generated, setGeneratedData] = useState(false);

    // Function to handle file selection
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setModelName(event.target.value);
    };

    // Function to handle file upload
    const handleFileUpload = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!selectedFile) {
            toast.error('Please select a file.');
            return;
        }

        const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/uploadjirafile`;
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('fullName', userData.fullName);

        try {
            setLoading(true);
            const response = await fetch(URL, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                toast.success(result.message);
                setSelectedFile(null); // Reset selected file
                setFileUploaded(false); // Prevent re-uploading
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            toast.error('File upload failed.');
        } finally {
            setLoading(false);
        }
    };

    // Function to handle sending a question to the backend
    const handleQuestionSubmit = async () => {
        if (!question.trim()) {
            toast.error('Please enter a question.');
            return;
        }

        try {
            setLoading(true);
            setResponseData('');
            setResponseTimeData('');
            setGeneratedData(false);
            const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/chatWithjira`;
            const requestData = {
                query: question,
                uid: getCookie('JWT'),
                modelName: modelName,
            };

            const response = await axios.post(URL, requestData);

            if (response.status === 200) {
                setResponseData(response.data.llm_response);
                setResponseTimeData(response.data.generationTime);
                setResponsechatIDData(response.data.chatId);
                setGeneratedData(true);
            } else {
                toast.error('Failed to get a response from the server.');
            }
        } catch (error) {
            console.error('Error fetching response:', error);
            toast.error('Failed to fetch the response.');
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
                {fileUploaded ? (
                    <div className="w-full flex flex-col items-center">
                        <h1 className="text-3xl my-6 text-white font-Poppins">
                            Upload your Jira XML File 📄
                        </h1>
                        <form onSubmit={handleFileUpload} className="w-1/2 flex items-center justify-center">
                            <div className="w-full border-2 border-tone3 rounded-md p-6">
                                <label
                                    htmlFor="uploadFile"
                                    className="h-full w-full flex flex-col items-center justify-center cursor-pointer"
                                >
                                    <img
                                        className="h-[35px]"
                                        src="/icons/upload.png"
                                        alt="Upload"
                                    />
                                    <p className="text-textTone1 text-xl">
                                        Drag & Drop or <span className="text-tone5">Choose</span> to upload
                                    </p>
                                    <input
                                        type="file"
                                        name="uploadFile"
                                        id="uploadFile"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </label>
                                {selectedFile && (
                                    <p className="text-textTone1 mt-2">
                                        Selected file: <span className="font-bold">{selectedFile.name}</span>
                                    </p>
                                )}
                                <button
                                    type="submit"
                                    className="w-full text-white bg-tone5 rounded-md p-3 mt-6 font-Montserrat font-medium hover:bg-tone3"
                                    disabled={loading}
                                >
                                    {loading ? 'Uploading...' : 'Upload Jira'}
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
                                className="bg-gray-800 text-white outline-none w-[150px] p-2 rounded-xl cursor-pointer"
                            >
                                <option value="llama3.2:latest" selected>llama3.2-3B</option>
                                <option value="llama3.1:latest">llama3.1-8B</option>
                            </select>
                        </div>
                        <h1 className="text-3xl my-6 text-white font-Poppins">
                            Chat With The Uploaded Jira XML File
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
                            {loading ? 'Generating...' : 'Go'}
                        </button>
                        {generated && (
                            <>
                        <h1 className="text-2xl my-3 text-white font-Poppins">
                            Response:
                        </h1>
                        <pre className="text-sm font-Poppins my-3 text-tone2 bg-gray-800 p-4 rounded-md whitespace-pre-wrap">
                            {responseData}
                        </pre>
                        
                            <div className="flex justify-end gap-3 py-3">
                                <button
                                    className="like-btn"
                                    onClick={() => handleFeedback(responsechatIDData as string, 1)}
                                >
                                    <AiFillLike size={20} />
                                </button>
                                <button
                                    className="dislike-btn"
                                    onClick={() => handleFeedback(responsechatIDData as string, 0)}
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
