import { internshipRowToJdText } from "@/lib/github-internships-text";

describe("internshipRowToJdText", () => {
  it("builds JD text from a row", () => {
    const text = internshipRowToJdText({
      id: "gh-0",
      company: "Acme",
      role: "Intern",
      location: "Remote",
      age: "1d",
      applyUrl: "https://jobs.example.com/1",
    });
    expect(text).toContain("Company: Acme");
    expect(text).toContain("Role: Intern");
    expect(text).toContain("Application URL: https://jobs.example.com/1");
    expect(text).toContain("Listing age (repo): 1d");
  });

  it("omits optional lines when missing", () => {
    const text = internshipRowToJdText({
      id: "gh-1",
      company: "Beta",
      role: "SWE",
      location: "NYC",
      age: "",
    });
    expect(text).not.toContain("Listing age");
    expect(text).not.toContain("Application URL");
  });
});
