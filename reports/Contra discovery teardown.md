# Contra discovery teardown

Researched 2026-11-11 from Uzo's logged-in session. The research was read-only; the profile changes made afterwards are listed in section 5. Sources: Contra's own web app traffic, its public JS bundles, Contra help-center pages, and searches run through the normal Discover UI.

Confidence labels:
- **Confirmed**: the API or Contra's own docs say so directly.
- **Strong**: a clear pattern across 100+ search results.
- **Hypothesis**: fits the data but isn't proven.

---

## 1. How discovery works

### The Discovery Score (Confirmed, from the API)

Your score is **189 pts, `topPercent: 1`, `discoverable: true`**. The API returns the full breakdown to your browser, including the parts the page locks behind PRO. The score is calculated **per role or tool** (`discoverability(roleOrToolId)`), so you have a different score for each role.

| Factor | Impact | You now | Next boost |
|---|---|---|---|
| Profile completion | HIGH | 100% | done |
| Profile quality | HIGH | 87% | — |
| Average rating | HIGH | 5.0 | — |
| Availability | HIGH | available | — |
| Earnings (through Contra) | HIGH | $35,585 | $50K, then $100K |
| Reviews | HIGH | 6 | **10**, then 25 |
| Verified (paid) portfolio projects | HIGH | 4 | **10** |
| Relevant portfolio projects (quality-checked) | HIGH | **3 high / 10 low quality** | — |
| Relevant productized services | HIGH | 3 high quality | — |
| Contra Pro | MEDIUM | 0 / 12 months | grows with months subscribed |
| Inquiry response time | MEDIUM | **no data** | — |
| Post replies received | MEDIUM | 88 | **100**, then 150 |
| Post reactions received | MEDIUM | 418 | **500**, then 1000 |
| Expert badges | MEDIUM | 1 | 2, then 3 |
| Relevant social posts | MEDIUM | **0** | — |

The help center lists the same inputs and says Pro membership has "a positive impact" on the score. It gives no weights.

### Project and service quality checks (Confirmed, from the bundle and API)

Every project gets a list of quality issues from a fixed set:
- `TITLE_TOO_SHORT`
- `NO_CUSTOM_COVER`
- `DESCRIPTION_TOO_SHORT`
- `CONTENT_TOO_SHORT`
- `NO_HIGH_QUALITY_MEDIA`

Services are checked for `TITLE_TOO_SHORT`, `NO_CUSTOM_COVER`, `DESCRIPTION_TOO_SHORT` and `PRICE_TOO_LOW`.

**The description cutoff is somewhere between 96 and 150 characters (Strong).** Every one of your projects with a description of 150 characters or more passes, and every one with 95 or fewer fails:

| Project | Desc chars | Issue |
|---|---|---|
| Third Settlements | 150 | ✅ |
| Share Inc. | 158 | ✅ |
| DTI | 159 | ✅ |
| Williams Alamu '23 | 90 | DESCRIPTION_TOO_SHORT |
| Cassettine | 95 | DESCRIPTION_TOO_SHORT |
| Dubai Habitat | 87 | DESCRIPTION_TOO_SHORT |
| Williams Alamu 2024 | 46 | DESCRIPTION_TOO_SHORT |
| Coffee Roasters | 156 | CONTENT_TOO_SHORT (body is too thin) |
| Alvren Partners | 80 | DESCRIPTION_TOO_SHORT |
| Mura | 76 | NO_HIGH_QUALITY_MEDIA + DESCRIPTION_TOO_SHORT |
| Thalia Therapeutics | 78 | DESCRIPTION_TOO_SHORT |
| Mailata Family Foundation | 69 | DESCRIPTION_TOO_SHORT |
| Point Africa | 34 | CONTENT_TOO_SHORT + DESCRIPTION_TOO_SHORT |

### Search ranking (Strong)

I ran "design engineer" and "webflow developer" in Discover → People and recorded about 140 and 128 results.

1. **You only show up for a role if you have work tagged with it.** All results in the exact-match section had at least one item tagged with the searched role. The card chip ("Design Engineer (5)") counts those items.
2. **PRO is a large ranking boost.** The help center says so ("priority placement in Discover and a boost in job matching"), and the data shows it:
   - "design engineer": PRO share by position went 8/10, 6/10, 6/10, 2/10, 1/10, 0/10, 0/10, 0/10.
   - "webflow developer": 9/10, 8/10, 4/10, 2/10, 0/10.
   - Non-PRO profiles with 14+ hires sit below PRO profiles with 1–2 hires and $1K+ earned.
3. **The ranking works in windows (Hypothesis).** Roughly every 80 results, PRO members, quick responders and available people jump back to the top. That fits a two-step system: first fetch candidates by relevance, then re-rank each batch on business signals (PRO, responsiveness, availability). Each result also has a `rankingDetails` field, but it comes back `null` for normal accounts.
4. **Where you rank today (baseline for any experiment):**
   - "design engineer": **about #99 of about 144**. You're a non-PRO profile among PRO members with far weaker stats. Your 8 Design Engineer matches are mostly recent posts.
   - "webflow developer": **about #121, and the list goes deeper**. This pool is crowded with people who have 10–20 Webflow-tagged projects plus PRO or MAX.
5. **The Design Engineer pool is about 4× less crowded than Webflow,** and Discover has no Design Engineer category. Your repositioning is pointed at the less contested lane.

### Jobs and invites (Confirmed)

- Free accounts see **3 of 106** open jobs. PRO gets "priority access to all jobs before everyone else". The server only sends you those 3, so this isn't a hidden-in-the-page paywall.
- Your 3 "For you" jobs were a video editor, a copywriter and a Blender modeller. Matching for free accounts barely uses your profile.
- This is the most likely explanation for invites drying up after PRO launched. Both search position and job visibility moved behind the subscription.

### The new Contra MCP (Confirmed, from contra.com/features/mcp)

- 60+ tools.
- Clients' AI assistants can search talent "by role, skills, expertise, and location" (their example: "a Webflow developer who knows e-commerce").
- It almost certainly uses the same role/tool tags as Discover. Projects tagged with the right roles are how an AI agent finds you too.

### Other platform signals

- Contra runs a Framer partner programme. Framer projects get a Framer badge on Discover cards (`PARTNER_CREATOR_AFFILIATE` campaign), Discover has a "Web design projects using Framer" row, and many top results carry a "Framer expert" badge.
- Top 100 is a monthly earnings leaderboard counting payments through Contra only. You're at $0 this month, and the cutoff is about $12K.

---

## 2. The core problem

**Contra's ranking sees you as a Webflow developer.** Your three high-quality projects are all tagged Webflow Developer / Frontend Engineer / Web Developer. Your design engineering work (Figma detach, Spotify Two Streams, GitHub time away, Calendar, WhatsApp, Apple clock, AI Overview) only exists as **posts**. Those posts are your most-viewed work (250–870 views), but posts don't count toward "relevant portfolio projects", which is a HIGH-impact factor. That's why Design Engineer isn't even in your list of scored roles: it isn't one of the 9 roles the API calculates a score for.

---

## 3. What to change, by impact

### A. Turn the prototypes into portfolio projects (biggest lever, free)

Make each one a real project, not a post:
- **Roles** (3 per project): Design Engineer, UX Engineer, Frontend Engineer. Put Design Engineer first on all of them.
- **Tools**: React, TypeScript, Motion for React, Figma.
- **Description**: at least 150 characters (drafts below, all checked at 150–159).
- **Cover**: a custom cover, not an auto-grabbed screenshot.
- **Media**: a screen recording.
- **Body**: the decisions (the GitHub post's numbered list is exactly the depth they want) plus the live demo link.

Draft descriptions (please check each one against what the prototype actually does):

- **Figma Detach Reasons** (154): A Figma concept that asks designers why they detached a component, then shows the design system team what got detached and why. Built in React and Motion.
- **Spotify Two Streams** (152): A Spotify prototype that keeps your album waiting behind a podcast, so one tap takes you back to where you were. Designed and built in React and Motion.
- **GitHub Time Away** (156): A GitHub feature concept: select empty days on your contribution graph and mark them as time away. Full keyboard support, screen reader labels, React build.
- **Google Calendar: Send as Email** (154): A Google Calendar prototype that turns a weekly meeting into an email update in one step, and cancels that week's meeting when you send. React and Motion.
- **WhatsApp Voice Note Transcript** (152): A WhatsApp voice note prototype: tap any word in the transcript to play from there, with uncertain words marked so you can check them. React and Motion.
- **Apple Homeview Clock** (157): A rebuild of the clock customization from Apple's Homeview. Ticks grow in from the edge and push the numbers inward when you switch styles. React and Motion.
- **Skip AI Overview** (150): A Google Search concept: what if you could skip the AI Overview the way you skip a YouTube ad? Designed and prototyped end to end in React and Motion.

If any paid client work was design engineering rather than Webflow, add it as a project and link the Contra invoice. Verified paid projects are a separate HIGH factor.

### B. Fix the 10 low-quality Webflow projects (about one hour, free)

Rewrite each description to 150–160 characters. Point Africa and Coffee Roasters also need more body content. Mura needs a high-quality image or video. This takes them from 3/13 to 13/13 passing. On the oldest pieces (the Williams Alamu folios, Coffee Roasters), consider retagging with Design Engineer or UX Engineer where it's honest.

### C. Add a Design Engineer service

You have three high-quality services, but all are Webflow or accessibility. Add one like "Interactive prototype in React + Motion (1 week)", tagged Design Engineer + React + Motion for React. Keep the price at your normal rate, because the check flags `PRICE_TOO_LOW`.

### D. Close the cheap milestones

- **Reviews 6 → 10.** Ask four past clients (the Contra review invite works for off-platform clients too).
- **Post replies 88 → 100 and reactions 418 → 500.** You're close. Keep posting the prototypes, and **add the Design Engineer tag to every post**: your "relevant social posts" count is 0.
- **Response time shows no data.** Answer inquiries inside Contra quickly so the factor gets a value.
- **Invoice direct clients through Contra.** It's commission-free for you, and it raises earnings (HIGH, next boost at $50K) and verified paid projects (HIGH, 4 → 10).
- Consider making earnings public. The profile shows `$•••••` while search cards already show $25K+.

### E. PRO, as a measured experiment

The data shows PRO decides your position in each ranking window and unlocks 103 hidden jobs. Rather than taking that on faith:

1. Do A–C first and wait about a week for re-indexing.
2. Re-run both searches and record your positions (baseline above: #99 and #121).
3. Subscribe for one month ($29), then re-run the same searches after a week.
4. While subscribed, snapshot the full jobs board each week (count by role: Webflow, Framer, Design Engineer, React) to get the trend data a free account can't see.

That separates the effect of profile quality from the effect of paying, and settles whether PRO is worth it for you.

---

## 4. Jobs trend: what we can and can't say

- **Can't measure on Contra from a free account.** 103 of 106 jobs are hidden on the server.
- **Outside signals point the same way as your instinct.**
  - Webflow restructured toward an "agentic web" platform and cut about 140 jobs in 2026 ([webhosting.today](https://webhosting.today/2026/06/01/wix-cut-1000-jobs-webflow-cut-140-the-website-builder-market-is-splitting/), [wearefounders.uk](https://www.wearefounders.uk/webflow-just-got-out-no-coded-what-linda-tongs-agentic-web-memo-actually-means/), [Sacra](https://sacra.com/chat/h/feebc7af-135b-491c-ba88-1902ba014c40/)).
  - Inside Contra, Framer gets the partner promotion, not Webflow.
  - None of this is a direct count of postings.
- **Best route to real numbers:** the PRO month in step E, or connecting the official Contra MCP (60+ tools, you'd do the OAuth sign-in) and checking whether its job tools return the full board.

---

## 5. What changed on the profile (2026-11-11 to 12)

### Done

- **7 prototype projects created and published**: Figma detach, Spotify Two Streams, GitHub Time Away, Calendar "could be an email", WhatsApp voice notes, Homeview clock, Skip AI Overview.
  - Each project has:
    - roles Design Engineer, Frontend Engineer and UX Engineer;
    - tools Motion for React, React and TypeScript;
    - one industry;
    - a description of 150 to 160 characters;
    - a link to the live prototype on uzookafor.com.
  - Each project's video plays at the top of the page. The video is the lab preview.mp4, or for Skip AI Overview, the video from the original post.
  - Duplicate stills were taken out of the body.
- **Descriptions lengthened**: 9 Webflow project descriptions now run 150 characters or more. Every remaining project passes the length check.
- **New service**: [Interactive prototype in React + Motion, 1 week](https://contra.com/s/EksNqUkX-interactive-prototype-in-react-motion-or-1-week).
  - $2,499 fixed. This price was my call, so change it if it's wrong.
  - Tagged Design Engineer, UX Engineer and Frontend Engineer, plus React, TypeScript, Motion, Next.js and Figma.
  - The 7 projects are attached.
- **Deleted, at your request**: Coffee Roasters and Point Africa. Both embedded sites (`*.webflow.io`) returned 404.

### Still open

- **Three more old projects have dead links. I asked before deleting these.**
  - Williams Alamu '23 Folio (`willie-folio.vercel.app`) and Dubai Habitat (`dubai-habitat.vercel.app`) return HTTP 451 `DEPLOYMENT_DISABLED`. That is probably the Vercel team flag, so these two may be recoverable.
  - Williams Alamu 2024 (`willie.design`): the domain no longer resolves.
- **Mura still has the "High quality media" flag.** It has one featured image and one paragraph. It needs 2 or 3 real screenshots or a screen recording of the build. Screenshots of today's mura.co might not show your version, so I didn't add any.

### First read after the changes

- **Search (Confirmed): Contra's MCP `search_freelancers`, sorted by relevance.**

  | Query | Position |
  |---|---|
  | "design engineer" | **#11** |
  | role filter Design Engineer | **#11** |
  | "design engineer react motion" | **#2** |
  | "webflow developer" | not in top 25 |
  | "webflow gsap" | not in top 50 |

  - This search isn't the same surface as the Discover UI baseline (#99). Compare like with like: re-run the Discover UI searches in about a week.
- **Discovery score: 183, down from 189.** The visible page doesn't say why.
  - The score is per role. The headline probably moved because the profile now leans Design Engineer, and that role has a different earnings and quality mix. (Hypothesis)
  - Re-check once the new projects are indexed.
- **Jobs: the MCP `list_job_feed` is capped too.**
  - It reports `accessLimitedFeed: true` and returns 3 of 106 jobs.
  - The 3 jobs are copywriting and video editing, so the "For you" matching isn't using your roles at all.
  - The MCP doesn't get around the jobs paywall.

### How the MCP is connected

- `~/.claude.json` has `mcpServers.contra` (`https://contra.com/mcp`, HTTP).
- New Claude Code sessions will ask you to sign in through OAuth once.
- This session used a manual PKCE sign-in. Its token lives only in the session scratchpad.
- Every write uses Contra's prepare → confirm flow. `list_reversible_mcp_writes` shows writes that can be undone.

### Editor gotchas (for next time)

- The web editor allows at most **3 tools** per project, even though the MCP accepts up to 5.
- To put a video at the top of a project, upload an mp4 or webm to the editor's hidden file input. The MCP can only embed Vimeo or YouTube.
- Backspace on a selected image can also take the block above it. Delete one block at a time and check after each.

---

## What I didn't do

- After the safety check stopped me, I didn't call Contra's API directly to pull per-role scores the UI keeps behind PRO.
- `rankingDetails` (per-result ranking reasons) is staff-only and stays unknown.
- No posts were shared to the community feed, and no messages were sent.

## Sources

- [How Contra's discovery score works](https://help.contra.com/en/articles/11899394-how-contra-s-discovery-score-works)
- [What is Contra Pro](https://help.contra.com/en/articles/9322981-what-is-contra-pro)
- [Contra MCP](https://contra.com/features/mcp)
- [Contra Top 100](https://contra.com/top-100)
