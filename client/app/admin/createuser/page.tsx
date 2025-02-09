"use client";
import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const LLMModelsPage = () => {
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);


  // Handle adding a new model
  const handleAddModel = async (event: any) => {
    event.preventDefault();

    if (!fullName || !password || !email ) {
      toast.error("All fields are required.");
      return;
    }

    const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/register`;
    const userData = {
      fullName: fullName,
      email: email,
      password: password,
      userType: "user",
      verificationCode: process.env.NEXT_PUBLIC_VERIFICATION,
    };

    try {
      setLoading(true);
      const response = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
        setFullName("");
        setPassword("");
        setEmail("");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Error adding user");
      console.error("Error adding user:", error);
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
            Create User 👤
          </h1>
          <form
            onSubmit={handleAddModel}
            className="w-1/2 flex flex-col gap-1 items-center"
          >
            <div className="w-full">
              <label
                htmlFor="fullName"
                className="block text-2xl text-textTone1 font-Poppins my-2"
              >
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter Full Name"
              />
            </div>
            <div className="w-full">
              <label
                htmlFor="email"
                className="block text-2xl text-textTone1 font-Poppins my-2"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter Email"
              />
            </div>
            <div className="w-full">
              <label
                htmlFor="password"
                className="block text-2xl text-textTone1 font-Poppins my-2"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter Password"
              />
            </div>
            <button
              type="submit"
              className="w-1/3 text-white bg-tone5 rounded-md my-2 p-3 font-Montserrat font-medium hover:bg-tone3"
              disabled={loading}
            >
              {loading ? "Creating User..." : "Add User"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
};

export default LLMModelsPage;
