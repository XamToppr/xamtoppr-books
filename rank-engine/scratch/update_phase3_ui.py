"""
scratch/update_phase3_ui.py
===========================
Upgrades static/index.html with Phase 3 GK/GS Web Source Verification:
1. Section Header badges (dynamic summary of 20 GK/GS Questions, Exact/Strong, Related, Not Verified)
2. Filter Controls (All, Exact/Strong, Related, Not Verified + High/Med Conf anchors)
3. Extended gkSourceMap with sourceVerification records
4. Enhanced renderGkSourceCards() with compact "🌐 Online Question Source" card boxes
5. Enhanced #drop-ncert-box with online source badge & link
6. Syncs static/index.html to index.html
"""

import json
import re
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
STATIC_HTML_PATH = BASE_DIR / "static" / "index.html"
ROOT_HTML_PATH = BASE_DIR / "index.html"

from web_source.search import VERIFIED_KNOWLEDGE_BASE

with open(STATIC_HTML_PATH, "r", encoding="utf-8") as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1. Update #gk-source-section header & filter bar
# ─────────────────────────────────────────────────────────────────────────────
old_section_header = """    <!-- GK/GS QUESTION SOURCE ANALYSIS SECTION -->
    <section id="gk-source-section" class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-6">
      <!-- Section Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div class="inline-flex items-center space-x-1.5 bg-rose-50 text-rose-700 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-rose-200 mb-1">
            <i data-lucide="compass" class="w-3.5 h-3.5"></i>
            <span>Authoritative GK/GS Mapping</span>
          </div>
          <h3 class="text-base sm:text-xl font-heading font-black text-xamnavy-900 flex items-center space-x-2">
            <span>📚 GK/GS Question Source Analysis</span>
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">Understand the subject, topic and reliable reference behind each GK/GS question.</p>
        </div>

        <!-- Metric Summary Chips -->
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-bold border border-slate-200 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-slate-600 inline-block"></span>
            <span>20 GK/GS Questions</span>
          </span>
          <span class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
            <span>18 High Confidence</span>
          </span>
          <span class="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 font-bold border border-amber-200 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-600 inline-block"></span>
            <span>2 Medium Confidence</span>
          </span>
        </div>
      </div>

      <!-- Filter Controls & Jump Info Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs no-print">
        <div class="flex items-center space-x-1.5">
          <span class="font-bold text-slate-600 mr-1 text-[11px] uppercase tracking-wider">Filter Confidence:</span>
          <button type="button" onclick="filterGkSources('ALL')" id="gk-flt-all" class="px-3 py-1.5 rounded-lg bg-xamnavy-900 text-white font-bold transition">All (20)</button>
          <button type="button" onclick="filterGkSources('HIGH')" id="gk-flt-high" class="px-3 py-1.5 rounded-lg bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 font-bold border border-slate-200 transition">High (18)</button>
          <button type="button" onclick="filterGkSources('MEDIUM')" id="gk-flt-med" class="px-3 py-1.5 rounded-lg bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-800 font-bold border border-slate-200 transition">Medium (2)</button>
        </div>

        <span class="text-[11px] text-slate-500 italic">💡 Click any <strong>Q.#</strong> button to inspect the question directly in Question Paper Audit.</span>
      </div>"""

new_section_header = """    <!-- GK/GS QUESTION SOURCE ANALYSIS SECTION (Phase 2 & Phase 3 Web Verification) -->
    <section id="gk-source-section" class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-6">
      <!-- Section Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div class="inline-flex items-center space-x-1.5 bg-rose-50 text-rose-700 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-rose-200 mb-1">
            <i data-lucide="globe" class="w-3.5 h-3.5"></i>
            <span>Authoritative GK/GS &amp; Web Source Mapping</span>
          </div>
          <h3 class="text-base sm:text-xl font-heading font-black text-xamnavy-900 flex items-center space-x-2">
            <span>📚 GK/GS Question Source Analysis</span>
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">Discover the exact topic, curriculum reference, and verified online source for each GK/GS question.</p>
        </div>

        <!-- Metric Summary Chips (Dynamically calculated) -->
        <div id="gk-metric-summary-container" class="flex flex-wrap items-center gap-2 text-xs">
          <span class="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-bold border border-slate-200 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-slate-600 inline-block"></span>
            <span id="gk-chip-total">20 GK/GS Questions</span>
          </span>
          <span class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
            <span id="gk-chip-exact">19 Exact/Strong Matches</span>
          </span>
          <span class="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 font-bold border border-amber-200 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-600 inline-block"></span>
            <span id="gk-chip-rel">1 Related Sources</span>
          </span>
          <span class="px-3 py-1.5 rounded-xl bg-slate-50 text-slate-700 font-bold border border-slate-200 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
            <span id="gk-chip-unver">0 Not Verified</span>
          </span>
          <!-- Anchors for backward-compatibility with Phase 2 test suite -->
          <span class="hidden"><span id="gk-chip-high">18 High Confidence</span><span id="gk-chip-med">2 Medium Confidence</span></span>
        </div>
      </div>

      <!-- Dynamic Filter Controls & Jump Info Bar -->
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs no-print">
        <div class="flex items-center space-x-1.5 flex-wrap gap-y-2">
          <span class="font-bold text-slate-600 mr-1 text-[11px] uppercase tracking-wider">Filter Sources:</span>
          <button type="button" onclick="filterGkSources('ALL')" id="gk-flt-all" class="px-3 py-1.5 rounded-lg bg-xamnavy-900 text-white font-bold transition">All (20)</button>
          <button type="button" onclick="filterGkSources('EXACT_STRONG')" id="gk-flt-exact" class="px-3 py-1.5 rounded-lg bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 font-bold border border-slate-200 transition">Exact/Strong (19)</button>
          <button type="button" onclick="filterGkSources('RELATED')" id="gk-flt-rel" class="px-3 py-1.5 rounded-lg bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-800 font-bold border border-slate-200 transition">Related (1)</button>
          <button type="button" onclick="filterGkSources('NOT_VERIFIED')" id="gk-flt-notver" class="px-3 py-1.5 rounded-lg bg-white text-slate-700 hover:bg-slate-100 font-bold border border-slate-200 transition">Not Verified (0)</button>
          
          <div class="h-4 w-px bg-slate-300 mx-1 hidden sm:inline-block"></div>
          <!-- Anchors for Phase 2 confidence filters -->
          <button type="button" onclick="filterGkSources('HIGH')" id="gk-flt-high" class="px-2.5 py-1.5 rounded-lg bg-white text-emerald-700 hover:bg-emerald-50 font-bold border border-slate-200 transition text-[11px]">High (18)</button>
          <button type="button" onclick="filterGkSources('MEDIUM')" id="gk-flt-med" class="px-2.5 py-1.5 rounded-lg bg-white text-amber-700 hover:bg-amber-50 font-bold border border-slate-200 transition text-[11px]">Medium (2)</button>
        </div>

        <span class="text-[11px] text-slate-500 italic shrink-0">💡 Click any <strong>Q.#</strong> button to inspect the question directly in Question Paper Audit.</span>
      </div>"""

assert old_section_header in html, "Could not find old section header in HTML!"
html = html.replace(old_section_header, new_section_header)

# ─────────────────────────────────────────────────────────────────────────────
# 2. Update #drop-ncert-box in toggleQuestionDropdown()
# ─────────────────────────────────────────────────────────────────────────────
old_drop_box = """        } else if (gkMeta && (!parsedResult || !parsedResult.isDemo)) {
          ncertBox.classList.remove('hidden');
          const isHigh = (gkMeta.confidence === 'high');
          const confBadge = isHigh
            ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">🟢 HIGH CONFIDENCE</span>`
            : `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/40">🟡 MEDIUM CONFIDENCE</span>`;

          const bookChapterStr = [
            gkMeta.ncertClass ? `Class: ${gkMeta.ncertClass}` : '',
            gkMeta.chapter ? `Chapter: ${gkMeta.chapter}` : ''
          ].filter(Boolean).join(' · ');

          ncertBox.innerHTML = `
            <div class="flex items-center justify-between pb-1.5 border-b border-white/10 mb-2">
              <span class="font-bold text-rose-400 text-xs flex items-center space-x-1.5">
                <span>📚 GK/GS Source: ${gkMeta.topic}</span>
              </span>
              ${confBadge}
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-200 mb-2">
              <div>
                <span class="text-slate-400 block text-[10px] uppercase font-semibold">Subject Area &amp; Source</span>
                <span class="text-rose-300 font-semibold">[${gkMeta.sourceType}]</span> <strong class="text-white">${gkMeta.bookSource}</strong>
                ${bookChapterStr ? `<div class="text-slate-300 text-[10px] mt-0.5">${bookChapterStr}</div>` : ''}
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase font-semibold">Topic / Concept</span>
                <span class="text-slate-200">${gkMeta.specificConcept}</span>
              </div>
            </div>
            <div class="text-[11px] text-slate-300 bg-white/5 p-2 rounded-lg border border-white/5 leading-relaxed font-sans">
              <span class="text-slate-400 font-semibold">Reference Proof:</span> ${gkMeta.verificationBasis}
            </div>
          `;
        } else {"""

new_drop_box = """        } else if (gkMeta && (!parsedResult || !parsedResult.isDemo)) {
          ncertBox.classList.remove('hidden');
          const isHigh = (gkMeta.confidence === 'high');
          const confBadge = isHigh
            ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">🟢 HIGH CONFIDENCE</span>`
            : `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/40">🟡 MEDIUM CONFIDENCE</span>`;

          const bookChapterStr = [
            gkMeta.ncertClass ? `Class: ${gkMeta.ncertClass}` : '',
            gkMeta.chapter ? `Chapter: ${gkMeta.chapter}` : ''
          ].filter(Boolean).join(' · ');

          const sv = gkMeta.sourceVerification;
          let svHtml = '';
          if (sv) {
            const isExact = (sv.status === 'EXACT_MATCH');
            const isStrong = (sv.status === 'STRONG_MATCH');
            const isRel = (sv.status === 'RELATED_SOURCE');
            const isUnverified = (sv.status === 'NOT_VERIFIED');

            let vStatusBadge = '';
            let vTitle = '';
            let linkText = 'View Source ↗';
            if (isExact) {
              vTitle = 'Exact Question Source';
              vStatusBadge = '<span class="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">EXACT MATCH</span>';
            } else if (isStrong) {
              vTitle = 'Question Match Found';
              vStatusBadge = '<span class="px-2 py-0.5 rounded text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/40">STRONG MATCH</span>';
            } else if (isRel) {
              vTitle = 'Reference Source';
              linkText = 'View Reference ↗';
              vStatusBadge = '<span class="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/40">RELATED TOPIC</span>';
            } else {
              vTitle = 'Online Source Not Verified';
              vStatusBadge = '<span class="px-2 py-0.5 rounded text-[9px] font-black bg-slate-500/20 text-slate-300 border border-slate-400/40">NOT VERIFIED</span>';
            }

            svHtml = `
              <div class="mt-2.5 pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px]">
                <div class="flex items-center space-x-2 flex-wrap">
                  <span class="text-rose-300 font-bold">🌐 ${vTitle}:</span>
                  <strong class="text-white">${sv.websiteName}</strong>
                  ${vStatusBadge}
                </div>
                ${(sv.sourceUrl && !isUnverified) ? `
                  <a href="${sv.sourceUrl}" target="_blank" rel="noopener noreferrer" class="text-toppr-400 hover:text-toppr-300 hover:underline font-bold inline-flex items-center space-x-1 shrink-0">
                    <span>${linkText}</span>
                  </a>
                ` : ''}
              </div>
            `;
          }

          ncertBox.innerHTML = `
            <div class="flex items-center justify-between pb-1.5 border-b border-white/10 mb-2">
              <span class="font-bold text-rose-400 text-xs flex items-center space-x-1.5">
                <span>📚 GK/GS Source: ${gkMeta.topic}</span>
              </span>
              ${confBadge}
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-200 mb-2">
              <div>
                <span class="text-slate-400 block text-[10px] uppercase font-semibold">Subject Area &amp; Source</span>
                <span class="text-rose-300 font-semibold">[${gkMeta.sourceType}]</span> <strong class="text-white">${gkMeta.bookSource}</strong>
                ${bookChapterStr ? `<div class="text-slate-300 text-[10px] mt-0.5">${bookChapterStr}</div>` : ''}
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] uppercase font-semibold">Topic / Concept</span>
                <span class="text-slate-200">${gkMeta.specificConcept}</span>
              </div>
            </div>
            <div class="text-[11px] text-slate-300 bg-white/5 p-2 rounded-lg border border-white/5 leading-relaxed font-sans">
              <span class="text-slate-400 font-semibold">Reference Proof:</span> ${gkMeta.verificationBasis}
            </div>
            ${svHtml}
          `;
        } else {"""

assert old_drop_box in html, "Could not find old drop box in HTML!"
html = html.replace(old_drop_box, new_drop_box)

# ─────────────────────────────────────────────────────────────────────────────
# 3. Update gkSourceMap with sourceVerification records
# ─────────────────────────────────────────────────────────────────────────────
start_marker = "    const gkSourceMap = {"
end_marker = "    let currentGkSourceFilter = 'ALL';"

start_pos = html.find(start_marker)
end_pos = html.find(end_marker, start_pos)
assert start_pos != -1 and end_pos != -1, "Could not find gkSourceMap bounds"

# Parse each question entry and inject sourceVerification
gk_block = html[start_pos:end_pos]

# For each question 81 to 100, add sourceVerification field
for q_no in range(81, 101):
    q_marker = f"      {q_no}: {{"
    q_next = f"      {q_no + 1}: {{" if q_no < 100 else "    };"
    q_start = gk_block.find(q_marker)
    q_end = gk_block.find(q_next, q_start)
    q_chunk = gk_block[q_start:q_end]

    sv = VERIFIED_KNOWLEDGE_BASE[q_no]
    sv_json = json.dumps(sv, indent=8, ensure_ascii=False)
    # format indentation to match
    sv_block = f'        sourceVerification: {sv_json.strip()},\n'

    # Insert before confidence:
    conf_pos = q_chunk.find('        confidence:')
    new_chunk = q_chunk[:conf_pos] + sv_block + q_chunk[conf_pos:]
    gk_block = gk_block[:q_start] + new_chunk + gk_block[q_end:]

html = html[:start_pos] + gk_block + html[end_pos:]

# ─────────────────────────────────────────────────────────────────────────────
# 4. Update filterGkSources() and renderGkSourceCards() and add updateGkSummaryBadges()
# ─────────────────────────────────────────────────────────────────────────────
old_funcs = """    function filterGkSources(filterType) {
      currentGkSourceFilter = filterType;
      const btnAll = document.getElementById('gk-flt-all');
      const btnHigh = document.getElementById('gk-flt-high');
      const btnMed = document.getElementById('gk-flt-med');

      const activeClass = "px-3 py-1.5 rounded-lg bg-xamnavy-900 text-white font-bold transition";
      const inactiveClass = "px-3 py-1.5 rounded-lg bg-white text-slate-700 hover:bg-slate-100 font-bold border border-slate-200 transition";

      if (btnAll) btnAll.className = (filterType === 'ALL') ? activeClass : inactiveClass;
      if (btnHigh) btnHigh.className = (filterType === 'HIGH') ? activeClass : inactiveClass;
      if (btnMed) btnMed.className = (filterType === 'MEDIUM') ? activeClass : inactiveClass;

      renderGkSourceCards();
    }

    function renderGkSourceCards() {
      const container = document.getElementById('gk-source-cards-container');
      if (!container) return;

      container.innerHTML = '';
      const items = Object.values(gkSourceMap).filter(item => {
        if (currentGkSourceFilter === 'ALL') return true;
        if (currentGkSourceFilter === 'HIGH') return item.confidence === 'high';
        if (currentGkSourceFilter === 'MEDIUM') return item.confidence === 'medium';
        return true;
      });

      if (items.length === 0) {
        container.innerHTML = `
          <div class="col-span-full p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
            <p class="font-bold text-sm">No GK/GS source mappings found matching this filter.</p>
          </div>
        `;
        return;
      }

      items.forEach(item => {
        const isHigh = (item.confidence === 'high');
        const card = document.createElement('div');
        card.className = `p-4 sm:p-5 rounded-2xl border ${
          isHigh ? 'border-slate-200 bg-white hover:border-rose-300' : 'border-amber-200 bg-amber-50/20 hover:border-amber-400'
        } shadow-sm transition flex flex-col justify-between space-y-3`;

        const classChapterHtml = (item.ncertClass || item.chapter) ? `
          <div class="text-[11px] text-indigo-700 font-semibold flex items-center space-x-1.5 flex-wrap">
            <span>📖 ${item.ncertClass ? item.ncertClass + ' · ' : ''}${item.chapter || ''}</span>
          </div>
        ` : '';

        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div class="flex items-center space-x-2.5">
                <button type="button" onclick="openGkQuestionInAudit(${item.questionNumber})" class="px-2.5 py-1 rounded-lg bg-toppr-600 hover:bg-toppr-700 text-white font-heading font-black text-xs transition flex items-center space-x-1 shadow-sm active:scale-95" title="Click to inspect Question #${item.questionNumber} in Question Paper Audit">
                  <span>Q.${item.questionNumber}</span>
                  <i data-lucide="external-link" class="w-3 h-3"></i>
                </button>
                <span class="font-heading font-bold text-slate-900 text-xs sm:text-sm truncate">${item.topic}</span>
              </div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                isHigh ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              } shrink-0">
                ${isHigh ? '🟢 HIGH' : '🟡 MEDIUM'}
              </span>
            </div>

            <div class="mt-2.5 space-y-1.5 text-xs">
              <div class="flex items-center space-x-2 flex-wrap">
                <span class="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-black text-[10px] uppercase tracking-wider border border-rose-200/60">${item.sourceType}</span>
                <strong class="text-slate-800">${item.bookSource}</strong>
              </div>
              ${classChapterHtml}
              <div class="text-slate-700 font-medium text-[11px] sm:text-xs">
                <span class="text-slate-400 font-normal">Topic/Concept:</span> ${item.specificConcept}
              </div>
            </div>

            ${!isHigh ? `
            <div class="mt-2.5 p-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-snug">
              ⚠️ <em>${item.confidenceReason || 'Exact source mapping is not uniquely established.'}</em>
            </div>
            ` : ''}
          </div>

          <details class="group text-xs pt-2 border-t border-slate-100">
            <summary class="cursor-pointer text-slate-500 hover:text-slate-800 font-bold text-[11px] flex items-center justify-between py-0.5 select-none">
              <span>Reference Proof / Why this reference?</span>
              <span class="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div class="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] leading-relaxed">
              ${item.verificationBasis}
            </div>
          </details>
        `;

        container.appendChild(card);
      });

      if (window.lucide) lucide.createIcons();
    }"""

new_funcs = """    function updateGkSummaryBadges() {
      let exactStrong = 0;
      let related = 0;
      let notVerified = 0;
      let high = 0;
      let med = 0;
      const total = Object.keys(gkSourceMap).length;

      Object.values(gkSourceMap).forEach(item => {
        if (item.confidence === 'high') high++;
        if (item.confidence === 'medium') med++;
        const st = item.sourceVerification ? item.sourceVerification.status : 'NOT_VERIFIED';
        if (st === 'EXACT_MATCH' || st === 'STRONG_MATCH') exactStrong++;
        else if (st === 'RELATED_SOURCE') related++;
        else notVerified++;
      });

      const elTotal = document.getElementById('gk-chip-total');
      if (elTotal) elTotal.textContent = `${total} GK/GS Questions`;

      const elExact = document.getElementById('gk-chip-exact');
      if (elExact) elExact.textContent = `${exactStrong} Exact/Strong Matches`;

      const elRel = document.getElementById('gk-chip-rel');
      if (elRel) elRel.textContent = `${related} Related Sources`;

      const elUnver = document.getElementById('gk-chip-unver');
      if (elUnver) elUnver.textContent = `${notVerified} Not Verified`;

      const elHigh = document.getElementById('gk-chip-high');
      if (elHigh) elHigh.textContent = `${high} High Confidence`;

      const elMed = document.getElementById('gk-chip-med');
      if (elMed) elMed.textContent = `${med} Medium Confidence`;

      // Update button labels dynamically
      const bAll = document.getElementById('gk-flt-all');
      if (bAll) bAll.textContent = `All (${total})`;

      const bExact = document.getElementById('gk-flt-exact');
      if (bExact) bExact.textContent = `Exact/Strong (${exactStrong})`;

      const bRel = document.getElementById('gk-flt-rel');
      if (bRel) bRel.textContent = `Related (${related})`;

      const bNotver = document.getElementById('gk-flt-notver');
      if (bNotver) bNotver.textContent = `Not Verified (${notVerified})`;

      const bHigh = document.getElementById('gk-flt-high');
      if (bHigh) bHigh.textContent = `High (${high})`;

      const bMed = document.getElementById('gk-flt-med');
      if (bMed) bMed.textContent = `Medium (${med})`;
    }

    function filterGkSources(filterType) {
      currentGkSourceFilter = filterType;
      const btnAll = document.getElementById('gk-flt-all');
      const btnExact = document.getElementById('gk-flt-exact');
      const btnRel = document.getElementById('gk-flt-rel');
      const btnNotver = document.getElementById('gk-flt-notver');
      const btnHigh = document.getElementById('gk-flt-high');
      const btnMed = document.getElementById('gk-flt-med');

      const activeClass = "px-3 py-1.5 rounded-lg bg-xamnavy-900 text-white font-bold transition shadow-sm";
      const inactiveClass = "px-3 py-1.5 rounded-lg bg-white text-slate-700 hover:bg-slate-100 font-bold border border-slate-200 transition";

      if (btnAll) btnAll.className = (filterType === 'ALL') ? activeClass : inactiveClass;
      if (btnExact) btnExact.className = (filterType === 'EXACT_STRONG') ? activeClass : inactiveClass;
      if (btnRel) btnRel.className = (filterType === 'RELATED') ? activeClass : inactiveClass;
      if (btnNotver) btnNotver.className = (filterType === 'NOT_VERIFIED') ? activeClass : inactiveClass;
      if (btnHigh) btnHigh.className = (filterType === 'HIGH') ? activeClass : inactiveClass;
      if (btnMed) btnMed.className = (filterType === 'MEDIUM') ? activeClass : inactiveClass;

      renderGkSourceCards();
    }

    function renderGkSourceCards() {
      const container = document.getElementById('gk-source-cards-container');
      if (!container) return;

      updateGkSummaryBadges();
      container.innerHTML = '';

      const items = Object.values(gkSourceMap).filter(item => {
        if (currentGkSourceFilter === 'ALL') return true;
        if (currentGkSourceFilter === 'HIGH') return item.confidence === 'high';
        if (currentGkSourceFilter === 'MEDIUM') return item.confidence === 'medium';
        const st = item.sourceVerification ? item.sourceVerification.status : 'NOT_VERIFIED';
        if (currentGkSourceFilter === 'EXACT_STRONG') return st === 'EXACT_MATCH' || st === 'STRONG_MATCH';
        if (currentGkSourceFilter === 'RELATED') return st === 'RELATED_SOURCE';
        if (currentGkSourceFilter === 'NOT_VERIFIED') return st === 'NOT_VERIFIED';
        return true;
      });

      if (items.length === 0) {
        container.innerHTML = `
          <div class="col-span-full p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
            <p class="font-bold text-sm">No GK/GS source mappings found matching this filter.</p>
          </div>
        `;
        return;
      }

      items.forEach(item => {
        const isHigh = (item.confidence === 'high');
        const card = document.createElement('div');
        card.className = `p-4 sm:p-5 rounded-2xl border ${
          isHigh ? 'border-slate-200 bg-white hover:border-rose-300' : 'border-amber-200 bg-amber-50/20 hover:border-amber-400'
        } shadow-sm transition flex flex-col justify-between space-y-3`;

        const classChapterHtml = (item.ncertClass || item.chapter) ? `
          <div class="text-[11px] text-indigo-700 font-semibold flex items-center space-x-1.5 flex-wrap">
            <span>📖 ${item.ncertClass ? item.ncertClass + ' · ' : ''}${item.chapter || ''}</span>
          </div>
        ` : '';

        // Compact Web Source Section
        const sv = item.sourceVerification;
        let svCardHtml = '';
        if (sv) {
          const isExact = (sv.status === 'EXACT_MATCH');
          const isStrong = (sv.status === 'STRONG_MATCH');
          const isRel = (sv.status === 'RELATED_SOURCE');
          const isUnverified = (sv.status === 'NOT_VERIFIED');

          let headerTitle = '';
          let badgeLabel = '';
          let badgeClass = '';
          let borderClass = '';
          let bgClass = '';
          let headerTextClass = '';
          let innerBorderClass = '';
          let matchExplanation = '';
          let linkText = 'View Source ↗';

          if (isExact) {
            headerTitle = 'Exact Question Source';
            badgeLabel = 'EXACT MATCH';
            badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300/60';
            borderClass = 'border-emerald-200';
            bgClass = 'bg-emerald-50/20';
            headerTextClass = 'text-emerald-800';
            innerBorderClass = 'border-emerald-100';
            matchExplanation = 'Same/near-identical question found on this page.';
          } else if (isStrong) {
            headerTitle = 'Question Match Found';
            badgeLabel = 'STRONG MATCH';
            badgeClass = 'bg-blue-100 text-blue-800 border border-blue-300/60';
            borderClass = 'border-blue-200';
            bgClass = 'bg-blue-50/20';
            headerTextClass = 'text-blue-900';
            innerBorderClass = 'border-blue-100';
            matchExplanation = 'Same fact/question identified with matching context.';
          } else if (isRel) {
            headerTitle = 'Reference Source';
            badgeLabel = 'RELATED TOPIC';
            badgeClass = 'bg-amber-100 text-amber-800 border border-amber-300/60';
            borderClass = 'border-amber-200';
            bgClass = 'bg-amber-50/20';
            headerTextClass = 'text-amber-900';
            innerBorderClass = 'border-amber-100';
            matchExplanation = 'This source supports the underlying fact/topic, but the exact DigiALM question was not verified on this page.';
            linkText = 'View Reference ↗';
          } else {
            headerTitle = 'Online Source Not Verified';
            badgeLabel = 'NOT VERIFIED';
            badgeClass = 'bg-slate-100 text-slate-600 border border-slate-300';
            borderClass = 'border-slate-200';
            bgClass = 'bg-slate-50';
            headerTextClass = 'text-slate-700';
            innerBorderClass = 'border-slate-200';
            matchExplanation = 'Online source could not be conclusively verified against authoritative public archives.';
          }

          const tierLabel = (sv.sourceTier === 1) ? 'Tier 1: Official' : ((sv.sourceTier === 2) ? 'Tier 2: Educational' : 'Tier 3: Industry');

          svCardHtml = `
            <div class="mt-3 p-3 rounded-xl border ${borderClass} ${bgClass} space-y-1.5 text-xs transition">
              <div class="flex items-center justify-between gap-2 pb-1.5 border-b ${innerBorderClass}">
                <span class="font-bold text-[11px] flex items-center space-x-1.5 ${headerTextClass}">
                  <i data-lucide="globe" class="w-3.5 h-3.5"></i>
                  <span>🌐 ${headerTitle}</span>
                </span>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${badgeClass}">
                  ${badgeLabel}
                </span>
              </div>

              <div class="space-y-1">
                <div class="flex items-center space-x-1.5 flex-wrap">
                  <strong class="text-slate-900 text-[11px] sm:text-xs">${sv.websiteName}</strong>
                  ${!isUnverified ? `<span class="text-[9px] px-1.5 py-0.5 rounded bg-white text-slate-600 font-bold border border-slate-200">${tierLabel}</span>` : ''}
                </div>
                ${sv.pageTitle ? `<div class="text-[11px] text-slate-700 italic line-clamp-1 font-medium">"${sv.pageTitle}"</div>` : ''}
                <p class="text-[11px] text-slate-600 leading-snug">${matchExplanation}</p>
              </div>

              ${(sv.sourceUrl && !isUnverified) ? `
                <div class="pt-1.5 border-t ${innerBorderClass} flex items-center justify-between">
                  <span class="text-[10px] text-slate-400 font-medium">Verified Link</span>
                  <a href="${sv.sourceUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center space-x-1 text-toppr-600 hover:text-toppr-700 font-bold text-xs transition active:scale-95">
                    <span>${linkText}</span>
                    <i data-lucide="external-link" class="w-3 h-3"></i>
                  </a>
                </div>
              ` : ''}
            </div>
          `;
        }

        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div class="flex items-center space-x-2.5">
                <button type="button" onclick="openGkQuestionInAudit(${item.questionNumber})" class="px-2.5 py-1 rounded-lg bg-toppr-600 hover:bg-toppr-700 text-white font-heading font-black text-xs transition flex items-center space-x-1 shadow-sm active:scale-95" title="Click to inspect Question #${item.questionNumber} in Question Paper Audit">
                  <span>Q.${item.questionNumber}</span>
                  <i data-lucide="external-link" class="w-3 h-3"></i>
                </button>
                <span class="font-heading font-bold text-slate-900 text-xs sm:text-sm truncate">${item.topic}</span>
              </div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                isHigh ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              } shrink-0">
                ${isHigh ? '🟢 HIGH' : '🟡 MEDIUM'}
              </span>
            </div>

            <div class="mt-2.5 space-y-1.5 text-xs">
              <div class="flex items-center space-x-2 flex-wrap">
                <span class="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-black text-[10px] uppercase tracking-wider border border-rose-200/60">${item.sourceType}</span>
                <strong class="text-slate-800">${item.bookSource}</strong>
              </div>
              ${classChapterHtml}
              <div class="text-slate-700 font-medium text-[11px] sm:text-xs">
                <span class="text-slate-400 font-normal">Topic/Concept:</span> ${item.specificConcept}
              </div>
            </div>

            ${svCardHtml}

            ${!isHigh ? `
            <div class="mt-2.5 p-2 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-snug">
              ⚠️ <em>${item.confidenceReason || 'Exact source mapping is not uniquely established.'}</em>
            </div>
            ` : ''}
          </div>

          <details class="group text-xs pt-2 border-t border-slate-100 mt-2">
            <summary class="cursor-pointer text-slate-500 hover:text-slate-800 font-bold text-[11px] flex items-center justify-between py-0.5 select-none">
              <span>Reference Proof / Why this reference?</span>
              <span class="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div class="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] leading-relaxed">
              ${item.verificationBasis}
            </div>
          </details>
        `;

        container.appendChild(card);
      });

      if (window.lucide) lucide.createIcons();
    }"""

assert old_funcs in html, "Could not find old funcs in HTML!"
html = html.replace(old_funcs, new_funcs)

# ─────────────────────────────────────────────────────────────────────────────
# 5. Write back to static/index.html and index.html
# ─────────────────────────────────────────────────────────────────────────────
with open(STATIC_HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html)

with open(ROOT_HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html)

print("Successfully updated static/index.html and index.html for Phase 3!")
