import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CreateProjectInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  language: z.enum(["c", "c++", "rust", "go"]),
  protection_profile: z.enum(["basic", "advanced", "enterprise", "military"]),
  files: z.array(z.object({
    filename: z.string().min(1).max(200),
    content: z.string().max(200000),
  })).min(1).max(20),
});

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateProjectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        name: data.name,
        description: data.description ?? null,
        language: data.language,
        protection_profile: data.protection_profile,
        status: "uploaded",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const rows = data.files.map((f) => ({
      project_id: project.id,
      user_id: userId,
      filename: f.filename,
      content: f.content,
      size_bytes: f.content.length,
      language: data.language,
    }));
    const { error: fErr } = await supabase.from("source_files").insert(rows);
    if (fErr) throw new Error(fErr.message);

    return { id: project.id as string };
  });

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const getProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: project, error: pe }, { data: files, error: fe }, { data: analyses, error: ae }] =
      await Promise.all([
        context.supabase.from("projects").select("*").eq("id", data.id).single(),
        context.supabase.from("source_files").select("id, filename, size_bytes, language, content").eq("project_id", data.id),
        context.supabase.from("ai_analyses").select("*").eq("project_id", data.id).order("created_at", { ascending: false }),
      ]);
    if (pe) throw new Error(pe.message);
    if (fe) throw new Error(fe.message);
    if (ae) throw new Error(ae.message);
    return { project, files: files ?? [], analyses: analyses ?? [] };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
