// A small safe text renderer: React escapes raw HTML instead of evaluating author HTML.
import { Fragment } from "react";
function inline(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .map((part, i) =>
      part.startsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : part.startsWith("`") ? (
        <code key={i}>{part.slice(1, -1)}</code>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    );
}
export function GuideBody({ content }: { content: string }) {
  return (
    <div className="guide-body">
      {content.split(/\r?\n/).map((line, i) =>
        /^#{1,3} /.test(line) ? (
          <h2 key={i}>{inline(line.replace(/^#{1,3} /, ""))}</h2>
        ) : /^[-*] /.test(line) ? (
          <p className="guide-bullet" key={i}>
            • {inline(line.slice(2))}
          </p>
        ) : (
          <p key={i}>{inline(line) || <br />}</p>
        ),
      )}
    </div>
  );
}
