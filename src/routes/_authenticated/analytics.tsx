/**
 * Analytics page — /analytics
 * Security metrics overview across all projects.
 * Radar chart + bar chart using Chart.js via react-chartjs-2.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listProjects, getMetrics } from "@/lib/api";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Radar, Bar } from "react-chartjs-2";
import { Activity, Shield, TrendingUp, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { SpotlightCard } from "@/components/SpotlightCard";

ChartJS.register(
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend, CategoryScale, LinearScale, BarElement
);

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — ObfusShield AI" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const analyzed = projects.filter(
    (p) => p.status === "analyzed" || p.status === "completed"
  );

  // Bar chart — security scores per project
  const barData = {
    labels: analyzed.map((p) => p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name),
    datasets: [
      {
        label: "Security Score",
        data: analyzed.map((p) => p.securityScore ?? 0),
        backgroundColor: analyzed.map((p) =>
          (p.securityScore ?? 0) >= 80
            ? "oklch(0.72 0.17 160 / 0.7)"
            : (p.securityScore ?? 0) >= 60
            ? "oklch(0.78 0.17 70 / 0.7)"
            : "oklch(0.65 0.22 25 / 0.7)"
        ),
        borderColor: "oklch(0.66 0.19 256)",
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => ` Score: ${ctx.raw}/100` } },
    },
    scales: {
      y: {
        min: 0, max: 100,
        ticks: { color: "#94a3b8", stepSize: 20 },
        grid: { color: "oklch(0.66 0.19 256 / 0.1)" },
      },
      x: { ticks: { color: "#94a3b8" }, grid: { display: false } },
    },
  };

  // Radar — avg metrics across all analyzed projects (only if we have data)
  const avgMetrics = analyzed.length
    ? {
        re: avg(analyzed.map((p) => (p as any).reverseEngineeringResistance ?? 60)),
        tamper: avg(analyzed.map((p) => (p as any).tamperResistance ?? 55)),
        coverage: avg(analyzed.map((p) => (p as any).protectionCoverage ?? 50)),
        score: avg(analyzed.map((p) => p.securityScore ?? 0)),
        complexity: avg(analyzed.map((p) => (p as any).complexityScore ?? 40)),
      }
    : null;

  const radarData = {
    labels: ["RE Resistance", "Tamper Resistance", "Coverage", "Security Score", "Complexity"],
    datasets: [
      {
        label: "Avg across projects",
        data: avgMetrics
          ? [avgMetrics.re, avgMetrics.tamper, avgMetrics.coverage, avgMetrics.score, avgMetrics.complexity]
          : [0, 0, 0, 0, 0],
        backgroundColor: "oklch(0.66 0.19 256 / 0.25)",
        borderColor: "oklch(0.66 0.19 256)",
        pointBackgroundColor: "oklch(0.85 0.1 240)",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "oklch(0.66 0.19 256)",
      },
    ],
  };

  const radarOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: "#94a3b8" } } },
    scales: {
      r: {
        min: 0, max: 100,
        ticks: { color: "#94a3b8", stepSize: 25, backdropColor: "transparent" },
        grid: { color: "oklch(0.66 0.19 256 / 0.15)" },
        pointLabels: { color: "#cbd5e1", font: { size: 11 } },
        angleLines: { color: "oklch(0.66 0.19 256 / 0.15)" },
      },
    },
  };

  const highRisk = projects.filter((p) => (p.securityScore ?? 0) < 60 && p.status !== "uploaded").length;
  const avgScore = analyzed.length
    ? Math.round(analyzed.reduce((a, p) => a + (p.securityScore ?? 0), 0) / analyzed.length)
    : 0;

  return (
    <div className="p-8 max-w-7xl">
      <header className="mb-8">
        <div className="text-xs uppercase tracking-[0.2em] font-mono text-[oklch(0.85_0.1_240)]">
          Security Analytics
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold">Metrics Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregate security posture across all protected codebases.
        </p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Shield} label="Avg Security Score" value={`${avgScore}`} color="text-gradient" />
        <StatCard icon={Activity} label="Projects Analyzed" value={`${analyzed.length}`} />
        <StatCard icon={TrendingUp} label="Total Projects" value={`${projects.length}`} />
        <StatCard icon={AlertTriangle} label="High Risk" value={`${highRisk}`} color="text-[oklch(0.78_0.2_25)]" />
      </div>

      {analyzed.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <div className="font-semibold">No analyzed projects yet</div>
          <p className="text-sm text-muted-foreground mt-1">
            Create a project and run AI analysis to see metrics here.
          </p>
          <Link
            to="/projects/new"
            className="trace-border mt-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm"
          >
            Create a project
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Bar chart */}
          <SpotlightCard className="glass rounded-2xl p-6">
            <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-[oklch(0.85_0.1_240)]" />
              Security Score by Project
            </h2>
            <Bar data={barData} options={barOptions} />
          </SpotlightCard>

          {/* Radar chart */}
          <SpotlightCard className="glass rounded-2xl p-6">
            <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-[oklch(0.85_0.1_240)]" />
              Protection Profile Radar
            </h2>
            <Radar data={radarData} options={radarOptions} />
          </SpotlightCard>

          {/* Project table */}
          <SpotlightCard className="glass rounded-2xl overflow-hidden md:col-span-2">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3">Project</th>
                  <th className="text-left px-5 py-3">Language</th>
                  <th className="text-left px-5 py-3">Profile</th>
                  <th className="text-left px-5 py-3">Score</th>
                  <th className="text-left px-5 py-3">Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {analyzed.map((p) => {
                  const score = p.securityScore ?? 0;
                  const risk = score >= 80 ? "Low" : score >= 60 ? "Medium" : "High";
                  const riskColor =
                    score >= 80
                      ? "text-[oklch(0.72_0.17_160)]"
                      : score >= 60
                      ? "text-[oklch(0.85_0.17_70)]"
                      : "text-[oklch(0.78_0.2_25)]";
                  return (
                    <tr key={p._id} className="border-t border-border hover:bg-accent/30 transition">
                      <td className="px-5 py-3">
                        <Link
                          to="/projects/$id"
                          params={{ id: p._id }}
                          className="fade-hover font-medium hover:text-[oklch(0.85_0.1_240)]"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground uppercase">{p.language}</td>
                      <td className="px-5 py-3 capitalize">{p.protectionProfile}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[oklch(0.66_0.19_256)] to-[oklch(0.78_0.14_200)]"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs">{score}</span>
                        </div>
                      </td>
                      <td className={`px-5 py-3 font-semibold text-xs ${riskColor}`}>{risk}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </SpotlightCard>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <SpotlightCard className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-[oklch(0.85_0.1_240)]" />
      </div>
      <div className={`mt-3 text-3xl font-display font-bold ${color ?? ""}`}>{value}</div>
    </SpotlightCard>
  );
}

function avg(arr: number[]) {
  return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
}
