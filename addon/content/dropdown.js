/* In-document combobox. Native HTML select popups can mispaint in Gecko chrome windows. */
"use strict";
class JournalListDropdown {
  constructor(select) {
    this.select = select;
    const doc = select.ownerDocument;
    this.root = doc.createElement("div");
    this.root.className = "select-control";
    this.trigger = doc.createElement("button");
    this.trigger.type = "button";
    this.trigger.className = "select-trigger";
    this.trigger.setAttribute("role", "combobox");
    this.trigger.setAttribute("aria-haspopup", "listbox");
    this.trigger.setAttribute("aria-expanded", "false");
    this.trigger.setAttribute("aria-label", ({ catalog: "当前使用的目录", grade: "等级", status: "匹配状态", "import-mode": "导入方式" })[select.id] || select.id);
    this.list = doc.createElement("div");
    this.list.id = select.id + "-listbox";
    this.list.className = "select-options";
    this.list.setAttribute("role", "listbox");
    this.list.hidden = true;
    this.trigger.setAttribute("aria-controls", this.list.id);
    this.root.append(this.trigger, this.list);
    select.after(this.root);
    select.hidden = true;
    this.trigger.addEventListener("click", event => {
      event.preventDefault(); event.stopPropagation();
      this.list.hidden ? this.open() : this.close();
    });
    this.trigger.addEventListener("keydown", event => this.onKey(event));
    this.trigger.addEventListener("blur", () => this.close());
    select.addEventListener("change", () => this.sync());
    this.outside = event => { if (!this.root.contains(event.target)) this.close(); };
    doc.addEventListener("click", this.outside);
    this.observer = new MutationObserver(() => this.sync());
    this.observer.observe(select, { childList: true, attributes: true, attributeFilter: ["disabled"] });
    this.sync();
  }
  sync() {
    this.trigger.disabled = this.select.disabled;
    this.trigger.textContent = this.select.selectedOptions[0]?.textContent || "请选择";
    this.list.replaceChildren();
    [...this.select.options].forEach((option, index) => {
      const node = this.select.ownerDocument.createElement("div");
      node.className = "select-option";
      node.id = this.list.id + "-" + index;
      node.textContent = option.textContent;
      node.setAttribute("role", "option");
      node.setAttribute("aria-selected", String(option.selected));
      node.setAttribute("aria-disabled", String(option.disabled));
      // Keep keyboard focus on the combobox, and suppress enclosing label activation.
      node.addEventListener("mousedown", event => event.preventDefault());
      node.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); this.choose(index); });
      this.list.appendChild(node);
    });
    if (this.select.disabled) this.close();
    if (!this.list.hidden) this.highlight(Math.max(0, this.select.selectedIndex));
  }
  open() {
    if (this.select.disabled) return;
    // Rebuilding an open list must not leave a second popup or stale options behind.
    this.sync();
    this.select.ownerDocument.dispatchEvent(new CustomEvent("journal-list-dropdown-open", { detail: this.select.id }));
    this.list.hidden = false;
    this.root.classList.add("is-open");
    this.trigger.setAttribute("aria-expanded", "true");
    this.highlight(Math.max(0, this.select.selectedIndex));
  }
  close() {
    this.list.hidden = true;
    this.root.classList.remove("is-open");
    this.trigger.setAttribute("aria-expanded", "false");
    this.trigger.removeAttribute("aria-activedescendant");
  }
  highlight(index) {
    const options = [...this.list.children];
    this.active = Math.max(0, Math.min(index, options.length - 1));
    options.forEach((node, i) => node.classList.toggle("active", i === this.active));
    const active = options[this.active];
    if (active) { this.trigger.setAttribute("aria-activedescendant", active.id); active.scrollIntoView({ block: "nearest" }); }
  }
  choose(index) {
    if (!this.select.options[index] || this.select.options[index].disabled) return;
    this.select.selectedIndex = index;
    this.close(); this.sync();
    this.select.dispatchEvent(new Event("change", { bubbles: true }));
    this.trigger.focus();
  }
  onKey(event) {
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (this.list.hidden) this.open();
      else this.highlight(event.key === "Home" ? 0 : event.key === "End" ? this.select.options.length - 1 : this.active + (event.key === "ArrowDown" ? 1 : -1));
    }
    else if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      this.list.hidden ? this.open() : this.choose(this.active);
    }
    else if (event.key === "Escape") { event.preventDefault(); this.close(); }
    else if (event.key === "Tab") this.close();
  }
  destroy() { this.observer.disconnect(); this.select.ownerDocument.removeEventListener("click", this.outside); }
}
