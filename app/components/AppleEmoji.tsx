'use client';

import { useState } from 'react';

interface AppleEmojiProps {
  emoji: string;
  size?: number;
  className?: string;
}

function getEmojiCodePoint(emoji: string): string {
  const codePoints: string[] = [];
  for (let i = 0; i < emoji.length; i++) {
    const codePoint = emoji.codePointAt(i);
    if (codePoint !== undefined) {
      codePoints.push(codePoint.toString(16));
      if (codePoint > 0xffff) {
        i++;
      }
    }
  }
  return codePoints.filter((cp) => cp !== 'fe0f').join('-');
}

export default function AppleEmoji({ emoji, size = 18, className = '' }: AppleEmojiProps) {
  const [hasError, setHasError] = useState(false);
  const hex = getEmojiCodePoint(emoji);
  
  // CDN pública e rápida com cache global estável dos emojis Apple iOS
  const src = `https://cdn.jsdelivr.net/gh/iamcal/emoji-data@master/img-apple-64/${hex}.png`;

  if (hasError) {
    return (
      <span
        style={{ fontSize: `${size}px`, lineHeight: 1 }}
        className={`inline-block align-middle select-none ${className}`}
      >
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={emoji}
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      onError={() => setHasError(true)}
      className={`inline-block align-middle select-none pointer-events-none transition-transform flex-shrink-0 ${className}`}
    />
  );
}