const core = require('@actions/core');
const fs = require('fs').promises;

async function add_badge() {

    try {
        const res = core.getInput('cypress_result');
        const readme_path = './README.md';
        const test_fail = 'https://img.shields.io/badge/test-failure-red';
        const test_success = 'https://img.shields.io/badge/tested%20with-Cypress-04C38E.svg';

        const url = res === 'success' ? test_success : test_fail;

        const data = await fs.readFile(readme_path, 'utf8');
        const new_readme = data.search(test_success) !== -1 ? data.replace(test_success, url) : data.replace(test_fail, url);
        
        await fs.writeFile(readme_path, new_readme);
        process.exit(0);
    } catch (error) {
        core.setFailed(error);
    }
}

add_badge();