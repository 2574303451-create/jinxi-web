import { ArrowRight, MessageCircle } from "lucide-react";
import type { Message } from "../../types/message-wall";
import { PublicAvatar, messageDate } from "../ui/paper";

export type PublicMessageSummary = Pick<
  Message,
  "id" | "name" | "content" | "timestamp" | "category" | "isPinned"
>;

export function RibbonCard({
  item,
  duplicate,
  onOpen,
}: {
  item: PublicMessageSummary;
  duplicate: boolean;
  onOpen: (id: string) => void;
}) {
  const text = Array.from(item.content.replace(/\s+/g, " ").trim());
  return (
    <li>
      <button
        className="message-ribbon-card"
        data-ribbon-id={item.id}
        data-public-message={duplicate ? undefined : item.id}
        tabIndex={duplicate ? -1 : 0}
        onMouseDown={duplicate ? (event) => event.preventDefault() : undefined}
        onClick={() => onOpen(item.id)}
      >
        <span className="ribbon-card-top">
          <PublicAvatar name={item.name} subject={`message:${item.id}`} />
          <span>
            <strong>{item.name}</strong>
            <small>{messageDate(item.timestamp)}</small>
          </span>
          <MessageCircle size={16} aria-hidden="true" />
        </span>
        <span className="ribbon-excerpt">
          {text.slice(0, 100).join("")}
          {text.length > 100 ? "…" : ""}
        </span>
        <span className="ribbon-card-bottom">
          <span className={`paper-tag${item.isPinned ? " yellow" : ""}`}>
            {item.isPinned ? "置顶" : item.category}
          </span>
          <span>
            查看留言 <ArrowRight size={14} />
          </span>
        </span>
      </button>
    </li>
  );
}
