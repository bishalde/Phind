'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const Page = () => {
  const [embeddingModelList, setEmbeddingModelList] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    embeddingModelName: null,
    embeddingModelParameters: null,
    embeddingModelchunkSize: null,
    embeddingModelchunkOverlap: null,
  });


  const fetchEmbeddingModels = async () => {
    const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/embeddingmodel`;
    try {
      const response = await fetch(URL);
      const data = await response.json();
      console.log('Embedding Models:', data.models);
      setEmbeddingModelList(data.models);
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };



  // Handle form submission
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/embeddingmodel`;
      const response = await axios.post(URL, formData);
      toast.success('Embedding Model added successfully!');
      fetchEmbeddingModels(); 
    } catch (error: any) {
      toast.error(`Error: ${error.response?.data?.error || 'Something went wrong'}`);
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteEmbeddingModel = async (embeddingModelId: string) => {
      const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/embeddingmodel/${embeddingModelId}`;
      try {
        setLoading(true);
        const response = await fetch(URL, {
          method: 'DELETE',
        });
  
        const result = await response.json();
  
        if (response.ok) {
          toast.success(result.message);
          fetchEmbeddingModels(); // Refresh the list of models
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        toast.error('Error deleting embedding model');
        console.error('Error deleting embedding model:', error);
      } finally {
        setLoading(false);
      }
    };

  // Fetch embeddings when the component mounts
  useEffect(() => {
    fetchEmbeddingModels(); // Fetch the embeddings on mount
  }, []);

  return (
    <section className="flex h-full w-full flex-col items-center justify-start overflow-hidden overflow-y-scroll">
      <ToastContainer/>
      
      <div className="w-full flex flex-col items-center">
        <h1 className="text-3xl my-4 text-white font-Poppins">
        🔗Manage Embedding Models🔗
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="w-full mt-5 flex flex-col gap-6 px-6 justify-center items-center">
        
        <div className="w-1/2">
          <label
            htmlFor="embeddingModelName"
            className="block text-xl text-textTone1 font-Poppins my-2"
          >
            Embedding Model Name
          </label>
          <input
            type="text"
            name="embeddingModelName"
            id="embeddingModelName"
            value={formData.embeddingModelName || ""} 
            onChange={(e) => setFormData({ ...formData, embeddingModelName: e.target.value })}
            placeholder="Enter Embedding Model Name"
            className="w-full p-2 border rounded-md"
            required
             
          />
        </div>


        <div className="w-1/2">
          <label
            htmlFor="embeddingModelParameters"
            className="block text-xl text-textTone1 font-Poppins my-2"
          >
            Embedding Model Paramater
          </label>
          <input
            type="number"
            name="embeddingModelParameters"
            id="embeddingModelParameters"
            value={formData.embeddingModelParameters || ""} 
            onChange={(e) => setFormData({ ...formData, embeddingModelParameters: e.target.value })}
            placeholder="Enter Embedding Model Parameter"
            className="w-full p-2 border rounded-md"
            required
             
          />
        </div>


        <div className="w-1/2">
          <label
            htmlFor="embeddingModelchunkSize"
            className="block text-xl text-textTone1 font-Poppins my-2"
          >
            Embedding Chunk Size
          </label>
          <input
            type="number"
            name="embeddingModelchunkSize"
            id="embeddingModelchunkSize"
            value={formData.embeddingModelchunkSize || ""}
            onChange={(e) => setFormData({ ...formData, embeddingModelchunkSize: e.target.value })}
            placeholder="Enter Chunk Size For Embedding"
            className="w-full p-2 border rounded-md"
            required

          />
        </div>
        
        <div className="w-1/2">
          <label
            htmlFor="embeddingModelchunkOverlap"
            className="block text-xl text-textTone1 font-Poppins my-2"
          >
            Embedding Chunk Overlap
          </label>
          <input
            type="number"
            name="embeddingModelchunkOverlap"
            id="embeddingModelchunkOverlap"
            value={formData.embeddingModelchunkOverlap || ""}
            onChange={(e) => setFormData({ ...formData, embeddingModelchunkOverlap: e.target.value })}
            placeholder="Enter Chunk Overlap For Embedding"
            className="w-full p-2 border rounded-md"
            required
            
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`w-[300px] text-white text-lg ${loading ? 'bg-gray-400' : 'bg-tone5 hover:bg-tone3'} rounded-md p-2 font-Montserrat font-medium`}
        >
          {loading ? 'Saving Embedding Model Data...' : 'Save Embedding Model Data'}
        </button>
      </form>

      {/* Table for displaying fetched embeddings */}
      <div className="w-full h-full p-6 noscroll overflow-x-scroll ">
        <h1 className="text-3xl my-4 text-white font-Poppins">
          Existing Embedding Models
        </h1>
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-2 py-3 w-[100px] text-white bg-tone2 font-Montserrat font-medium text-xs">S.No</th>
              <th className="px-2 py-3 text-white bg-tone2 font-Montserrat font-medium text-xs tracking-wider">Model</th>
              <th className="px-2 py-3 text-white bg-tone2 font-Montserrat font-medium text-xs tracking-wider">Parameter [Million]</th>
              <th className="px-2 py-3 text-white bg-tone2 font-Montserrat font-medium text-xs tracking-wider">Chunk Size</th>
              <th className="px-2 py-3 text-white bg-tone2 font-Montserrat font-medium text-xs tracking-wider">Created Overlap</th>
              <th className="px-2 py-3 text-white bg-tone2 font-Montserrat font-medium text-xs tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {embeddingModelList.length > 0 ? (
              embeddingModelList.map((embedding, index) => (
                <tr key={embedding.embedding_model}>
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-textTone1 text-center">{index + 1}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-textTone1 text-center">{embedding.embeddingModelName}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-textTone1 text-center">{embedding.embeddingModelParameters}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-textTone1 text-center">{embedding.embeddingModelchunkSize}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-textTone1 text-center">{embedding.embeddingModelchunkOverlap}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-lg text-textTone1 text-center">
                      <button
                        onClick={() => handleDeleteEmbeddingModel(embedding._id)}
                        className="text-red-500 hover:text-red-700"
                        disabled={loading}
                      >
                        {loading ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-4 whitespace-nowrap text-lg text-textTone1">
                  No embeddings available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Page;
