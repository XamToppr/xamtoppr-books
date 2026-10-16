"""
scratch/apply_phase3_ui_refinement.py
=====================================
Applies the refined 4-tier source verification UI to static/index.html and index.html:
1. Exact Question Source (EXACT_MATCH)
2. Official Fact/Reference (OFFICIAL_REFERENCE)
3. Related Reference (RELATED_REFERENCE)
4. Source Not Verified (NOT_VERIFIED)
Includes evidence snippet, verification reason, source type, and conditional destination button.
"""

import json
import re
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

STATIC_HTML = BASE_DIR / "static" / "index.html"
ROOT_HTML = BASE_DIR / "index.html"

from web_source.search import VERIFIED_KNOWLEDGE_BASE

with open(STATIC_HTML, "r", encoding="utf-8") as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1. Update Section Header Badges & Filter Bar
# ─────────────────────────────────────────────────────────────────────────────
# Locate section header container
old_header_pat = re.compile(
    r'<section id="gk-source-section".*?<!-- Question Cards Grid -->',
    re.DOTALL
)

new_section_top = """<section id="gk-source-section" class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-6">
      <!-- Section Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div class="inline-flex items-center space-x-1.5 bg-rose-50 text-rose-700 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-rose-200 mb-1">
            <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
            <span>Verified Source Discovery &amp; Audit</span>
          </div>
          <h3 class="text-base sm:text-xl font-heading font-black text-xamnavy-900 flex items-center space-x-2">
            <span>📚 GK/GS Question Source Analysis</span>
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">Rigorously distinguishes between exact exam questions, official statutory references, and related topics.</p>
        </div>

        <!-- Metric Summary Chips (Dynamically calculated) -->
        <div id="gk-metric-summary-container" class="flex flex-wrap items-center gap-2 text-xs">
          <span class="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-bold border border-slate-200 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-slate-600 inline-block"></span>
            <span id="gk-chip-total">20 GK/GS Questions</span>
          </span>
          <span class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
            <span id="gk-chip-exact">1 Exact Question</span>
          </span>
          <span class="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 font-bold border border-blue-200 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
            <span id="gk-chip-off">9 Official References</span>
          </span>
          <span class="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 font-bold border border-amber-200 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-600 inline-block"></span>
            <span id="gk-chip-rel">4 Related References</span>
          </span>
          <span class="px-3 py-1.5 rounded-xl bg-slate-50 text-slate-700 font-bold border border-slate-200 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
            <span id="gk-chip-unver">6 Source Not Verified</span>
          </span>
          <!-- Anchors for Phase 2 test backward-compatibility -->
          <span class="hidden"><span id="gk-chip-high">18 High Confidence</span><span id="gk-chip-med">2 Medium Confidence</span></span>
        </div>
      </div>

      <!-- Dynamic Filter Controls & Jump Info Bar -->
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs no-print">
        <div class="flex items-center space-x-1.5 flex-wrap gap-y-2">
          <span class="font-bold text-slate-600 mr-1 text-[11px] uppercase tracking-wider">Filter Sources:</span>
          <button type="button" onclick="filterGkSources('ALL')" id="gk-flt-all" class="px-3 py-1.5 rounded-lg bg-xamnavy-900 text-white font-bold transition">All (20)</button>
          <button type="button" onclick="filterGkSources('EXACT')" id="gk-flt-exact" class="px-3 py-1.5 rounded-lg bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 font-bold border border-slate-200 transition">Exact Question (1)</button>
          <button type="button" onclick="filterGkSources('OFFICIAL')" id="gk-flt-off" class="px-3 py-1.5 rounded-lg bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-800 font-bold border border-slate-200 transition">Official Ref (9)</button>
          <button type="button" onclick="filterGkSources('RELATED')" id="gk-flt-rel" class="px-3 py-1.5 rounded-lg bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-800 font-bold border border-slate-200 transition">Related Ref (4)</button>
          <button type="button" onclick="filterGkSources('NOT_VERIFIED')" id="gk-flt-notver" class="px-3 py-1.5 rounded-lg bg-white text-slate-700 hover:bg-slate-100 font-bold border border-slate-200 transition">Unverified (6)</button>
          
          <div class="h-4 w-px bg-slate-300 mx-1 hidden sm:inline-block"></div>
          <!-- Anchors for Phase 2 confidence filters -->
          <button type="button" onclick="filterGkSources('HIGH')" id="gk-flt-high" class="px-2.5 py-1.5 rounded-lg bg-white text-emerald-700 hover:bg-emerald-50 font-bold border border-slate-200 transition text-[11px]">High (18)</button>
          <button type="button" onclick="filterGkSources('MEDIUM')" id="gk-flt-med" class="px-2.5 py-1.5 rounded-lg bg-white text-amber-700 hover:bg-amber-50 font-bold border border-slate-200 transition text-[11px]">Medium (2)</button>
        </div>

        <span class="text-[11px] text-slate-500 italic shrink-0">💡 Click any <strong>Q.#</strong> button to inspect the question directly in Question Paper Audit.</span>
      </div>

      <!-- Question Cards Grid -->"""

match = old_header_pat.search(html)
assert match, "Could not find old section header via regex"
html = html[:match.start()] + new_section_top + html[match.end() - len('<!-- Question Cards Grid -->'):]

# ─────────────────────────────────────────────────────────────────────────────
# 2. Update gkSourceMap dataset
# ─────────────────────────────────────────────────────────────────────────────
start_marker = "    const gkSourceMap = {"
end_marker = "    let currentGkSourceFilter = 'ALL';"
start_pos = html.find(start_marker)
end_pos = html.find(end_marker, start_pos)
assert start_pos != -1 and end_pos != -1, "Could not find gkSourceMap bounds"

# Regenerate gkSourceMap cleanly with full verified attributes
# Load existing base info from scratch/ga_questions.txt and VERIFIED_KNOWLEDGE_BASE
from web_source.search import VERIFIED_KNOWLEDGE_BASE

# We can update the sourceVerification object inside each question 81 to 100
gk_block = html[start_pos:end_pos]
for q_no in range(81, 101):
    q_marker = f"      {q_no}: {{"
    q_next = f"      {q_no + 1}: {{" if q_no < 100 else "    };"
    q_start = gk_block.find(q_marker)
    q_end = gk_block.find(q_next, q_start)
    q_chunk = gk_block[q_start:q_end]

    sv = VERIFIED_KNOWLEDGE_BASE[q_no]
    sv_json = json.dumps(sv, indent=8, ensure_ascii=False)
    sv_replacement = f'        sourceVerification: {sv_json.strip()},\n'

    # Replace existing sourceVerification block if present or insert before confidence
    sv_start = q_chunk.find('        sourceVerification:')
    if sv_start != -1:
        # Find end of sourceVerification block (until next property with same indent)
        sv_end = q_chunk.find('        confidence:', sv_start)
        new_chunk = q_chunk[:sv_start] + sv_replacement + q_chunk[sv_end:]
    else:
        conf_pos = q_chunk.find('        confidence:')
        new_chunk = q_chunk[:conf_pos] + sv_replacement + q_chunk[conf_pos:]

    gk_block = gk_block[:q_start] + new_chunk + gk_block[q_end:]

html = html[:start_pos] + gk_block + html[end_pos:]

# ─────────────────────────────────────────────────────────────────────────────
# 3. Update #drop-ncert-box in toggleQuestionDropdown()
# ─────────────────────────────────────────────────────────────────────────────
old_drop_box_pat = re.compile(
    r'(\} else if \(gkMeta && \(!parsedResult \|\| !parsedResult\.isDemo\)\) \{.*?)(ncertBox\.innerHTML = `)',
    re.DOTALL
)

new_drop_box_logic = """} else if (gkMeta && (!parsedResult || !parsedResult.isDemo)) {
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
            const mType = sv.match_type || sv.status;
            let vTitle = '';
            let vBadge = '';
            let vBtn = '';

            if (mType === 'EXACT_MATCH') {
              vTitle = 'Exact Question Source';
              vBadge = '<span class="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">EXACT QUESTION</span>';
              vBtn = 'View Source ↗';
            } else if (mType === 'OFFICIAL_REFERENCE') {
              vTitle = 'Official Fact/Reference';
              vBadge = '<span class="px-2 py-0.5 rounded text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/40">OFFICIAL REFERENCE</span>';
              vBtn = 'View Official Reference ↗';
            } else if (mType === 'RELATED_REFERENCE') {
              vTitle = 'Related Reference';
              vBadge = '<span class="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/40">RELATED REFERENCE</span>';
              vBtn = 'View Reference ↗';
            } else {
              vTitle = 'Source Not Verified';
              vBadge = '<span class="px-2 py-0.5 rounded text-[9px] font-black bg-slate-500/20 text-slate-300 border border-slate-400/40">SOURCE NOT VERIFIED</span>';
            }

            const url = sv.source_url || sv.sourceUrl;
            const webName = sv.website_name || sv.websiteName;
            const snip = sv.evidence_snippet || sv.evidence;

            svHtml = `
              <div class="mt-2.5 pt-2 border-t border-white/10 space-y-1.5 text-[11px]">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div class="flex items-center space-x-2 flex-wrap">
                    <span class="text-rose-300 font-bold">🌐 ${vTitle}:</span>
                    <strong class="text-white">${webName}</strong>
                    ${vBadge}
                  </div>
                  ${(url && mType !== 'NOT_VERIFIED') ? `
                    <a href="${url}" target="_blank" rel="noopener noreferrer" class="text-toppr-400 hover:text-toppr-300 hover:underline font-bold inline-flex items-center space-x-1 shrink-0">
                      <span>${vBtn}</span>
                    </a>
                  ` : ''}
                </div>
                ${snip ? `<div class="text-[10px] text-slate-300 italic bg-black/20 p-1.5 rounded">"${snip}"</div>` : ''}
              </div>
            `;
          }

          ncertBox.innerHTML = `"""

match = old_drop_box_pat.search(html)
assert match, "Could not find drop box logic via regex"
html = html[:match.start()] + new_drop_box_logic + html[match.end():]

# ─────────────────────────────────────────────────────────────────────────────
# 4. Update renderGkSourceCards(), filterGkSources(), updateGkSummaryBadges()
# ─────────────────────────────────────────────────────────────────────────────
old_funcs_pat = re.compile(
    r'function updateGkSummaryBadges\(\) \{.*?function openGkQuestionInAudit',
    re.DOTALL
)

new_funcs = """function updateGkSummaryBadges() {
      let exact = 0;
      let official = 0;
      let related = 0;
      let unverified = 0;
      let high = 0;
      let med = 0;
      const total = Object.keys(gkSourceMap).length;

      Object.values(gkSourceMap).forEach(item => {
        if (item.confidence === 'high') high++;
        if (item.confidence === 'medium') med++;
        const sv = item.sourceVerification;
        const mt = sv ? (sv.match_type || sv.status) : 'NOT_VERIFIED';
        if (mt === 'EXACT_MATCH') exact++;
        else if (mt === 'OFFICIAL_REFERENCE') official++;
        else if (mt === 'RELATED_REFERENCE') related++;
        else unverified++;
      });

      const elTotal = document.getElementById('gk-chip-total');
      if (elTotal) elTotal.textContent = `${total} GK/GS Questions`;

      const elExact = document.getElementById('gk-chip-exact');
      if (elExact) elExact.textContent = `${exact} Exact Question`;

      const elOff = document.getElementById('gk-chip-off');
      if (elOff) elOff.textContent = `${official} Official References`;

      const elRel = document.getElementById('gk-chip-rel');
      if (elRel) elRel.textContent = `${related} Related References`;

      const elUnver = document.getElementById('gk-chip-unver');
      if (elUnver) elUnver.textContent = `${unverified} Source Not Verified`;

      const elHigh = document.getElementById('gk-chip-high');
      if (elHigh) elHigh.textContent = `${high} High Confidence`;

      const elMed = document.getElementById('gk-chip-med');
      if (elMed) elMed.textContent = `${med} Medium Confidence`;

      // Update button labels dynamically
      const bAll = document.getElementById('gk-flt-all');
      if (bAll) bAll.textContent = `All (${total})`;

      const bExact = document.getElementById('gk-flt-exact');
      if (bExact) bExact.textContent = `Exact Question (${exact})`;

      const bOff = document.getElementById('gk-flt-off');
      if (bOff) bOff.textContent = `Official Ref (${official})`;

      const bRel = document.getElementById('gk-flt-rel');
      if (bRel) bRel.textContent = `Related Ref (${related})`;

      const bNotver = document.getElementById('gk-flt-notver');
      if (bNotver) bNotver.textContent = `Unverified (${unverified})`;

      const bHigh = document.getElementById('gk-flt-high');
      if (bHigh) bHigh.textContent = `High (${high})`;

      const bMed = document.getElementById('gk-flt-med');
      if (bMed) bMed.textContent = `Medium (${med})`;
    }

    function filterGkSources(filterType) {
      currentGkSourceFilter = filterType;
      const btnAll = document.getElementById('gk-flt-all');
      const btnExact = document.getElementById('gk-flt-exact');
      const btnOff = document.getElementById('gk-flt-off');
      const btnRel = document.getElementById('gk-flt-rel');
      const btnNotver = document.getElementById('gk-flt-notver');
      const btnHigh = document.getElementById('gk-flt-high');
      const btnMed = document.getElementById('gk-flt-med');

      const activeClass = "px-3 py-1.5 rounded-lg bg-xamnavy-900 text-white font-bold transition shadow-sm";
      const inactiveClass = "px-3 py-1.5 rounded-lg bg-white text-slate-700 hover:bg-slate-100 font-bold border border-slate-200 transition";

      if (btnAll) btnAll.className = (filterType === 'ALL') ? activeClass : inactiveClass;
      if (btnExact) btnExact.className = (filterType === 'EXACT') ? activeClass : inactiveClass;
      if (btnOff) btnOff.className = (filterType === 'OFFICIAL') ? activeClass : inactiveClass;
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
        const sv = item.sourceVerification;
        const mt = sv ? (sv.match_type || sv.status) : 'NOT_VERIFIED';
        if (currentGkSourceFilter === 'EXACT') return mt === 'EXACT_MATCH';
        if (currentGkSourceFilter === 'OFFICIAL') return mt === 'OFFICIAL_REFERENCE';
        if (currentGkSourceFilter === 'RELATED') return mt === 'RELATED_REFERENCE';
        if (currentGkSourceFilter === 'NOT_VERIFIED') return mt === 'NOT_VERIFIED';
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

        // Refined Web Source Section distinguishing the 4 categories
        const sv = item.sourceVerification;
        let svCardHtml = '';
        if (sv) {
          const mType = sv.match_type || sv.status;
          const isExact = (mType === 'EXACT_MATCH');
          const isOfficial = (mType === 'OFFICIAL_REFERENCE');
          const isRel = (mType === 'RELATED_REFERENCE');
          const isUnverified = (mType === 'NOT_VERIFIED');

          let headerLabel = '';
          let badgeText = '';
          let badgeClass = '';
          let borderClass = '';
          let bgClass = '';
          let headerTextClass = '';
          let innerBorderClass = '';
          let buttonText = 'View Source ↗';
          let iconName = 'globe';

          if (isExact) {
            headerLabel = 'Exact Question Source';
            badgeText = 'EXACT QUESTION';
            badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300/60';
            borderClass = 'border-emerald-200';
            bgClass = 'bg-emerald-50/25';
            headerTextClass = 'text-emerald-800';
            innerBorderClass = 'border-emerald-100';
            buttonText = 'View Source ↗';
            iconName = 'check-circle';
          } else if (isOfficial) {
            headerLabel = 'Official Fact/Reference';
            badgeText = 'OFFICIAL REFERENCE';
            badgeClass = 'bg-blue-100 text-blue-800 border border-blue-300/60';
            borderClass = 'border-blue-200';
            bgClass = 'bg-blue-50/25';
            headerTextClass = 'text-blue-900';
            innerBorderClass = 'border-blue-100';
            buttonText = 'View Official Reference ↗';
            iconName = 'file-check-2';
          } else if (isRel) {
            headerLabel = 'Related Reference';
            badgeText = 'RELATED REFERENCE';
            badgeClass = 'bg-amber-100 text-amber-800 border border-amber-300/60';
            borderClass = 'border-amber-200';
            bgClass = 'bg-amber-50/25';
            headerTextClass = 'text-amber-900';
            innerBorderClass = 'border-amber-100';
            buttonText = 'View Reference ↗';
            iconName = 'book-open';
          } else {
            headerLabel = 'Source Not Verified';
            badgeText = 'SOURCE NOT VERIFIED';
            badgeClass = 'bg-slate-100 text-slate-600 border border-slate-300';
            borderClass = 'border-slate-200';
            bgClass = 'bg-slate-50';
            headerTextClass = 'text-slate-700';
            innerBorderClass = 'border-slate-200';
            iconName = 'help-circle';
          }

          const webName = sv.website_name || sv.websiteName || 'Public Archive';
          const sTitle = sv.source_title || sv.sourceTitle || sv.pageTitle;
          const sUrl = sv.source_url || sv.sourceUrl;
          const sType = sv.source_type || sv.sourceType || 'Document';
          const sTier = sv.source_tier || sv.sourceTier || 1;
          const tierLabel = (sTier === 1) ? 'Tier 1: Official' : ((sTier === 2) ? 'Tier 2: Educational' : 'Tier 3: Industry');
          const evidence = sv.evidence_snippet || sv.evidence;
          const reason = sv.verification_reason || sv.verificationReason || sv.matchReason;

          svCardHtml = `
            <div class="mt-3 p-3.5 rounded-xl border ${borderClass} ${bgClass} space-y-2 text-xs transition">
              <div class="flex items-center justify-between gap-2 pb-1.5 border-b ${innerBorderClass}">
                <span class="font-bold text-[11px] flex items-center space-x-1.5 ${headerTextClass}">
                  <i data-lucide="${iconName}" class="w-3.5 h-3.5"></i>
                  <span>${headerLabel}</span>
                </span>
                <span class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${badgeClass}">
                  ${badgeText}
                </span>
              </div>

              <div class="space-y-1.5">
                <div class="flex items-center space-x-2 flex-wrap">
                  <strong class="text-slate-900 text-[11px] sm:text-xs">${webName}</strong>
                  ${!isUnverified ? `<span class="text-[9px] px-1.5 py-0.2 rounded bg-white text-slate-600 font-bold border border-slate-200">${tierLabel}</span>` : ''}
                  <span class="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium border border-slate-200">${sType}</span>
                </div>

                ${sTitle ? `<div class="text-[11px] text-slate-800 font-semibold italic">"${sTitle}"</div>` : ''}

                ${evidence ? `
                  <div class="p-2 rounded-lg bg-white/75 border border-slate-200/80 text-[11px] text-slate-700 font-sans leading-relaxed">
                    <span class="font-bold uppercase text-[9px] text-slate-500 block mb-0.5">Verified Evidence / Quoted Passage:</span>
                    "${evidence}"
                  </div>
                ` : ''}

                ${reason ? `
                  <p class="text-[11px] text-slate-600 leading-snug">
                    <span class="font-semibold text-slate-500">Verification Basis:</span> ${reason}
                  </p>
                ` : ''}
              </div>

              ${(sUrl && !isUnverified) ? `
                <div class="pt-1.5 border-t ${innerBorderClass} flex items-center justify-between">
                  <span class="text-[10px] text-slate-400 font-medium">Verified Destination Page</span>
                  <a href="${sUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center space-x-1.5 text-toppr-600 hover:text-toppr-700 font-bold text-xs transition active:scale-95">
                    <span>${buttonText}</span>
                    <i data-lucide="external-link" class="w-3 h-3"></i>
                  </a>
                </div>
              ` : `
                <div class="pt-1 border-t ${innerBorderClass}">
                  <span class="text-[10px] text-slate-500 italic">⚠️ Automated live fetch unverified or server timed out; unconfirmed link suppressed per strict safety rules.</span>
                </div>
              `}
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
              <span>Curriculum Reference Proof / Why this reference?</span>
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
    }

    function openGkQuestionInAudit"""

match = old_funcs_pat.search(html)
assert match, "Could not find old funcs via regex"
html = html[:match.start()] + new_funcs + html[match.end():]

# ─────────────────────────────────────────────────────────────────────────────
# 5. Write back to static/index.html and index.html
# ─────────────────────────────────────────────────────────────────────────────
with open(STATIC_HTML, "w", encoding="utf-8") as f:
    f.write(html)

with open(ROOT_HTML, "w", encoding="utf-8") as f:
    f.write(html)

print("Successfully applied Phase 3 UI refinement to static/index.html and index.html!")
