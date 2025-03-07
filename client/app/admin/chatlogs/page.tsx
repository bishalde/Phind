"use client";
import React, { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const LogDownloadPage = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle downloading logs
  const handleDownloadLogs = async (event: any) => {
    event.preventDefault();

    if (!startDate || !endDate) {
      toast.error("Both start and end date are required.");
      return;
    }

    const URL = `${process.env.NEXT_PUBLIC_LLM_API}/downloadlogs`;
    const logData = {
      startDate: startDate,
      endDate: endDate,
    };

    try {
      setLoading(true);
      const response = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logData),
      });

      if (response.ok) {
        // Convert response to blob
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Create a link element and trigger download
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat_logs_${startDate}_to_${endDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        // Release the URL object after download
        window.URL.revokeObjectURL(url);
        toast.success("Logs downloaded successfully.");
      } else {
        const result = await response.json();
        toast.error(result.message || "Failed to download logs.");
      }
    } catch (error) {
      toast.error("Error downloading logs.");
      console.error("Error downloading logs:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="flex h-full w-full flex-col items-center justify-start overflow-hidden overflow-y-scroll">
        <ToastContainer />
        <div className="w-full flex flex-col items-center">
          <h1 className="text-3xl my-6 text-white font-Poppins">
            Download Logs 📄
          </h1>
          <form
            onSubmit={handleDownloadLogs}
            className="w-1/2 flex flex-col gap-1 items-center"
          >
            <div className="w-full">
              <label
                htmlFor="startDate"
                className="block text-2xl text-textTone1 font-Poppins my-2"
              >
                Start Date and Time
              </label>
              <input
                type="datetime-local"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter Start Date and Time"
              />
            </div>
            <div className="w-full">
              <label
                htmlFor="endDate"
                className="block text-2xl text-textTone1 font-Poppins my-2"
              >
                End Date and Time
              </label>
              <input
                type="datetime-local"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter End Date and Time"
              />
            </div>
            <button
              type="submit"
              className="w-1/3 text-white bg-tone5 rounded-md my-2 p-3 font-Montserrat font-medium hover:bg-tone3"
              disabled={loading}
            >
              {loading ? "Downloading Logs..." : "Download Logs"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
};

export default LogDownloadPage;
