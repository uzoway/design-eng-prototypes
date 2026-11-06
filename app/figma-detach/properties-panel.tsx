"use client";

import { type ReactNode } from "react";
import { LIBRARY } from "./data";
import {
  AlignBottomIcon,
  AlignHCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignTopIcon,
  AlignVCenterIcon,
  AngleIcon,
  ChevronDownIcon,
  ClipIcon,
  DistributeIcon,
  EyeIcon,
  FlipHIcon,
  FlipVIcon,
  FocusIcon,
  GoToMainIcon,
  InstanceIcon,
  InstanceOptionsIcon,
  MinusIcon,
  MoreIcon,
  OpacityIcon,
  PlayIcon,
  PlusIcon,
  RadiusIcon,
  RotateIcon,
  StylesIcon,
} from "./icons";
import { componentOf, type Scene } from "./scene";

/* Fills and radii for each layer, as the file defines them. */
const FILLS: Record<string, string> = {
  checkout: "FFFFFF",
  "top-bar": "FFFFFF",
  avatar: "E8ECFF",
  badge: "E6F6EC",
  card: "FFFFFF",
  email: "FFFFFF",
  "card-number": "FFFFFF",
  "name-on-card": "FFFFFF",
  button: "3B5BDB",
  logo: "FFFFFF",
  title: "111318",
  payment: "111318",
  "card-icon": "5B6170",
};

const RADII: Record<string, number> = { avatar: 16, badge: 10, card: 12, button: 10 };

type PropertiesPanelProps = {
  scene: Scene;
  selection: string[];
  zoom: number;
  canvasColor: string;
};

export function PropertiesPanel({ scene, selection, zoom, canvasColor }: PropertiesPanelProps) {
  const ids = selection.filter((id) => scene[id]);
  const single = ids.length === 1 ? scene[ids[0]] : null;

  return (
    <section className="fd-right" aria-label="Properties">
      <div className="fd-right-top" aria-hidden="true">
        <span className="fd-viewer">S</span>
        <span className="fd-right-spacer" />
        <span className="fd-icon-button">
          <PlayIcon />
        </span>
        <span className="fd-share">Share</span>
      </div>

      <div className="fd-right-tabs" aria-hidden="true">
        <span className="fd-tab" data-active="">
          Design
        </span>
        <span className="fd-tab">Prototype</span>
        <span className="fd-right-spacer" />
        <span className="fd-zoom">
          {Math.round(zoom * 100)}%
          <ChevronDownIcon />
        </span>
      </div>

      <div className="fd-props">
        {ids.length === 0 && <PageProps canvasColor={canvasColor} />}
        {single && <LayerProps scene={scene} id={single.id} />}
        {ids.length > 1 && <MixedProps count={ids.length} />}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */

function PageProps({ canvasColor }: { canvasColor: string }) {
  return (
    <>
      <Section title="Page">
        <div className="fd-prop-grid">
          <Swatch color={canvasColor} />
          <span className="fd-field-value fd-span-1">100%</span>
          <span className="fd-icon-button fd-col-icon" aria-hidden="true">
            <EyeIcon />
          </span>
        </div>
      </Section>
      <Section title="Variables" action={<StylesIcon />} />
      <Section title="Styles" action={<PlusIcon />} />
      <Section title="Export" action={<PlusIcon />} />
    </>
  );
}

function MixedProps({ count }: { count: number }) {
  return (
    <>
      <div className="fd-props-head">
        <div className="fd-props-title-row">
          <h2 className="fd-props-title">
            Mixed
            <ChevronDownIcon />
          </h2>
        </div>
        <p className="fd-props-sub">{count} layers selected</p>
      </div>
      <PositionSection x="Mixed" y="Mixed" />
      <Section title="Appearance">
        <AppearanceRow radius="Mixed" />
      </Section>
    </>
  );
}

function LayerProps({ scene, id }: { scene: Scene; id: string }) {
  const node = scene[id];
  const component = node.type === "instance" ? componentOf(scene, id) : null;
  const fill = FILLS[id] ?? "FFFFFF";
  const radius = String(RADII[id] ?? 0);

  return (
    <>
      {component ? (
        <div className="fd-props-head">
          <div className="fd-props-title-row">
            <h2 className="fd-props-title">
              {component.name}
              <ChevronDownIcon />
            </h2>
            <span className="fd-props-actions" aria-hidden="true">
              <span className="fd-icon-button">
                <InstanceOptionsIcon />
              </span>
              <span className="fd-icon-button">
                <GoToMainIcon />
              </span>
              <span className="fd-icon-button">
                <MoreIcon />
              </span>
            </span>
          </div>
          <p className="fd-props-sub">
            {component.library === "local" ? "From this file" : LIBRARY}
            <InstanceIcon size={20} aria-hidden="true" />
          </p>
          <dl className="fd-variant-rows">
            {component.props.map((prop) => (
              <div key={prop.label} className="fd-variant-row">
                <dt>{prop.label}</dt>
                <dd className="fd-dropdown">
                  {prop.value}
                  <ChevronDownIcon />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <div className="fd-props-head">
          <div className="fd-props-title-row">
            <h2 className="fd-props-title">
              {node.type === "text" ? "Text" : "Frame"}
              <ChevronDownIcon />
            </h2>
            <span className="fd-props-actions" aria-hidden="true">
              <span className="fd-icon-button">
                <MoreIcon />
              </span>
            </span>
          </div>
        </div>
      )}

      <PositionSection x={String(node.x)} y={String(node.y)} />

      <Section title="Layout">
        <div className="fd-prop-grid">
          <Field prefix="W" value={String(node.w)} />
          <Field prefix="H" value={String(node.h)} />
          <span className="fd-icon-button fd-col-icon" aria-hidden="true">
            <ClipIcon />
          </span>
        </div>
      </Section>

      <Section title="Appearance">
        <AppearanceRow radius={radius} />
      </Section>

      <Section title="Fill" action={<StylesIcon />}>
        <div className="fd-prop-grid">
          <Swatch color={`#${fill}`} />
          <span className="fd-icon-button fd-col-icon" aria-hidden="true">
            <MinusIcon />
          </span>
        </div>
      </Section>

      <Section title="Stroke" action={<PlusIcon />} />
      <Section title="Effects" action={<PlusIcon />} />
      <Section title="Export" action={<PlusIcon />} />
    </>
  );
}

/* ------------------------------------------------------------------------ */

function Section({ title, action, children }: { title: string; action?: ReactNode; children?: ReactNode }) {
  return (
    <div className="fd-prop-section">
      <div className="fd-prop-section-head">
        <h3 className="fd-section-title">{title}</h3>
        {action && (
          <span className="fd-icon-button fd-col-icon" aria-hidden="true">
            {action}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function PositionSection({ x, y }: { x: string; y: string }) {
  return (
    <Section title="Position" action={<FocusIcon />}>
      <span className="fd-prop-label">Alignment</span>
      <div className="fd-prop-grid" aria-hidden="true">
        <span className="fd-segmented">
          <AlignLeftIcon />
          <AlignHCenterIcon />
          <AlignRightIcon />
        </span>
        <span className="fd-segmented">
          <AlignTopIcon />
          <AlignVCenterIcon />
          <AlignBottomIcon />
        </span>
        <span className="fd-icon-button fd-col-icon">
          <DistributeIcon />
        </span>
      </div>

      <span className="fd-prop-label">Position</span>
      <div className="fd-prop-grid">
        <Field prefix="X" value={x} />
        <Field prefix="Y" value={y} />
      </div>

      <span className="fd-prop-label">Rotation</span>
      <div className="fd-prop-grid" aria-hidden="true">
        <span className="fd-field">
          <AngleIcon className="fd-field-icon" />
          <span className="fd-field-value">0°</span>
        </span>
        <span className="fd-segmented">
          <RotateIcon />
          <FlipHIcon />
          <FlipVIcon />
        </span>
      </div>
    </Section>
  );
}

function AppearanceRow({ radius }: { radius: string }) {
  return (
    <div className="fd-prop-grid">
      <span className="fd-field">
        <OpacityIcon className="fd-field-icon" />
        <span className="fd-field-value">100%</span>
      </span>
      <span className="fd-field">
        <RadiusIcon className="fd-field-icon" />
        <span className="fd-field-value">{radius}</span>
      </span>
    </div>
  );
}

function Field({ prefix, value }: { prefix: string; value: string }) {
  return (
    <span className="fd-field">
      <span className="fd-field-prefix" aria-hidden="true">
        {prefix}
      </span>
      <span className="fd-sr-only">{prefix} </span>
      <span className="fd-field-value">{value}</span>
    </span>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span className="fd-field fd-swatch-field fd-span-1">
      <span className="fd-swatch" style={{ background: color }} aria-hidden="true" />
      <span className="fd-field-value">{color.replace("#", "").toUpperCase()}</span>
    </span>
  );
}
