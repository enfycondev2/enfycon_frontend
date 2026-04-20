"use client";

import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function AiContentRenderer({ content, isMe }: { content: string; isMe: boolean }) {
    try {
        if (isMe) return <p className="mb-1 text-sm leading-relaxed break-words">{content}</p>;
        
        const data = typeof content === 'string' ? JSON.parse(content) : content;
        
        if (!data.answer && !data.previewData) {
             return <p className="mb-1 text-sm leading-relaxed break-words">{content}</p>;
        }

        return (
            <div className="flex flex-col gap-3 max-w-full overflow-hidden">
                <p className="mb-0 text-sm leading-relaxed">{data.answer}</p>
                
                {data.previewData && data.previewData.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-neutral-100 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50">
                        <table className="w-full text-[11px] text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-100/50 dark:bg-slate-800/50">
                                    <th className="px-2 py-1.5 font-bold">Candidate</th>
                                    <th className="px-2 py-1.5 font-bold">Client</th>
                                    <th className="px-2 py-1.5 font-bold">Position</th>
                                    <th className="px-2 py-1.5 font-bold text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.previewData.map((row: any, idx: number) => (
                                    <tr key={idx} className="border-t border-neutral-100 dark:border-slate-700">
                                        <td className="px-2 py-1.5 truncate max-w-[100px]">{row.candidate}</td>
                                        <td className="px-2 py-1.5 truncate max-w-[80px]">{row.client}</td>
                                        <td className="px-2 py-1.5 truncate max-w-[100px]">{row.position}</td>
                                        <td className="px-2 py-1.5 text-right whitespace-nowrap">
                                            {format(new Date(row.date), 'MMM dd')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {data.actionLink && (
                    <Button 
                        asChild 
                        variant="link" 
                        size="sm" 
                        className="h-auto p-0 justify-start text-primary font-bold hover:underline"
                    >
                        <a href={data.actionLink}>
                            {data.actionLabel || 'View Full List'} →
                        </a>
                    </Button>
                )}
            </div>
        );
    } catch (e) {
        return <p className="mb-1 text-sm leading-relaxed break-words">{String(content)}</p>;
    }
}
