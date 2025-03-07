"use client";
import React, { useState, useEffect } from "react";
import { getCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import { PulseLoader, SyncLoader } from "react-spinners";
import { UserProvider } from "@/app/user/userContext";
import axios from "axios";
import UserSlider from "@/components/UserSlider";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getCookie("JWT");
    const URL = `${process.env.NEXT_PUBLIC_LOCAL_BACKEND_API}/verify?id=${token}`;
    if (token) {
      axios
        .get(URL)
        .then((res) => {
          setUserData(res.data);
          setLoading(false);
        })
        .catch((err) => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <section className="flex items-center justify-center h-screen bg-tone1">
        <SyncLoader color="#36d7b7" size={15} />
      </section>
    );
  }

  return (
    <UserProvider userData={userData}>
      <section className="main min-h-screen w-screen flex">
        <div className="left w-[18%] bg-gradient-to-br from-navy to-black">
          <UserSlider />
        </div>
        <div className="right w-[82%] bg-gradient-to-br from-navy to-black">{children}</div>
      </section>
    </UserProvider>
  );
}
