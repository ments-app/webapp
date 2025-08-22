"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PostsRedirect = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to root since posts functionality isn't fully implemented
    router.replace('/');
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
        <p className="text-foreground text-lg">Redirecting...</p>
      </div>
    </div>
  );
};

export default PostsRedirect;