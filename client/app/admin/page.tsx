"use client";
import React, { useState, useEffect } from "react";
import { useUser } from "@/app/admin/userContext"; 

const Page = () => {
  const { userData } = useUser(); 
  return (
    <section className="h-full w-full flex flex-col justify-center items-center">
       <h3 className="text-white font-Poppins text-4xl"> Hello Admin <span className="text-tone5 font-semibold">{userData['fullName']}</span> !</h3>
      <h1 className="text-white text-2xl mt-4 font-poppins font-semibold">🖐🖐Welcome to the Phind.👊👊</h1>
       <h4 className="text-xl font-thin text-textTone1">Dive into the world of intelligent, offline AI conversations. Transform the way you work, learn, and create with cutting-edge technology.</h4>
    </section>
  );
};

export default Page;
