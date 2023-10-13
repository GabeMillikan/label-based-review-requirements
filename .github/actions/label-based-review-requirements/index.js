const core = require('@actions/core');
const github = require('@actions/github');

try {
    console.log(`before`);
    const octokit = github.getOctokit(core.getInput('token'));
    console.log(`YOO ${octokit}`);
} catch (error) {
    core.setFailed(error.message);
}
