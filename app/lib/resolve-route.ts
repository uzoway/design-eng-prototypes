/**
 * Works out which page a broken link meant, so the 404 page can send people there instead.
 *
 * Links get mangled on their way to people: a mail client keeps the ")" from
 * "(uzookafor.com/plurise)", a sentence's full stop sticks to the URL, someone types
 * "/Linkedin-nav", or a long link is cut short ("/figma-deta"). GitHub Pages is
 * case-sensitive and has no redirects, so each of those lands on the 404 page.
 *
 * Returns the page's path with its trailing slash ("/plurise/"), "/" for the home page,
 * or null when nothing is a confident match.
 *
 * It runs in the browser as an inline script, serialised with toString(), so it must stay
 * self-contained: no imports, no outer variables, nothing that compiles to a helper.
 */
export function resolveRoute(pathname: string, routes: string[]): string | null {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // A stray "%" can't be decoded; match on the raw path.
  }

  path = path
    .toLowerCase()
    .replace(/\/index\.html?$/, "")
    // Leading slashes and anything a sentence wraps a link in.
    .replace(/^[\s/("'<[{]+/, "")
    // Trailing slashes, closing brackets and sentence punctuation.
    .replace(/[\s/)\]}>.,;:!?'"`*]+$/, "")
    .replace(/\/{2,}/g, "/");

  if (path === "") return "/";

  const known: Record<string, boolean> = {};
  for (let i = 0; i < routes.length; i++) known[routes[i]] = true;

  if (known[path]) return "/" + path + "/";

  // A deeper path under a real page ("/plurise/anything") goes to that page.
  const first = path.split("/")[0];
  if (known[first]) return "/" + first + "/";

  // A link cut short: the only page whose slug starts with what's left.
  if (first.length >= 4) {
    let prefixed = "";
    let count = 0;
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].indexOf(first) === 0) {
        prefixed = routes[i];
        count++;
      }
    }
    if (count === 1) return "/" + prefixed + "/";
  }

  // A slug with something added ("plurise-lab", "two-streams-phone").
  let contained = "";
  let containedCount = 0;
  for (let i = 0; i < routes.length; i++) {
    if (routes[i].length >= 5 && first.indexOf(routes[i]) !== -1) {
      contained = routes[i];
      containedCount++;
    }
  }
  if (containedCount === 1) return "/" + contained + "/";

  // A typo: one page within two edits, and no other page as close.
  if (first.length >= 5) {
    let best = "";
    let bestDistance = 3;
    let tied = false;
    for (let i = 0; i < routes.length; i++) {
      const a = first;
      const b = routes[i];
      let previous: number[] = [];
      for (let j = 0; j <= b.length; j++) previous.push(j);
      for (let x = 1; x <= a.length; x++) {
        const current: number[] = [x];
        for (let y = 1; y <= b.length; y++) {
          const cost = a.charAt(x - 1) === b.charAt(y - 1) ? 0 : 1;
          current.push(Math.min(previous[y] + 1, current[y - 1] + 1, previous[y - 1] + cost));
        }
        previous = current;
      }
      const distance = previous[b.length];
      if (distance < bestDistance) {
        best = b;
        bestDistance = distance;
        tied = false;
      } else if (distance === bestDistance) {
        tied = true;
      }
    }
    if (best && !tied) return "/" + best + "/";
  }

  return null;
}
