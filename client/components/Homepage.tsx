"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCookie } from "cookies-next";
import { PulseLoader, SyncLoader } from 'react-spinners'; 
import axios from "axios";

const Homepage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true); // State to handle loading

  useEffect(() => {
    const token = getCookie("JWT");
    const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/verify?id=${token}`;
    if (token) {
      axios.get(URL).
      then((res) => {
        if(res.data.userType === "admin") {
          router.push("/admin");
        } else {
          router.push("/user");
        }
      }).catch((err) => {
        setLoading(false);
      });
    } else {
      setLoading(false); 
    }
  }, [router]);
  if (loading) {
    // Show a modern loader while the page is checking for the cookie
    return (
      <section className="flex items-center justify-center h-screen bg-tone1">
        <SyncLoader color="#36d7b7" size={15} />
      </section>
    );
  }

  return (
    <section className="main flex h-screen w-screen">
      <div className="left w-[60%] h-full bg-gradient-to-br from-navy to-black">
        <h1 className="absolute top-10 left-10 text-white text-3xl font-Montserrat font-semibold">
          <Link href="/">Phind.</Link>
        </h1>
        <div className="flex flex-col justify-center items-start h-full p-10">
          <h1 className="text-tone3 text-5xl my-5 font-Poppins font-semibold">
          Chat with AI Locally
          </h1>
          <p className="text-white text-2xl font-Montserrat font-extralight ">
          Experience seamless, offline AI-driven conversations that simplify information and boost productivity like never before.
          </p>
        </div>
      </div>
      <div className="right w-[40%] h-full bg-tone4 flex flex-col gap-5 justify-center items-center">
        <h1 className="text-tone1 text-4xl font-Poppins font-semibold">
          Get started
        </h1>
        <div className="flex gap-5">
          <Link
            href="/login"
            className="text-white font-Montserrat bg-tone2 py-2 px-4 w-[200px] rounded-md text-center hover:bg-slate-500"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="text-white font-Montserrat bg-tone2 py-2 px-4 w-[200px] rounded-md text-center hover:bg-slate-500"
          >
            Sign up
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Homepage;
