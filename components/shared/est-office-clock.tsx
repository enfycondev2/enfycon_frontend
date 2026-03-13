import { useEffect, useState } from 'react';

export default function EstOfficeClock() {
    const [mounted, setMounted] = useState(false);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    useEffect(() => {
        setMounted(true);
        setCurrentTime(new Date());
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!mounted || !currentTime) {
        return <div className="text-sm font-medium animate-pulse bg-muted rounded h-10 w-32 mr-2"></div>;
    }


    // Format EST time: "hh:mm:ss A (EST/EDT)"
    const estFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZoneName: 'short',
    });
    const formattedEstTime = estFormatter.format(currentTime);

    // Office hours based on IST: 7:30 PM IST to 4:30 AM IST next day
    // 7:30 PM IST = 14:00 UTC
    // 4:30 AM IST = 23:00 UTC
    const officeOpen = new Date(currentTime);
    officeOpen.setUTCHours(14, 0, 0, 0);

    const officeClose = new Date(currentTime);
    officeClose.setUTCHours(23, 0, 0, 0);

    // If we're past today's closing time, the next opening is tomorrow
    if (currentTime.getTime() >= officeClose.getTime()) {
        officeOpen.setUTCDate(officeOpen.getUTCDate() + 1);
        officeClose.setUTCDate(officeClose.getUTCDate() + 1);
    }

    let statusText = '';
    const isOpen = currentTime >= officeOpen && currentTime < officeClose;

    if (!isOpen) {
        const startTimeEst = officeOpen.toLocaleString('en-US', {
            timeZone: 'America/New_York',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
        statusText = `Opens at ${startTimeEst}`;
    } else {
        // Office is open, calculate time to close
        const diffMs = officeClose.getTime() - currentTime.getTime();

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        const h = diffHours.toString().padStart(2, '0');
        const m = diffMinutes.toString().padStart(2, '0');
        const s = diffSeconds.toString().padStart(2, '0');

        statusText = `Closes in ${h}:${m}:${s}`;
    }

    return (
        <div className="flex flex-col items-end justify-center px-4 py-1.5 border border-border rounded-lg bg-background/50 shadow-sm mr-2 hidden sm:flex">
            <div className="text-sm font-bold text-foreground leading-tight tracking-wide">
                {formattedEstTime}
            </div>
            <div className={`text-xs font-semibold leading-tight ${isOpen ? 'text-green-600 dark:text-green-500' : 'text-neutral-500'}`}>
                {statusText}
            </div>
        </div>
    );
}
