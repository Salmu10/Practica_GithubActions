const core = require('@actions/core');
const fs = require('fs').promises;

async function add_badge() {

    try {
        const res = core.getInput('cypress_result');

        const test_fail = 'https://img.shields.io/badge/test-failure-red';
        const test_success = 'https://img.shields.io/badge/tested%20with-Cypress-04C38E.svg';

        const url = res === 'success' ? test_success : test_fail;

        const old_readme = await fs.readFile('./README.md', 'utf8');
        const new_readme = old_readme.search(test_success) !== -1 ? old_readme.replace(test_success, url) : old_readme.replace(test_fail, url);
        
        await fs.writeFile('./README.md', new_readme);
        process.exit(0);
    } catch (error) {
        core.setFailed(error);
    }
}

add_badge();