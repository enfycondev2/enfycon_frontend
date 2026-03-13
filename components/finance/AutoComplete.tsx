"use client";

import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/apiClient";

interface Option {
    id: string | number;
    name: string;
}

interface AutoCompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    clientType?: "CLIENT" | "END_CLIENT";
    className?: string;
}

export default function AutoComplete({
    value,
    onChange,
    placeholder = "Search or type...",
    label,
    clientType,
    className = "",
}: AutoCompleteProps) {
    const [query, setQuery] = useState(value);
    const [options, setOptions] = useState<Option[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setQuery(value);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchOptions = async (search: string) => {
        if (!clientType) return;
        setLoading(true);
        try {
            const res = await apiClient(`clients?type=${clientType}&search=${encodeURIComponent(search)}`);
            if (res.ok) {
                const data = await res.json();
                setOptions(data || []);
            }
        } catch (err) {
            console.error("Failed to fetch autocomplete options", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && clientType) {
            const timer = setTimeout(() => {
                fetchOptions(query);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [query, isOpen, clientType]);

    const handleSelect = (optionName: string) => {
        setQuery(optionName);
        onChange(optionName);
        setIsOpen(false);
    };

    const [activeIndex, setActiveIndex] = useState(-1);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            setActiveIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter" && activeIndex >= 0) {
            handleSelect(options[activeIndex].name);
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        onChange(val);
        setIsOpen(true);
        setActiveIndex(-1);
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {label && (
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {label}
                </label>
            )}
            <input
                type="text"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm transition"
            />
            {isOpen && (loading || options.length > 0 || (query.length >= 2 && !loading)) && (
                <ul className="absolute z-[9999] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-auto py-1">
                    {loading ? (
                        <li className="px-4 py-2 text-sm text-gray-500 animate-pulse flex items-center gap-2">
                             <div className="w-3 h-3 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                             Searching...
                        </li>
                    ) : options.length > 0 ? (
                        options.map((opt, index) => (
                            <li
                                key={opt.id}
                                onClick={() => handleSelect(opt.name)}
                                onMouseEnter={() => setActiveIndex(index)}
                                className={`px-4 py-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer transition flex items-center justify-between
                                    ${activeIndex === index ? "bg-violet-100 dark:bg-violet-900/60" : "hover:bg-violet-50 dark:hover:bg-violet-900/40"}`}
                            >
                                <span>{opt.name}</span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-700">Client</span>
                            </li>
                        ))
                    ) : query.length >= 2 ? (
                        <li className="px-4 py-2 text-sm text-gray-400 italic">No results found - keep typing to add new</li>
                    ) : null}
                </ul>
            )}
        </div>
    );
}
