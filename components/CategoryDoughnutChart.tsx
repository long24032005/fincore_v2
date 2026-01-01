"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

// Color palette for categories
const COLORS = [
    "#10B981", // Emerald
    "#14B8A6", // Teal
    "#06B6D4", // Cyan
    "#3B82F6", // Blue
    "#6366F1", // Indigo
    "#64748B", // Slate
];

interface CategoryDoughnutChartProps {
    categories: CategoryCount[];
}

const CategoryDoughnutChart = ({ categories = [] }: CategoryDoughnutChartProps) => {
    // Guard clause: return early if no data
    if (!categories || categories.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                No category data available
            </div>
        );
    }

    // Use pre-aggregated category data (from countTransactionCategories)
    // Limit to top 5 + Others
    let labels: string[] = [];
    let values: number[] = [];

    if (categories.length <= 6) {
        labels = categories.map((c) => c.name);
        values = categories.map((c) => c.count);
    } else {
        const top5 = categories.slice(0, 5);
        const othersCount = categories.slice(5).reduce((sum, c) => sum + c.count, 0);
        labels = [...top5.map((c) => c.name), "Others"];
        values = [...top5.map((c) => c.count), othersCount];
    }

    const data = {
        labels,
        datasets: [
            {
                data: values,
                backgroundColor: COLORS.slice(0, labels.length),
                borderColor: "#1F2937",
                borderWidth: 2,
                hoverOffset: 4,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "60%",
        plugins: {
            legend: {
                display: true,
                position: "right" as const,
                labels: {
                    color: "#D1D5DB",
                    padding: 16,
                    usePointStyle: true,
                    pointStyle: "circle",
                    font: { size: 12 },
                },
            },
            tooltip: {
                backgroundColor: "#1F2937",
                titleColor: "#F9FAFB",
                bodyColor: "#D1D5DB",
                padding: 10,
                cornerRadius: 6,
                callbacks: {
                    label: (ctx: any) => {
                        const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
                        const percentage = ((ctx.raw / total) * 100).toFixed(1);
                        return `${ctx.raw} transactions (${percentage}%)`;
                    },
                },
            },
        },
    };

    return <Doughnut data={data} options={options} />;
};

export default CategoryDoughnutChart;
