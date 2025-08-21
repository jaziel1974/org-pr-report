const fs = require("fs");
const fetch = require("node-fetch");
const XLSX = require("xlsx");

const githubToken = process.env.REPORTING_REPO_TOKEN; // set your token in env vars
const org = "jaziel1974"; // replace with your org name
const headers = { Authorization: `token ${githubToken}` };

    if (link && link.includes("rel=\"next\"")) {
      const match = link.match(/<([^>]+)>; rel=\"next\"/);
      url = match ? match[1] : null;
    } else {
      url = null;
    }
  }
  return results;
}

async function main() {
  const repos = await fetchAllPages(
    `https://api.github.com/${org}/repos?per_page=100&type=all`
  );

  const results = [];

  for (const repo of repos) {
    const prs = await fetchAllPages(
      `https://api.github.com/repos/${org}/${repo.name}/pulls?state=open&per_page=100`
    );

    for (const pr of prs) {
      const reviews = await fetchAllPages(
        `https://api.github.com/repos/${org}/${repo.name}/pulls/${pr.number}/reviews`
      );

      const status =
        reviews.length === 0 || reviews.every((rv) => rv.state === "PENDING")
          ? "Needs Review"
          : "Reviewed";

      results.push({
        Repository: repo.name,
        "PR Number": pr.number,
        Title: pr.title,
        Owner: pr.user.login,
        URL: pr.html_url,
        Status: status,
      });
    }
  }

  // Export to Excel
  const worksheet = XLSX.utils.json_to_sheet(results);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "PRs");
  XLSX.writeFile(workbook, "org_prs_needing_review.xlsx");

  console.log("Spreadsheet generated: org_prs_needing_review.xlsx");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
