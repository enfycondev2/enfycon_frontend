"use client";

import { useEmployeeMail } from "@/contexts/EmployeeMailContext";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { X, Send, Paperclip, Minimize2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EmployeeMailComposeModal = ({ isOpen, onClose }: ComposeModalProps) => {
  const { sendEmail, selectedEmployee } = useEmployeeMail();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!to || !subject || !body) return;
    setSending(true);

    const emailPayload = {
      message: {
        subject: subject,
        body: {
          contentType: "Text",
          content: body,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
      },
      saveToSentItems: "true",
    };

    const success = await sendEmail(emailPayload);
    if (success) {
      setTo("");
      setSubject("");
      setBody("");
      onClose();
    }
    setSending(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-none rounded-3xl shadow-2xl ring-1 ring-slate-200/50 dark:ring-slate-800/50">
        <DialogHeader className="p-6 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Compose Message
          </DialogTitle>
          <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><Minimize2 className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col">
          <div className="flex items-center px-6 py-3 border-b border-slate-50 dark:border-slate-800/50 group">
            <span className="text-xs font-bold text-slate-400 w-12 group-focus-within:text-primary transition-colors">To:</span>
            <input
              className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-800 dark:text-white placeholder:text-slate-300 placeholder:font-normal"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="flex items-center px-6 py-3 border-b border-slate-50 dark:border-slate-800/50 group">
            <span className="text-xs font-bold text-slate-400 w-12 group-focus-within:text-primary transition-colors">CC:</span>
            <span className="flex-1 text-xs text-slate-300">Add carbon copy...</span>
          </div>
          <div className="flex items-center px-6 py-3 border-b border-slate-100 dark:border-slate-800 group bg-slate-50/30">
            <span className="text-xs font-bold text-slate-400 w-12 group-focus-within:text-primary transition-colors">Sub:</span>
            <input
              className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-white placeholder:text-slate-300 placeholder:font-normal"
              placeholder="What's this about?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          
          <div className="p-1">
            <textarea
              className="w-full h-80 bg-transparent border-none outline-none text-sm p-6 leading-relaxed text-slate-700 dark:text-slate-300 custom-scrollbar resize-none placeholder:text-slate-200"
              placeholder="Write your brilliant thoughts here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 pt-2 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full"><Paperclip className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:bg-slate-100/50 rounded-full"><Trash2 className="w-5 h-5" /></Button>
          </div>
          <div className="flex items-center gap-4">
              <p className="text-[10px] font-bold text-slate-300 uppercase italic">Sending as: {selectedEmployee?.email}</p>
              <Button 
                onClick={handleSend} 
                disabled={sending || !to || !subject || !body}
                className="rounded-2xl px-8 h-12 font-black shadow-xl shadow-primary/30 transition-all hover:scale-[1.05] active:scale-[0.98]"
              >
                  {sending ? "Blasting..." : "Sent Mail"}
                  <Send className={cn("ml-2 w-4 h-4 transition-transform", !sending && "group-hover:translate-x-1 group-hover:-translate-y-1")} />
              </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeMailComposeModal;
