// 같은 시설·상품의 DOM을 유지해 포커스와 펼친 안내를 보존한다.
const key = node => node.nodeType === 1 ? node.id || node.getAttribute('data-parking-row') || node.getAttribute('data-product') : null;
function sync(current, next) {
  if (current.nodeType !== next.nodeType || current.nodeName !== next.nodeName) {
    current.replaceWith(next.cloneNode(true)); return;
  }
  if (current.nodeType === 3) {
    if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
    return;
  }
  if (current.nodeType !== 1) return;
  for (const attribute of [...current.attributes]) {
    if (current.tagName === 'DETAILS' && attribute.name === 'open') continue;
    if (!next.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
  }
  for (const attribute of next.attributes) {
    if (current.getAttribute(attribute.name) !== attribute.value) current.setAttribute(attribute.name, attribute.value);
  }
  syncChildren(current, next);
}
function syncChildren(current, next) {
  const keyed = new Map([...current.childNodes].filter(key).map(node => [key(node),node]));
  let cursor = current.firstChild;
  for (const desired of [...next.childNodes]) {
    const id = key(desired);
    let existing = id ? keyed.get(id) : cursor && !key(cursor) ? cursor : null;
    if (!existing) existing = desired.cloneNode(true);
    if (existing !== cursor) current.insertBefore(existing, cursor);
    if (existing.nodeType !== desired.nodeType || existing.nodeName !== desired.nodeName) {
      const replacement=desired.cloneNode(true);
      existing.replaceWith(replacement); existing=replacement;
    }
    sync(existing, desired);
    cursor = existing.nextSibling;
  }
  while (cursor) {const nextNode = cursor.nextSibling; cursor.remove(); cursor = nextNode;}
}
export function updateHtml(element, html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  syncChildren(element, template.content);
}
