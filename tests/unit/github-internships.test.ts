import { parseInternshipReadmeTables } from "@/lib/github-internships";

const sampleTableHtml = `
<table>
  <thead><tr><td>Company</td><td>Role</td><td>Location</td><td>Apply</td><td>Age</td></tr></thead>
  <tbody>
    <tr>
      <td><a href="https://company.example">Acme Corp</a></td>
      <td>Software Intern</td>
      <td>Remote</td>
      <td><a href="https://apply.external.com/o/1">Apply here</a></td>
      <td>2d</td>
    </tr>
  </tbody>
</table>
`;

describe("parseInternshipReadmeTables", () => {
  it("parses internship rows from README table HTML", () => {
    const rows = parseInternshipReadmeTables(sampleTableHtml);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      company: "Acme Corp",
      role: "Software Intern",
      location: "Remote",
      age: "2d",
      applyUrl: "https://apply.external.com/o/1",
    });
    expect(rows[0].id).toMatch(/^gh-/);
  });

  it("skips header-like rows", () => {
    const html = `
      <table><tbody>
        <tr><td>Company</td><td>Role</td><td>Loc</td><td></td><td>Age</td></tr>
        <tr><td>RealCo</td><td>Eng</td><td>NY</td><td></td><td>1d</td></tr>
      </tbody></table>`;
    const rows = parseInternshipReadmeTables(html);
    expect(rows).toHaveLength(1);
    expect(rows[0].company).toBe("RealCo");
  });

  it("parses tables without tbody using row filter", () => {
    const html = `
      <table>
        <tr><td>SoloCo</td><td>Dev</td><td>SF</td><td></td><td>0d</td></tr>
      </table>`;
    const rows = parseInternshipReadmeTables(html);
    expect(rows).toHaveLength(1);
    expect(rows[0].company).toBe("SoloCo");
  });
});
