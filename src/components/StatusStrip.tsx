type Step = {
  id: string;
  label: string;
};

export function StatusStrip({
  steps,
  current,
  error,
}: {
  steps: Step[];
  current: string;
  error?: string;
}) {
  const currentIndex = steps.findIndex((step) => step.id === current);
  return (
    <div className="status-strip">
      <ol>
        {steps.map((step, index) => {
          const done = current === "ready" || (currentIndex !== -1 && index < currentIndex);
          const active = step.id === current;
          return (
            <li
              key={step.id}
              data-done={done}
              data-active={active}
            >
              <span className="dot" />
              {step.label}
            </li>
          );
        })}
      </ol>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
