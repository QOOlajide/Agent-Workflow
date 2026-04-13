import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { GitHubInternshipRow } from "@/types/workflow";

function pickApplyUrl($: ReturnType<typeof cheerio.load>, cell: Element): string | undefined {
  const hrefs: string[] = [];
  $(cell)
    .find("a[href]")
    .each((_, a) => {
      const h = $(a).attr("href");
      if (h && /^https?:\/\//i.test(h)) hrefs.push(h.trim());
    });
  const external = hrefs.filter(
    (h) =>
      !h.includes("simplify.jobs/") &&
      !h.includes("i.imgur.com")
  );
  return external[0] ?? hrefs.find((h) => !h.includes("simplify.jobs/p/")) ?? hrefs[0];
}

/**
 * Parses HTML tables from the SimplifyJobs Summer README (embedded <table> in .md).
 */
export function parseInternshipReadmeTables(html: string): GitHubInternshipRow[] {
  const $ = cheerio.load(html);
  const rows: GitHubInternshipRow[] = [];
  let idx = 0;

  $("table").each((_, table) => {
    const $table = $(table);
    const rowEls = $table.find("tbody tr");
    const iterator = rowEls.length ? rowEls : $table.find("tr").filter((__, tr) => {
      return $(tr).find("> td").length >= 5;
    });

    iterator.each((__, tr) => {
      const $tr = $(tr);
      if ($tr.closest("thead").length) return;

      const tds = $tr.find("> td");
      if (tds.length < 5) return;

      const company = $(tds[0]).text().replace(/\s+/g, " ").trim();
      const companyUrl = $(tds[0]).find("a[href]").first().attr("href");
      const role = $(tds[1]).text().replace(/\s+/g, " ").trim();
      const location = $(tds[2]).text().replace(/\s+/g, " ").trim();
      const age = $(tds[4]).text().replace(/\s+/g, " ").trim();
      const cellEl = tds.get(3);
      const applyUrl = cellEl ? pickApplyUrl($, cellEl) : undefined;

      if (!company || !role) return;
      if (company === "Company" && role === "Role") return;

      rows.push({
        id: `gh-${idx++}`,
        company,
        companyUrl,
        role,
        location,
        applyUrl,
        age,
      });
    });
  });

  return rows;
}
