"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, TextArea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useSendNewsletter } from "../api/newsletter-api";

type ComposeNewsletterModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ComposeNewsletterModal({ open, onClose }: ComposeNewsletterModalProps) {
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const sendMutation = useSendNewsletter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !html) return;

    sendMutation.mutate(
      { subject, html },
      {
        onSuccess: () => {
          onClose();
          setSubject("");
          setHtml("");
        },
      }
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Compose Newsletter">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Newsletter Subject"
          required
        />
        <TextArea
          label="HTML Content"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          placeholder="<h1>Hello!</h1>..."
          required
          rows={10}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose} type="button" disabled={sendMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={sendMutation.isPending}>
            Send to all active subscribers
          </Button>
        </div>
      </form>
    </Modal>
  );
}
