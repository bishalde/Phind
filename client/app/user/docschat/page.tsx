import React from 'react';
import { getCookie } from 'cookies-next';

const Page = () => {
  const uid = getCookie('JWT'); 

  return (
    <div className='h-full w-full'>
      <iframe 
        src={`http://localhost:8503?uid=${uid}`}  // Add UID as query parameter
        style={{ height: '100%', width: '100%', border: 'none' }}
        title="Docs Chat"
      />
    </div>
  );
}

export default Page;