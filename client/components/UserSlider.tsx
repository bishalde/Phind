'use client'
import Link from 'next/link'
import React from 'react'
import { useRouter, usePathname } from "next/navigation";
import { deleteCookie } from "cookies-next";

const menus = [
  {name:'Home',path:'/user'},
  {name:'LLM Chat',path:'/user/chats'},
  {name:'Docs Chat',path:'/user/docschat'},
  {name:'Image Chat',path:'/user/imagechat'},
  {name:'URL Chat',path:'/user/urlchat'},
  {name:'XLSX/CSV Chat',path:'/user/xlsxcsvchat'},
  {name:'SQL Chat',path:'/user/sqldbchat'},
  // {name:'JSON Chat',path:'/user/jsonchat'},
  {name:'Video Query Chat',path:'/user/videochat'},
]

const profileMenus =[
  {name:'Profile',path:'/user/profile'},
  {name:'Chat History',path:'/user/chathistory'},
  {name:'Change Password',path:'/user/changepassword'},
]

const UserSlider = () => {
  const router = useRouter();
  const pathname = usePathname(); // Hook to get the current path
  
  const handelLogout = async () => {
    deleteCookie("JWT");
    router.push("/");
  }

  return (
    <section className='relative h-full w-full flex flex-col '>
      <h1 className="absolute top-3 left-2 text-tone3 text-[20px] font-Montserrat font-semibold">
        <Link href="/">Phind.</Link>
      </h1>
      <img onClick={handelLogout} className='absolute right-2 top-3 h-[30px] w-[30px] hover:scale-110 hover:cursor-pointer' src="/icons/logout.png" alt="exit"/>

      <h3 className='text-white text-lg font-semibold font-Montserrat mt-20 p-2 px-3'>Menus</h3>
      <ul className='flex px-4 w-full flex-col gap-1 items-start justify-start'>
        {menus.map(menu => (
          <li key={menu.name} className='w-full'>
            <Link 
              href={menu.path} 
              className={`block font-Montserrat w-full px-4 py-2 text-textTone1 rounded-md
              ${pathname === menu.path ? 'bg-tone6' : 'bg-inherit hover:bg-tone6'}`}
            >
              {menu.name}
            </Link>
          </li>
        ))}
      </ul>

      <h3 className='text-white text-lg font-semibold font-Montserrat mt-5 p-2 px-3'>Profile</h3>
      <ul className='flex px-4 w-full flex-col gap-1 items-start justify-start'>
        {profileMenus.map(menu => (
          <li key={menu.name} className='w-full'>
            <Link 
              href={menu.path} 
              className={`block font-Montserrat w-full px-4 py-2 text-textTone1 rounded-md
              ${pathname === menu.path? 'bg-tone6' : 'bg-inherit hover:bg-tone6'}`}
            >
              {menu.name}
            </Link>
          </li>
        ))}
      </ul>

    </section>
  )
}

export default UserSlider
