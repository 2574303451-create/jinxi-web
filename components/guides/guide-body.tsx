// Deliberate Markdown subset. React escapes every text node; author HTML never executes.
import { createElement, Fragment, type ReactNode } from "react";
import { safeMediaUrl } from "../../lib/guide-media-policy";
import { ContentImage } from "../ui/content-image";
type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph" | "code"; text: string }
  | {
      kind: "list";
      ordered: boolean;
      start: number;
      items: { text: string; children: Block[] }[];
    };
const listPattern = /^(\s*)([-+*]|\d+[.)])\s+(.+)$/;
function readList(
  lines: string[],
  start: number,
  indent: number,
): [Block, number] {
  const first = lines[start].match(listPattern)!,
    ordered = /^\d/.test(first[2]);
  const block: Extract<Block, { kind: "list" }> = {
    kind: "list",
    ordered,
    start: ordered ? parseInt(first[2], 10) : 1,
    items: [],
  };
  let i = start;
  while (i < lines.length) {
    const match = lines[i].match(listPattern);
    if (!match || match[1].length < indent) break;
    if (match[1].length > indent) {
      if (!block.items.length) break;
      const [child, end] = readList(lines, i, match[1].length);
      block.items[block.items.length - 1].children.push(child);
      i = end;
      continue;
    }
    if (/^\d/.test(match[2]) !== ordered) break;
    block.items.push({ text: match[3], children: [] });
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].match(listPattern) &&
      /^\s/.test(lines[i])
    ) {
      block.items[block.items.length - 1].text += "\n" + lines[i].trim();
      i++;
    }
  }
  return [block, i];
}
function blocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n"),
    result: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const fence = line.match(/^\s*(```|~~~)/);
    if (fence) {
      const text: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1]))
        text.push(lines[i++]);
      if (i < lines.length) i++;
      result.push({ kind: "code", text: text.join("\n") });
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+?)(?:\s+#+)?$/);
    if (heading) {
      result.push({
        kind: "heading",
        level: Math.min(6, heading[1].length + 1),
        text: heading[2],
      });
      i++;
      continue;
    }
    const list = line.match(listPattern);
    if (list) {
      const [block, end] = readList(lines, i, list[1].length);
      result.push(block);
      i = end;
      continue;
    }
    const paragraph = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|\s*(?:```|~~~))/.test(lines[i]) &&
      !listPattern.test(lines[i])
    )
      paragraph.push(lines[i++]);
    result.push({ kind: "paragraph", text: paragraph.join("\n") });
  }
  return result;
}
function inline(text: string): ReactNode[] {
  const pattern =
    /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|!\[[^\]\n]*\]\([^\s)]+\)|\[[^\]\n]+\]\([^\s)]+\))/g;
  return text.split(pattern).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    const media = part.match(/^(!?)\[([^\]]*)\]\(([^)]+)\)$/);
    if (media) {
      const url = safeMediaUrl(media[3]);
      if (!url) return <Fragment key={i}>{part}</Fragment>;
      if (media[1])
        return (
          <span className="guide-inline-image" key={i}>
            <ContentImage src={url} alt={media[2] || "攻略配图"} />
          </span>
        );
      return (
        <a
          key={i}
          href={url}
          rel="noopener noreferrer"
          target={/^https?:\/\//i.test(url) ? "_blank" : undefined}
        >
          {media[2]}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
function render(block: Block, key: number): ReactNode {
  switch (block.kind) {
    case "heading":
      return createElement("h" + block.level, { key }, inline(block.text));
    case "code":
      return (
        <pre key={key}>
          <code>{block.text}</code>
        </pre>
      );
    case "list":
      return createElement(
        block.ordered ? "ol" : "ul",
        { key, start: block.ordered ? block.start : undefined },
        block.items.map((item, i) => (
          <li key={i}>
            {inline(item.text)}
            {item.children.map(render)}
          </li>
        )),
      );
    default:
      return <p key={key}>{inline(block.text)}</p>;
  }
}
export function GuideBody({ content }: { content: string }) {
  return <div className="guide-body">{blocks(content).map(render)}</div>;
}
