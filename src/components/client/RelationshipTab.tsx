import { useState } from "react";
import { Send, Trash2, MessagesSquare } from "lucide-react";
import { addComment, deleteComment } from "@/db/repo";
import { CHANNELS, CHANNEL_LABEL } from "@/lib/constants";
import { DynIcon } from "@/components/DynIcon";
import { EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { Channel, Comment } from "@/lib/types";

const CHANNEL_ICON: Record<Channel, string> = {
  ligacao: "phone",
  whatsapp: "message-circle",
  email: "mail",
  presencial: "users",
  outros: "message-square",
};

export function RelationshipTab({
  clientId,
  comments,
}: {
  clientId: string;
  comments: Comment[];
}) {
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [body, setBody] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    addComment(clientId, channel, body);
    setBody("");
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="card space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setChannel(c.value)}
              className={`badge ${channel === c.value ? "badge-green" : "badge-gray"} cursor-pointer`}
            >
              <DynIcon name={c.icon} size={13} /> {c.label}
            </button>
          ))}
        </div>
        <textarea
          className="input min-h-20"
          placeholder="Registrar um contato ou observação de relacionamento…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex justify-end">
          <button className="btn btn-primary" disabled={!body.trim()}>
            <Send size={16} />
            Registrar
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <EmptyState
          icon={<MessagesSquare size={24} />}
          title="Sem registros de relacionamento"
          description="Anote ligações, mensagens e observações importantes do cliente."
        />
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="card flex gap-3 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                <DynIcon name={CHANNEL_ICON[c.channel]} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {CHANNEL_LABEL[c.channel]}
                  </span>
                  <span className="num text-xs text-faint">
                    {formatDate(c.created_at)}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                  {c.body}
                </p>
              </div>
              <button
                className="text-faint hover:text-danger"
                onClick={() => deleteComment(c.id)}
                title="Excluir"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
