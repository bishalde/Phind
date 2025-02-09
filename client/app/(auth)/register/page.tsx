'use client';
import axios from 'axios';
import Link from "next/link";
import React, { useState,useEffect } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import { PulseLoader, SyncLoader } from 'react-spinners'; 
const Page = () => {
  const router = useRouter();
  const [user, userData] = useState({
    fullName: "",
    userType: "user",
    email: "",
    password: "",
    verificationCode: "",
  });

  const [loading, setLoading] = useState(true); // State to handle loading

  // Check if the cookie exists and redirect to the home page if so
  useEffect(() => {
    const token = getCookie('JWT');
    if (token) {
      router.push('/'); // Redirect to the home page if the cookie exists
    } else {
      setLoading(false); // Set loading to false after check
    }
  }, [router]);

  const handleChange = (e: any) => {
    userData({ ...user, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/register`
    await axios
      .post(URL, user)
      .then((res:any) => {
        if (res.status === 201) {
          toast.success(res.data.message);
          userData({
            fullName: "",
            userType: "user",
            email: "",
            password: "",
            verificationCode: "",
          })
        } else {
          toast.error(res.data.message);
        }
      })
      .catch((err) => {
        toast.error(err.response.data.message);
      });
  };

  if (loading) {
    // Show a modern loader while the page is checking for the cookie
    return (
      <section className="flex items-center justify-center h-screen bg-tone1">
        <SyncLoader color="#36d7b7" size={15} />
      </section>
    );
  }
  
  return (
    <section className="main flex flex-col items-center h-screen w-screen bg-gradient-to-br from-navy to-black">
      <ToastContainer />
      <form
        onSubmit={handleSubmit}
        className="w-1/2 h-full flex flex-col justify-center items-center p-6"
      >
        <h1 className="absolute top-10 left-10 text-white text-3xl font-Montserrat font-semibold">
          <Link href="/">Phind.</Link>
        </h1>
        <h1 className="text-tone3 text-3xl font-semibold font-Poppins">
          Create Your Account
        </h1>
        <h3 className="text-tone3 text-sm my-1 mb-8 font-Poppins font-light">
          We are very excited to have you here!
        </h3>

        {/* Full Name Input */}
        <input
          className="w-[350px] p-3 mb-2 bg-tone1 font-Montserrat font-medium text-green-500 border border-gray-500 rounded-md focus:outline-none"
          type="text"
          placeholder="Full Name"
          value={user.fullName}
          name="fullName"
          onChange={handleChange}
          required
        />

        {/* User Type Select Dropdown */}
        <select
          name="userType"
          className="w-[350px] p-3 mb-2 bg-tone1 font-Montserrat font-medium text-green-500 border border-gray-500 rounded-md focus:outline-none"
          onChange={handleChange}
          value={user.userType}
          required
        >
          <option value="user" selected>
            User
          </option>
          <option value="admin">Admin</option>
        </select>

        {/* Email Input */}
        <input
          className="w-[350px] p-3 mb-2 bg-tone1 font-Montserrat font-medium text-green-500 border border-gray-500 rounded-md focus:outline-none"
          type="email"
          placeholder="Email address"
          value={user.email}
          name="email"
          onChange={handleChange}
          required
        />

        {/* Password Input */}
        <input
          className="w-[350px] p-3 mb-2 bg-tone1 font-Montserrat font-medium text-green-500 border border-gray-500 rounded-md focus:outline-none"
          type="password"
          placeholder="Password"
          value={user.password}
          name="password"
          onChange={handleChange}
          required
        />

        {/* Verification Code Input */}
        <input
          className="w-[350px] p-3 mb-2 bg-tone1 font-Montserrat font-medium text-green-500 border border-gray-500 rounded-md focus:outline-none"
          type="password"
          placeholder="Verification Code"
          value={user.verificationCode}
          name="verificationCode"
          onChange={handleChange}
          required
        />
        <Link href="/login" className="text-white my-2">
          Already have an account? <span className="text-tone3">Login</span>
        </Link>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-[350px] my-5 text-white bg-tone2 hover:bg-slate-500 font-semibold py-3 rounded-md transition duration-200"
        >
          Sign Up
        </button>
      </form>
    </section>
  );
};

export default Page;
