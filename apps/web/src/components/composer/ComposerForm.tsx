"use client";

import { useMemo, useState, useTransition } from "react";

import { assembleDisplayName } from "@wildloom/combat";
import {
  AFFINITY_COLOR_HEX,
  AFFINITY_DISPLAY_NAME,
  AFFINITY_IDS,
  MOVE_CATEGORIES,
  type AccumulatorKey,
  type AffinityID,
  type ModalityWeights,
  type MoveCategory,
  type MoveInstance,
} from "@wildloom/types";

import { saveMoveAction } from "@/app/app/composer/[creatureId]/actions";

interface FrameLite {
  id: string;
  category: MoveCategory;
  display_seed: string;
}

interface ComposerFormProps {
  creatureId: string;
  initialMove: MoveInstance;
  slot: number;
  frames: FrameLite[];
}

const ACCUMULATOR_KEYS: AccumulatorKey[] = [
  "fracture",
  "heat_load",
  "wetness",
  "concussion",
  "charge_buildup",
  "corrosion",
];

export default function ComposerForm({
  creatureId,
  initialMove,
  slot,
  frames,
}: ComposerFormProps) {
  const [move, setMove] = useState<MoveInstance>(initialMove);
  const [pending, startTransition] = useTransition();
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const livePreview = useMemo(() => {
    try {
      return assembleDisplayName(move);
    } catch {
      return "(invalid frame)";
    }
  }, [move]);

  const framesForCategory = frames.filter((f) => f.category === move.category);

  function patch(p: Partial<MoveInstance>) {
    setMove((m) => ({ ...m, ...p }));
    setSavedMessage(null);
  }

  function patchOmega(
    field: "strike_modalities" | "delivery_modalities",
    key: keyof ModalityWeights,
    value: number,
  ) {
    setMove((m) => {
      const omega = { ...m[field], [key]: value };
      const sum = omega.concussive + omega.piercing + omega.slashing;
      const norm =
        sum > 0
          ? {
              concussive: omega.concussive / sum,
              piercing: omega.piercing / sum,
              slashing: omega.slashing / sum,
            }
          : { concussive: 1 / 3, piercing: 1 / 3, slashing: 1 / 3 };
      return { ...m, [field]: norm };
    });
    setSavedMessage(null);
  }

  function patchOutcome(
    key: "endurance_share" | "status_guard_shred_share" | "status_delivery_share" | "utility_field_share" | "utility_pressure_share",
    value: number,
  ) {
    setMove((m) => {
      const next = { ...m, [key]: value };
      const sum =
        next.endurance_share +
        next.status_guard_shred_share +
        next.status_delivery_share +
        next.utility_field_share +
        next.utility_pressure_share;
      if (sum > 0) {
        const f = 1 / sum;
        next.endurance_share *= f;
        next.status_guard_shred_share *= f;
        next.status_delivery_share *= f;
        next.utility_field_share *= f;
        next.utility_pressure_share *= f;
      }
      return next;
    });
    setSavedMessage(null);
  }

  function save() {
    startTransition(async () => {
      const next = { ...move, system_display_title: livePreview };
      const res = await saveMoveAction({ creatureId, slot, payload: next });
      setSavedMessage(res.ok ? `Saved at ${new Date().toLocaleTimeString()}` : `Error: ${res.error}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-wild-accent/40 bg-wild-ink/40 p-4">
        <p className="font-pixel text-[9px] uppercase tracking-[0.3em] text-wild-accent">
          Live preview · slot {slot + 1}
        </p>
        <p className="mt-1 text-2xl font-semibold text-wild-parch">{livePreview}</p>
        <p className="mt-1 text-xs text-wild-parch/60">
          {move.category} · {move.frame_id} · bp {move.base_power} · acc {Math.round(move.accuracy)} · cd {move.cooldown_turns}
        </p>
      </div>

      {/* Panel 1: Category */}
      <Panel title="1 · Category">
        <div className="flex flex-wrap gap-2">
          {MOVE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                const firstFrame = frames.find((f) => f.category === c);
                patch({
                  category: c,
                  frame_id: firstFrame?.id ?? move.frame_id,
                });
              }}
              className={cls(
                "rounded-md border px-3 py-1.5 text-xs uppercase tracking-wide",
                move.category === c
                  ? "border-wild-accent bg-wild-accent/15 text-wild-accent"
                  : "border-wild-parch/15 text-wild-parch/70 hover:border-wild-parch/40",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </Panel>

      {/* Panel 2: Frame */}
      <Panel title="2 · Frame">
        <select
          className="w-full rounded-md border border-wild-parch/15 bg-wild-ink/60 px-3 py-2 text-sm text-wild-parch"
          value={move.frame_id}
          onChange={(e) => patch({ frame_id: e.target.value })}
        >
          {framesForCategory.length === 0 ? (
            <option value={move.frame_id}>{move.frame_id}</option>
          ) : (
            framesForCategory.map((f) => (
              <option key={f.id} value={f.id}>
                {f.display_seed} ({f.id})
              </option>
            ))
          )}
        </select>
      </Panel>

      {/* Panel 3: Affinity */}
      <Panel title="3 · Affinity">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AffinityPicker
            label="Primary"
            value={move.primary_affinity}
            onChange={(a) => patch({ primary_affinity: a ?? undefined })}
            allowNone
          />
          <AffinityPicker
            label="Secondary"
            value={move.secondary_affinity}
            onChange={(a) => patch({ secondary_affinity: a ?? undefined })}
            allowNone
          />
        </div>
        <Slider
          label={`Blend η = ${move.blend_eta.toFixed(2)}`}
          min={0}
          max={0.5}
          step={0.01}
          value={move.blend_eta}
          onChange={(v) => patch({ blend_eta: v })}
        />
      </Panel>

      {/* Panel 4: Payload */}
      <Panel title="4 · Payload split">
        <Slider
          label={`Kinetic share W_k = ${move.kinetic_share.toFixed(2)} · Energetic W_e = ${(1 - move.kinetic_share).toFixed(2)}`}
          min={0}
          max={1}
          step={0.01}
          value={move.kinetic_share}
          onChange={(v) => patch({ kinetic_share: v })}
        />
        <ModalitySimplex
          label="Strike modalities ω (kinetic)"
          weights={move.strike_modalities}
          onChange={(k, v) => patchOmega("strike_modalities", k, v)}
        />
        <ModalitySimplex
          label="Delivery modalities ω (energetic)"
          weights={move.delivery_modalities}
          onChange={(k, v) => patchOmega("delivery_modalities", k, v)}
        />
        <Slider
          label={`Pierce λ = ${move.pierce.toFixed(2)}`}
          min={0}
          max={0.8}
          step={0.01}
          value={move.pierce}
          onChange={(v) => patch({ pierce: v })}
        />
      </Panel>

      {/* Panel 5: Potency */}
      <Panel title="5 · Potency">
        <Slider
          label={`Base power = ${move.base_power}`}
          min={20}
          max={150}
          step={1}
          value={move.base_power}
          onChange={(v) => patch({ base_power: v })}
        />
        <Slider
          label={`Accuracy = ${Math.round(move.accuracy)}`}
          min={50}
          max={100}
          step={1}
          value={move.accuracy}
          onChange={(v) => patch({ accuracy: v })}
        />
        <Slider
          label={`Cooldown turns = ${move.cooldown_turns}`}
          min={0}
          max={6}
          step={1}
          value={move.cooldown_turns}
          onChange={(v) => patch({ cooldown_turns: v })}
        />
      </Panel>

      {/* Panel 6: Outcome budget */}
      <Panel title="6 · Outcome budget (sums to 1.0)">
        <BudgetSlider label="Endurance α" value={move.endurance_share} onChange={(v) => patchOutcome("endurance_share", v)} />
        <BudgetSlider label="Guard shred β" value={move.status_guard_shred_share} onChange={(v) => patchOutcome("status_guard_shred_share", v)} />
        <BudgetSlider label="Status delivery γ" value={move.status_delivery_share} onChange={(v) => patchOutcome("status_delivery_share", v)} />
        <BudgetSlider label="Field φ" value={move.utility_field_share} onChange={(v) => patchOutcome("utility_field_share", v)} />
        <BudgetSlider label="Pressure ψ" value={move.utility_pressure_share} onChange={(v) => patchOutcome("utility_pressure_share", v)} />
      </Panel>

      {/* Panel 7: Effects */}
      <Panel title="7 · Effects">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {ACCUMULATOR_KEYS.map((k) => (
            <label key={k} className="flex flex-col gap-1 text-xs text-wild-parch/70">
              <span className="font-pixel text-[9px] uppercase tracking-[0.2em]">{k}</span>
              <input
                type="number"
                step="0.01"
                min={0}
                max={0.6}
                value={move.accumulator_impulses[k] ?? 0}
                onChange={(e) =>
                  patch({
                    accumulator_impulses: {
                      ...move.accumulator_impulses,
                      [k]: Number(e.target.value) || 0,
                    },
                  })
                }
                className="rounded-md border border-wild-parch/15 bg-wild-ink/60 px-2 py-1 text-sm text-wild-parch"
              />
            </label>
          ))}
        </div>
      </Panel>

      <div className="flex items-center gap-3 sticky bottom-0 bg-wild-ink/95 py-3 -mx-2 px-2 backdrop-blur">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md bg-wild-accent px-4 py-2 text-sm font-semibold text-wild-ink disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save move"}
        </button>
        {savedMessage && <span className="text-xs text-wild-parch/70">{savedMessage}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-wild-parch/10 bg-wild-parch/5 p-4">
      <h3 className="font-pixel text-[9px] uppercase tracking-[0.3em] text-wild-accent">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-wild-parch/70">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-wild-accent"
      />
    </label>
  );
}

function BudgetSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Slider
      label={`${label} = ${(value * 100).toFixed(0)}%`}
      min={0}
      max={1}
      step={0.01}
      value={value}
      onChange={onChange}
    />
  );
}

function AffinityPicker({
  label,
  value,
  onChange,
  allowNone = false,
}: {
  label: string;
  value: AffinityID | undefined;
  onChange: (v: AffinityID | null) => void;
  allowNone?: boolean;
}) {
  return (
    <div>
      <p className="font-pixel text-[9px] uppercase tracking-[0.2em] text-wild-parch/60">
        {label}
      </p>
      <div className="mt-1 grid grid-cols-6 gap-1">
        {allowNone && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className={cls(
              "rounded-md border px-1.5 py-1 text-[10px] uppercase",
              value == null
                ? "border-wild-accent bg-wild-accent/15 text-wild-accent"
                : "border-wild-parch/15 text-wild-parch/60 hover:border-wild-parch/40",
            )}
          >
            none
          </button>
        )}
        {AFFINITY_IDS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange(a)}
            title={AFFINITY_DISPLAY_NAME[a]}
            className={cls(
              "rounded-md border px-1.5 py-1 text-[10px] font-bold",
              value === a
                ? "border-wild-accent text-wild-parch"
                : "border-wild-parch/15 text-wild-parch/70",
            )}
            style={{ backgroundColor: value === a ? AFFINITY_COLOR_HEX[a] : "transparent" }}
          >
            {a}
          </button>
        ))}
      </div>
    </div>
  );
}

function ModalitySimplex({
  label,
  weights,
  onChange,
}: {
  label: string;
  weights: ModalityWeights;
  onChange: (k: keyof ModalityWeights, v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-wild-parch/70">{label}</p>
      {(["concussive", "piercing", "slashing"] as const).map((k) => (
        <Slider
          key={k}
          label={`${k} = ${weights[k].toFixed(2)}`}
          min={0}
          max={1}
          step={0.01}
          value={weights[k]}
          onChange={(v) => onChange(k, v)}
        />
      ))}
    </div>
  );
}

function cls(...parts: (string | undefined | null | false)[]) {
  return parts.filter(Boolean).join(" ");
}
