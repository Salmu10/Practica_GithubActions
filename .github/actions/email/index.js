const core = require('@actions/core');
const formData = require('form-data');

const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);

let linter_job = core.getInput('linter_job');
let cypress_job = core.getInput('cypress_job');
let add_badge_job = core.getInput('add_badge_job');
let deploy_job = core.getInput('deploy_job');
let destinatario = core.getInput('destinatario');
var api_key = core.getInput('API_KEY');
var domain = core.getInput('DOMAIN');

const mg = mailgun.client({ username: 'api', key: api_key });

const body =`<div>
                <p>
                    Se ha realizado un push en la rama master que ha provocado la ejecución del
                    workflow Practica_GithubActions con los siguientes resultados:
                </p>
                <ul>
                    <li>linter_job: ${linter_job}</li>
                    <li>cypress_job: ${cypress_job}</li>
                    <li>add_badge_job: ${add_badge_job}</li>
                    <li>deploy_job: ${deploy_job}</li>
                </ul>
            </div>`;

mg.messages.create(domain, {
    from: "salmu1997@gmail.com",
    to: [destinatario],
    subject: "Resultado del workflow ejecutado",
    html: body
})
.then(msg => console.log(msg))
.catch(err => console.error(err));