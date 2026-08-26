import type { ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

export function AskMarkdown({ content }: { content: string }) {
  const blocks = content.trim().split(/\n{2,}/);

  return (
    <div className="space-y-4 text-base leading-relaxed">
      {blocks.map((block, index) => {
        const heading = block.match(/^###\s+(.+)$/m);
        if (heading && block.trim().startsWith("###")) {
          const rest = block.replace(/^###\s+.+/, "").trim();
          return (
            <section key={index} className="space-y-2">
              <h3 className="text-lg">{heading[1]}</h3>
              {rest ? <BlockBody text={rest} /> : null}
            </section>
          );
        }
        return <BlockBody key={index} text={block} />;
      })}
    </div>
  );
}

function BlockBody({ text }: { text: string }) {
  const lines = text.split("\n").map((line) => line.trimEnd());
  const isList = lines.every(
    (line) => line === "" || line.startsWith("- ") || line.startsWith("* "),
  );

  if (isList) {
    return (
      <ul className="text-text list-disc space-y-1 pl-5">
        {lines
          .filter((line) => line.startsWith("- ") || line.startsWith("* "))
          .map((line, index) => (
            <li key={index}>{renderInline(line.slice(2))}</li>
          ))}
      </ul>
    );
  }

  return (
    <p className="text-text">
      {lines.map((line, index) => (
        <span key={index}>
          {index > 0 ? <br /> : null}
          {renderInline(line)}
        </span>
      ))}
    </p>
  );
}
