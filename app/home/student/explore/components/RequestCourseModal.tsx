"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal, Button, Input, Textarea, Label } from "@/components/ui/primitives";

type RequestCourseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Course/subject the student searched for or was browsing, if any. */
  prefillCourse?: string;
};

export function RequestCourseModal({ isOpen, onClose, prefillCourse }: RequestCourseModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMessage(
      prefillCourse
        ? `I'm looking for a tutor for: ${prefillCourse}`
        : "I'm looking for a tutor for: "
    );
  }, [isOpen, prefillCourse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Fill in your name, email, and what you need — then send.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: "Tutor request from Explore",
          message: message.trim(),
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      toast.success("Got it — we'll email you the moment a tutor is available.");
      setName("");
      setEmail("");
      setMessage("");
      onClose();
    } catch {
      toast.error("Couldn't send your request — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request a tutor" size="sm">
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <p className="text-sm text-ink-500">
          Tell us who you are and what you need — we&rsquo;ll notify you the moment a matching
          tutor is available.
        </p>
        <div>
          <Label htmlFor="request-name">Your name</Label>
          <Input
            id="request-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jamie Lee"
            disabled={submitting}
          />
        </div>
        <div>
          <Label htmlFor="request-email">Email</Label>
          <Input
            id="request-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={submitting}
          />
        </div>
        <div>
          <Label htmlFor="request-message">What do you need?</Label>
          <Textarea
            id="request-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={submitting}
          />
        </div>
        <Button type="submit" variant="primary" fullWidth loading={submitting}>
          Send request
        </Button>
      </form>
    </Modal>
  );
}

export default RequestCourseModal;
