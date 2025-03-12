'use client';
import { useEffect, useState } from 'react';

const API_URL = process.env.NODE_ENV === 'production'
  ? process.env.NEXT_PUBLIC_API_URL_PROD
  : process.env.NEXT_PUBLIC_API_URL_DEV;

export default function Home() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    fetch(API_URL || 'http://localhost:8000')
      .then(response => response.text())
      .then(data => setMessage(data))
      .catch(error => setMessage('Error connecting to FastAPI backend'));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-4xl font-bold">
        {message}
      </div>
    </main>
  );
}
