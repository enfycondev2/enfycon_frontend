"use client";

import { useEffect, useMemo, useState } from 'react';
import AudienceStatsChart from '@/components/charts/audience-stats-chart';
import CustomSelect from '@/components/shared/custom-select';
import { Card, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/apiClient';

interface PodRow {
    id: string;
    name: string;
}

interface JobRow {
    id: string;
    pod?: {
        id: string;
        name: string;
    } | null;
    pods?: Array<{
        id: string;
        name?: string;
    }> | null;
    podIds?: string[] | null;
}

interface SubmissionRow {
    jobId?: string;
    submissionDate?: string;
    l1Status?: string;
    l2Status?: string;
    l3Status?: string;
    finalStatus?: string;
}

interface PodMetrics {
    submissions: number;
    interviews: number;
    placements: number;
}

interface PodPerformanceData {
    name: string;
    submissions: number;
    interviews: number;
    placements: number;
}

interface PodSubmissionChartProps {
    initialData?: PodPerformanceData[];
}

const PodSubmissionChart = ({ initialData = [] }: PodSubmissionChartProps) => {
    const [selectedRange, setSelectedRange] = useState("All Time");
    const [isLoading, setIsLoading] = useState(false);
    const [podCategories, setPodCategories] = useState<string[]>([]);
    const [podSeries, setPodSeries] = useState<{ name: string; data: number[] }[]>([]);

    useEffect(() => {
        if (initialData.length > 0) {
            const categories = initialData.map(d => d.name);
            const submissions = initialData.map(d => d.submissions);
            const interviews = initialData.map(d => d.interviews);
            const placements = initialData.map(d => d.placements);

            setPodCategories(categories);
            setPodSeries([
                { name: 'Submissions', data: submissions },
                { name: 'Interviews', data: interviews },
                { name: 'Placements', data: placements },
            ]);
        }
    }, [initialData]);

    const fetchChartData = async () => {
        if (selectedRange === "All Time" && initialData.length > 0) return;
        
        setIsLoading(true);
        // Temporary placeholder: For now we'll stick to initialData to avoid the slow fetch.
        // In a real production app, we would add range parameters to the /stats endpoint.
        setIsLoading(false);
    };

    useEffect(() => {
        fetchChartData();
    }, [selectedRange]);

    const hasData = useMemo(
        () => podSeries.some((series) => series.data.some((value) => value > 0)),
        [podSeries]
    );

    return (
        <Card className="border border-gray-200 dark:border-neutral-700 bg-white dark:bg-slate-800 rounded-md shadow-none h-full">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h6 className="font-semibold text-lg text-neutral-900 dark:text-white">Pod Performance Overview</h6>
                    <CustomSelect
                        placeholder={selectedRange}
                        options={["Last 30 Days", "This Quarter", "Year to Date", "All Time"]}
                        value={selectedRange}
                        onValueChange={setSelectedRange}
                    />
                </div>

                {isLoading ? (
                    <div className="h-[350px] flex items-center justify-center text-sm text-neutral-500">
                        Loading performance data...
                    </div>
                ) : (
                    <div className="apexcharts-tooltip-z-none">
                        <AudienceStatsChart
                            series={podSeries}
                            categories={podCategories.length ? podCategories : ['No Data']}
                            colors={['#487FFF', '#91B9FF', '#F59E0B']}
                            height={350}
                        />
                        {!hasData && (
                            <p className="text-xs text-neutral-500 mt-3 italic">
                                No submission/interview/placement data available for your pods yet.
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default PodSubmissionChart;
