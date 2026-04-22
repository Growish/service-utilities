# @growishpay/service-utilities

Libreria di utility Node.js pensata per progetti che usano Express e Mongoose, con componenti di supporto per:
- gestione e formattazione risposte HTTP standardizzate
- validazione input tramite Joi + i18n
- logger con rotazione file
- webhook GitHub (pull/reset automatico)
- sync Mongoose <-> Salesforce (plugin)
- gestione stato persistente su file JSON
- invio notifiche Slack

## Requisiti

- Node.js (CommonJS, `require(...)`)
- Express 5 (come `devDependency` nel package)
- Mongoose (necessario per i plugin su schema)
- (Opzionale) Slack bot hook, per `notifier`
- (Opzionale) GitHub webhook secret, per `github-hook-express-controller`

## Installazione

```bash
npm install @growishpay/service-utilities
```

## Entry point

Il modulo principale è `src/index.js`, che esporta:

- `logger`
- `notifier`
- `state`
- `githubHookExpress`
- `mongooseErrorFormatterPlugin`
- `salesforce`
- `express`
- `dependencyLocator`

Esempio:

```js
const {
  logger,
  notifier,
  state,
  githubHookExpress,
  mongooseErrorFormatterPlugin,
  salesforce,
  express,
  dependencyLocator
} = require('@growishpay/service-utilities');
```

## Moduli

### `express` (utilities per Express)

`src/express.js` espone:

- `express.init(app, authMiddleware = null, locale = 'en')`
- `express.Service` (builder di endpoint)
- `express.Middleware` (wrapper per controller con error handling)
- `express.Mfa` (placeholder/non implementato completamente nel repo)

#### `express.init(...)`

Inizializza il contesto dell’app:
- registra `api-middleware` come middleware globale (`app.use(apiMiddleware)`)
- salva `authMiddleware` (se non nullo) per proteggere rotte private
- imposta la `locale` usata da `input-validator`

Esempio:

```js
const expressApp = require('express');
const app = expressApp();
app.use(require('express').json()); // assicurati di avere il body parser

const { express } = require('@growishpay/service-utilities');
express.init(app, authMiddleware, 'en');
```

#### `express.Service`

`new express.Service(name)` ti permette di dichiarare:
- metodo HTTP (`isGet()`, `isPost()`, `isPut()`, `isDelete()`, `isAll()`)
- rotta (`respondsAt(route)`)
- middlewares (`setMiddlewares(m)`)
- pubblica/privata (`isPublic()`)
- validazione input (`setInputFields(schema)`)

`controller(fn)` registra l’endpoint su `app` e:
- valida `req.params`/`req.body` (di fatto usa il body in `input-validator`)
- in caso di errori risponde con `res.badRequest(errors)`
- gestisce eccezioni tramite `res.apiErrorResponse(error, name)`

Esempio:

```js
const { express } = require('@growishpay/service-utilities');

new express.Service('GetHealth')
  .isGet()
  .isPublic()
  .respondsAt('/health')
  .controller(async (req, res, logger) => {
    return res.resolve({ ok: true, at: new Date().toISOString() });
  });
```

Nota: le rotte private richiedono che `express.init(...)` riceva un `authMiddleware` valido.

#### `express.Middleware`

Wrapper per controller:

```js
const { express } = require('@growishpay/service-utilities');

const mw = new express.Middleware('MyController');
router.post('/path', mw.controller(async (req, res, logger) => {
  logger.info('running');
  return res.resolve({ ok: true });
}));
```

Il wrapper intercetta eccezioni e usa `res.apiErrorResponse(...)`.

### `api-middleware` (risposte HTTP standard)

In `src/api-middleware.js` vengono aggiunti helper a `res`:

- `res.resolve(payload)` -> `200`
- `res.badRequest(payload)` -> `400`
- `res.unauthorized(message)` -> `401`
- `res.forbidden(message)` -> `403`
- `res.conflict(reason, message)` -> `409`
- `res.notFound()` -> `404`
- `res.applicationError(message)` -> `500`
- `res.tooManyRequests(message)` -> `429`
- `res.timeout(message)` -> `408`
- `res.unavailable(message)` -> `503`
- `res.resolveAsCSV(payload)` (setta `Content-Type: text/csv` e invia `export.csv`)
- `res.apiErrorResponse(error, ctrlName)` per mappare eccezioni note (`ValidationError`, `ForbiddenError`, `ConflictError`) e loggare gli altri errori

Inoltre:
- `res.setPagination(p)` (opzionale) per includere `pagination` nella risposta
- aggiunta costanti `res.errorConstants` (mappatura codici)

### `input-validator` (Joi + i18n)

`src/input-validator.js` usa:
- `joi` per costruire lo schema a partire da una descrizione “string-based”
- `i18n` per tradurre i messaggi (catalogo statico italiano in `src/validation-locales/it.json`)

La funzione esportata è:
- `inputValidator.check(schema, params, body, locale)`

Per ogni campo:
- lo schema deve essere un oggetto i cui valori sono stringhe tipo `"<joiType>:<param1>,<param2>..."` oppure oggetti annidati
- viene eseguita la validazione su `body`
- i messaggi vengono tradotti tramite `i18n.__(el.type, el.context)`

Esempio di schema:

```js
const inputFields = {
  email: 'string:email,required',
  age: 'number:min=18,required'
};
```

### `logger` (Winston)

`src/logger.js` esporta un logger `winston` con:
- trasporto su file opzionale (rotazione giornaliera) sotto `./logs`:
  - `app-%DATE%.log` (info)
  - `error-%DATE%.log` (error)
  - `http-%DATE%.log` (http requests)
- console con formattazione colorata oppure JSON

Contiene inoltre:
- `logger.stream.write(...)` per compatibilità con alcuni middlewares HTTP
- `logger.genTag(name)` per taggare i log con un suffisso casuale

Default retrocompatibile:

```bash
LOGGER_MODE=legacy
```

In questa modalità il logger scrive sia su file che in console, come nelle versioni precedenti.

Per ambienti cloud / log collector:

```bash
LOGGER_MODE=cloud
```

In questa modalità il logger non scrive su disco e manda log JSON su stdout/stderr, lasciando a Docker, al runtime cloud o all'infrastruttura di logging il compito di raccoglierli.

Variabili opzionali:
- `LOGGER_FILE_ENABLED=false` disabilita i file log anche in modalità legacy
- `LOGGER_CONSOLE_ENABLED=false` disabilita la console
- `LOGGER_CONSOLE_JSON=true` forza il formato JSON in console

Test locale rapido:
- `node test.js` prova il logger in modalità legacy
- `LOGGER_MODE=cloud node test.js` prova il logger in modalità cloud
- `node test.js --server` avvia anche il server Express di prova sulla porta `3080`

> Se i file log sono abilitati, la cartella `logs/` è ignorata in `.gitignore` ma deve esistere o essere creabile dal processo.

### `notifier` (Slack)

In `src/notifier.js`:
- `notifier.init(env, SLACK_BOT_HOOK)`
- `notifier.send(text, attachment, level = 'low', overrideChannel)`

Comportamento:
- invia una richiesta HTTP POST verso `SLACK_BOT_HOOK`
- usa un payload Slack con `mrkdwn: true` e opzionali `attachments`
- colore attachment in base a `level` (`low`, `medium`, altro -> `#d1401c`)

Esempio:

```js
const { notifier } = require('@growishpay/service-utilities');

notifier.init(process.env.ENV, process.env.SLACK_BOT_HOOK);
await notifier.send('Job completato', { buildId: 123 }, 'medium');
```

### `state` (stato persistente su file)

`src/application-state.js` implementa una cache persistente su JSON:
- salva/legge `application-state.json`
- guarda il file con `chokidar` e ricarica automaticamente in caso di modifica

Metodi:
- `state.get(property?)` -> valore o intero oggetto
- `state.set(property, value)`
- `state.increment(property)` (incrementa se è un intero)

### `githubHookExpress` (controller webhook GitHub)

In `src/github-hook-express-controller.js`:
- `githubHookExpress.init(GITHUB_HOOK_SECRET, restartApplicationFn)`
- `githubHookExpress.controller(req, res)` per gestire l’evento webhook

Il controller:
- legge l’header `x-hub-signature`
- calcola una firma `sha1=HMAC(secret, JSON.stringify(req.body))`
- confronta la firma: se non matcha risponde `"KO"`
- se matcha:
  - esegue `git fetch --all`
  - esegue `git reset hard`
  - esegue `git pull`
  - se tra i file toccati c’è `package.json` esegue `npm install` e poi chiama `restartApplicationFn`
  - altrimenti chiama direttamente `restartApplicationFn`

Inoltre aggiorna `state.lastGithubPull` con `summary` e `files`.

Esempio (strutturale):

```js
const { githubHookExpress } = require('@growishpay/service-utilities');

githubHookExpress.init(process.env.GITHUB_HOOK_SECRET, () => {
  process.exit(0); // oppure una logica equivalente di restart
});

app.post('/github-webhook', githubHookExpress.controller);
```

### `mongooseErrorFormatterPlugin`

`src/mongoose-error-formatter-plugin.js` esporta una funzione da applicare a uno schema Mongoose:
- converte gli errori di validazione Mongoose (`ValidationError` con `err.errors`) in una forma:
  - `next({ name: 'ValidationError', data: { [field]: message } })`
- lo applica su hook:
  - `post('validate')`
  - `post('save')`
  - `post('findOneAndUpdate')`

Uso:

```js
const mongoose = require('mongoose');
const { mongooseErrorFormatterPlugin } = require('@growishpay/service-utilities');

const schema = new mongoose.Schema({ /* ... */ });
schema.plugin(mongooseErrorFormatterPlugin);
```

### `salesforce` (sync tramite plugin Mongoose)

In `src/salesforce-sync.js`:
- `salesforce.init(realTimeSyncActive, pushFn, deleteFn, addSalesforceFieldIntoSchema = false)`
- `salesforce.mongoosePlugin(schema, options = {})`

La funzione `mongoosePlugin` aggiunge:
- hook `pre('save')` (se `realTimeSyncActive` è true e non `ignorePushOnSave`)
  - chiama `pushFn({ assetId, assetClass, hook: 'save' })`
- metodi documento:
  - `doc.pushToSalesforce(force = false)` -> chiama `pushFn(..., hook: 'direct')`
  - `doc.deleteToSalesforce(force = false)` -> chiama `deleteFn(..., hook: 'direct')`
- hook delete:
  - `pre('deleteOne')` e `pre('deleteMany')` che risolvono i documenti coinvolti e chiamano `deleteFn(...)`
- opzionale: aggiunta nel documento dei campi:
  - `salesforce.sync` (boolean, enum false/true, default false)
  - `salesforce.lastSyncAt` (Date)

Uso:

```js
const { salesforce } = require('@growishpay/service-utilities');

salesforce.init(
  process.env.REAL_TIME_SYNC_ACTIVE === 'true',
  ({ assetId, assetClass, hook }) => {/* push a Salesforce */},
  ({ assetId, assetClass, hook }) => {/* delete su Salesforce */},
  true
);

schema.plugin(salesforce.mongoosePlugin, { assetClass: 'MyAssetClass' });
```

## `dependencyLocator`

In `src/dependency-locator.js` un semplice registry:
- `dependencyLocator.register(name, fn)`
- `dependencyLocator.get(name)`
- `dependencyLocator.purge(name)`

Utile per mantenere riferimenti a dipendenze “iniettate” runtime.

## Note

- Non c’è una suite di test configurata (`npm test` ritorna errore).
- Il progetto si concentra su utility modulari: alcuni moduli richiedono integrazioni esterne (Mongoose, Slack, GitHub webhook).
