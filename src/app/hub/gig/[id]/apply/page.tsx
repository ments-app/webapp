'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ApplicationStartScreen from '@/components/application/ApplicationStartScreen';

export default function GigApplyPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/gigs/${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((json) => { if (json.data?.title) setTitle(json.data.title); })
      .catch(() => {});
  }, [id]);

  return <ApplicationStartScreen type="gig" listingId={id} listingTitle={title} />;
}
