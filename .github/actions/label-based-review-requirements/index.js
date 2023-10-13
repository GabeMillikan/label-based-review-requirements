const core = require('@actions/core');
const github = require('@actions/github');

try {
    console.log("HELLO WORLD!!");
} catch (error) {
    core.setFailed(error.message);
}
