import React from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

const palette = {
  red: "#d71920",
  blue: "#2455a6",
  navy: "#17233c",
  amber: "#f59e0b",
  green: "#16a34a",
  slate: "#64748b",
};

const axisOptions = {
  grid: { color: "rgba(100, 116, 139, 0.14)" },
  ticks: { color: palette.slate, font: { size: 11, weight: "600" } },
};

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#111827",
      borderColor: "rgba(255,255,255,0.12)",
      borderWidth: 1,
      padding: 10,
      titleColor: "#fff",
      bodyColor: "#e5e7eb",
    },
  },
};

const emptyValues = (values) => !values?.length || values.every((value) => Number(value || 0) === 0);

function EmptyChart({ label = "No chart data available" }) {
  return <div className="chart-empty">{label}</div>;
}

export function BarVisual({ labels, values, label = "Quantity", colors = [palette.red, palette.blue] }) {
  if (emptyValues(values)) return <EmptyChart />;

  return (
    <div className="chart-frame">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label,
              data: values,
              backgroundColor: values.map((_, index) => colors[index % colors.length]),
              borderRadius: 6,
              barThickness: 20,
            },
          ],
        }}
        options={{
          ...baseOptions,
          scales: {
            x: { ...axisOptions, grid: { display: false } },
            y: { ...axisOptions, beginAtZero: true },
          },
        }}
      />
    </div>
  );
}

export function LineVisual({ labels, values, label = "Trend" }) {
  if (emptyValues(values)) return <EmptyChart />;

  return (
    <div className="chart-frame">
      <Line
        data={{
          labels,
          datasets: [
            {
              label,
              data: values,
              borderColor: palette.red,
              backgroundColor: "rgba(215, 25, 32, 0.14)",
              fill: true,
              tension: 0.35,
              pointBackgroundColor: palette.blue,
              pointRadius: 3,
            },
          ],
        }}
        options={{
          ...baseOptions,
          scales: {
            x: { ...axisOptions, grid: { display: false } },
            y: { ...axisOptions, beginAtZero: true },
          },
        }}
      />
    </div>
  );
}

export function DoughnutVisual({ labels, values, label = "Share" }) {
  if (emptyValues(values)) return <EmptyChart />;

  return (
    <div className="chart-frame compact-chart">
      <Doughnut
        data={{
          labels,
          datasets: [
            {
              label,
              data: values,
              backgroundColor: [palette.green, palette.amber, palette.red, palette.blue],
              borderColor: "rgba(255,255,255,0.75)",
              borderWidth: 2,
            },
          ],
        }}
        options={{
          ...baseOptions,
          cutout: "68%",
          plugins: {
            ...baseOptions.plugins,
            legend: {
              display: true,
              position: "bottom",
              labels: { boxWidth: 10, boxHeight: 10, color: palette.slate, font: { size: 11, weight: "700" } },
            },
          },
        }}
      />
    </div>
  );
}
