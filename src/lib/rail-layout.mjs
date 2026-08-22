/**
 * Places full-size rail buttons near their content anchors without allowing
 * their touch targets to overlap or leave the available directory window.
 */
export function computeRailLayout({
  availableHeight,
  items,
  gap = 4,
  padding = 4
}) {
  const height = Math.max(0, Number(availableHeight) || 0);
  const normalized = items.map((item) => ({
    id: item.id,
    anchorCenter: Number(item.anchorCenter) || 0,
    height: Math.max(0, Number(item.height) || 0)
  }));
  if (!normalized.length) return { overflow: false, positions: [] };

  const usableStart = Math.max(0, padding);
  const usableEnd = Math.max(usableStart, height - padding);
  const requiredHeight = normalized.reduce((total, item) => total + item.height, 0)
    + Math.max(0, normalized.length - 1) * gap;
  if (requiredHeight > usableEnd - usableStart) {
    let nextTop = usableStart;
    return {
      overflow: true,
      positions: normalized.map((item) => {
        const position = { id: item.id, top: nextTop };
        nextTop += item.height + gap;
        return position;
      })
    };
  }

  const positions = normalized.map((item) => ({
    id: item.id,
    height: item.height,
    top: Math.min(
      usableEnd - item.height,
      Math.max(usableStart, item.anchorCenter - item.height / 2)
    )
  }));

  for (let index = 1; index < positions.length; index += 1) {
    const previous = positions[index - 1];
    positions[index].top = Math.max(positions[index].top, previous.top + previous.height + gap);
  }

  const last = positions.at(-1);
  if (last.top + last.height > usableEnd) {
    last.top = usableEnd - last.height;
    for (let index = positions.length - 2; index >= 0; index -= 1) {
      const next = positions[index + 1];
      positions[index].top = Math.min(positions[index].top, next.top - positions[index].height - gap);
    }
  }

  if (positions[0].top < usableStart) {
    positions[0].top = usableStart;
    for (let index = 1; index < positions.length; index += 1) {
      const previous = positions[index - 1];
      positions[index].top = Math.max(positions[index].top, previous.top + previous.height + gap);
    }
  }

  return {
    overflow: false,
    positions: positions.map(({ id, top }) => ({ id, top }))
  };
}
