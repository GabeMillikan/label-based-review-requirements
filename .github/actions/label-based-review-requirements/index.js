const core = require('@actions/core');
const github = require('@actions/github');

async function parseApprovers() { // returns a Set of usernames which have approved the pull request
    const owner = github.context.payload.repository.owner.login;
    const repo = github.context.payload.repository.name;
    const pr = github.context.payload.pull_request.number;

    const octokit = github.getOctokit(core.getInput('token'));


    // shamelessly borrowing from
    // https://github.com/Automattic/action-required-review/commit/b194371ccf5dc949e02e0351e7702f77e38d95f5/src/reviewers.js#L18-L33
    // since I don't know asycnc javascript
    const approvers = new Set();
    for await (const res of octokit.paginate.iterator(octokit.rest.pulls.listReviews, {
        owner: owner,
        repo: repo,
        pull_number: pr,
        per_page: 100,
    })) {
        res.data.forEach(review => {
            // GitHub may return more than one review per user, but only counts the last non-comment one for each.
            // "APPROVED" allows merging, while "CHANGES_REQUESTED" and "DISMISSED" do not.
            if (review.state === 'APPROVED') {
                approvers.add(review.user.login);
            } else if (review.state !== 'COMMENTED') {
                approvers.delete(review.user.login);
            }
        });
    }

    return approvers;
}

async function determineMissingApprovals() {
    // returns an array with two elements: [
    //    the number of approvals still required,
    //    an array of specific people who must review,
    // ]
    return [1 - approvers.size, []];
}

function formatCommaSeparatedList(items) {
    // formats a list like:
    // ['a', 'b', 'c'] -> 'a, b, and c'
    // ['a', 'b'] -> 'a and b'
    if (items.length == 1) {
        return items[0];
    } else if (items.length == 2) {
        return items.join(" and ");
    } else {
        const firstItems = items.slice(0, -1);
        const lastItem = items[items.length - 1];
        return `${firstItems.join(', ')}, and ${lastItem}`
    }
}

function formatMissingApprovals(count, people) {
    const requirements = [];

    if (count !== 0) {
        requirements.push(`at least ${count} additional code ${count == 1 ? 'owner' : 'owners'}`);
    }

    if (people.length !== 0) {
        requirements.push(...people);
    }

    if (requirements.length === 0) {
        return "nobody";
    }

    return formatCommaSeparatedList(requirements);
}

async function determineFailureReason() { // describes the reason why the check should fail, or null if it should succeed
    const [missingCount, missingPeople] = await determineMissingApprovals();
    if (missingCount === 0 && missingPeople.length === 0) {
        return null;
    }

    return `Review is still required from: ${formatMissingApprovals(missingCount, missingPeople)}`;
};

determineFailureReason()
    .then(failureReason => {
        if (failureReason) {
            core.setFailed(failureReason);
        } else {
            console.log("All required reviewers approved!");
        }
    })
    .catch(e => {
        core.setFailed(e.message);
        core.info(err.stack);
    });
