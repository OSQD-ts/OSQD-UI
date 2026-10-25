import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTable, Pagination, Stepper, Table, TablePagination } from "../src/index";

const css = (file: string) => readFileSync(new URL(`../styles/${file}`, import.meta.url), "utf8");

describe("Table responsive modes", () => {
  it("scrolls by default and stacks on request", () => {
    const plain = renderToStaticMarkup(
      <Table>
        <tbody>
          <tr>
            <td>a</td>
          </tr>
        </tbody>
      </Table>,
    );
    expect(plain).not.toContain("oq-table--stack");
    const stacked = renderToStaticMarkup(
      <Table responsive="stack">
        <tbody>
          <tr>
            <td>a</td>
          </tr>
        </tbody>
      </Table>,
    );
    expect(stacked).toContain("oq-table--stack");
  });

  it("DataTable labels each cell from its string header, so stacked rows read as label–value", () => {
    const html = renderToStaticMarkup(
      <DataTable
        responsive="stack"
        rows={[{ id: 1, name: "fra-01", rps: 12 }]}
        columns={[
          { key: "name", header: "Node" },
          { key: "rps", header: "Req/s", align: "right" },
        ]}
      />,
    );
    expect(html).toContain('data-label="Node"');
    expect(html).toContain('data-label="Req/s"');
  });
});

describe("Pagination on phones", () => {
  it("marks only the neighbours of the current page, never first, current or last", () => {
    const html = renderToStaticMarkup(<Pagination page={5} count={20} onChange={() => {}} />);
    const near = [...html.matchAll(/<button[^>]*data-near=""[^>]*>(\d+)</g)].map((m) => Number(m[1]));
    expect(near).toEqual([4, 6]);
    expect(html).toMatch(/aria-current="page"[^>]*>5</);
  });

  it("TablePagination keeps an accessible name on the rows select when the label text is hidden", () => {
    const html = renderToStaticMarkup(
      <TablePagination page={1} count={312} rowsPerPage={20} onPageChange={() => {}} onRowsPerPageChange={() => {}} />,
    );
    expect(html).toContain('class="oq-table-pagination__label"');
    expect(html).toContain('aria-label="Rows per page"');
  });
});

describe("Stepper summary", () => {
  it("gives a horizontal stepper a one-line summary for phones", () => {
    const html = renderToStaticMarkup(<Stepper active={1} steps={[{ label: "Source" }, { label: "Parse" }, { label: "Review" }]} />);
    expect(html).toContain('data-summary="Step 2 of 3 · Parse"');
  });

  it("leaves vertical steppers alone", () => {
    const html = renderToStaticMarkup(<Stepper orientation="vertical" active={0} steps={[{ label: "One" }, { label: "Two" }]} />);
    expect(html).not.toContain("data-summary");
  });
});

describe("touch and small-screen CSS", () => {
  it("wraps every :hover rule in components.css in a hover media query", () => {
    // Outside @media (hover: hover), a hover style sticks after a tap on a touch screen.
    const src = css("components.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const offenders: string[] = [];
    let depth = 0;
    let hoverBlock = -1;
    for (const chunk of src.split(/(?=[{}])/)) {
      const head = chunk.replace(/^[{}]/, "");
      if (chunk.startsWith("}")) {
        depth--;
        if (depth < hoverBlock) hoverBlock = -1;
      }
      if (chunk.startsWith("{")) depth++;
      if (/@media[^{]*\(hover:\s*hover\)/.test(head)) hoverBlock = depth + 1;
      if (head.includes(":hover") && hoverBlock < 0 && !head.includes("@media")) offenders.push(head.trim().slice(0, 60));
    }
    expect(offenders).toEqual([]);
  });

  it("the pop animation does not animate transform, which would undo centring transforms", () => {
    const pop = css("components.css").match(/@keyframes oq-pop \{[^}]*\}/)?.[0] ?? "";
    expect(pop).not.toBe("");
    expect(pop).not.toContain("transform");
  });

  it("grid columns can never be wider than the screen", () => {
    expect(css("base.css")).toContain("minmax(min(var(--min, 220px), 100%), 1fr)");
  });
});
