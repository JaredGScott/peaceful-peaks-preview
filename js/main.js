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
  if (!reduced && navigator.userAgentData?.brands?.some((b) => b.brand === "Chromium")) document.documentElement.classList.add("refract");
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
      this.home = this.home || this.pop.parentElement;
      const host = innerWidth <= 900 ? document.body : this.home;
      if (this.pop.parentElement !== host) host.appendChild(this.pop);
      this.pop.hidden = false;
      this.render();
      // keep the whole calendar on screen (desktop popovers open below their field)
      if (innerWidth > 900) {
        const r = this.pop.getBoundingClientRect();
        const over = r.bottom - innerHeight + 24;
        if (over > 0) scrollBy({ top: over, behavior: reduced ? "auto" : "smooth" });
      }
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
      if (this.pop && !this.pop.hidden) this.pop.innerHTML = this.html(true);
      if (this.inline) this.inline.innerHTML = this.html(false);
    }
  }

  const params = new URLSearchParams(location.search);
  const qIn = params.get("in"), qOut = params.get("out"), qGuests = params.get("guests");

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
    availReady.then(() => picker.render());
    stay.addEventListener("change", () => picker.set(null, null));
    search.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = new URLSearchParams();
      if (picker.start && picker.end) { q.set("in", picker.start); q.set("out", picker.end); }
      q.set("guests", $("[data-search-guests]", search).value);
      if (stay.value) { location.href = `${BASE}/stays/${stay.value}/?${q}`; return; }
      $$('#stays a[href*="/stays/"]').forEach((a) => { a.href = a.getAttribute("href").split("?")[0] + "?" + q; });
      document.getElementById("stays").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    });
  }

  /* ---------- booking card ---------- */
  const card = $("[data-book]");
  if (card) {
    const slug = card.dataset.unit;
    const unit = unitBySlug[slug] || {};
    const guestsSel = $("[data-book-guests]", card);
    if (qGuests && guestsSel.querySelector(`option[value="${qGuests}"]`)) guestsSel.value = qGuests;
    const breakEl = $("[data-book-break]", card);
    const mobileDates = $("[data-mobile-dates]");
    const money = (n) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    const picker = new RangePicker({
      pop: $("[data-range-pop]", card),
      inline: $("[data-cal-inline]"),
      triggers: $$("[data-range-trigger]", card),
      inEl: $("[data-range-in]", card),
      outEl: $("[data-range-out]", card),
      getUnit: () => slug,
      onChange: (a, b) => {
        const n = a && b ? nightsBetween(a, b) : 0;
        if (mobileDates) mobileDates.textContent = n ? `${fmt(a)} – ${fmt(b)} · ${n} night${n > 1 ? "s" : ""}` : "Add dates";
        if (unit.price && n) {
          const stayCost = unit.price * n, clean = unit.cleaningFee || 0;
          breakEl.innerHTML = `<div><span>${money(unit.price)} × ${n} night${n > 1 ? "s" : ""}</span><span>${money(stayCost)}</span></div>${clean ? `<div><span>Cleaning fee</span><span>${money(clean)}</span></div>` : ""}<div class="total"><span>Total before taxes</span><span>${money(stayCost + clean)}</span></div>`;
          breakEl.hidden = false;
        } else breakEl.hidden = true;
      },
    });
    for (const el of [$("[data-range-in]", card), $("[data-range-out]", card)]) el.dataset.ph = "Add date";
    availReady.then(() => {
      if (validIso(qIn) && validIso(qOut) && qOut > qIn && picker.rangeOk(qIn, qOut)) { picker.view = new Date(parse(qIn).getFullYear(), parse(qIn).getMonth(), 1); picker.set(qIn, qOut); }
      else picker.sync();
    });

    const modal = $("[data-request-modal]");
    const form = $("[data-request-form]", modal);
    const done = $("[data-req-done]", modal);
    const err = $("[data-form-error]", modal);
    const openModal = () => {
      const n = nightsBetween(picker.start, picker.end);
      $("[data-req-summary]", modal).textContent = `${unit.name} · ${fmt(picker.start, { weekday: "short", month: "short", day: "numeric" })} – ${fmt(picker.end, { weekday: "short", month: "short", day: "numeric", year: "numeric" })} · ${n} night${n > 1 ? "s" : ""} · ${guestsSel.value} guest${guestsSel.value > 1 ? "s" : ""}`;
      form.hidden = false; done.hidden = true; err.hidden = true;
      modal.hidden = false; document.body.style.overflow = "hidden";
      setTimeout(() => form.elements.name.focus(), 60);
    };
    const closeModal = () => { modal.hidden = true; document.body.style.overflow = ""; };
    const request = () => {
      if (!(picker.start && picker.end)) { picker.open(); return; }
      openModal();
    };
    // stopPropagation: the picker's click-outside handler would otherwise close it at once
    $("[data-book-request]", card).addEventListener("click", (e) => { e.stopPropagation(); request(); });
    $("[data-mobile-book]")?.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); request(); });
    $$("[data-modal-close]", modal).forEach((b) => b.addEventListener("click", closeModal));
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.hidden = true;
      if (!form.checkValidity()) { err.textContent = "Please add your name, a valid email, and agree to the policies."; err.hidden = false; form.reportValidity(); return; }
      const fd = Object.fromEntries(new FormData(form));
      const payload = { unit: slug, unitName: unit.name, checkIn: picker.start, checkOut: picker.end, nights: nightsBetween(picker.start, picker.end), guests: Number(guestsSel.value), ...fd, agree: true };
      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true; btn.textContent = "Sending…";
      let ok = false;
      try {
        const r = await fetch(PP.endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
        ok = r.ok;
      } catch { ok = false; }
      if (!ok) {
        // Fallback until the booking endpoint is live: open a pre-filled email.
        const body = `Stay: ${unit.name}\nDates: ${payload.checkIn} to ${payload.checkOut} (${payload.nights} nights)\nGuests: ${payload.guests}\nPets: ${fd.pets}\nName: ${fd.name}\nEmail: ${fd.email}\nPhone: ${fd.phone || ""}\n\n${fd.message || ""}`;
        location.href = `mailto:${PP.email}?subject=${encodeURIComponent(`Booking request: ${unit.name}`)}&body=${encodeURIComponent(body)}`;
      }
      btn.disabled = false; btn.textContent = "Send request";
      form.hidden = true; done.hidden = false;
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
