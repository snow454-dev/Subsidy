import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
}

/**
 * Markdownテーブルの壊れた行を修復する
 * Geminiが窓口情報等を複数行に分割してしまう問題に対応
 * 
 * 例：
 *   | 1 | 補助金A | 中小企業庁 | メリット | 注目点 | 事務局 |
 *   TEL: 0570-666-376
 *   （IP電話等: 050-3133-3272）
 *   （月〜金 9:30〜17:30）
 * 
 * → | 1 | 補助金A | 中小企業庁 | メリット | 注目点 | 事務局 TEL: 0570-666-376（IP電話等: 050-3133-3272）（月〜金 9:30〜17:30） |
 */
function fixBrokenTableRows(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 現在の行がテーブル行（|で始まり|で終わる）かチェック
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // テーブルのセパレータ行（|---|---|）はそのまま
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
        result.push(line);
        continue;
      }

      // 次の行以降がテーブル行でもセパレータでもない「はみ出し行」なら結合
      let merged = trimmed;
      while (i + 1 < lines.length) {
        const nextTrimmed = lines[i + 1].trim();

        // 空行ならストップ
        if (nextTrimmed === '') break;
        // 次の行もテーブル行ならストップ（正常な次のデータ行）
        if (nextTrimmed.startsWith('|') && nextTrimmed.endsWith('|')) break;
        // テーブルセパレータならストップ
        if (/^\|[\s\-:|]+\|$/.test(nextTrimmed)) break;
        // Markdownの見出しや箇条書きならストップ
        if (/^(#{1,6}\s|[-*]\s|\d+\.\s)/.test(nextTrimmed)) break;

        // はみ出し行 → 最後のセルに結合
        // 最後の | の手前に追加
        const lastPipeIndex = merged.lastIndexOf('|');
        const beforeLastPipe = merged.substring(0, lastPipeIndex).trimEnd();
        merged = beforeLastPipe + ' ' + nextTrimmed + ' |';
        i++;
      }
      result.push(merged);
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
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

  // テーブルの壊れた行を修復
  const fixedContent = fixBrokenTableRows(cleanContent);

  return (
    <div className="markdown-body text-slate-800 leading-relaxed prose prose-slate max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {fixedContent}
      </ReactMarkdown>
    </div>
  );
};
