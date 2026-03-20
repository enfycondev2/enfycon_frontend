"use client";

import { useState } from "react";

interface QuickCalcProps {
    size?: "sm" | "md" | "lg";
    onSizeChange?: (size: "sm" | "md" | "lg") => void;
    showSizeControls?: boolean;
}

export default function QuickCalc({ size = "md", onSizeChange, showSizeControls = false }: QuickCalcProps) {
    const [display, setDisplay] = useState("0");
    const [equation, setEquation] = useState("");
    const [shouldReset, setShouldReset] = useState(false);

    const handleDigit = (digit: string) => {
        if (display === "0" || shouldReset) {
            setDisplay(digit);
            setShouldReset(false);
        } else {
            setDisplay(display + digit);
        }
    };

    const handleOperator = (op: string) => {
        setEquation(display + " " + op + " ");
        setShouldReset(true);
    };

    const calculate = () => {
        try {
            // Basic safety check for eval
            const sanitized = (equation + display).replace(/[^-()\d/*+.]/g, '');
            const result = eval(sanitized);
            setDisplay(String(Number(result.toFixed(4))));
            setEquation("");
            setShouldReset(true);
        } catch (e) {
            setDisplay("Error");
            setEquation("");
        }
    };

    const clear = () => {
        setDisplay("0");
        setEquation("");
    };

    // Size-based styling
    const config = {
        sm: {
            width: "w-[180px]",
            btnH: "h-8",
            txt: "text-[10px]",
            disp: "text-sm",
            gap: "gap-1",
            padding: "p-2",
            eqH: "h-full"
        },
        md: {
            width: "w-[240px]",
            btnH: "h-10",
            txt: "text-xs",
            disp: "text-lg",
            gap: "gap-2",
            padding: "p-4",
            eqH: "h-full"
        },
        lg: {
            width: "w-[300px]",
            btnH: "h-14",
            txt: "text-sm",
            disp: "text-2xl",
            gap: "gap-3",
            padding: "p-6",
            eqH: "h-full"
        }
    }[size];

    const btnCls = `${config.btnH} w-full rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${config.txt} shadow-sm`;
    const opCls = `${config.btnH} w-full rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-bold hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors ${config.txt} shadow-sm`;
    const eqCls = `${config.btnH} w-full rounded-lg bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors ${config.txt} shadow-md`;

    return (
        <div className={`bg-white dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl ${config.padding} ${showSizeControls ? 'pt-8' : ''} shadow-2xl ${config.width} mx-auto transition-all duration-300 relative`}>
            {/* Size Controls */}
            {showSizeControls && (
                <div className="flex justify-center gap-1 mb-3">
                    {(["sm", "md", "lg"] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => onSizeChange?.(s)}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition ${
                                size === s 
                                ? "bg-violet-600 text-white" 
                                : "bg-gray-200 dark:bg-gray-800 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700"
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            <div className="mb-3">
                <div className="text-[10px] text-gray-400 text-right h-4 overflow-hidden mb-0.5 font-mono">{equation}</div>
                <div className={`bg-gray-50 dark:bg-gray-950/50 rounded-xl px-3 py-2 text-right ${config.disp} font-bold font-mono text-gray-800 dark:text-white border border-gray-100 dark:border-gray-800/50 shadow-inner overflow-hidden truncate`}>
                    {display}
                </div>
            </div>
            
            <div className={`grid grid-cols-4 ${config.gap}`}>
                <button onClick={clear} className={`${btnCls} col-span-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400`}>AC</button>
                <button onClick={() => handleOperator("/")} className={opCls}>÷</button>
                <button onClick={() => handleOperator("*")} className={opCls}>×</button>
                
                <button onClick={() => handleDigit("7")} className={btnCls}>7</button>
                <button onClick={() => handleDigit("8")} className={btnCls}>8</button>
                <button onClick={() => handleDigit("9")} className={btnCls}>9</button>
                <button onClick={() => handleOperator("-")} className={opCls}>−</button>
                
                <button onClick={() => handleDigit("4")} className={btnCls}>4</button>
                <button onClick={() => handleDigit("5")} className={btnCls}>5</button>
                <button onClick={() => handleDigit("6")} className={btnCls}>6</button>
                <button onClick={() => handleOperator("+")} className={opCls}>+</button>
                
                <div className={`col-span-3 grid grid-cols-3 ${config.gap}`}>
                    <button onClick={() => handleDigit("1")} className={btnCls}>1</button>
                    <button onClick={() => handleDigit("2")} className={btnCls}>2</button>
                    <button onClick={() => handleDigit("3")} className={btnCls}>3</button>
                    <button onClick={() => handleDigit("0")} className={`${btnCls} col-span-2`}>0</button>
                    <button onClick={() => handleDigit(".")} className={btnCls}>.</button>
                </div>
                <button onClick={calculate} className={`${eqCls} ${config.eqH} row-span-2`}>=</button>
            </div>
        </div>
    );
}
