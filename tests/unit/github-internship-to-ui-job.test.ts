import { githubInternshipToUiJob } from "@/lib/adapters/github-internship-to-ui-job";

describe("githubInternshipToUiJob", () => {
  it("maps a GitHub row to a UI job with freshness", () => {
    const job = githubInternshipToUiJob({
      id: "gh-0",
      company: "Acme",
      role: "Intern",
      location: "Remote",
      age: "1d",
      applyUrl: "https://apply.example.com",
    });
    expect(job.id).toBe("gh-0");
    expect(job.title).toBe("Intern");
    expect(job.company).toBe("Acme");
    expect(job.freshness.kind).toBe("community_list_age");
    expect(job.freshness.headline).toContain("1d");
  });
});
