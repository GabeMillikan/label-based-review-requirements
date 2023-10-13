const core = require('@actions/core');
const github = require('@actions/github');

try {
    const octokit = github.getOctokit(core.getInput('token'));
    console.log(`YOO ${octokit}`);
} catch (error) {
    core.setFailed(error.message);
}
