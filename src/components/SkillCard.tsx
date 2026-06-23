import type { Skill } from "../types/skill";

type SkillCardProps = {
  skill: Skill;
  onOpen: (skill: Skill) => void;
  onDelete: (skill: Skill) => void | Promise<void>;
};

export default function SkillCard({ skill, onOpen, onDelete }: SkillCardProps) {
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
          x
        </button>
      </div>
      <h3>{skill.name}</h3>
      <p>{skill.description || "No description available."}</p>
      <div className="meta">
        <span>{skill.source}</span>
        <span>{new Date(skill.addedAt).toLocaleDateString()}</span>
      </div>
    </article>
  );
}
