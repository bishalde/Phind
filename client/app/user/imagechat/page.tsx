'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '@/app/user/userContext';
import { getCookie } from 'cookies-next';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AiFillLike, AiFillDislike } from 'react-icons/ai';
import { ImageIcon, Upload, X } from 'lucide-react';

const Page = () => {
    const { userData } = useUser();
    const [imageUploaded, setImageUploaded] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [responseData, setResponseData] = useState('');
    const [publicUrl, setPublicUrl] = useState('http://172.20.62.39:5000/uploadsImages/Image.png');
    const [responseTimeData, setResponseTimeData] = useState('');
    const [responsechatIDData, setResponsechatIDData] = useState('');
    const [question, setQuestion] = useState('');
    const [modelName, setModelName] = useState("llama-3.2-11b-vision-preview");
    const [generated, setGeneratedData] = useState(false);

    // Handle paste events globally
    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            const items = event.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) handleImageFile(file);
                }
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, []);

    // Function to handle the image file
    const handleImageFile = (file: File) => {
        // Create preview URL
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setSelectedImage(file);
    };

    // Function to handle drag and drop
    const handleDrop = (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const files = event.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            handleImageFile(files[0]);
        } else {
            toast.error('Please drop an image file.');
        }
    };

    const handleDragOver = (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
    };

    // Function to handle file selection through input
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            handleImageFile(event.target.files[0]);
        }
    };

    const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setModelName(event.target.value);
    };

    // Function to clear selected image
    const clearSelectedImage = () => {
        setPreviewUrl(null);
        setSelectedImage(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
    };

    // Function to handle image upload
    const handleImageUpload = async () => {
        if (!selectedImage) {
            toast.error('Please select an image first.');
            return;
        }

        const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/uploadimage`;
        const formData = new FormData();
        formData.append('image', selectedImage);
        formData.append('fullName', userData.fullName);

        try {
            setLoading(true);
            const response = await fetch(URL, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                toast.success('Image uploaded successfully!');
                setImageUploaded(true);
            } else {
                toast.error(result.error);
                clearSelectedImage();
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Image upload failed.');
            clearSelectedImage();
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
            const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/chatwithimage`;
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
            toast.success(comments === 1 ? "Thanks for the like!" : "Thanks for the feedback!");
        } catch (error) {
            console.error("Error sending feedback:", error);
            toast.error("An error occurred while sending feedback.");
        }
    };

    return (
        <>
            <section className="flex h-full w-full flex-col items-center justify-start overflow-hidden overflow-y-scroll">
                <ToastContainer />
                {!imageUploaded ? (
                    <div className="w-full flex flex-col items-center">
                        <h1 className="text-3xl my-6 text-white font-Poppins">
                            Upload or Paste an Image 🖼️
                        </h1>
                        <div className="w-1/2">
                            {!previewUrl ? (
                                <div 
                                    className="border-2 border-tone3 rounded-md p-6"
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                >
                                    <label
                                        htmlFor="uploadFile"
                                        className="h-[200px] w-full flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-tone3 rounded-md"
                                    >
                                        <ImageIcon className="h-12 w-12 text-tone5 mb-2" />
                                        <p className="text-textTone1 text-xl text-center">
                                            Drag & Drop, Paste, or <span className="text-tone5">Choose</span> an image
                                        </p>
                                        <p className="text-textTone1 text-sm mt-2">
                                            You can also paste an image using Ctrl+V
                                        </p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            name="uploadFile"
                                            id="uploadFile"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                </div>
                            ) : (
                                <div className="border-2 border-tone3 rounded-md p-6">
                                    <div className="relative">
                                        <button
                                            onClick={clearSelectedImage}
                                            className="absolute top-2 right-2 p-1 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
                                        >
                                            <X className="h-5 w-5 text-white" />
                                        </button>
                                        <img 
                                            src={previewUrl} 
                                            alt="Preview" 
                                            className="w-full rounded-lg shadow-lg"
                                        />
                                    </div>
                                    <div className="mt-4 flex justify-center">
                                        <button
                                            onClick={handleImageUpload}
                                            disabled={loading}
                                            className="px-8 py-3 bg-tone5 text-white rounded-md hover:bg-tone3 transition-colors flex items-center gap-2"
                                        >
                                            {loading ? (
                                                'Uploading...'
                                            ) : (
                                                <>
                                                    <Upload className="h-5 w-5" />
                                                    Upload Image
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-[90%] h-full py-10 flex flex-col relative">
                        <div className="absolute top-2 left-[-50px]">
                            <select
                                value={modelName}
                                onChange={handleModelChange}
                                className="bg-black text-white outline-none w-[200px] p-2 rounded-xl cursor-pointer"
                            >
                                <option value="llama-3.2-11b-vision-preview">llama-3.2:11b-vision</option>
                            </select>
                        </div>
                        
                        <div className="flex items-start gap-4">
                            {previewUrl && (
                                <div className="w-1/3 my-6">
                                    <a href={publicUrl} target='_blank'>
                                    <img 
                                        src={previewUrl} 
                                        alt="Uploaded preview" 
                                        className="w-full rounded-lg shadow-lg"
                                    />
                                    </a>
                                </div>
                            )}
                            <div className="flex-1">
                                <h1 className="text-3xl my-6 text-white font-Poppins">
                                    Chat About Your Image
                                </h1>
                                <textarea
                                    name="question"
                                    className="w-full min-h-20 p-3 rounded-md border-2 border-tone3 focus:outline-none"
                                    rows={3}
                                    placeholder="Ask a question about your image..."
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                />
                                <button
                                    className="w-[300px] text-white bg-tone5 rounded-md p-3 mt-6 font-Montserrat font-medium hover:bg-tone3 cursor-pointer"
                                    onClick={handleQuestionSubmit}
                                    disabled={loading}
                                >
                                    {loading ? 'Generating...' : 'Ask Question'}
                                </button>
                            </div>
                        </div>

                        {responseData && (
                            <>
                                <h1 className="text-2xl my-3 text-white font-Poppins">
                                    Response:
                                </h1>
                                <pre className="text-sm text-white font-mono whitespace-pre-line break-words leading-relaxed">
                                    {responseData}
                                </pre>
                            </>
                        )}
                        
                        {generated && (
                            <div className="flex justify-end gap-3 py-3">
                                <button
                                    className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                                    onClick={() => handleFeedback(responsechatIDData, 1)}
                                >
                                    <AiFillLike size={20} className="text-tone4" />
                                </button>
                                <button
                                    className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                                    onClick={() => handleFeedback(responsechatIDData, 0)}
                                >
                                    <AiFillDislike size={20} className="text-tone4" />
                                </button>
                                <p className="text-xs py-2 text-gray-400 text-right">
                                    4.5 s
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </>
    );
};

export default Page;