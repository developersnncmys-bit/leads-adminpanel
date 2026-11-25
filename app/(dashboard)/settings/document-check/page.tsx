'use client';

// Document Check moved to Operations — keep old links and bookmarks working.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DocumentCheckMoved() {
  const router = useRouter();
  useEffect(() => { router.replace('/operations/document-check'); }, [router]);
  return null;
}
