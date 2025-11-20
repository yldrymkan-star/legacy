import React from 'react';

const MarkdownRenderer = ({ content }) => {
  const renderMarkdown = (markdown) => {
    // Basic markdown rendering. For a full solution, consider a library like 'marked' or 'react-markdown'.
    let html = markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>') // h3
      .replace(/^## (.*$)/gim, '<h2>$1</h2>') // h2
      .replace(/^# (.*$)/gim, '<h1>$1</h1>') // h1
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>') // bold
      .replace(/\*(.*)\*/gim, '<em>$1</em>') // italic
      .replace(/`(.*?)`/gim, '<code>$1</code>') // inline code
      .replace(/```(\w+)?\n([\s\S]*?)\n```/gim, '<pre><code class="language-$1">$2</code></pre>') // code blocks
      .replace(/\[Citation: (.*?)\]/gim, '<cite class="block text-sm text-stone-500 dark:text-stone-400 mt-2 not-italic font-semibold">Source: $1</cite>') // Custom citation format
      .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-amber-500 hover:underline">$1</a>') // links
      .replace(/^- (.*$)/gim, '<li>$1</li>') // unordered lists
      .replace(/\n\n/g, '</p><p>') // paragraphs
      .replace(/\n/g, '<br />'); // line breaks

    // Wrap in a paragraph if it doesn't already start with a block tag
    if (!html.startsWith('<h1') && !html.startsWith('<h2') && !html.startsWith('<h3') && !html.startsWith('<pre') && !html.startsWith('<ul') && !html.startsWith('<p')) {
        html = `<p>${html}</p>`;
    }

    return html;
  };

  return (
    React.createElement(
      'div',
      {
        className: 'prose dark:prose-invert max-w-none text-stone-900 dark:text-stone-100',
        dangerouslySetInnerHTML: { __html: renderMarkdown(content) }
      }
    )
  );
};

export default MarkdownRenderer;