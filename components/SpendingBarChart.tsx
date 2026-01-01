"use client";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const SpendingBarChart = ({ transactions }: SpendingChartProps) => {
    // === 1. SETUP BUCKETS ===
    // Create an array of size 7 filled with zeros for daily spending
    const chartData: number[] = new Array(7).fill(0);

    // Create labels for the last 7 days (from Today - 6 days to Today)
    const chartLabels: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to Midnight for consistent comparison

    for (let i = 6; i >= 0; i--) {
        const labelDate = new Date(today);
        labelDate.setDate(today.getDate() - i);
        const dayLabel = labelDate.toLocaleDateString("en-US", { weekday: "short" });
        chartLabels.push(dayLabel);
    }

    // === 2. PROCESS TRANSACTIONS (TIMESTAMP MATH) ===
    if (transactions && Array.isArray(transactions)) {
        transactions.forEach((t) => {
            if (!t.date) return;

            // Parse transaction date and reset to Midnight
            const txDate = new Date(t.date);
            if (isNaN(txDate.getTime())) return; // Guard against invalid dates
            txDate.setHours(0, 0, 0, 0);

            // Calculate difference in time (milliseconds)
            const diffTime = today.getTime() - txDate.getTime();

            // Calculate days ago (using Math.round for safety with DST edge cases)
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            // Condition: Only include if within the last 7 days (0 to 6 days ago)
            // and if it's an expense (amount < 0)
            if (diffDays >= 0 && diffDays < 7 && t.amount < 0) {
                // Bucket index: index 6 = today, index 0 = 6 days ago
                const bucketIndex = 6 - diffDays;
                chartData[bucketIndex] += Math.abs(t.amount);
            }
        });
    }

    // Round values to 2 decimal places
    const roundedChartData = chartData.map((val) => Math.round(val * 100) / 100);

    // === 3. CHART CONFIG ===
    const data = {
        labels: chartLabels,
        datasets: [
            {
                label: "Daily Spending",
                data: roundedChartData,
                backgroundColor: "#10B981", // Emerald color
                hoverBackgroundColor: "#059669",
                borderRadius: 8, // Rounded corners
                borderSkipped: false as const,
                barThickness: 20,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "#1F2937",
                titleColor: "#F9FAFB",
                bodyColor: "#D1D5DB",
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: (ctx: any) => `$${ctx.raw.toFixed(2)}`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false }, // Hidden x-axis grid lines
                ticks: { color: "#9CA3AF" },
                border: { display: false },
            },
            y: {
                beginAtZero: true,
                grid: {
                    display: true,
                    color: "rgba(75, 85, 99, 0.3)", // Subtle y-axis grid lines
                },
                ticks: {
                    color: "#9CA3AF",
                    callback: (value: any) => `$${value}`,
                },
                border: { display: false },
            },
        },
    };

    return <Bar data={data} options={options} />;
};

export default SpendingBarChart;
