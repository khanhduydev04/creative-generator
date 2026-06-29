"use client";
// Client Component: scene selection with auto/manual radio, grouped checkboxes, and custom scene CRUD

import type { SceneTemplate } from "@/features/stealth/types";
import { getScenesByCategory } from "@/lib/stealth-scenes";
import { useT } from "@/lib/i18n/useTranslation";
import { Clapperboard, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

type SceneCategory = "ENV" | "FMT" | "STR" | "HUM";

interface CustomSceneInput {
  scene_id: string;
  category: SceneCategory;
  name: string;
  description: string;
  placement_method: string;
  best_for_products: string[];
  best_for_audiences: string[];
}

/** DB row shape for custom scenes (matches API response) */
export interface CustomSceneRow {
  id: string;
  brand_id: string;
  scene_id: string;
  category: string;
  name: string;
  description: string;
  placement_method: string;
  best_for_products: string[];
  best_for_audiences: string[];
  created_at: string;
  updated_at: string;
}

interface SceneSelectionSectionProps {
  mode: "auto" | "manual";
  selectedSceneIds: string[];
  allScenes: SceneTemplate[];
  customScenes: CustomSceneRow[];
  onModeChange: (mode: "auto" | "manual") => void;
  onScenesChange: (ids: string[]) => void;
  onCreateScene: (input: CustomSceneInput) => Promise<void>;
  onUpdateScene: (id: string, input: Partial<CustomSceneInput>) => Promise<void>;
  onDeleteScene: (id: string) => Promise<void>;
}

const EMPTY_FORM: CustomSceneInput = {
  scene_id: "",
  category: "ENV",
  name: "",
  description: "",
  placement_method: "",
  best_for_products: [],
  best_for_audiences: [],
};

export function SceneSelectionSection({
  mode,
  selectedSceneIds,
  allScenes,
  customScenes,
  onModeChange,
  onScenesChange,
  onCreateScene,
  onUpdateScene,
  onDeleteScene,
}: SceneSelectionSectionProps) {
  const { t } = useT();
  const [showCustomManager, setShowCustomManager] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomSceneInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState({ products: "", audiences: "" });

  const categories = [
    { key: "HUM" as const, label: t.stealth.humanCentric, description: t.stealth.humanCentricDesc },
    { key: "ENV" as const, label: t.stealth.environment, description: t.stealth.environmentDesc },
    { key: "FMT" as const, label: t.stealth.contentFormat, description: t.stealth.contentFormatDesc },
    { key: "STR" as const, label: t.stealth.story, description: t.stealth.storyDesc },
  ];

  function handleToggle(id: string) {
    if (selectedSceneIds.includes(id)) {
      onScenesChange(selectedSceneIds.filter((sid) => sid !== id));
    } else {
      onScenesChange([...selectedSceneIds, id]);
    }
  }

  function handleToggleCategory(category: SceneCategory) {
    const categoryIds = getScenesByCategory(category, allScenes).map((s) => s.id);
    const allSelected = categoryIds.every((id) => selectedSceneIds.includes(id));
    if (allSelected) {
      onScenesChange(selectedSceneIds.filter((id) => !categoryIds.includes(id)));
    } else {
      const merged = new Set([...selectedSceneIds, ...categoryIds]);
      onScenesChange(Array.from(merged));
    }
  }

  function openCreateForm() {
    const nextNum = customScenes.length + 1;
    setForm({ ...EMPTY_FORM, scene_id: `CUSTOM_${String(nextNum).padStart(2, "0")}` });
    setTagsInput({ products: "", audiences: "" });
    setEditingId(null);
    setFormOpen(true);
  }

  function openEditForm(row: CustomSceneRow) {
    setForm({
      scene_id: row.scene_id,
      category: row.category as SceneCategory,
      name: row.name,
      description: row.description,
      placement_method: row.placement_method,
      best_for_products: row.best_for_products,
      best_for_audiences: row.best_for_audiences,
    });
    setTagsInput({
      products: row.best_for_products.join(", "),
      audiences: row.best_for_audiences.join(", "),
    });
    setEditingId(row.id);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit() {
    if (!form.scene_id || !form.name || !form.description || !form.placement_method) return;

    setSaving(true);
    const input: CustomSceneInput = {
      ...form,
      best_for_products: tagsInput.products
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      best_for_audiences: tagsInput.audiences
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      if (editingId) {
        await onUpdateScene(editingId, input);
      } else {
        await onCreateScene(input);
      }
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await onDeleteScene(id);
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border-strong/20 bg-background-elevated/50 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-border-strong/30">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Clapperboard className="h-3.5 w-3.5 text-primary" />
        </div>
        {t.stealth.sceneSelection}
        {mode === "manual" && selectedSceneIds.length > 0 && (
          <span className="ml-auto text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {selectedSceneIds.length} {t.stealth.selected}
          </span>
        )}
      </h3>

      {/* Mode radio */}
      <div className="space-y-2 mb-4">
        <label className="flex items-center gap-3 p-2.5 rounded-lg bg-background-subtle border border-border-subtle cursor-pointer hover:bg-background-elevated transition-colors">
          <input
            type="radio"
            name="sceneMode"
            checked={mode === "auto"}
            onChange={() => onModeChange("auto")}
            className="accent-primary w-4 h-4"
          />
          <div>
            <span className="text-sm font-semibold text-foreground-muted">{t.stealth.aiAutoSelect}</span>
            <p className="text-xs text-foreground-subtle">{t.stealth.aiAutoSelectDesc}</p>
          </div>
        </label>
        <label className="flex items-center gap-3 p-2.5 rounded-lg bg-background-subtle border border-border-subtle cursor-pointer hover:bg-background-elevated transition-colors">
          <input
            type="radio"
            name="sceneMode"
            checked={mode === "manual"}
            onChange={() => onModeChange("manual")}
            className="accent-primary w-4 h-4"
          />
          <div>
            <span className="text-sm font-semibold text-foreground-muted">{t.stealth.pickScenes}</span>
            <p className="text-xs text-foreground-subtle">{t.stealth.pickScenesDesc}</p>
          </div>
        </label>
      </div>

      {/* Scene checkboxes (manual mode only) */}
      {mode === "manual" && (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
          {categories.map((cat) => {
            const scenes = getScenesByCategory(cat.key, allScenes);
            const catSelected = scenes.filter((s) => selectedSceneIds.includes(s.id)).length;
            const allSelected = catSelected === scenes.length && scenes.length > 0;

            return (
              <div key={cat.key}>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => handleToggleCategory(cat.key)}
                    className="accent-primary w-3.5 h-3.5 rounded"
                  />
                  <span className="text-xs font-bold text-foreground-muted">{cat.label}</span>
                  <span className="text-xs text-foreground-subtle">
                    — {cat.description} ({catSelected}/{scenes.length})
                  </span>
                </label>
                <div className="space-y-1 ml-1">
                  {scenes.map((scene) => {
                    const isSelected = selectedSceneIds.includes(scene.id);
                    return (
                      <label
                        key={scene.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/5 border border-primary/20"
                            : "hover:bg-background-subtle border border-transparent"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggle(scene.id)}
                          className="accent-primary w-3.5 h-3.5 rounded mt-0.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground">
                            <span className="text-xs text-foreground-subtle font-mono mr-1">{scene.id}</span>
                            {scene.name}
                            {scene.isCustom && (
                              <span className="ml-1.5 text-[10px] font-semibold text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                                {t.stealth.custom}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-foreground-subtle mt-0.5">{scene.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === "auto" && (
        <p className="text-xs text-foreground-subtle mt-1">
          {t.stealth.aiWillChoose.replace("{0}", String(allScenes.length))}
        </p>
      )}

      {/* ── Custom Scenes Manager ────────────────────────────── */}
      <div className="mt-4 border-t border-border-subtle pt-4">
        <button
          type="button"
          onClick={() => setShowCustomManager(!showCustomManager)}
          className="flex items-center gap-2 text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors w-full"
        >
          {showCustomManager ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {t.stealth.manageCustomScenes}
          {customScenes.length > 0 && (
            <span className="text-[10px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded ml-1">
              {customScenes.length}
            </span>
          )}
        </button>

        {showCustomManager && (
          <div className="mt-3 space-y-2">
            {/* Existing custom scenes */}
            {customScenes.map((row) => (
              <div
                key={row.id}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/[0.06] border border-warning/20"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">
                    <span className="text-xs text-amber-600 font-mono mr-1">{row.scene_id}</span>
                    {row.name}
                    <span className="ml-1 text-[10px] text-foreground-subtle">({row.category})</span>
                  </p>
                  <p className="text-xs text-foreground-subtle mt-0.5">{row.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openEditForm(row)}
                  className="p-1 text-foreground-subtle hover:text-foreground-muted transition-colors shrink-0"
                  title={t.stealth.editScene}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(row.id)}
                  className="p-1 text-foreground-subtle hover:text-rose-500 transition-colors shrink-0"
                  title={t.stealth.deleteScene}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {customScenes.length === 0 && !formOpen && (
              <p className="text-xs text-foreground-subtle py-2">{t.stealth.noCustomScenesYet}</p>
            )}

            {/* Add/Edit form */}
            {formOpen ? (
              <div className="p-3 rounded-lg bg-background-subtle border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground-muted">
                    {editingId ? t.stealth.editScene : t.stealth.newCustomScene}
                  </p>
                  <button type="button" onClick={closeForm} className="text-foreground-subtle hover:text-foreground-muted">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-foreground-muted block mb-1">{t.stealth.sceneId}</label>
                    <input
                      type="text"
                      value={form.scene_id}
                      onChange={(e) => setForm((f) => ({ ...f, scene_id: e.target.value }))}
                      placeholder={t.stealth.sceneIdPlaceholder}
                      className="w-full rounded-md border border-border bg-background-elevated px-2 py-1.5 text-xs text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-foreground-muted block mb-1">{t.stealth.category}</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as SceneCategory }))}
                      className="w-full rounded-md border border-border bg-background-elevated px-2 py-1.5 text-xs text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="ENV">{t.stealth.categoryEnv}</option>
                      <option value="FMT">{t.stealth.categoryFmt}</option>
                      <option value="STR">{t.stealth.categoryStr}</option>
                      <option value="HUM">{t.stealth.categoryHum}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-foreground-muted block mb-1">{t.stealth.name}</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder={t.stealth.namePlaceholder}
                    className="w-full rounded-md border border-border bg-background-elevated px-2 py-1.5 text-xs text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-foreground-muted block mb-1">{t.stealth.description}</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder={t.stealth.descriptionPlaceholder}
                    rows={2}
                    className="w-full rounded-md border border-border bg-background-elevated px-2 py-1.5 text-xs text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-foreground-muted block mb-1">{t.stealth.placementMethod}</label>
                  <input
                    type="text"
                    value={form.placement_method}
                    onChange={(e) => setForm((f) => ({ ...f, placement_method: e.target.value }))}
                    placeholder={t.stealth.placementPlaceholder}
                    className="w-full rounded-md border border-border bg-background-elevated px-2 py-1.5 text-xs text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-foreground-muted block mb-1">
                    {t.stealth.bestForProducts}
                  </label>
                  <input
                    type="text"
                    value={tagsInput.products}
                    onChange={(e) => setTagsInput((t) => ({ ...t, products: e.target.value }))}
                    placeholder={t.stealth.bestForProductsPlaceholder}
                    className="w-full rounded-md border border-border bg-background-elevated px-2 py-1.5 text-xs text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-foreground-muted block mb-1">
                    {t.stealth.bestForAudiences}
                  </label>
                  <input
                    type="text"
                    value={tagsInput.audiences}
                    onChange={(e) => setTagsInput((t) => ({ ...t, audiences: e.target.value }))}
                    placeholder={t.stealth.bestForAudiencesPlaceholder}
                    className="w-full rounded-md border border-border bg-background-elevated px-2 py-1.5 text-xs text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={saving || !form.scene_id || !form.name || !form.description || !form.placement_method}
                  className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? t.stealth.saving : editingId ? t.stealth.updateScene : t.stealth.createSceneBtn}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openCreateForm}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors mt-1"
              >
                <Plus className="h-3.5 w-3.5" />
                {t.stealth.addCustomScene}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
