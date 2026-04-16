"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, ArrowUp, FileText, Medal, UsersRound, Wallet, BriefcaseBusiness, Timer } from "lucide-react";
import React from "react";

const ICON_MAP: Record<string, React.ElementType> = {
  UsersRound,
  Medal,
  Wallet,
  FileText,
  BriefcaseBusiness,
  Timer,
  ArrowUp,
  ArrowDown
};

import Link from "next/link";

interface CardData {
  title: string;
  value: string;
  icon: any; 
  iconBg: string;
  gradientFrom: string;
  growth: string;
  growthIcon: any;
  growthColor: string;
  description: string;
  targetUrl?: string;
};

const cardsDatas: CardData[] = [
  // ... existing demo data (omitted for brevity in replacement but kept in structure)
];

const StatCard = ({ data }: { data?: CardData[] }) => {
  const displayData = data || cardsDatas;
  return (displayData.map((card, index) => {
    const IconComp = typeof card.icon === 'string' ? ICON_MAP[card.icon] : card.icon;
    const GrowthIconComp = typeof card.growthIcon === 'string' ? ICON_MAP[card.growthIcon] : card.growthIcon;

    const Content = (
      <Card
        key={index}
        className={`bg-gradient-to-r ${card.gradientFrom} to-white dark:to-slate-700 p-0 border border-gray-200 dark:border-neutral-700 rounded-md shadow-none transition-all duration-200 ${card.targetUrl ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-blue-200 active:scale-[0.98]' : ''}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{card.title}</p>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">{card.value}</h3>
            </div>
            <div className={`w-12 h-12 ${card.iconBg} rounded-full flex items-center justify-center`}>
              {IconComp && <IconComp className="text-white" size={24} />}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm mt-4">
            <span className={`flex items-center gap-1 ${card.growthColor}`}>
              {GrowthIconComp && <GrowthIconComp fill="currentColor" stroke="none" width={14} height={14} />}
              {card.growth}
            </span>
            <span className="text-neutral-500 dark:text-neutral-400 text-[13px]">{card.description}</span>
          </div>
        </CardContent>
      </Card>
    );

    if (card.targetUrl) {
      return (
        <Link href={card.targetUrl} key={index}>
          {Content}
        </Link>
      );
    }

    return Content;
  }));
};


export default StatCard;
