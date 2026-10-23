/** Small DOM helpers to avoid innerHTML with dynamic values. */

export function clearEl(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function setText(el: HTMLElement, text: string): void {
  clearEl(el);
  el.appendChild(document.createTextNode(text));
}

export function appendLink(
  parent: HTMLElement,
  href: string,
  label: string,
): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = label;
  parent.appendChild(a);
  return a;
}
