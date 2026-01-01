"use client";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const SpendingChart = ({ transactions }: SpendingChartProps) => {
    // Get date 7 days ago
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Initialize spending by day for the last 7 days
    const dailySpending: { [key: string]: number } = {};
    const dayLabels: string[] = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateKey = date.toISOString().split("T")[0];
        const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });
        dailySpending[dateKey] = 0;
        dayLabels.push(dayLabel);
    }

    // Filter and group transactions from last 7 days
    transactions?.forEach((transaction) => {
        const transactionDate = new Date(transaction.date);
        const dateKey = transactionDate.toISOString().split("T")[0];

        // Only include expenses (negative amounts) from last 7 days
        if (dailySpending.hasOwnProperty(dateKey) && transaction.amount < 0) {
            dailySpending[dateKey] += Math.abs(transaction.amount);
        }
    });

    const spendingValues = Object.values(dailySpending);

    const data = {
        labels: dayLabels,
        datasets: [
            {
                label: "Daily Spending",
                data: spendingValues,
                backgroundColor: "#10B981",
                borderRadius: 8,
                borderSkipped: false,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: "#1F2937",
                titleColor: "#F9FAFB",
                bodyColor: "#D1D5DB",
                borderColor: "#374151",
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: function (context: any) {
                        return `$${context.raw.toFixed(2)}`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: "#9CA3AF",
                },
            },
            y: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: "#9CA3AF",
                    callback: function (value: any) {
                        return `$${value}`;
                    },
                },
            },
        },
    };

    return (
        <div className="h-[200px] w-full">
            <Bar data={data} options={options} />
        </div>
    );
};

export default SpendingChart;
