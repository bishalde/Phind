'use client';
import React, { useState, useEffect } from 'react';
import { useUser } from '@/app/user/userContext'; 
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Page = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]); 

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

  // Fetch the uploaded files when the component mounts
  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  return (
    <>
      <section className="flex h-full w-full flex-col items-center justify-start overflow-hidden overflow-y-scroll">
        <ToastContainer />

        <div className="w-full h-full p-6">
          <h1 className="text-3xl my-4 text-white font-Poppins">
            Available Documents
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
                  Uploaded date
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
                      {file.upload_date}
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
