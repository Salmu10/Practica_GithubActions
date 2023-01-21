# PRÁCTICA GITHUB ACTIONS

Realizada por [`Salva Muñoz Úbeda`](https://github.com/salmu10)

# EXPLICACIÓN TEÓRICA

Primeramente, hacemos un “git clone” del repositorio que se nos proporciona en la práctica.

## LINTER JOB

He creado el workflow del proyecto dentro de la carpeta “.github”, con un job llamado linter-job, el cual instala las dependencias del proyecto y ejecuta el comando que realiza el linter test, el cual se puede ver en el "package.json", que en este caso es “npm run lint”.

```yml
  linter-job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install -D
      - name: execute linter
        run: npm run lint
```

Al hacer el “push” y realizar la "action", esta ha dado error puesto que hay errores que detecta el propio linter y que hay que corregir.

![Imagen](/assets/linter_result_1.png)

Una vez corregidos, la "action" ya se ejecuta correctamente.

![Imagen](/assets/linter_result_2.png)

<br>

## CYPRESS JOB

Para hacer el job de “cypress” empezamos realizando un “npm run start” y “npm run cypress” en la terminal de nuestro ordenador, para que no dé error la ejecución de “npm run start” haremos primero un “npm run build”. Al hacerlo, nos dará error, y es porque en el post del archivo “pages/api/index.js” hay un 0 que no debería estar. Por tanto, al quitarlo, ya funcionará correctamente.

![Imagen](/assets/cypress_error.png)

El resultado del job en el workflow será el siguiente. Como vemos, empieza realizando un checkout del código, ejecuta el comando “npm install”, ejecuta los test de cypress continuando aunque haya un error y crea un txt con el resultado del test.

```yml
  Cypress_job:
    runs-on: ubuntu-latest
    needs: linter-job
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - uses: cypress-io/github-action@v5
        with:
          build: npm run build
          start: npm run start
        id: res_cypress
        continue-on-error: true
      - run: echo ${{steps.res_cypress.outcome}} > result.txt
      - uses: actions/upload-artifact@v3
        with:
          name: result.txt
          path: result.txt
```

Y como podemos ver en la siguiente imagen, el test ha funcionado correctamente.

![Imagen](/assets/cypress_result.png)

<br>

## ADD BADGE JOB

Para este job crearemos una nueva carpeta en la carpeta de “.github” llamada “actions”, la cual contendrá una nueva carpeta que, en este caso, la he llamado “add_badge”, donde se encuentra la "action.yml" junto con el "index.js", que hará el cambio en el "README.md".

```yml
name: "action add badge"
description: "Update the README with cypress test result"
inputs:
  cypress_result:
    description: "Cypress test result"
    required: true
runs:
  using: "node16"
  main: "dist/index.js"
```

```js
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
```

Una vez creado el "index.js", ejecutaremos el comando “ncc build index.js” dentro de la carpeta donde se encuentra el "index.js", y así nos creará la carpeta “dist” con el archivo compilado.

Para que no dÉ error de permisos, hay que activar los siguientes permisos para el workflow:

![Imagen](/assets/badge_permisions.png)

El resultado del job en el workflow será el siguiente:

```yml
  Add_badge_job:
    runs-on: ubuntu-latest
    needs: Cypress_job
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: result.txt
      - run: echo "::set-output name=cypress_outcome::$(cat result.txt)"
        id: cypress_result
      - uses: ./.github/actions/add_badge
        with:
          cypress_result: ${{steps.cypress_result.outputs.cypress_outcome}} 
      - uses: EndBug/add-and-commit@v9
        with:
          add: "."
          author_name: "Salva Muñoz Úbeda"
          message: "Cypress test result updated"
          push: true
```

El badge que será modificado dependiendo del resultado es el siguiente:

<img src='https://img.shields.io/badge/tested%20with-Cypress-04C38E.svg'/>

<br>

## DEPLOY JOB

En este job publicaremos nuestro proyecto en la página de vercel, para ello vincularemos el repositorio con la página de vercel y crearemos el job en el workflow.

```yml
  Deploy_job:
    runs-on: ubuntu-latest
    needs: Cypress_job
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./
```

Además, tendremos que añadir los diferentes secrets a nuestro repositorio de github.

![Imagen](/assets/vercel_secrets.png)

- https://practica-github-actions-khaki.vercel.app/

<br>

## NOTIFICATION JOB

En este job enviaremos un correo con los resultados de todos los jobs anteriores, para ello he creado la siguiente action:

```yml
name: 'send email'
description: 'Email con el resultado del workflow'
inputs:
  linter_job: 
    description: 'Result of linter job'
    required: true
  cypress_job: 
    description: 'Result of cypress job'
    required: true
  add_badge_job: 
    description: 'Result of add badge job'
    required: true
  deploy_job: 
    description: 'Result of deploy job'
    required: true
  destinatario:
    description: 'Email receiver'
    required: true
  API_KEY:
    description: 'Api key de mailgun'
    required: true
  DOMAIN:
    description: 'Domain de mailgun'
    required: true
  
runs:
  using: "node16"
  main: "dist/index.js"
```

He decidido utilizar la api de mailgun, la cual ya usamos el año pasado, para enviar dicho correo. Además de guardar las key en los secrets de github, he configurado el siguiente js:

![Imagen](/assets/mail_secrets.png)

```js
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
```

Al hacer el push con el siguiente workflow configurado:

```yml
  Notification_job:
    runs-on: ubuntu-latest
    needs: [linter-job, Cypress_job, Add_badge_job, Deploy_job]
    if: always()
    steps:
      - uses: actions/checkout@v3
      - uses: ./.github/actions/email
        with:
          linter_job: ${{ needs.linter-job.result }}
          cypress_job: ${{ needs.Cypress_job.result }}
          add_badge_job: ${{ needs.Add_badge_job.result }}
          deploy_job: ${{ needs.Deploy_job.result }}
          destinatario: "salmu1997@gmail.com"
          API_KEY: ${{ secrets.API_KEY_MAILGUN }}
          DOMAIN: ${{ secrets.DOMAIN_KEY_MAILGUN }}
```

Se me envió el siguiente correo:

![Imagen](/assets/email.png)

<br>

## GITHUB-METRICS JOB

Este último job, lo he realizado en el repositorio de mi perfil de GitHub y el resultado del workflow es el siguiente:

```yml
name: Practica_GithubActions
on: 
  push:
   branches:
    - main
jobs:
  Github-metrics:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: lowlighter/metrics@latest
        with:
          token: ${{ secrets.METRICS_TOKEN }}
```

He añadido la siguiente línea en el README.md para que no sea modificado lo que previamente se encontraba en este:

![Imagen](/assets/metrics.png)

Y el resultado queda así:

![Imagen](/assets/Readme.png)
