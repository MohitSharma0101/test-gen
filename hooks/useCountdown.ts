'use client';

import { useState, useEffect } from 'react';

interface TimeLeft {
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
}

const useCountdownTimer = (endTime: Date | number): TimeLeft => {
    const [timeLeft, setTimeLeft] = useState<TimeLeft>({
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
    });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = Date.now(); // Current time in milliseconds
            const timeDifference = endTime instanceof Date ? endTime.getTime() - now : endTime - now; // Handle both Date and number input

            if (timeDifference <= 0) {
                setTimeLeft({
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                    milliseconds: 0,
                });
                return; // Stop updating when time is up
            }

            // Calculate the remaining time
            const hours = Math.floor(timeDifference / (1000 * 60 * 60));
            const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
            const milliseconds = timeDifference % 1000;

            setTimeLeft({
                hours,
                minutes,
                seconds,
                milliseconds,
            });
        };

        // Call `calculateTimeLeft` every 100ms to keep the countdown accurate
        const intervalId = setInterval(calculateTimeLeft, 100);

        // Cleanup interval on component unmount or when the countdown ends
        return () => {
            clearInterval(intervalId);
        };
    }, [endTime]); // Re-run the effect if `endTime` prop changes

    return timeLeft;
};

export default useCountdownTimer;
