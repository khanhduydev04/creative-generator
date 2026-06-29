"use client";
// Client Component: manages concept CRUD with interactive form state

import {
  useConcepts,
  useUpdateConcept,
  useCreateUserConcept,
  useUpdateUserConcept,
  useDeleteUserConcept,
  useDeleteSystemConcept,
  useUploadConceptImage,
} from "@/hooks/api/useConcepts";
import type { ConceptPrompt, UserConcept } from "@/hooks/api/useConcepts";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "@/features/auth/context";
import { isAdmin } from "@/features/auth/types";
import { useT } from "@/lib/i18n/useTranslation";

type ConceptItem =
  | (ConceptPrompt & { _source: "system" })
  | (UserConcept & { _source: "custom" });

export function ConceptsTab() {
  const { t } = useT();
  const { profile } = useAuth();
  const isLoggedIn = !!profile;
  const canEditSystem = isLoggedIn && isAdmin(profile.role);
  const canEditCustom = isLoggedIn;
  const { data: conceptsData, isLoading: loading } = useConcepts();
  const deleteSystemConcept = useDeleteSystemConcept();
  const deleteUserConcept = useDeleteUserConcept();
  const [showForm, setShowForm] = useState(false);
  const [editingConcept, setEditingConcept] = useState<ConceptItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const systemConcepts = conceptsData?.system ?? [];
  const customConcepts = conceptsData?.custom ?? [];
  const concepts: ConceptItem[] = [
    ...systemConcepts.map((c): ConceptItem => ({ ...c, _source: "system" })),
    ...customConcepts.map((c): ConceptItem => ({ ...c, _source: "custom" })),
  ];

  async function handleDelete(concept: ConceptItem) {
    if (!window.confirm(t.brand.deleteConceptConfirm)) return;
    try {
      if (concept._source === "custom") {
        await deleteUserConcept.mutateAsync(concept.id);
      } else {
        await deleteSystemConcept.mutateAsync(concept.concept_id);
      }
    } catch (err) {
      window.alert(t.brand.deleteFailed + " " + String(err instanceof Error ? err.message : err));
    }
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-6 backdrop-blur-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="mb-6 flex items-center justify-between">
        <h3 className="flex items-center gap-3 text-lg font-bold text-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Lightbulb className="h-4.5 w-4.5 text-primary" />
          </div>
          {t.brand.concepts}
        </h3>
        {canEditCustom ? (
          <button
            type="button"
            onClick={() => { setEditingConcept(null); setShowForm(true); }}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:shadow-[0_0_16px_hsl(262_83%_65%/0.3)]"
          >
            <Plus className="h-4 w-4" />
            {t.brand.addConcept}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning">
            <Eye className="h-3.5 w-3.5" />
            {t.brand.viewOnly}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-foreground-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">{t.brand.loadingConcepts}</span>
        </div>
      )}

      {!loading && concepts.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-12 text-foreground-subtle">
          <Lightbulb className="mb-3 h-8 w-8 opacity-30" />
          <p className="text-sm font-medium">{t.brand.noConceptsYet}</p>
          <p className="mt-1 text-xs">{t.brand.addConceptHint}</p>
        </div>
      )}

      {(showForm || editingConcept) && (
        <ConceptForm
          concept={editingConcept}
          onSaved={() => { setShowForm(false); setEditingConcept(null); }}
          onCancel={() => { setShowForm(false); setEditingConcept(null); }}
        />
      )}

      {concepts.length > 0 && (
        <div className="mt-4 space-y-3">
          {concepts.map((concept) => {
            const isExpanded = expandedId === concept.concept_id;
            return (
              <div
                key={concept._source === "custom" ? concept.id : concept.concept_id}
                className="overflow-hidden rounded-lg border border-border bg-background-subtle/50"
              >
                <div className="flex items-start gap-4 p-4">
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : concept.concept_id)}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">{concept.label}</h4>
                      <span className="rounded bg-background-elevated px-1.5 py-0.5 font-mono text-[10px] text-foreground-subtle">
                        {concept.concept_id}
                      </span>
                      {concept.requires_competitor && (
                        <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                          {t.brand.competitor}
                        </span>
                      )}
                      {concept.reference_images.length > 0 && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          {concept.reference_images.length} {t.brand.ref}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-foreground-muted">{concept.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : concept.concept_id)}
                      className="cursor-pointer rounded-lg border border-border p-1.5 transition-colors duration-200 hover:bg-white/[0.05]"
                      aria-label={isExpanded ? t.brand.collapse : t.brand.expand}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-foreground-muted" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-foreground-muted" />
                      )}
                    </button>
                    {(concept._source === "system" ? canEditSystem : canEditCustom) && (
                      <>
                        <button
                          type="button"
                          onClick={() => { setShowForm(false); setEditingConcept(concept); }}
                          className="cursor-pointer rounded-lg border border-border p-1.5 transition-colors duration-200 hover:bg-white/[0.05]"
                          aria-label={t.brand.edit}
                        >
                          <Pencil className="h-3.5 w-3.5 text-foreground-muted" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(concept)}
                          className="cursor-pointer rounded-lg border border-danger/30 p-1.5 transition-colors duration-200 hover:bg-danger/5"
                          aria-label={t.brand.delete}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-danger" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
                    {concept.reference_images.length > 0 && (
                      <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-foreground-subtle">{t.brand.referenceImages}</p>
                        <div className="flex gap-2">
                          {concept.reference_images.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Reference ${idx + 1}`}
                              className="h-20 w-20 rounded-lg border border-border object-cover"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {concept.prompt && (
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground-subtle">{t.brand.prompt}</p>
                        <pre className="max-h-[300px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-background-elevated p-3 text-xs text-foreground-muted">
                          {concept.prompt}
                        </pre>
                      </div>
                    )}
                    {!concept.prompt && concept.reference_images.length === 0 && (
                      <p className="text-xs italic text-foreground-subtle">{t.brand.noPromptConfigured}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Concept Form (Add / Edit) ──────────────────────────────────────────────

interface ConceptFormProps {
  concept: ConceptItem | null;
  onSaved: () => void;
  onCancel: () => void;
}

function ConceptForm({ concept, onSaved, onCancel }: ConceptFormProps) {
  const { t } = useT();
  const createUserConcept = useCreateUserConcept();
  const updateConcept = useUpdateConcept();
  const updateUserConcept = useUpdateUserConcept();
  const uploadConceptImage = useUploadConceptImage();
  const [conceptId, setConceptId] = useState(concept?.concept_id ?? "");
  const [label, setLabel] = useState(concept?.label ?? "");
  const [description, setDescription] = useState(concept?.description ?? "");
  const [requiresCompetitor, setRequiresCompetitor] = useState(concept?.requires_competitor ?? false);
  const [prompt, setPrompt] = useState(concept?.prompt ?? "");
  const [referenceImages, setReferenceImages] = useState<string[]>(concept?.reference_images ?? []);
  const [uploading, setUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(
    !!(concept?.prompt || (concept?.reference_images?.length ?? 0) > 0),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = concept !== null;
  const saving = createUserConcept.isPending || updateConcept.isPending || updateUserConcept.isPending;
  const uploadId = isEditing ? concept.concept_id : conceptId.trim() || "temp-" + Date.now();

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 2 - referenceImages.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of toUpload) {
        const result = await uploadConceptImage.mutateAsync({
          conceptId: uploadId,
          file,
        });
        uploaded.push(result.url);
      }
      setReferenceImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      window.alert(t.brand.uploadFailed + " " + String(err instanceof Error ? err.message : err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeReferenceImage(index: number) {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;

    try {
      if (isEditing) {
        const fields = {
          label: label.trim(),
          description: description.trim(),
          requires_competitor: requiresCompetitor,
          prompt: prompt.trim(),
          reference_images: referenceImages,
        };
        if (concept._source === "custom") {
          await updateUserConcept.mutateAsync({ id: concept.id, ...fields });
        } else {
          await updateConcept.mutateAsync({ conceptId: concept.concept_id, ...fields });
        }
      } else {
        if (!conceptId.trim()) return;
        await createUserConcept.mutateAsync({
          label: label.trim(),
          prompt: prompt.trim(),
          description: description.trim(),
          reference_images: referenceImages,
          requires_competitor: requiresCompetitor,
        });
      }
      onSaved();
    } catch (err) {
      window.alert(t.brand.saveFailed + " " + String(err instanceof Error ? err.message : err));
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mb-4 rounded-lg border border-border bg-background-subtle/50 p-5">
      <h4 className="mb-4 text-sm font-bold text-foreground">
        {isEditing ? t.brand.editConcept : t.brand.addNewConcept}
      </h4>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground-muted">
            {t.brand.conceptIdLabel} <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={conceptId}
            onChange={(e) => setConceptId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
            placeholder={t.brand.conceptIdPlaceholder}
            required
            disabled={isEditing}
            className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:text-foreground-subtle disabled:opacity-60"
          />
          <p className="mt-1 text-[10px] text-foreground-subtle">{t.brand.conceptIdHint}</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground-muted">
            {t.brand.label} <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t.brand.labelPlaceholder}
            required
            className="w-full rounded-lg border border-border bg-background-elevated px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-semibold text-foreground-muted">
          {t.brand.description}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.brand.conceptDescPlaceholder}
          rows={2}
          className="w-full resize-none rounded-lg border border-border bg-background-elevated px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="mb-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={requiresCompetitor}
            onChange={(e) => setRequiresCompetitor(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-foreground-muted">{t.brand.requiresCompetitor}</span>
        </label>
      </div>

      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex cursor-pointer items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showAdvanced ? t.brand.hide : t.brand.show} {t.brand.promptAndReferences}
        </button>
      </div>

      {showAdvanced && (
        <div className="mb-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground-muted">
              {t.brand.prompt}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t.brand.promptPlaceholder}
              rows={10}
              className="w-full resize-none rounded-lg border border-border bg-background-elevated px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-[10px] text-foreground-subtle">
              {t.brand.promptHint}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground-muted">
              {t.brand.referenceImages} <span className="font-normal text-foreground-subtle">{t.brand.maxTwo}</span>
            </label>

            {referenceImages.length > 0 && (
              <div className="mb-3 flex gap-3">
                {referenceImages.map((url, idx) => (
                  <div key={idx} className="group relative">
                    <img
                      src={url}
                      alt={`Reference ${idx + 1}`}
                      className="h-24 w-24 rounded-lg border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeReferenceImage(idx)}
                      className="absolute -right-1.5 -top-1.5 cursor-pointer rounded-full bg-danger p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label={t.brand.removeImage}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {referenceImages.length < 2 && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => void handleFileUpload(e)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border-strong px-4 py-2.5 text-sm font-semibold text-foreground-muted transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.brand.uploading}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      {`${t.brand.uploadReferenceImage} (${2 - referenceImages.length} ${t.brand.remaining})`}
                    </>
                  )}
                </button>
              </div>
            )}
            <p className="mt-1 text-[10px] text-foreground-subtle">
              {t.brand.imageFormatHint}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground-muted transition-colors duration-200 hover:bg-white/[0.05]"
        >
          {t.brand.cancel}
        </button>
        <button
          type="submit"
          disabled={saving || uploading || (!isEditing && !conceptId.trim()) || !label.trim()}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:shadow-[0_0_16px_hsl(262_83%_65%/0.3)] disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? t.brand.saveChanges : t.brand.createConcept}
        </button>
      </div>
    </form>
  );
}
