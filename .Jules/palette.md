## 2024-04-28 - Missing ARIA Labels on Number Input Buttons
**Learning:** Custom increment/decrement buttons (`Minus`/`Plus` icons) often lack ARIA labels, making them inaccessible to screen readers. This pattern is common when replacing native number inputs with custom UI controls.
**Action:** Always verify that custom control buttons, especially icon-only ones, have descriptive `aria-label` and `title` attributes, along with `focus-visible` styles for keyboard navigation.
