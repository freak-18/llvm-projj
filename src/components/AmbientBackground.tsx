/** Full-viewport static dot-grid backdrop — a calm texture behind all pages. */
export function AmbientBackground() {
  return (
    <div className="contents" aria-hidden="true">
      <div className="ambient-grid" />
    </div>
  );
}
