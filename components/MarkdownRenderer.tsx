import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
}

export const MarkdownRenderer: React.FC<Props> = ({ content }) => {
  const cleanContent = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^(\s*[-–—]\s*\n)+/gm, '')
    .replace(/^\s*\|\s*\|\s*$/gm, '')
    .replace(/^[-]{3,}\s*$/gm, '')
    .trim();

  return (
    <div className="markdown-body text-slate-800 leading-relaxed prose prose-slate max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
};
