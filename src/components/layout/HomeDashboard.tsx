"use client";

import { PostList } from "@/components/posts/PostList";

export function HomeDashboard() {

  return (
    <main className="w-full max-w-3xl mx-auto mt-6">
      {/* Main Feed */}
      <div>
        {/* TODO: Pass environmentId or filter posts by search */}
        <PostList environmentId="default" />
      </div>
    </main>
  );
}
