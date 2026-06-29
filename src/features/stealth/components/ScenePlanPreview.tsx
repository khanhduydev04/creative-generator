"use client";
// Client Component: displays editable plan cards with full CRUD — delete, reorder, edit all fields, add from library

import type { SceneTemplate } from "@/features/stealth/types";
import type { StealthPlanCard, StealthScenePlan } from "@/features/stealth/types";
import { useT } from "@/lib/i18n/useTranslation";
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { useState } from "react";

interface ScenePlanPreviewProps {
  planCards: StealthPlanCard[];
  onUpdatePlan: (index: number, plan: StealthScenePlan) => void;
  onRegeneratePlan: (index: number) => void;
  onDeletePlan: (index: number) => void;
  onReorderPlan: (fromIndex: number, toIndex: number) => void;
  onAddScene: (sceneId: string) => void;
  allScenes: SceneTemplate[];
  isPlanning: boolean;
}

type EditField =
  | "text"
  | "composition"
  | "surfaceContent"
  | "productPlacement"
  | null;

export function ScenePlanPreview({
  planCards,
  onUpdatePlan,
  onRegeneratePlan,
  onDeletePlan,
  onReorderPlan,
  onAddScene,
  allScenes,
  isPlanning,
}: ScenePlanPreviewProps) {
  const { t } = useT();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editField, setEditField] = useState<EditField>(null);
  const [editDraft, setEditDraft] = useState<StealthScenePlan | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  // ── Edit Handlers ──────────────────────────────────────────────
  function startEdit(index: number, field: EditField) {
    if (index < 0 || index >= planCards.length) return;
    setEditingIndex(index);
    setEditField(field);
    setEditDraft(structuredClone(planCards[index].plan));
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditField(null);
    setEditDraft(null);
  }

  function saveEdit(index: number) {
    if (!editDraft) return;
    onUpdatePlan(index, editDraft);
    cancelEdit();
  }

  // ── Used scene IDs (to mark already-in-plan scenes in add menu) ──
  const usedSceneIds = new Set(planCards.map((c) => c.plan.sceneId));

  if (planCards.length === 0 && !showAddMenu) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-foreground-subtle uppercase tracking-wider">
          {planCards.length} {planCards.length !== 1 ? t.stealth.scenePlans : t.stealth.scenePlan}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-foreground-subtle">
            {t.stealth.clickToEdit}
          </p>
          <button
            type="button"
            onClick={() => setShowAddMenu((v) => !v)}
            disabled={isPlanning}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
            {t.stealth.addScene}
          </button>
        </div>
      </div>

      {/* Add Scene Menu */}
      {showAddMenu && (
        <AddSceneMenu
          allScenes={allScenes}
          usedSceneIds={usedSceneIds}
          onAdd={(sceneId) => {
            onAddScene(sceneId);
            setShowAddMenu(false);
          }}
          onClose={() => setShowAddMenu(false)}
          isPlanning={isPlanning}
        />
      )}

      {/* Plan Cards Grid */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
        {planCards.map((card, arrayIdx) => {
          const isEditing = editingIndex === card.index;
          const isExpanded = expandedCard === card.index;

          return (
            <div
              key={card.index}
              className="bg-background-elevated rounded-xl border border-border p-4 shadow-sm relative group"
            >
              {/* Header — scene name + actions */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-foreground-subtle bg-background-elevated px-1.5 py-0.5 rounded shrink-0">
                    {card.plan.sceneId}
                  </span>
                  <span className="text-sm font-bold text-foreground truncate">
                    {card.plan.sceneName}
                  </span>
                  {/* Order badge */}
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                    #{arrayIdx + 1}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {/* Reorder */}
                  <button
                    type="button"
                    onClick={() => onReorderPlan(arrayIdx, arrayIdx - 1)}
                    disabled={arrayIdx === 0 || isPlanning}
                    className="p-1.5 rounded-lg hover:bg-background-elevated transition-colors text-foreground-subtle hover:text-foreground-muted disabled:opacity-20 disabled:cursor-not-allowed"
                    title={t.stealth.moveUp}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onReorderPlan(arrayIdx, arrayIdx + 1)}
                    disabled={arrayIdx === planCards.length - 1 || isPlanning}
                    className="p-1.5 rounded-lg hover:bg-background-elevated transition-colors text-foreground-subtle hover:text-foreground-muted disabled:opacity-20 disabled:cursor-not-allowed"
                    title={t.stealth.moveDown}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                  {/* Regenerate */}
                  <button
                    type="button"
                    onClick={() => onRegeneratePlan(card.index)}
                    disabled={isPlanning}
                    className="p-1.5 rounded-lg hover:bg-background-elevated transition-colors text-foreground-subtle hover:text-primary disabled:opacity-40"
                    title={t.stealth.regenerate}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => onDeletePlan(card.index)}
                    disabled={isPlanning}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors text-foreground-subtle hover:text-rose-500 disabled:opacity-40"
                    title={t.stealth.removeScene}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  {/* Expand/Collapse */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCard(isExpanded ? null : card.index)
                    }
                    className="p-1.5 rounded-lg hover:bg-background-elevated transition-colors text-foreground-subtle hover:text-foreground-muted"
                    title={isExpanded ? t.stealth.collapse : t.stealth.expand}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Plan sections */}
              <div className="space-y-2.5 text-xs">
                {/* Composition — editable */}
                <EditableSection
                  icon={<Camera className="h-3.5 w-3.5 text-foreground-subtle mt-0.5 shrink-0" />}
                  title={t.stealth.composition}
                  isEditing={isEditing && editField === "composition"}
                  onStartEdit={() => startEdit(card.index, "composition")}
                  onSave={() => saveEdit(card.index)}
                  onCancel={cancelEdit}
                  disabled={isPlanning}
                  display={
                    <>
                      <p className="text-foreground-subtle mt-0.5">
                        {card.plan.composition.cameraAngle} &mdash;{" "}
                        {card.plan.composition.lighting}
                      </p>
                      {isExpanded && (
                        <>
                          <p className="text-xs text-foreground-subtle mt-0.5">
                            {t.stealth.colorMood}: {card.plan.composition.colorMood}
                          </p>
                          <p className="text-xs text-foreground-subtle mt-0.5">
                            {t.stealth.settingDetail}: {card.plan.composition.settingDetail}
                          </p>
                        </>
                      )}
                    </>
                  }
                  editor={
                    editDraft && (
                      <div className="space-y-1.5 mt-1">
                        <LabeledInput
                          label={t.stealth.cameraAngle}
                          value={editDraft.composition.cameraAngle}
                          onChange={(v) =>
                            setEditDraft({
                              ...editDraft,
                              composition: {
                                ...editDraft.composition,
                                cameraAngle: v,
                              },
                            })
                          }
                        />
                        <LabeledInput
                          label={t.stealth.lighting}
                          value={editDraft.composition.lighting}
                          onChange={(v) =>
                            setEditDraft({
                              ...editDraft,
                              composition: {
                                ...editDraft.composition,
                                lighting: v,
                              },
                            })
                          }
                        />
                        <LabeledInput
                          label={t.stealth.colorMood}
                          value={editDraft.composition.colorMood}
                          onChange={(v) =>
                            setEditDraft({
                              ...editDraft,
                              composition: {
                                ...editDraft.composition,
                                colorMood: v,
                              },
                            })
                          }
                        />
                        <LabeledInput
                          label={t.stealth.settingDetail}
                          value={editDraft.composition.settingDetail}
                          onChange={(v) =>
                            setEditDraft({
                              ...editDraft,
                              composition: {
                                ...editDraft.composition,
                                settingDetail: v,
                              },
                            })
                          }
                        />
                      </div>
                    )
                  }
                />

                {/* Surface Content — editable */}
                <EditableSection
                  icon={<Eye className="h-3.5 w-3.5 text-foreground-subtle mt-0.5 shrink-0" />}
                  title={t.stealth.surfaceContent}
                  isEditing={isEditing && editField === "surfaceContent"}
                  onStartEdit={() => startEdit(card.index, "surfaceContent")}
                  onSave={() => saveEdit(card.index)}
                  onCancel={cancelEdit}
                  disabled={isPlanning}
                  display={
                    <>
                      <p className="text-foreground-subtle mt-0.5">
                        {card.plan.surfaceContent.whatViewerSees}
                      </p>
                      <p className="text-xs text-primary/70 mt-0.5">
                        {t.stealth.hook} {card.plan.surfaceContent.stopScrollHook}
                      </p>
                      {isExpanded && (
                        <p className="text-xs text-foreground-subtle mt-0.5">
                          {t.stealth.emotionLabel} {card.plan.surfaceContent.emotionalTrigger}
                        </p>
                      )}
                    </>
                  }
                  editor={
                    editDraft && (
                      <div className="space-y-1.5 mt-1">
                        <LabeledTextarea
                          label={t.stealth.whatViewerSees}
                          value={editDraft.surfaceContent.whatViewerSees}
                          onChange={(v) =>
                            setEditDraft({
                              ...editDraft,
                              surfaceContent: {
                                ...editDraft.surfaceContent,
                                whatViewerSees: v,
                              },
                            })
                          }
                        />
                        <LabeledInput
                          label={t.stealth.stopScrollHook}
                          value={editDraft.surfaceContent.stopScrollHook}
                          onChange={(v) =>
                            setEditDraft({
                              ...editDraft,
                              surfaceContent: {
                                ...editDraft.surfaceContent,
                                stopScrollHook: v,
                              },
                            })
                          }
                        />
                        <LabeledInput
                          label={t.stealth.emotionalTrigger}
                          value={editDraft.surfaceContent.emotionalTrigger}
                          onChange={(v) =>
                            setEditDraft({
                              ...editDraft,
                              surfaceContent: {
                                ...editDraft.surfaceContent,
                                emotionalTrigger: v,
                              },
                            })
                          }
                        />
                      </div>
                    )
                  }
                />

                {/* Product Placement — editable */}
                <EditableSection
                  icon={<MapPin className="h-3.5 w-3.5 text-foreground-subtle mt-0.5 shrink-0" />}
                  title={t.stealth.productPlacement}
                  isEditing={isEditing && editField === "productPlacement"}
                  onStartEdit={() =>
                    startEdit(card.index, "productPlacement")
                  }
                  onSave={() => saveEdit(card.index)}
                  onCancel={cancelEdit}
                  disabled={isPlanning}
                  display={
                    <>
                      <p className="text-foreground-subtle mt-0.5">
                        {card.plan.productPlacement.integrationMethod}
                      </p>
                      <p className="text-xs text-foreground-subtle mt-0.5">
                        {t.stealth.position} {card.plan.productPlacement.locationInFrame}{" "}
                        &mdash; {t.stealth.size} {card.plan.productPlacement.sizeRelative}
                      </p>
                      {isExpanded && (
                        <>
                          <p className="text-xs text-foreground-subtle mt-0.5">
                            {t.stealth.labelField} {card.plan.productPlacement.labelVisibility}
                          </p>
                          <p className="text-xs text-foreground-subtle mt-0.5">
                            {t.stealth.whyNatural}{" "}
                            {card.plan.productPlacement.naturalJustification}
                          </p>
                        </>
                      )}
                    </>
                  }
                  editor={
                    editDraft && (
                      <div className="space-y-1.5 mt-1">
                        <LabeledTextarea
                          label={t.stealth.integrationMethod}
                          value={editDraft.productPlacement.integrationMethod}
                          onChange={(v) =>
                            setEditDraft({
                              ...editDraft,
                              productPlacement: {
                                ...editDraft.productPlacement,
                                integrationMethod: v,
                              },
                            })
                          }
                        />
                        <LabeledInput
                          label={t.stealth.locationInFrame}
                          value={editDraft.productPlacement.locationInFrame}
                          onChange={(v) =>
                            setEditDraft({
                              ...editDraft,
                              productPlacement: {
                                ...editDraft.productPlacement,
                                locationInFrame: v,
                              },
                            })
                          }
                        />
                        <LabeledInput
                          label={t.stealth.sizeRelative}
                          value={editDraft.productPlacement.sizeRelative}
                          onChange={(v) =>
                            setEditDraft({
                              ...editDraft,
                              productPlacement: {
                                ...editDraft.productPlacement,
                                sizeRelative: v,
                              },
                            })
                          }
                        />
                        <LabeledInput
                          label={t.stealth.labelVisibility}
                          value={editDraft.productPlacement.labelVisibility}
                          onChange={(v) =>
                            setEditDraft({
                              ...editDraft,
                              productPlacement: {
                                ...editDraft.productPlacement,
                                labelVisibility: v,
                              },
                            })
                          }
                        />
                        <LabeledTextarea
                          label={t.stealth.naturalJustification}
                          value={
                            editDraft.productPlacement.naturalJustification
                          }
                          onChange={(v) =>
                            setEditDraft({
                              ...editDraft,
                              productPlacement: {
                                ...editDraft.productPlacement,
                                naturalJustification: v,
                              },
                            })
                          }
                        />
                      </div>
                    )
                  }
                />

                {/* Text in Image — editable */}
                <EditableSection
                  icon={<Type className="h-3.5 w-3.5 text-foreground-subtle mt-0.5 shrink-0" />}
                  title={t.stealth.textInImage}
                  isEditing={isEditing && editField === "text"}
                  onStartEdit={() => startEdit(card.index, "text")}
                  onSave={() => saveEdit(card.index)}
                  onCancel={cancelEdit}
                  disabled={isPlanning}
                  display={
                    <>
                      <p className="text-foreground-subtle mt-0.5 whitespace-pre-line line-clamp-4">
                        {card.plan.textInImage.textContent}
                      </p>
                      <p className="text-xs text-foreground-subtle mt-0.5">
                        {t.stealth.textStyle}: {card.plan.textInImage.textStyle}
                      </p>
                      {isExpanded && (
                        <>
                          <p className="text-xs text-foreground-subtle mt-0.5">
                            {t.stealth.textType}: {card.plan.textInImage.textType}
                          </p>
                          <p className="text-xs text-foreground-subtle mt-0.5">
                            {t.stealth.textPlacement}: {card.plan.textInImage.textPlacement}
                          </p>
                        </>
                      )}
                    </>
                  }
                  editor={
                    editDraft && (
                      <div className="space-y-1.5 mt-1">
                        <LabeledTextarea
                          label={t.stealth.textContent}
                          value={editDraft.textInImage.textContent}
                          onChange={(v) =>
                            setEditDraft({
                              ...editDraft,
                              textInImage: {
                                ...editDraft.textInImage,
                                textContent: v,
                              },
                            })
                          }
                          rows={3}
                        />
                        <LabeledInput
                          label={t.stealth.textStyle}
                          value={editDraft.textInImage.textStyle}
                          onChange={(v) =>
                            setEditDraft({
                              ...editDraft,
                              textInImage: {
                                ...editDraft.textInImage,
                                textStyle: v,
                              },
                            })
                          }
                        />
                        <LabeledInput
                          label={t.stealth.textType}
                          value={editDraft.textInImage.textType}
                          onChange={(v) =>
                            setEditDraft({
                              ...editDraft,
                              textInImage: {
                                ...editDraft.textInImage,
                                textType: v,
                              },
                            })
                          }
                        />
                        <LabeledInput
                          label={t.stealth.textPlacement}
                          value={editDraft.textInImage.textPlacement}
                          onChange={(v) =>
                            setEditDraft({
                              ...editDraft,
                              textInImage: {
                                ...editDraft.textInImage,
                                textPlacement: v,
                              },
                            })
                          }
                        />
                      </div>
                    )
                  }
                />

                {/* Tags (read-only) */}
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-foreground-subtle shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 py-0.5 bg-background-elevated text-foreground-muted text-[10px] font-semibold rounded-full">
                      {card.plan.surfaceContent.emotionalTrigger}
                    </span>
                    {card.plan.generation.styleKeywords.slice(0, 3).map((kw) => (
                      <span
                        key={kw}
                        className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded-full"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Editable Section Component ──────────────────────────────────────────────

interface EditableSectionProps {
  icon: React.ReactNode;
  title: string;
  display: React.ReactNode;
  editor: React.ReactNode;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  disabled: boolean;
}

function EditableSection({
  icon,
  title,
  display,
  editor,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  disabled,
}: EditableSectionProps) {
  const { t } = useT();
  return (
    <div className="flex items-start gap-2">
      {icon}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-foreground-muted">{title}</p>
          {isEditing ? (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={onSave}
                className="p-1 rounded-md bg-primary text-white hover:opacity-90"
                title={t.stealth.save}
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="p-1 rounded-md border border-border text-foreground-muted hover:bg-background-subtle"
                title={t.stealth.cancel}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onStartEdit}
              disabled={disabled}
              className="p-1 rounded-md hover:bg-background-elevated text-foreground-subtle hover:text-primary transition-colors disabled:opacity-40"
              title={`${t.stealth.edit} ${title}`}
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>
        {isEditing ? editor : display}
      </div>
    </div>
  );
}

// ─── Add Scene Menu ──────────────────────────────────────────────────────────

interface AddSceneMenuProps {
  allScenes: SceneTemplate[];
  usedSceneIds: Set<string>;
  onAdd: (sceneId: string) => void;
  onClose: () => void;
  isPlanning: boolean;
}

function AddSceneMenu({
  allScenes,
  usedSceneIds,
  onAdd,
  onClose,
  isPlanning,
}: AddSceneMenuProps) {
  const { t } = useT();
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categoryLabels: Record<string, string> = {
    HUM: t.stealth.humanCentric,
    ENV: t.stealth.environment,
    FMT: t.stealth.contentFormat,
    STR: t.stealth.story,
  };

  const filtered =
    filterCategory === "all"
      ? allScenes
      : allScenes.filter((s) => s.category === filterCategory);

  return (
    <div className="bg-background-elevated rounded-xl border border-border shadow-lg mb-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <p className="text-xs font-bold text-foreground-muted">{t.stealth.addSceneToPlan}</p>
        <div className="flex items-center gap-2">
          {/* Category filter */}
          <div className="flex gap-1">
            {["all", "HUM", "ENV", "FMT", "STR"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-1 rounded-md text-xs font-bold transition-colors ${
                  filterCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-background-elevated text-foreground-muted hover:bg-background-elevated"
                }`}
              >
                {cat === "all" ? t.stealth.filterAll : cat}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-background-elevated text-foreground-subtle"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scene list */}
      <div className="max-h-[280px] overflow-y-auto divide-y divide-border-subtle">
        {filtered.map((scene) => {
          const isUsed = usedSceneIds.has(scene.id);
          return (
            <div
              key={scene.id}
              className={`flex items-center justify-between px-4 py-2.5 ${
                isUsed ? "bg-background-subtle opacity-50" : "hover:bg-background-subtle"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-foreground-subtle bg-background-elevated px-1 py-0.5 rounded shrink-0">
                    {scene.id}
                  </span>
                  <span className="text-xs font-bold text-foreground-subtle shrink-0">
                    {categoryLabels[scene.category] ?? scene.category}
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground-muted mt-0.5">
                  {scene.name}
                </p>
                <p className="text-xs text-foreground-subtle line-clamp-1">
                  {scene.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAdd(scene.id)}
                disabled={isUsed || isPlanning}
                className="shrink-0 ml-3 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-primary/10 text-primary hover:bg-primary hover:text-white"
              >
                {isUsed ? t.stealth.inPlan : t.stealth.addToButton}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Form Primitives ─────────────────────────────────────────────────────────

interface LabeledInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function LabeledInput({ label, value, onChange }: LabeledInputProps) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-foreground-muted block mb-0.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded-lg border border-border text-xs text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
      />
    </div>
  );
}

interface LabeledTextareaProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}

function LabeledTextarea({
  label,
  value,
  onChange,
  rows = 2,
}: LabeledTextareaProps) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-foreground-muted block mb-0.5">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-2 py-1.5 rounded-lg border border-border text-xs text-foreground-muted resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
      />
    </div>
  );
}
