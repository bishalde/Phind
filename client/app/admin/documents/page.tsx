'use client';
import React, { useState, useEffect } from 'react';
import { useUser } from '@/app/admin/userContext'; 
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Page = () => {
  const { userData } = useUser();
  const [uploadedFiles, setUploadedFiles] = useState([]); 
  const [selectedFile, setSelectedFile] = useState(null); // To track the selected file
  const [loading, setLoading] = useState(false);

  // Function to fetch uploaded files from the backend
  const fetchUploadedFiles = async () => {
    const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/uploadfile`; // Ensure the correct route for fetching files
    try {
      const response = await fetch(URL); 
      const data = await response.json();
      setUploadedFiles(data.files); 
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
    }
  };

  // Function to handle file selection
  const handleFileChange = (event:any) => {
    setSelectedFile(event.target.files[0]);
  };

  // Function to handle file upload
  const handleFileUpload = async (event:any) => {
    event.preventDefault();
    
    if (!selectedFile) {
      toast.error('Please select a file.');
      return;
    }

    const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/uploadfile`; 
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
        fetchUploadedFiles(); // Refresh the list of files after successful upload
        setSelectedFile(null); // Reset selected file
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch the uploaded files when the component mounts
  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  //functio to handel file deletion
  const handleDelete = async (fileId:any) => {
    const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/deletefile/${fileId}`;
    try {
      const response = await fetch(URL, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
        fetchUploadedFiles(); // Refresh the list of files after successful deletion
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Error deleting file');
      console.error('Error deleting file:', error);
    }
  };

  return (
    <>
      <section className="flex h-full w-full flex-col items-center justify-start overflow-hidden overflow-y-scroll">
        <ToastContainer />

        <div className="w-full flex flex-col items-center">
          <h1 className="text-3xl my-6 text-white font-Poppins">
            Upload your Documents📄
          </h1>
          <form onSubmit={handleFileUpload} className="w-1/2 flex items-center justify-center">
            <div className="w-full border-solid border-2 border-tone3 rounded-md p-6">
              <label htmlFor="uploadFile" className="h-full w-full flex flex-col items-center justify-center">
                <img className="h-[35px]" src="/icons/upload.png" alt="upload images" />
                <p className="text-textTone1 text-xl">
                  Drag & Drop <span className="text-tone5">Choose</span> to upload
                </p>
                <input type="file" name="uploadFile" id="uploadFile" className="hidden" onChange={handleFileChange} />
              </label>
              <div className="mt-2">
                {selectedFile && (
                  <p className="text-textTone1">
                    Selected file: <span className="font-bold">{selectedFile.name}</span>
                  </p>
                )}
              </div>
              <div>
                <button 
                  type="submit" 
                  className="w-full text-white bg-tone5 rounded-md p-3 mt-6 font-Montserrat font-medium hover:bg-tone3" 
                  disabled={loading}
                >
                  {loading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="w-full h-full p-6">
          <h1 className="text-3xl my-4 text-white font-Poppins">
            Uploaded Documents
          </h1>
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-6 py-3 w-[100px] text-white bg-tone2 font-Montserrat font-medium text-sm">
                  S.No
                </th>
                <th className="px-6 py-3 text-white bg-tone2 font-Montserrat font-medium text-sm  tracking-wider">
                  File Name
                </th>
                <th className="px-6 py-3 text-white bg-tone2 font-Montserrat font-medium text-sm  tracking-wider">
                  Uploaded By
                </th>
                <th className="px-6 py-3 text-white bg-tone2 font-Montserrat font-medium text-sm  tracking-wider">
                  Uploaded date
                </th>
                <th className="px-6 py-3 text-white bg-tone2 font-Montserrat font-medium text-sm  tracking-wider">
                  Embeddings
                </th>
                <th className="px-6 py-3 text-white bg-tone2 font-Montserrat font-medium text-sm  tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {uploadedFiles.length > 0 ? (
                uploadedFiles.map((file, index) => (
                  <tr key={file._id}>
                    <td className="px-6 py-3 whitespace-nowrap text-lg text-textTone1 text-center">
                      {index + 1}
                    </td>
                    <td className=" max-w-[200px] px-6 py-3 whitespace-nowrap text-lg text-textTone1 text-center">
                      <a href={file.public_url} target="_blank" rel="noopener noreferrer">{file.filename}</a>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-lg text-textTone1 text-center">
                      {file.upload_by}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-lg text-textTone1 text-center">
                      {file.upload_date}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-lg text-textTone1 text-center">
                      {file.embeddings ? 'Available' : 'Not Generated'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-lg text-textTone1 text-center">
                    <button 
                        className="text-red-500 hover:text-red-700" 
                        onClick={() => handleDelete(file._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 whitespace-nowrap text-lg text-textTone1">
                    No files uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};

export default Page;
