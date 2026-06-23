import { useState } from "react";
import type { Skill } from "../types/skill";

type SkillCardProps = {
  skill: Skill;
  onOpen: (skill: Skill) => void;
  onDelete: (skill: Skill) => void | Promise<void>;
};

export default function SkillCard({ skill, onOpen, onDelete }: SkillCardProps) {
  const [copied, setCopied] = useState(false);

  const canCopyInstall = skill.sourceType === "github" && Boolean(skill.source);

  const repoUrl = skill.source.startsWith("http")
    ? skill.source
    : `https://github.com/${skill.source}`;

  const installCommand = `npx skills add ${repoUrl} --skill ${skill.name}`;

  async function handleCopyCommand(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(installCommand);
    } catch {
      // Fallback for non-secure clipboard contexts.
      const textArea = document.createElement("textarea");
      textArea.value = installCommand;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <article key={skill.id} className="card" onClick={() => onOpen(skill)}>
      <div className="card-top">
        <span className="badge">{skill.category}</span>
        <button
          className="icon danger"
          onClick={(e) => {
            e.stopPropagation();
            void onDelete(skill);
          }}
          aria-label={`Delete ${skill.name}`}
        >
          ×
        </button>
      </div>
      <h3>{skill.name}</h3>
      <p>{skill.description || "No description available."}</p>
      <div className="meta">
        <span className="source-line">{skill.source}</span>
        <div className="meta-actions">
          {canCopyInstall && (
            <button
              type="button"
              className={`copy-pill${copied ? " copied" : ""}`}
              onClick={handleCopyCommand}
              aria-label={`Copy install command for ${skill.name}`}
              title={installCommand}
            >
              {copied ? "Copied!" : "Copy npx cmd"}
            </button>
          )}
          <span>{new Date(skill.addedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </article>
  );
}
