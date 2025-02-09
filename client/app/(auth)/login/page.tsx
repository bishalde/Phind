'use client'
import axios from 'axios';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { setCookie, getCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import { PulseLoader, SyncLoader } from 'react-spinners'; // Import a modern loader

const Page = () => {
  const router = useRouter();
  const [userData, setUserData] = useState({
    email: '',
    password: '',
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
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/login`
    await axios
      .post(URL, userData)
      .then((res: any) => {
        if (res.status === 200) {
          setCookie('JWT', res.data.id);
          setUserData({
            email: '',
            password: '',
          });
          router.push('/'); // Redirect to home page after successful login
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
      <form onSubmit={handleSubmit} className="w-1/2 h-full flex flex-col justify-center items-center p-6">
        <h1 className="absolute top-10 left-10 text-white text-3xl font-Montserrat font-semibold">
          <Link href="/">Phind.</Link>
        </h1>
        <h1 className="text-tone3 text-4xl font-semibold font-Poppins">
          Welcome Back
        </h1>
        <h3 className="text-tone3 text-sm my-1 mb-8 font-Poppins font-light">🥳Excited to have you back!🎉</h3>
        {/* Email Input */}
        <input
          className="w-[350px] p-3 mb-2 bg-tone1 font-Montserrat font-medium text-green-500 border border-gray-500 rounded-md focus:outline-none"
          type="email"
          autoFocus
          placeholder="Email address"
          required
          name="email"
          value={userData.email}
          onChange={handleChange}
        />

        {/* Password Input */}
        <input
          className="w-[350px] p-3 mb-2 bg-tone1 font-Montserrat font-medium text-green-500 border border-gray-500 rounded-md focus:outline-none"
          type="password"
          placeholder="Password"
          required
          name="password"
          value={userData.password}
          onChange={handleChange}
        />

        <Link href="/register" className="text-white my-2">
          New here.? <span className="text-tone3">Register</span>
        </Link>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-[350px] my-4 text-white bg-tone2 hover:bg-slate-500 font-semibold py-3 rounded-md transition duration-200"
        >
          Log in
        </button>
      </form>
    </section>
  );
};

export default Page;
