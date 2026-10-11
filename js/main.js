/* Peaceful Peaks Glamping — interactions (no dependencies) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PP = window.PP || { units: [] };
  const unitBySlug = Object.fromEntries(PP.units.map((u) => [u.slug, u]));
  const BASE = PP.base || ""; // set when the site is served from a sub-path

  /* ---------- header ---------- */
  const header = $("[data-header]");
  const onScrollHeader = () => header && header.classList.toggle("is-scrolled", scrollY > 40);
  addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();
  const toggle = $("[data-nav-toggle]");
  const mnav = $("[data-mobile-nav]");
  toggle?.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    mnav.hidden = !open;
    header.classList.toggle("is-scrolled", open || scrollY > 40);
  });
  mnav?.addEventListener("click", (e) => {
    if (e.target.closest("a")) { mnav.hidden = true; toggle.setAttribute("aria-expanded", "false"); }
  });

  /* ---------- scroll reveals ---------- */
  const revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
    // Content already on screen at load shouldn't wait on the observer (it never
    // fires in background tabs, prerenders or screenshot tools).
    setTimeout(() => {
      revealEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) { el.classList.add("is-in"); io.unobserve(el); }
      });
    }, 80);
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- parallax ---------- */
  const para = $$("[data-parallax]");
  if (para.length && !reduced) {
    let ticking = false;
    const update = () => {
      ticking = false;
      if (innerWidth < 700) { para.forEach((el) => (el.style.transform = "")); return; }
      const vh = innerHeight;
      para.forEach((el) => {
        const box = el.parentElement.getBoundingClientRect();
        if (box.bottom < -200 || box.top > vh + 200) return;
        const f = parseFloat(el.dataset.parallax) || 0.12;
        const offset = (box.top + box.height / 2 - vh / 2) * -f;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
    };
    const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    addEventListener("scroll", req, { passive: true });
    addEventListener("resize", req);
    update();
  }

  /* ---------- living photos: only animate what's on screen ---------- */
  const lives = $$(".live");
  if ("IntersectionObserver" in window) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach((en) => en.target.classList.toggle("in-view", en.isIntersecting));
    }, { rootMargin: "120px 0px" });
    lives.forEach((el) => vio.observe(el));
  } else lives.forEach((el) => el.classList.add("in-view"));

  /* ---------- liquid glass: Chromium can refract the backdrop through an SVG filter ---------- */
  // (an SVG-refraction backdrop filter was tried here; it made fixed sheets and the checkout render invisibly in Chrome, so it is off)
  if (reduced) $$(".svg-defs animate").forEach((a) => a.remove());

  /* ---------- tilt + sheen on clickable photos, highlight on glass ---------- */
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (finePointer && !reduced) {
    $$("[data-tilt]").forEach((el) => {
      let raf = 0, ev = null;
      const apply = () => {
        raf = 0;
        const r = el.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
        el.style.setProperty("--ry", `${((px - 0.5) * 7).toFixed(2)}deg`);
        el.style.setProperty("--rx", `${((0.5 - py) * 5).toFixed(2)}deg`);
        el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
      };
      el.addEventListener("pointerenter", () => el.classList.add("is-tilting"));
      el.addEventListener("pointermove", (e) => { ev = e; if (!raf) raf = requestAnimationFrame(apply); });
      el.addEventListener("pointerleave", () => {
        el.classList.remove("is-tilting");
        el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg");
      });
    });
    document.addEventListener("pointermove", (e) => {
      const g = e.target.closest?.(".glass");
      if (!g) return;
      const r = g.getBoundingClientRect();
      g.style.setProperty("--gx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      g.style.setProperty("--gy", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
    }, { passive: true });
  }

  /* ---------- stay card carousels (auto-advance while on screen) ---------- */
  $$("[data-carousel]").forEach((car, ci) => {
    const imgs = $$("img", car);
    const dots = $$(".car-dots i", car);
    let i = 0;
    const show = (n) => {
      imgs[i].classList.remove("is-active"); dots[i]?.classList.remove("on");
      i = (n + imgs.length) % imgs.length;
      imgs[i].classList.add("is-active"); dots[i]?.classList.add("on");
    };
    if (!reduced && imgs.length > 1) {
      let last = performance.now() + ci * 900; // stagger the cards so they don't change in unison
      const period = 5600;
      const tick = (t) => {
        if (car.classList.contains("in-view") && !document.hidden && t - last > period) { show(i + 1); last = t; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      car.addEventListener("click", () => (last = performance.now()), true);
    }
    const nav = (d) => (e) => { e.preventDefault(); e.stopPropagation(); show(i + d); };
    $("[data-car-prev]", car)?.addEventListener("click", nav(-1));
    $("[data-car-next]", car)?.addEventListener("click", nav(1));
    let x0 = null;
    car.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    car.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  });

  /* ---------- lightbox ---------- */
  const lb = $("[data-lightbox]");
  if (lb) {
    const lbImg = $("[data-lightbox-img]", lb);
    const lbCap = $("[data-lightbox-caption]", lb);
    const lbCount = $("[data-lightbox-count]", lb);
    let items = [], idx = 0, lastFocus = null;
    const render = () => {
      const it = items[idx];
      lbImg.classList.add("is-swapping");
      const pre = new Image();
      pre.onload = () => { lbImg.src = it.dataset.full; lbImg.alt = it.dataset.caption || ""; lbImg.classList.remove("is-swapping"); };
      pre.src = it.dataset.full;
      lbCap.textContent = it.dataset.caption || "";
      lbCount.textContent = `${idx + 1} / ${items.length}`;
    };
    const open = (group, start) => {
      items = $$(`[data-lightbox-group="${group}"]`);
      idx = Math.max(0, start);
      lastFocus = document.activeElement;
      lb.hidden = false;
      document.body.style.overflow = "hidden";
      render();
      $("[data-lightbox-close]", lb).focus();
    };
    const close = () => { lb.hidden = true; document.body.style.overflow = ""; lastFocus?.focus(); };
    const step = (d) => { idx = (idx + d + items.length) % items.length; render(); };
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-lightbox-group]");
      if (t) { const g = t.dataset.lightboxGroup; open(g, $$(`[data-lightbox-group="${g}"]`).indexOf(t)); }
      if (e.target.closest("[data-gallery-all]")) open("unit", 0);
    });
    $("[data-lightbox-close]", lb).addEventListener("click", close);
    $("[data-lightbox-prev]", lb).addEventListener("click", () => step(-1));
    $("[data-lightbox-next]", lb).addEventListener("click", () => step(1));
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    });
    let lx = null;
    lb.addEventListener("touchstart", (e) => (lx = e.touches[0].clientX), { passive: true });
    lb.addEventListener("touchend", (e) => {
      if (lx === null) return;
      const dx = e.changedTouches[0].clientX - lx;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
      lx = null;
    });
  }

  /* ---------- dates ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const nightsBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const fmt = (s, opts = { month: "short", day: "numeric" }) => parse(s).toLocaleDateString("en-US", opts);
  const todayIso = iso(new Date());
  const validIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && s >= todayIso;

  let availability = {};
  const availReady = fetch(`${BASE}/data/availability.json`).then((r) => (r.ok ? r.json() : {})).then((j) => (availability = j)).catch(() => {});
  const bookedNights = (slug) => {
    const set = new Set();
    (availability[slug] || []).forEach(([a, b]) => { for (let d = a; d < b; d = addDays(d, 1)) set.add(d); });
    return set;
  };

  /* ---------- range picker ---------- */
  class RangePicker {
    constructor({ pop, inline, triggers, inEl, outEl, getUnit, onChange }) {
      Object.assign(this, { pop, inline, triggers, inEl, outEl, getUnit, onChange });
      this.start = null; this.end = null; this.msg = "";
      const t = new Date(); this.view = new Date(t.getFullYear(), t.getMonth(), 1);
      triggers.forEach((tr) => tr.addEventListener("click", (e) => { e.stopPropagation(); this.pop.hidden ? this.open() : this.close(); }));
      document.addEventListener("click", (e) => { if (this.pop && !this.pop.hidden && !this.pop.contains(e.target) && !triggers.includes(e.target.closest("[data-range-trigger]"))) this.close(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && this.pop && !this.pop.hidden) this.close(); });
      [pop, inline].filter(Boolean).forEach((host) => host.addEventListener("click", (e) => this.handle(e)));
    }
    get booked() { const u = this.getUnit(); return u ? bookedNights(u) : new Set(); }
    get minNights() { return unitBySlug[this.getUnit()]?.minNights || 1; }
    set(start, end) {
      this.start = start; this.end = end; this.msg = "";
      if (start && !this.view) this.view = parse(start);
      this.sync();
    }
    open() {
      if (!this.pop) return;
      // On phones the picker is a fixed bottom sheet. A glass (backdrop-filter) ancestor
      // would become its containing block, so move it to <body> while it's a sheet.
      this.pop.hidden = false;
      this.render();
      mount(this);
    }
    close() { if (this.pop) this.pop.hidden = true; }
    sync() {
      const setLabel = (el, v, ph) => { if (!el) return; el.textContent = v ? fmt(v, { weekday: "short", month: "short", day: "numeric" }) : ph; el.classList.toggle("has-value", !!v); };
      setLabel(this.inEl, this.start, this.inEl?.dataset.ph || "Add dates");
      setLabel(this.outEl, this.end, this.outEl?.dataset.ph || "Add dates");
      this.render();
      this.onChange?.(this.start, this.end);
    }
    rangeOk(a, b) {
      const booked = this.booked;
      for (let d = a; d < b; d = addDays(d, 1)) if (booked.has(d)) return false;
      return true;
    }
    pick(d) {
      this.msg = "";
      if (!this.start || this.end || d <= this.start) { this.start = d; this.end = null; }
      else if (!this.rangeOk(this.start, d)) { this.msg = "Those dates include booked nights."; }
      else if (nightsBetween(this.start, d) < this.minNights) { this.msg = `Minimum stay is ${this.minNights} nights.`; }
      else { this.end = d; }
      this.sync();
      if (this.start && this.end && this.pop && !this.pop.hidden) setTimeout(() => this.close(), 350);
    }
    handle(e) {
      const b = e.target.closest("button"); if (!b) return;
      e.stopPropagation();
      if (b.dataset.day) this.pick(b.dataset.day);
      else if (b.dataset.nav) { this.view = new Date(this.view.getFullYear(), this.view.getMonth() + Number(b.dataset.nav), 1); this.render(); }
      else if (b.dataset.clear !== undefined) this.set(null, null);
      else if (b.dataset.close !== undefined) this.close();
    }
    month(first) {
      const booked = this.booked;
      const y = first.getFullYear(), m = first.getMonth();
      const days = new Date(y, m + 1, 0).getDate();
      const lead = first.getDay();
      let cells = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => `<span class="cal-dow">${d}</span>`).join("");
      cells += "<span></span>".repeat(lead);
      for (let d = 1; d <= days; d++) {
        const s = `${y}-${pad(m + 1)}-${pad(d)}`;
        const past = s < todayIso;
        const isBooked = booked.has(s);
        // a booked night can still be a checkout day if the night before is free
        const canCheckout = this.start && !this.end && s > this.start && !booked.has(addDays(s, -1));
        const disabled = past || (isBooked && !canCheckout);
        const cls = ["cal-day"];
        if (isBooked) cls.push("booked");
        if (s === todayIso) cls.push("today");
        if (s === this.start) cls.push("is-start");
        if (s === this.end) cls.push("is-end");
        const inRange = this.start && this.end && s > this.start && s < this.end;
        if (inRange) cls.push("in-range");
        const flow = inRange ? ` style="--i:${nightsBetween(this.start, s)}"` : "";
        cells += `<button type="button" class="${cls.join(" ")}"${flow} data-day="${s}" ${disabled ? "disabled" : ""} aria-label="${fmt(s, { weekday: "long", month: "long", day: "numeric" })}${isBooked ? ", booked" : ""}">${d}</button>`;
      }
      return `<div class="cal-month"><h4>${first.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h4><div class="cal-grid">${cells}</div></div>`;
    }
    html(withFoot) {
      const a = this.view, b = new Date(a.getFullYear(), a.getMonth() + 1, 1);
      const now = new Date(); const atStart = a.getFullYear() === now.getFullYear() && a.getMonth() === now.getMonth();
      const n = this.start && this.end ? nightsBetween(this.start, this.end) : 0;
      const label = n ? `${n} night${n > 1 ? "s" : ""} · ${fmt(this.start)} – ${fmt(this.end)}` : this.start ? "Select checkout date" : "Select check-in date";
      return `<div class="cal-head"><button type="button" data-nav="-1" aria-label="Previous month" ${atStart ? "disabled" : ""}>‹</button><strong>${label}</strong><button type="button" data-nav="1" aria-label="Next month">›</button></div>
        <div class="cal-months">${this.month(a)}${this.month(b)}</div>
        <div class="cal-foot"><span class="cal-msg">${this.msg}</span><span><button type="button" data-clear>Clear dates</button>${withFoot ? ' <button type="button" class="cal-close" data-close>Close</button>' : ""}</span></div>`;
    }
    render() {
      if (this.pop && !this.pop.hidden) { this.pop.innerHTML = this.html(true); if (this.home && typeof place === "function") place(this); }
      if (this.inline) this.inline.innerHTML = this.html(false);
    }
  }

  // only one picker sheet/popover open at a time
  const openPickers = new Set();
  const closeOthers = (me) => openPickers.forEach((p) => p !== me && p.close());
  // On phones pickers are fixed bottom sheets. A glass (backdrop-filter) ancestor would
  // become their containing block, so they move to <body> while shown as a sheet.
  // Every dropdown lives on <body> and is pinned to the screen, so nothing on the page
  // (sticky header, glass cards, later sections) can cover or clip it. Desktop: anchored
  // under its field, flipped above when there's no room, never under the header, and
  // scrollable inside if taller than the screen. Phones: a bottom sheet (CSS).
  const floating = new Set();
  const place = (picker) => {
    const pop = picker.pop;
    if (pop.hidden) return;
    if (innerWidth <= 900) { pop.classList.remove("is-floating"); pop.removeAttribute("style"); return; }
    pop.classList.add("is-floating");
    const a = (picker.anchor || picker.home).getBoundingClientRect();
    const gap = 10, edge = 16, headerH = document.querySelector("[data-header]")?.getBoundingClientRect().bottom || 0;
    const width = Math.min(picker.popWidth ? picker.popWidth(a) : a.width, innerWidth - edge * 2);
    let left = picker.alignRight ? a.right - width : a.left;
    left = Math.max(edge, Math.min(left, innerWidth - width - edge));
    pop.style.width = `${width}px`;
    pop.style.left = `${left}px`;
    pop.style.maxHeight = "";
    const h = pop.scrollHeight + (pop.offsetHeight - pop.clientHeight); // include borders
    // open under the field; if it would run off the bottom, slide it up so it shows in full
    // (it may then cover its own field), never above the header; scroll inside only if
    // it's taller than the whole space under the header
    const minTop = Math.max(headerH, 0) + gap;
    const top = Math.max(minTop, Math.min(a.bottom + gap, innerHeight - edge - h));
    pop.style.top = `${top}px`;
    pop.style.maxHeight = `${innerHeight - edge - top}px`;
  };
  const mount = (picker) => {
    picker.home = picker.home || picker.pop.parentElement;
    if (picker.pop.parentElement !== document.body) document.body.appendChild(picker.pop);
    floating.add(picker);
    place(picker);
  };
  const reflow = () => floating.forEach(place);
  addEventListener("scroll", reflow, { passive: true });
  addEventListener("resize", reflow);
  const origOpen = RangePicker.prototype.open, origClose = RangePicker.prototype.close;
  RangePicker.prototype.open = function () { closeOthers(this); openPickers.add(this); origOpen.call(this); };
  RangePicker.prototype.close = function () { openPickers.delete(this); origClose.call(this); };

  /* ---------- guests & dogs picker ---------- */
  const SIZES = PP.petSizes || [];
  class GuestPicker {
    constructor({ trigger, pop, label, max = 6, maxPets = PP.maxPets || 2, onChange }) {
      Object.assign(this, { trigger, pop, label, max, maxPets, onChange });
      this.state = { adults: 2, children: 0, infants: 0, pets: 0, sizes: [] };
      trigger.addEventListener("click", (e) => { e.stopPropagation(); this.pop.hidden ? this.open() : this.close(); });
      pop.addEventListener("click", (e) => this.handle(e));
      document.addEventListener("click", (e) => { if (!this.pop.hidden && !this.pop.contains(e.target) && !trigger.contains(e.target)) this.close(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !this.pop.hidden) this.close(); });
      this.sync();
    }
    open() { closeOthers(this); openPickers.add(this); mount(this); this.pop.hidden = false; this.render(); }
    close() { openPickers.delete(this); this.pop.hidden = true; }
    get guests() { return this.state.adults + this.state.children; }
    text() {
      const s = this.state, g = this.guests;
      const parts = [`${g} guest${g > 1 ? "s" : ""}`];
      if (s.infants) parts.push(`${s.infants} infant${s.infants > 1 ? "s" : ""}`);
      if (s.pets) parts.push(`${s.pets} dog${s.pets > 1 ? "s" : ""}`);
      return parts.join(", ");
    }
    set(patch) {
      const s = Object.assign(this.state, patch);
      s.adults = Math.max(1, Math.min(s.adults, this.max - s.children));
      s.children = Math.max(0, Math.min(s.children, this.max - s.adults));
      s.infants = Math.max(0, Math.min(s.infants, 5));
      s.pets = Math.max(0, Math.min(s.pets, this.maxPets));
      s.sizes = Array.from({ length: s.pets }, (_, i) => s.sizes[i] || null);
      this.sync();
    }
    sync() { if (this.label) this.label.textContent = this.text(); this.render(); this.onChange?.(this.state); }
    row(key, title, sub, min, max) {
      const v = this.state[key];
      return `<div class="g-row"><div><strong>${title}</strong><small>${sub}</small></div><div class="stepper">
        <button type="button" data-k="${key}" data-d="-1" aria-label="Fewer ${title.toLowerCase()}" ${v <= min ? "disabled" : ""}>−</button>
        <output aria-live="polite">${v}</output>
        <button type="button" data-k="${key}" data-d="1" aria-label="More ${title.toLowerCase()}" ${v >= max ? "disabled" : ""}>+</button></div></div>`;
    }
    sizeChips(i, z) {
      return `<div class="pet-size"><span>Dog ${i + 1}</span><div class="chips">${SIZES.map(([k, n, w]) =>
        `<button type="button" class="chip${z === k ? " on" : ""}" data-pet="${i}" data-size="${k}" aria-pressed="${z === k}">${n}<small>${w}</small></button>`).join("")}</div></div>`;
    }
    html() {
      const s = this.state;
      return `<div class="g-head"><strong>Who is coming?</strong><span class="muted">Up to ${this.max} guests</span></div>
        ${this.row("adults", "Adults", "Ages 13+", 1, this.max - s.children)}
        ${this.row("children", "Children", "Ages 2–12", 0, this.max - s.adults)}
        ${this.row("infants", "Infants", "Under 2", 0, 5)}
        ${this.row("pets", "Dogs", `Dogs welcome · up to ${this.maxPets}`, 0, this.maxPets)}
        ${s.pets ? `<div class="pet-sizes"><p class="muted small">What size is each dog?</p>${s.sizes.map((z, i) => this.sizeChips(i, z)).join("")}</div>` : ""}
        <div class="cal-foot"><span></span><span><button type="button" class="cal-close" data-g-close>Done</button></span></div>`;
    }
    render() { if (!this.pop.hidden) { this.pop.innerHTML = this.html(); if (this.home) place(this); } }
    handle(e) {
      const b = e.target.closest("button"); if (!b) return;
      e.stopPropagation();
      if (b.dataset.k) this.set({ [b.dataset.k]: this.state[b.dataset.k] + Number(b.dataset.d) });
      else if (b.dataset.pet) { const sizes = [...this.state.sizes]; sizes[Number(b.dataset.pet)] = b.dataset.size; this.set({ sizes }); }
      else if (b.dataset.gClose !== undefined) this.close();
    }
    fromQuery(q) {
      const n = (k) => (q.get(k) !== null && q.get(k) !== "" && !isNaN(q.get(k)) ? Number(q.get(k)) : undefined);
      const patch = {};
      for (const k of ["adults", "children", "infants", "pets"]) if (n(k) !== undefined) patch[k] = n(k);
      if (patch.adults === undefined && n("guests") !== undefined) patch.adults = n("guests");
      const sizes = (q.get("dogs") || "").split(",").map((z) => (SIZES.some(([k]) => k === z) ? z : null));
      if (sizes.some(Boolean)) patch.sizes = sizes;
      this.set(patch);
    }
    toQuery(q) {
      const s = this.state;
      q.set("adults", s.adults);
      if (s.children) q.set("children", s.children);
      if (s.infants) q.set("infants", s.infants);
      if (s.pets) { q.set("pets", s.pets); if (s.sizes.some(Boolean)) q.set("dogs", s.sizes.map((z) => z || "").join(",")); }
    }
  }

  const params = new URLSearchParams(location.search);
  const qIn = params.get("in"), qOut = params.get("out");

  /* ---------- hero search ---------- */
  const search = $("[data-search]");
  if (search) {
    const stay = $("[data-search-stay]", search);
    const picker = new RangePicker({
      pop: $("[data-range-pop]", search),
      triggers: $$("[data-range-trigger]", search),
      inEl: $("[data-range-in]", search),
      outEl: $("[data-range-out]", search),
      getUnit: () => stay.value,
    });
    const who = new GuestPicker({ trigger: $("[data-guest-trigger]", search), pop: $("[data-guest-pop]", search), label: $("[data-guest-label]", search), max: 8 });
    picker.anchor = search; picker.popWidth = (a) => Math.min(a.width, 760);
    who.anchor = search; who.alignRight = true; who.popWidth = () => 420;
    availReady.then(() => picker.render());
    stay.addEventListener("change", () => picker.set(null, null));
    search.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = new URLSearchParams();
      if (picker.start && picker.end) { q.set("in", picker.start); q.set("out", picker.end); }
      who.toQuery(q);
      if (stay.value) { location.href = `${BASE}/stays/${stay.value}/?${q}`; return; }
      $$('#stays a[href*="/stays/"]').forEach((a) => { a.href = a.getAttribute("href").split("?")[0] + "?" + q; });
      document.getElementById("stays").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    });
  }

  /* ---------- booking card + checkout ---------- */
  const card = $("[data-book]");
  if (card) {
    const slug = card.dataset.unit;
    const unit = unitBySlug[slug] || {};
    const modal = $("[data-request-modal]");
    const breakEl = $("[data-book-break]", card);
    const mobileDates = $("[data-mobile-dates]");
    const money = (n) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    const longDate = (d) => fmt(d, { weekday: "short", month: "short", day: "numeric" });
    let picker = null, guests = null;

    const quote = () => {
      const n = picker && picker.start && picker.end ? nightsBetween(picker.start, picker.end) : 0;
      if (!n || !unit.price) return { n, total: null, lines: [] };
      const stayCost = unit.price * n, clean = unit.cleaningFee || 0;
      const lines = [[`${money(unit.price)} × ${n} night${n > 1 ? "s" : ""}`, money(stayCost)]];
      if (clean) lines.push(["Cleaning fee", money(clean)]);
      return { n, total: stayCost + clean, lines };
    };
    const renderBreak = () => {
      const qd = quote();
      if (qd.total === null) { breakEl.hidden = true; return; }
      breakEl.innerHTML = qd.lines.map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join("") + `<div class="total"><span>Total before taxes</span><span>${money(qd.total)}</span></div>`;
      breakEl.hidden = false;
    };

    // --- checkout pieces (declared before the pickers so their callbacks can use them)
    const details = $("[data-details-form]", modal), pay = $("[data-pay-form]", modal), done = $("[data-step='3']", modal);
    const err = $("[data-form-error]", modal), payErr = $("[data-pay-error]", modal), payBtn = $("[data-pay-btn]", modal);
    const steps = [details, pay, done];
    let step = 1;
    const renderCheckout = () => {
      const qd = quote();
      $("[data-co-dates]", modal).textContent = picker.start && picker.end ? `${longDate(picker.start)} – ${longDate(picker.end)} · ${qd.n} night${qd.n > 1 ? "s" : ""}` : "";
      $("[data-co-guests]", modal).textContent = guests.text();
      $("[data-co-pets]", modal).hidden = !guests.state.pets;
      $("[data-co-pet-rows]", modal).innerHTML = guests.state.sizes.map((z, i) => guests.sizeChips(i, z)).join("");
      const lines = [...qd.lines];
      if (guests.state.pets) lines.push([`${guests.state.pets} dog${guests.state.pets > 1 ? "s" : ""}`, "Welcome"]);
      $("[data-co-lines]", modal).innerHTML = qd.total === null
        ? `<p class="muted">Your total will be confirmed by your host.</p>`
        : lines.map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join("") + `<div class="total"><span>Total (USD)</span><span>${money(qd.total)}</span></div><p class="muted small">Taxes calculated at checkout.</p>`;
      payBtn.textContent = qd.total === null ? "Request to book" : `Pay ${money(qd.total)}`;
    };

    picker = new RangePicker({
      pop: $("[data-range-pop]", card),
      inline: $("[data-cal-inline]"),
      triggers: $$("[data-range-trigger]", card),
      inEl: $("[data-range-in]", card),
      outEl: $("[data-range-out]", card),
      getUnit: () => slug,
      onChange: (a, b) => {
        const n = a && b ? nightsBetween(a, b) : 0;
        if (mobileDates) mobileDates.textContent = n ? `${fmt(a)} – ${fmt(b)} · ${n} night${n > 1 ? "s" : ""}` : "Add dates";
        renderBreak();
      },
    });
    for (const el of [$("[data-range-in]", card), $("[data-range-out]", card)]) el.dataset.ph = "Add date";
    guests = new GuestPicker({
      trigger: $("[data-guest-trigger]", card), pop: $("[data-guest-pop]", card), label: $("[data-guest-label]", card),
      max: unit.guests || 6, onChange: () => { if (guests && !modal.hidden) renderCheckout(); },
    });
    const fields = $(".book-fields", card);
    picker.anchor = fields; picker.alignRight = true; picker.popWidth = () => 700;
    guests.anchor = fields; guests.alignRight = true; guests.popWidth = (a) => Math.max(a.width + 48, 400);
    guests.fromQuery(params);
    availReady.then(() => {
      if (validIso(qIn) && validIso(qOut) && qOut > qIn && picker.rangeOk(qIn, qOut)) { picker.view = new Date(parse(qIn).getFullYear(), parse(qIn).getMonth(), 1); picker.set(qIn, qOut); }
      else picker.sync();
    });

    const goStep = (n) => {
      step = n;
      steps.forEach((el, i) => (el.hidden = i !== n - 1));
      $$("[data-dot]", modal).forEach((d) => d.classList.toggle("on", Number(d.dataset.dot) <= n));
      $(".modal-card", modal).scrollTop = 0;
      const first = steps[n - 1].querySelector("input, button");
      if (innerWidth > 900) setTimeout(() => first?.focus({ preventScroll: true }), 60);
    };
    $("[data-co-pet-rows]", modal).addEventListener("click", (e) => {
      const b = e.target.closest("[data-pet]"); if (!b) return;
      const sizes = [...guests.state.sizes]; sizes[Number(b.dataset.pet)] = b.dataset.size; guests.set({ sizes });
    });
    const openModal = () => { renderCheckout(); err.hidden = true; payErr.hidden = true; goStep(step === 3 ? 1 : step); modal.hidden = false; document.body.style.overflow = "hidden"; };
    const closeModal = () => { modal.hidden = true; document.body.style.overflow = ""; if (step === 3) { pay.reset(); step = 1; } };
    const reserve = () => { if (!(picker.start && picker.end)) { picker.open(); return; } openModal(); };
    // stopPropagation: a picker's click-outside handler would otherwise close it at once
    $("[data-book-request]", card).addEventListener("click", (e) => { e.stopPropagation(); reserve(); });
    $("[data-mobile-book]")?.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); reserve(); });
    $$("[data-modal-close]", modal).forEach((b) => b.addEventListener("click", closeModal));
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });
    $("[data-back]", modal).addEventListener("click", () => goStep(1));

    details.addEventListener("submit", (e) => {
      e.preventDefault();
      err.hidden = true;
      if (guests.state.sizes.some((z) => !z)) { err.textContent = "Please choose a size for each dog."; err.hidden = false; return; }
      if (!details.checkValidity()) { err.textContent = "Please add your name, email and phone, and agree to the policies."; err.hidden = false; details.reportValidity(); return; }
      goStep(2);
    });

    // card field formatting (in preview mode the values never leave the page)
    const digits = (v) => v.replace(/\D/g, "");
    $("[data-cc]", pay).addEventListener("input", (e) => { e.target.value = digits(e.target.value).slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 "); });
    $("[data-exp]", pay).addEventListener("input", (e) => { const d = digits(e.target.value).slice(0, 4); e.target.value = d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d; });
    $("[data-cvc]", pay).addEventListener("input", (e) => { e.target.value = digits(e.target.value).slice(0, 4); });
    const luhn = (num) => { let sum = 0, dbl = false; for (let i = num.length - 1; i >= 0; i--) { let d = +num[i]; if (dbl) { d *= 2; if (d > 9) d -= 9; } sum += d; dbl = !dbl; } return sum % 10 === 0; };

    const finish = async () => {
      payBtn.disabled = true; const label = payBtn.textContent; payBtn.textContent = "Processing…";
      const fd = Object.fromEntries(new FormData(details));
      const qd = quote();
      // booking details only, never card data
      const payload = { unit: slug, unitName: unit.name, checkIn: picker.start, checkOut: picker.end, nights: qd.n, ...guests.state, total: qd.total, name: fd.name, email: fd.email, phone: fd.phone, arrival: fd.arrival, message: fd.message, paid: !!PP.paymentsLive };
      try { await fetch(PP.endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); } catch { /* endpoint not live yet */ }
      await new Promise((r) => setTimeout(r, 1100));
      payBtn.disabled = false; payBtn.textContent = label;
      pay.reset();
      $("[data-done-text]", modal).textContent = `${unit.name}, ${longDate(picker.start)} – ${longDate(picker.end)}. A confirmation is on its way to ${fd.email}.${PP.paymentsLive ? "" : " (Preview: no payment was taken.)"}`;
      goStep(3);
    };
    $$("[data-wallet]", pay).forEach((b) => b.addEventListener("click", finish));
    pay.addEventListener("submit", (e) => {
      e.preventDefault();
      payErr.hidden = true;
      const f = Object.fromEntries(new FormData(pay));
      const cc = digits(f.cc || ""), exp = digits(f.exp || ""), mm = Number(exp.slice(0, 2)), yy = Number(exp.slice(2, 4));
      const now = new Date(), expOk = exp.length === 4 && mm >= 1 && mm <= 12 && (2000 + yy > now.getFullYear() || (2000 + yy === now.getFullYear() && mm >= now.getMonth() + 1));
      const problem = cc.length < 13 || !luhn(cc) ? "Please check the card number." : !expOk ? "Please check the expiry date." : digits(f.cvc || "").length < 3 ? "Please check the security code." : !(f.ccname || "").trim() ? "Please add the name on the card." : digits(f.zip || "").length < 5 ? "Please add your billing ZIP code." : "";
      if (problem) { payErr.textContent = problem; payErr.hidden = false; return; }
      finish();
    });
  }

  /* ---------- share ---------- */
  $("[data-share]")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    try {
      if (navigator.share) await navigator.share({ title: document.title, url: location.href.split("?")[0] });
      else { await navigator.clipboard.writeText(location.href.split("?")[0]); const t = btn.innerHTML; btn.textContent = "Link copied"; setTimeout(() => (btn.innerHTML = t), 1800); }
    } catch { /* cancelled */ }
  });
})();

/* "Check availability" in the header on stay pages: open the date picker in place
   instead of sending people back to the home page */
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-open-dates]");
  if (!a) return;
  const trigger = document.querySelector("[data-book] [data-range-trigger]");
  if (!trigger) return;
  e.preventDefault(); e.stopPropagation();
  const nav = document.querySelector("[data-mobile-nav]");
  if (nav && !nav.hidden) { nav.hidden = true; document.querySelector("[data-nav-toggle]")?.setAttribute("aria-expanded", "false"); }
  if (innerWidth > 900) document.getElementById("book")?.scrollIntoView({ block: "center" });
  setTimeout(() => trigger.click(), innerWidth > 900 ? 350 : 0);
});
