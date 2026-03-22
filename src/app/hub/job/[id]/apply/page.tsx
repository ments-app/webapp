'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ApplicationStartScreen from '@/components/application/ApplicationStartScreen';

export default function JobApplyPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/jobs/${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((json) => { if (json.data?.title) setTitle(json.data.title); })
      .catch(() => {});
  }, [id]);

  return <ApplicationStartScreen type="job" listingId={id} listingTitle={title} />;
}
