/* Native Gecko menus in Zotero; HTML select in browser previews. */
"use strict";
class JournalListDropdown {
  constructor(select) {
    this.select = select;
    const doc = select.ownerDocument;
    if (!doc.createXULElement) return;
    this.control = doc.createXULElement("menulist");
    this.control.classList.add("native-select");
    this.control.setAttribute("aria-label", select.getAttribute("aria-label") || select.id);
    this.popup = doc.createXULElement("menupopup");
    this.control.appendChild(this.popup);
    select.after(this.control);
    select.hidden = true;
    this.control.addEventListener("command", event => {
      if (event.target.localName !== "menuitem") return;
      select.value = event.target.getAttribute("value");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    this.changed = () => this.sync();
    select.addEventListener("change", this.changed);
    this.observer = new MutationObserver(this.changed);
    this.observer.observe(select, { childList: true, attributes: true, attributeFilter: ["disabled"] });
    this.sync();
  }
  sync() {
    if (!this.control) return;
    const options = [...this.select.options];
    const signature = JSON.stringify(options.map(o => [o.value, o.textContent, o.disabled]));
    if (signature !== this.signature) {
      this.popup.replaceChildren(...options.map(option => {
        const item = this.select.ownerDocument.createXULElement("menuitem");
        item.setAttribute("label", option.textContent);
        item.setAttribute("value", option.value);
        if (option.disabled) item.setAttribute("disabled", "true");
        return item;
      }));
      this.signature = signature;
    }
    this.control.value = this.select.value;
    this.control.disabled = this.select.disabled;
  }
  open() { if (this.control && !this.select.disabled) this.control.open = true; }
  close() { this.popup?.hidePopup(); }
  destroy() { this.observer?.disconnect(); this.select.removeEventListener("change", this.changed); }
}
