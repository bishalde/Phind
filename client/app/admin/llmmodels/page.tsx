'use client';
import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const LLMModelsPage = () => {
  const [models, setModels] = useState([]);
  const [modelName, setModelName] = useState('');
  const [modelPath, setModelPath] = useState('');
  const [modelParameter, setModelParameter] = useState('');
  const [modelSize, setModelSize] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch models from backend
  const fetchModels = async () => {
    const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/model`;
    try {
      const response = await fetch(URL);
      const data = await response.json();
      setModels(data.models);
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  // Handle adding a new model
  const handleAddModel = async (event: any) => {
    event.preventDefault();

    if (!modelName || !modelParameter || !modelSize || !modelPath) {
      toast.error('All fields are required.');
      return;
    }

    const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/model`;
    const modelData = { name: modelName,path:modelPath, parameter: modelParameter, size: modelSize };

    try {
      setLoading(true);
      const response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelData),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
        fetchModels(); // Refresh the list of models
        setModelName('');
        setModelParameter('');
        setModelPath('');
        setModelSize('');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Error adding model');
      console.error('Error adding model:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a model
  const handleDeleteModel = async (modelId: string) => {
    const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/model/${modelId}`;
    try {
      setLoading(true);
      const response = await fetch(URL, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
        fetchModels(); // Refresh the list of models
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Error deleting model');
      console.error('Error deleting model:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch models when the component mounts
  useEffect(() => {
    fetchModels();
  }, []);

  return (
    <>
      <section className="flex h-full w-full flex-col items-center justify-start overflow-hidden overflow-y-scroll">
        <ToastContainer />

        <div className="w-full flex flex-col items-center">
          <h1 className="text-3xl my-6 text-white font-Poppins">
          🤖 Manage LLM Models 🤖
          </h1>
          <form onSubmit={handleAddModel} className="w-1/2 flex flex-col gap-1 items-center">
            <div className="w-full">
              <label
                htmlFor="modelName"
                className="block text-2xl text-textTone1 font-Poppins my-2"
              >
                Model Name
              </label>
              <input
                type="text"
                id="modelName"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter model name"
              />
            </div>
            <div className="w-full">
              <label
                htmlFor="modelPath"
                className="block text-2xl text-textTone1 font-Poppins my-2"
              >
                Model Path
              </label>
              <input
                type="text"
                id="modelPath"
                value={modelPath}
                onChange={(e) => setModelPath(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter model path"
              />
            </div>
            <div className="w-full">
              <label
                htmlFor="modelParameter"
                className="block text-2xl text-textTone1 font-Poppins my-2"
              >
                Model Parameter
              </label>
              <input
                type="text"
                id="modelParameter"
                value={modelParameter}
                onChange={(e) => setModelParameter(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter model parameter"
              />
            </div>
            <div className="w-full">
              <label
                htmlFor="modelSize"
                className="block text-2xl text-textTone1 font-Poppins my-2"
              >
                Model Size
              </label>
              <input
                type="text"
                id="modelSize"
                value={modelSize}
                onChange={(e) => setModelSize(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter model size"
              />
            </div>
            <button
              type="submit"
              className="w-1/3 text-white bg-tone5 rounded-md my-2 p-3 font-Montserrat font-medium hover:bg-tone3"
              disabled={loading}
            >
              {loading ? 'Adding Model...' : 'Add Model'}
            </button>
          </form>
        </div>

        <div className="w-full h-full p-6">
          <h1 className="text-3xl my-4 text-white font-Poppins">
            LLM Models
          </h1>
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-6 py-3 w-[100px] text-white bg-tone2 font-Montserrat font-medium text-sm">
                  S.No
                </th>
                <th className="px-6 py-3 text-white bg-tone2 font-Montserrat font-medium text-sm tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-white bg-tone2 font-Montserrat font-medium text-sm tracking-wider">
                  Path
                </th>
                <th className="px-6 py-3 text-white bg-tone2 font-Montserrat font-medium text-sm tracking-wider">
                  Parameter [Billion]
                </th>
                <th className="px-6 py-3 text-white bg-tone2 font-Montserrat font-medium text-sm tracking-wider">
                  Size [Gb]
                </th>
                <th className="px-6 py-3 text-white bg-tone2 font-Montserrat font-medium text-sm tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {models.length > 0 ? (
                models.map((model, index) => (
                  <tr key={model._id}>
                    <td className="px-6 py-3 whitespace-nowrap text-lg text-textTone1 text-center">
                      {index + 1}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-lg text-textTone1 text-center">
                      {model.name}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-lg text-textTone1 text-center">
                      {model.path}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-lg text-textTone1 text-center">
                      {model.parameter}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-lg text-textTone1 text-center">
                      {model.size}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-lg text-textTone1 text-center">
                      <button
                        onClick={() => handleDeleteModel(model._id)}
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
                  <td colSpan="5" className="px-6 py-4 whitespace-nowrap text-lg text-textTone1 text-center">
                    No models available.
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

export default LLMModelsPage;
