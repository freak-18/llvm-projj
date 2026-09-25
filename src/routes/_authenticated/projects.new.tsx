import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createProject } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UploadCloud, FileCode2, X, Shield } from "lucide-react";
import { SpotlightCard } from "@/components/SpotlightCard";

export const Route = createFileRoute("/_authenticated/projects/new")({
  head: () => ({ meta: [{ title: "New Project — ObfusShield AI" }] }),
  component: NewProject,
});

function NewProject() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("c++");
  const LANGUAGES = [
    { value: "c",      label: "C" },
    { value: "c++",   label: "C++" },
    { value: "rust",  label: "Rust" },
    { value: "go",    label: "Go" },
    { value: "python",label: "Python" },
    { value: "java",  label: "Java" },
  ];
  const [profile, setProfile] = useState("enterprise");
  const [files, setFiles] = useState([]);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Project name is required");
      if (files.length === 0) throw new Error("At least one source file is required");
      
      try {
        const response = await createProject({
          name,
          description,
          language: language as any,
          protectionProfile: profile as any,
          files,
        });
        
        if (!response?.id) {
          throw new Error("No project ID returned from server");
        }
        
        return response;
      } catch (err: any) {
        console.error("Project creation error:", err);
        throw new Error(err?.message || "Failed to create project");
      }
    },
    onSuccess: (res) => {
      console.log("Project created successfully:", res);
      toast.success("Project created!");
      qc.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/projects/$id", params: { id: res.id } });
    },
    onError: (err: any) => {
      console.error("Mutation error:", err);
      const errorMsg = err?.message || "Failed to create project";
      toast.error(errorMsg);
    },
  });

  async function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const added = [];
    for (const f of Array.from(e.target.files)) {
      if (f.size > 200_000) { toast.error(`${f.name} too large`); continue; }
      added.push({ filename: f.name, content: await f.text() });
    }
    setFiles((p) => [...p, ...added]);
    e.target.value = "";
  }

  function doCreate() {
    createMut.mutate();
  }

  return (
    <div className="p-8 max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold">New Project</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure and upload source code.</p>
      </div>

      {/* Name */}
      <SpotlightCard className="glass rounded-2xl p-5 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Project Name <span className="text-destructive">*</span></p>
          <input
            type="text"
            placeholder="Enter your project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg bg-input/40 border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
          />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Description (Optional)</p>
          <textarea
            rows={2}
            placeholder="Describe your project and its purpose"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg bg-input/40 border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground/50"
          />
        </div>
      </SpotlightCard>

      {/* Language + Profile */}
      <SpotlightCard className="glass rounded-2xl p-5 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Language</p>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value} className="bg-background text-foreground">
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Protection Profile</p>
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            className="w-full rounded-lg bg-input/40 border border-border px-3 py-2 text-sm"
          >
            <option value="basic">Basic (3 passes)</option>
            <option value="advanced">Advanced (5 passes)</option>
            <option value="enterprise">Enterprise (7 passes)</option>
            <option value="military">Military Grade (9 passes)</option>
          </select>
        </div>
      </SpotlightCard>

      {/* Files */}
      <SpotlightCard className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Source Files ({files.length})
          </p>
          <label className="fade-hover inline-flex items-center gap-1.5 rounded-lg glass hover:bg-accent px-3 py-1.5 text-xs cursor-pointer">
            <UploadCloud className="h-3.5 w-3.5" />
            Add files
            <input
              type="file"
              multiple
              onChange={pickFiles}
              className="hidden"
              accept=".c,.cpp,.cc,.cxx,.h,.hpp,.rs,.go,.py,.java"
            />
          </label>
        </div>
        {files.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground space-y-2">
            <p className="font-medium">No files selected</p>
            <p className="text-xs">Click "Add files" above to upload your source code</p>
            <p className="text-xs">Supported: .c, .cpp, .cc, .cxx, .h, .hpp, .rs, .go, .py, .java</p>
            <p className="text-xs">Maximum 200 KB per file</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="font-mono truncate">{f.filename}</span>
                  <span className="text-muted-foreground shrink-0">{f.content.length}B</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                  className="fade-hover text-muted-foreground hover:text-destructive ml-2"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SpotlightCard>

      {/* Actions — NO FORM, just buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate({ to: "/projects" })}
          className="fade-hover rounded-lg glass px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={createMut.isPending}
          onClick={doCreate}
          className="trace-border inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium shadow-[var(--shadow-glow)] disabled:opacity-50"
        >
          {createMut.isPending ? (
            <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Creating…</>
          ) : (
            <><Shield className="h-4 w-4" /> Create Project</>
          )}
        </button>
      </div>
    </div>
  );
}
