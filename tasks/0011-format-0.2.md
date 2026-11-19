# 0011 – Format 0.2: the rule problems the review found

**Who:** worker · **Status:** waiting – starts after 0010 (its Windows results decide P4–P6) and after v0.1.1 is merged · **Lane:** Format
**Repository it changes:** `smholte/toolbox-format` · **Branch:** `task/0011-format-0.2`
**Started by:** lead, 19 Nov 2026 · **Model:** Opus · effort High · **Merge:** lead review before merge, then both neighbour leads review (CLAUDE.md section 6)

## Goal

Format 0.2 closes the rule problems the independent review found, so that several copies of a tool, tools'
own file types and long names cannot break anything – and the text says exactly what the code does.

## Background

Task 0001's report (`tasks/0001-independent-review-of-the-format.md`), table "Rule problems and unclear text", P1–P29.
The lead's decisions (19 Nov 2026):

| # | Decision |
| --- | --- |
| P1 | Take up a left-over `waiting`/`working` job only when its status has not been updated for 5 minutes (as 6.4); a final status is never changed again (all readers check before writing). |
| P2 | **Own types may not use `head_matches`.** Only the built-in list may, and its patterns are reviewed here. Simplest and safe; widen later if a tool needs it. |
| P3 | A name: at most 120 characters **and** at most 255 bytes in UTF-8. |
| P4 | Add the names 0010 shows Windows keeps; refuse a space before the extension of a kept name. |
| P5 | Names must be NFC; "the same name" is compared with `upper()` after NFC. Adjust to 0010's findings. |
| P6 | Keep the whole path under 260 characters: tool id at most 60, job id at most 32, file name at most 80 – unless 0010 shows long paths work without settings. Check the samples and the apps' ids fit. |
| P7 | JSON at most 64 levels deep, in the text and both checkers. |
| P8 | `size` at most 9007199254740991 (schema and text). |
| P9–P29 | Text and checker fixes as the report proposes. Where the report offers a choice, take the simpler rule and say so in the changelog. P27: unknown entries are a WARNING. |

## The work

1. Each decision into `FORMAT.md`, the schemas, `types.json` if needed, the checker and the reference code in **both**
   languages, with a broken-copy test per new rule and a JavaScript/Python comparison where both judge it.
2. `VERSION` 0.2; samples remade; `CHANGELOG.md` says, per change, what an app has to do.
3. A short "What changed for tool authors" at the top of the changelog entry, for the leads' review.
4. Push the branch, **do not merge**. The ToolBox lead reviews, then sends it to the House Planner and Fresing Render
   leads through the lead post.

## Done when

- [ ] P1–P29 each done or, with a reason, left (in the report)
- [ ] All tests pass, also on GitHub; samples up to date
- [ ] Branch pushed, not merged; report filled in

## Not in this task

Router, apps, the trial page beyond what a rule change needs, making a tag.

---

## Report (filled in by the chat that did the task)

**Chat / date:**

**What changed:**

**Tested and measured** (name the machine, the browser, the version):

**Open points / follow-up tasks:**
