"use client";

import Link from 'next/link';
import { Fragment } from 'react';

type MentionTextProps = {
  content: string;
  className?: string;
};

export function MentionText({ content, className = "" }: MentionTextProps) {
  // Parse mentions in simple @username format
  const mentionRegex = /@(\w+)/g;
  
  const parts: Array<{ type: 'text' | 'mention'; value: string; username: string }> = [];
  let lastIndex = 0;
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: content.substring(lastIndex, match.index),
        username: ''
      });
    }
    
    // Add mention - simple @username format
    parts.push({
      type: 'mention',
      value: `@${match[1]}`,
      username: match[1]
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      value: content.substring(lastIndex),
      username: ''
    });
  }
  
  // If no parts were created, just return the content as is
  if (parts.length === 0) {
    return <span className={className}>{content}</span>;
  }
  
  return (
    <span className={className}>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part.type === 'text' ? (
            <span>{part.value}</span>
          ) : (
            <Link 
              href={`/profile/${part.username}`}
              className="text-primary hover:text-primary/80 font-medium hover:underline transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {part.value}
            </Link>
          )}
        </Fragment>
      ))}
    </span>
  );
}