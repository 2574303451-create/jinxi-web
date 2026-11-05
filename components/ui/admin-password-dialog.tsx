"use client";

import { useEffect, useId, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Modal } from "./modal";

export function AdminPasswordDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void | Promise<void>;
  title: string;
  description: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const id = useId();
  useEffect(() => {
    if (!isOpen) {
      setPassword("");
      setError("");
    }
  }, [isOpen]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (!password.trim()) {
      setError("请输入管理密码");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onConfirm(password);
      setPassword("");
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "操作失败，请重试。");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) onClose();
      }}
      title={title}
      legacy={false}
    >
      <form
        className="paper-form admin-verify"
        onSubmit={submit}
        aria-busy={loading}
      >
        <span className="paper-tag yellow">
          <ShieldCheck size={16} /> 管理员操作
        </span>
        <p className="paper-muted">{description}</p>
        <label className="paper-label" htmlFor={id}>
          管理密码
        </label>
        <input
          id={id}
          className="paper-input"
          type="password"
          autoComplete="off"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={loading}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error && (
          <p role="alert" id={`${id}-error`} className="paper-notice error">
            {error}
          </p>
        )}
        <div className="paper-form-actions">
          <button
            className="paper-button"
            type="button"
            disabled={loading}
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="paper-button yellow"
            type="submit"
            disabled={loading || !password.trim()}
          >
            {loading ? "处理中…" : "确认操作"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
