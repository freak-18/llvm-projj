import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listProjects } from "@/lib/api";
import { Plus, FolderOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects — ObfusShield AI" }] }),
  component: ProjectsLayout,
});

// Layout wrapper — renders child routes (new, $id) via Outlet,
// or the projects list when on /projects exactly
function ProjectsLayout() {
  const matchRoute = useMatchRoute();
  const isIndex = matchRoute({ to: "/projects", fuzzy: false });

  // If we're on a child route (/projects/new, /projects/$id), just render it
  if (!isIndex) {
    return <Outlet />;
  }

  return <ProjectsList />;
}

function ProjectsList() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  return (
    <div className="p-8 max-w-7xl">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">All codebases under protection.</p>
        </div>
        <Link to="/projects/new" className="trace-border inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-[var(--shadow-glow)]">
          <Plus className="h-4 w-4" /> New project
        </Link>
      </header>

      {isLoading ? (
        <div className="glass rounded-xl p-8 text-center text-muted-foreground">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <div className="font-semibold">No projects yet</div>
          <Link to="/projects/new" className="trace-border mt-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm">
            <Plus className="h-4 w-4" /> Create your first project
          </Link>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Language</th>
                <th className="text-left px-5 py-3">Profile</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Score</th>
                <th className="text-left px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p._id} className="border-t border-border hover:bg-accent/40 transition">
                  <td className="px-5 py-3">
                    <Link to="/projects/$id" params={{ id: p._id }} className="fade-hover font-medium hover:text-[oklch(0.85_0.1_240)]">{p.name}</Link>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground uppercase">{p.language}</td>
                  <td className="px-5 py-3 capitalize">{p.protectionProfile}</td>
                  <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">{p.status}</span></td>
                  <td className="px-5 py-3 font-mono">{p.securityScore ?? 0}</td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
