const fs = require("fs");
const fetch = require("node-fetch");

const githubToken = process.env.REPORTING_REPO_TOKEN; // set your token in env vars
const org = "jaziel1974"; // replace with your org name
const headers = { Authorization: `token ${githubToken}` };

async function fetchAllPages(url) {
  let results = [];
  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Failed request: ${res.status}`);
    const data = await res.json();
    results = results.concat(data);

    const link = res.headers.get("link"); if (link && link.includes("rel=\"next\"")) {
      const match = link.match(/<([^>]+)>; rel=\"next\"/);
      url = match ? match[1] : null;
    } else {
      url = null;
    }
  }
  return results;
}

async function main() {
  console.log(`Processing all repositories in user: ${org}`);
  const repos = await fetchAllPages(
    `https://api.github.com/users/${org}/repos?per_page=100&type=public`
  );

  const results = [];

  for (const repo of repos) {
    let prs;
    try {
      console.log(`Now trying to get the repo ${repo.name}`); // Log the repository being processed
      prs = await fetchAllPages(
        `https://api.github.com/repos/${org}/${repo.name}/pulls?state=open&per_page=100`
      );
    } catch (error) {
      console.warn(`Skipping repository ${repo.name} due to ${error.message}`);
      continue; // Skip to the next repository
    }

    console.log(`Found ${prs.length} PRs`);
    
    for (const pr of prs) {
      const reviews = await fetchAllPages(
        `https://api.github.com/repos/${org}/${repo.name}/pulls/${pr.number}/reviews`
      );

      const status =
        reviews.length === 0 || reviews.every((rv) => rv.state === "PENDING")
          ? "Needs Review"
          : "Reviewed";

      // Collect unique reviewers' logins
      const reviewers = [...new Set(reviews.map(rv => rv.user && rv.user.login).filter(Boolean))];

      results.push({
        name: pr.title,
        description: pr.body,
        created_at: pr.created_at,
        author: pr.user.login,
        status: status,
        reviewers: reviewers,
        url: pr.html_url
      });
    }
  }

  // Export to JSON file
  fs.writeFileSync("org_prs_needing_review.json", JSON.stringify(results, null, 2));
  console.log("JSON file generated: org_prs_needing_review.json");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
