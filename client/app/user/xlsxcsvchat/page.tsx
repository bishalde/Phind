import React from 'react';

const Page = () => {
  return (
    <div className='h-full w-full'>
      <iframe 
        src="http://localhost:8501"
        style={{ height: '100%', width: '100%', border: 'none' }}
        title="XLSX & CSV Chat"
      />
    </div>
  );
}

export default Page;
