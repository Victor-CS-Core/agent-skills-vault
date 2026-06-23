import { renderMarkdownSafe, safeExternalUrl } from "../lib/skill-utils";
import type { Skill } from "../types/skill";

type SkillDetailModalProps = {
  skill: Skill;
  onClose: () => void;
};

export default function SkillDetailModal({
  skill,
  onClose,
}: SkillDetailModalProps) {
  const sourceUrl = safeExternalUrl(skill.rawUrl);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal detail" onClick={(e) => e.stopPropagation()}>
        <div className="detail-head">
          <h2>{skill.name}</h2>
          <button className="icon" onClick={onClose}>
            x
          </button>
        </div>
        <p className="detail-meta">
          {skill.source}
          {sourceUrl && (
            <>
              {" "}
              .{" "}
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                View source
              </a>
            </>
          )}
        </p>
        <div
          className="markdown"
          dangerouslySetInnerHTML={{
            __html: renderMarkdownSafe(skill.body || "*No content*"),
          }}
        />
      </div>
    </div>
  );
}
