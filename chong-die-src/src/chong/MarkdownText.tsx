import { Fragment } from "react";

/**
 * Shows the engine's breakdown text: `~~x~~` struck through, `**x**` bold.
 * Text nodes only, never HTML.
 */
export function MarkdownText({ text }: { text: string }) {
  const parts = text.split(/(~~.*?~~|\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4) {
          return (
            <s key={i} style={{ opacity: 0.6 }}>
              <MarkdownText text={part.slice(2, -2)} />
            </s>
          );
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return <b key={i}>{part.slice(2, -2)}</b>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
