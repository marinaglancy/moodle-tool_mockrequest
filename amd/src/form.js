// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Sends the request composed in the form with the user's cookies and shows the response.
 *
 * @module     tool_mockrequest/form
 * @copyright  Marina Glancy
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Config from 'core/config';
import Modal from 'core/modal';
import {getString} from 'core/str';
import JSON5 from 'tool_mockrequest/local/json5';

const DBNAME = 'tool_mockrequest';
const DBSTORE = 'form';
const FIELDS = ['url', 'method', 'body'];

const PLACEHOLDERREGEX = /<[A-Z][A-Z0-9_]*>/g;

const HTMLREGEX = /<\/?[a-z][^>]*>/i;

/** @var {WeakMap} htmlPreviews HTML strings from the response, by the link that previews them */
const htmlPreviews = new WeakMap();

const EXAMPLEPLACEHOLDERS = [
    {name: '<SESSKEY>', auto: 'sesskey'},
    {name: '<USERID>', auto: 'userid'},
];

/** @var {Object} currentValues values of the current user that "auto" placeholders take */
let currentValues = {};

/** @var {String} dbKey key of the saved form values, one entry per site and user */
let dbKey = '';

const SELECTORS = {
    FORM: '#tool_mockrequest_form',
    BODY: '[data-region="body"]',
    BODYHINT: '[data-region="bodyhint"]',
    BODYNOTE: '[data-region="bodynote"]',
    BODYERROR: '[data-region="bodyerror"]',
    ERROR: '[data-region="error"]',
    PLACEHOLDERS: '[data-region="placeholders"]',
    PLACEHOLDER: '[data-region="placeholder"]',
    PLACEHOLDERTEMPLATE: '[data-region="placeholdertemplate"]',
    ADDPLACEHOLDER: '[data-action="addplaceholder"]',
    REMOVEPLACEHOLDER: '[data-action="removeplaceholder"]',
    MISSING: '[data-region="missingplaceholders"]',
    MISSINGTEXT: '[data-region="missingtext"]',
    ADDMISSING: '[data-action="addmissing"]',
    RESETFORM: '[data-action="resetform"]',
    RESULT: '[data-region="tool_mockrequest_result"]',
    REQUEST: '[data-region="request"]',
    STATUS: '[data-region="status"]',
    OUTPUT: '[data-region="output"]',
    PREVIEWHTML: '[data-action="previewhtml"]',
};

/**
 * Parses the response as JSON.
 *
 * @param {String} text
 * @returns {*} parsed value, or undefined if the text is empty or not valid JSON
 */
const parseJson = (text) => {
    if (text.trim() === '') {
        return undefined;
    }
    try {
        return JSON.parse(text);
    } catch (e) {
        return undefined;
    }
};

/**
 * Parses the request body as JSON5.
 *
 * @param {String} text
 * @returns {Object} {value} with the parsed value (undefined for an empty body), or {error} with the parser message
 */
const parseJson5 = (text) => {
    if (text.trim() === '') {
        return {value: undefined};
    }
    try {
        return {value: JSON5.parse(text)};
    } catch (e) {
        return {error: e.message.replace(/^JSON5: /, '')};
    }
};

/**
 * Returns the placeholders from the form.
 *
 * @param {HTMLFormElement} form
 * @returns {Array} list of {name, value, auto}
 */
const getPlaceholders = (form) => [...form.querySelectorAll(SELECTORS.PLACEHOLDER)].map((row) => ({
    name: row.querySelector('[data-field="name"]').value,
    value: row.querySelector('[data-field="value"]').value,
    auto: row.dataset.auto ?? null,
}));

/**
 * Replaces every placeholder in the text with its value.
 *
 * @param {String} text
 * @param {Array} placeholders
 * @returns {String}
 */
const substitute = (text, placeholders) => placeholders.reduce(
    (result, {name, value}) => (name === '' ? result : result.split(name).join(value)),
    text
);

/**
 * Adds a placeholder row.
 *
 * A row with "auto" takes the current user's value (see currentValues) until its value is edited.
 *
 * @param {HTMLFormElement} form
 * @param {Object} placeholder
 * @param {String} [placeholder.name]
 * @param {String} [placeholder.value]
 * @param {String|null} [placeholder.auto] key in currentValues
 * @returns {HTMLElement} the new row
 */
const addPlaceholder = (form, {name = '', value = '', auto = null} = {}) => {
    const row = form.querySelector(SELECTORS.PLACEHOLDERTEMPLATE).content.firstElementChild.cloneNode(true);
    row.querySelector('[data-field="name"]').value = `${name}`;
    row.querySelector('[data-field="value"]').value = `${value}`;
    if (Object.hasOwn(currentValues, auto)) {
        row.dataset.auto = auto;
        row.querySelector('[data-field="value"]').value = currentValues[auto];
    }
    form.querySelector(SELECTORS.PLACEHOLDERS).append(row);
    return row;
};

/**
 * Wraps an IndexedDB request or transaction in a promise.
 *
 * @param {IDBRequest|IDBTransaction} request
 * @returns {Promise} resolved with the request result
 */
const dbPromise = (request) => new Promise((resolve, reject) => {
    if (request instanceof IDBTransaction) {
        request.oncomplete = () => resolve();
    } else {
        request.onsuccess = () => resolve(request.result);
    }
    request.onerror = () => reject(request.error);
});

/**
 * Opens the object store where the form values are kept.
 *
 * The values are kept in IndexedDB because Moodle clears the local storage on every login.
 *
 * @param {String} mode 'readonly' or 'readwrite'
 * @returns {Promise<IDBObjectStore>}
 */
const openStore = async(mode) => {
    const request = window.indexedDB.open(DBNAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DBSTORE);
    const db = await dbPromise(request);
    return db.transaction(DBSTORE, mode).objectStore(DBSTORE);
};

/**
 * Restores the form values and the placeholders that were saved in the browser, or adds the example placeholders.
 *
 * @param {HTMLFormElement} form
 */
const restoreValues = async(form) => {
    let values = null;
    try {
        values = await dbPromise((await openStore('readonly')).get(dbKey));
    } catch (e) {
        // IndexedDB is not available, the form starts with the defaults.
    }
    FIELDS.forEach((name) => {
        const element = form.elements[name];
        const value = values?.[name];
        if (typeof value !== 'string') {
            return;
        }
        if (element.tagName === 'SELECT' && ![...element.options].some((option) => option.value === value)) {
            return;
        }
        element.value = value;
    });
    const placeholders = Array.isArray(values?.placeholders) ? values.placeholders : EXAMPLEPLACEHOLDERS;
    placeholders.forEach((placeholder) => addPlaceholder(form, placeholder));
};

/**
 * Saves the form values and the placeholders of the current user in the browser.
 *
 * @param {HTMLFormElement} form
 */
const saveValues = async(form) => {
    const values = Object.fromEntries(FIELDS.map((name) => [name, form.elements[name].value]));
    values.placeholders = getPlaceholders(form);
    try {
        const store = await openStore('readwrite');
        store.put(values, dbKey);
        await dbPromise(store.transaction);
    } catch (e) {
        // IndexedDB is not available, the values are simply not remembered.
    }
};

/**
 * Forgets the form values and the placeholders that were saved in the browser.
 */
const clearValues = async() => {
    try {
        const store = await openStore('readwrite');
        store.delete(dbKey);
        await dbPromise(store.transaction);
    } catch (e) {
        // IndexedDB is not available, nothing was saved.
    }
};

/**
 * Shows the body field for POST requests, with the hint for the selected method.
 *
 * @param {HTMLFormElement} form
 */
const updateBodyState = (form) => {
    const method = form.elements.method.value;
    form.querySelector(SELECTORS.BODY).classList.toggle('d-none', method === 'get');
    form.querySelectorAll(SELECTORS.BODYHINT).forEach((hint) => hint.classList.toggle('d-none', hint.dataset.method !== method));
};

/**
 * Shows the note under the body when the method is POST (JSON) and the body is not valid JSON5.
 *
 * The note keeps its space when it is hidden, so the content below it does not move.
 *
 * @param {HTMLFormElement} form
 */
const validateBody = (form) => {
    let error = null;
    if (form.elements.method.value === 'json') {
        error = parseJson5(substitute(form.elements.body.value, getPlaceholders(form))).error ?? null;
    }
    form.querySelector(SELECTORS.BODYERROR).textContent = error ?? '';
    form.querySelector(SELECTORS.BODYNOTE).classList.toggle('invisible', error === null);
};

/** @var {Number} missingSequence number of the latest call to updateMissingPlaceholders() */
let missingSequence = 0;

/**
 * Shows a note when the URL or the body uses placeholders that are not defined.
 *
 * @param {HTMLFormElement} form
 */
const updateMissingPlaceholders = async(form) => {
    const sequence = ++missingSequence;
    const defined = new Set(getPlaceholders(form).map(({name}) => name));
    let text = form.elements.url.value;
    if (form.elements.method.value !== 'get') {
        text += '\n' + form.elements.body.value;
    }
    const missing = [...new Set(text.match(PLACEHOLDERREGEX) ?? [])].filter((name) => !defined.has(name));

    const region = form.querySelector(SELECTORS.MISSING);
    region.dataset.missing = JSON.stringify(missing);
    if (!missing.length) {
        region.classList.add('d-none');
        return;
    }
    const message = await getString('missingplaceholders', 'tool_mockrequest', missing.join(', '));
    if (sequence === missingSequence) {
        region.querySelector(SELECTORS.MISSINGTEXT).textContent = message;
        region.classList.remove('d-none');
    }
};

/**
 * Adds the placeholders that the note about missing placeholders lists.
 *
 * @param {HTMLFormElement} form
 */
const addMissingPlaceholders = (form) => {
    const missing = JSON.parse(form.querySelector(SELECTORS.MISSING).dataset.missing || '[]');
    const rows = missing.map((name) => addPlaceholder(form, {name}));
    rows[0]?.querySelector('[data-field="value"]').focus();
};

/**
 * Updates the notes about the body and the placeholders after a change in the form.
 *
 * @param {HTMLFormElement} form
 */
const refresh = (form) => {
    validateBody(form);
    updateMissingPlaceholders(form);
};

/**
 * Resets the fields and the placeholders to their defaults and forgets the saved values.
 *
 * @param {HTMLFormElement} form
 */
const resetForm = (form) => {
    form.reset();
    form.querySelector(SELECTORS.PLACEHOLDERS).replaceChildren();
    EXAMPLEPLACEHOLDERS.forEach((placeholder) => addPlaceholder(form, placeholder));
    showError(form, null);
    updateBodyState(form);
    refresh(form);
    clearValues();
};

/**
 * Builds the URL and the fetch() options from the form values.
 *
 * @param {HTMLFormElement} form
 * @returns {Object} either {url, options} or {error} with the string identifier of the error
 */
const prepareRequest = (form) => {
    const placeholders = getPlaceholders(form);
    const path = substitute(form.elements.url.value.trim(), placeholders).replace(/#.*$/, '');
    if (!path.startsWith('/')) {
        return {error: 'errorurl'};
    }
    const method = form.elements.method.value;
    const url = Config.wwwroot + path;
    const options = {method: method === 'get' ? 'GET' : 'POST', credentials: 'same-origin', headers: {}};
    const body = substitute(form.elements.body.value, placeholders);
    if (method === 'json') {
        const parsed = parseJson5(body);
        if (parsed.error !== undefined) {
            return {error: 'errorjson'};
        }
        options.headers['Content-Type'] = 'application/json';
        options.body = parsed.value === undefined ? '' : JSON.stringify(parsed.value);
    } else if (method === 'post') {
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.body = body.trim();
    }
    return {url, options};
};

/**
 * Shows an error above the submit button, or hides it.
 *
 * @param {HTMLFormElement} form
 * @param {String|null} message
 */
const showError = (form, message) => {
    const region = form.querySelector(SELECTORS.ERROR);
    region.textContent = message ?? '';
    region.classList.toggle('d-none', !message);
};

/**
 * Renders a JSON value indented like JSON.stringify(value, null, 2), with the keys in bold.
 *
 * The key of a string that contains HTML tags is a link that opens a preview of the HTML.
 *
 * @param {*} value
 * @param {String} indent indentation of the current line
 * @param {String} path path to the value, shown in the preview
 * @returns {DocumentFragment}
 */
const renderJson = (value, indent = '', path = '') => {
    const fragment = document.createDocumentFragment();
    const isArray = Array.isArray(value);
    if (value === null || typeof value !== 'object') {
        fragment.append(JSON.stringify(value));
        return fragment;
    }
    const keys = isArray ? [...value.keys()] : Object.keys(value);
    const [open, close] = isArray ? ['[', ']'] : ['{', '}'];
    if (!keys.length) {
        fragment.append(open + close);
        return fragment;
    }
    fragment.append(open + '\n');
    keys.forEach((key, index) => {
        const item = value[key];
        const itemPath = isArray ? `${path}[${key}]` : (path === '' ? key : `${path}.${key}`);
        fragment.append(indent + '  ');
        if (!isArray) {
            const label = document.createElement('strong');
            label.textContent = JSON.stringify(key);
            if (typeof item === 'string' && HTMLREGEX.test(item)) {
                const link = document.createElement('a');
                link.href = '#';
                link.dataset.action = 'previewhtml';
                link.dataset.path = itemPath;
                link.append(label);
                htmlPreviews.set(link, item);
                fragment.append(link);
            } else {
                fragment.append(label);
            }
            fragment.append(': ');
        }
        fragment.append(renderJson(item, indent + '  ', itemPath));
        fragment.append(index < keys.length - 1 ? ',\n' : '\n');
    });
    fragment.append(indent + close);
    return fragment;
};

/**
 * Shows HTML from the response in a popup, in a sandboxed frame where scripts do not run.
 *
 * The frame loads the stylesheets of this page, so the HTML looks as it would on the site. It keeps the site's
 * origin so that the theme fonts load, which is safe only as long as the sandbox does not allow scripts.
 *
 * @param {String} path path to the value in the response
 * @param {String} html
 */
const previewHtml = async(path, html) => {
    const escape = (text) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const styles = [...document.querySelectorAll('link[rel="stylesheet"]')]
        .map((link) => `<link rel="stylesheet" href="${escape(link.href)}">`)
        .join('');

    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-same-origin');
    frame.className = 'w-100 border rounded';
    frame.style.height = '70vh';
    frame.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head>` +
        `<body class="p-3">${html}</body></html>`;
    const pathElement = document.createElement('code');
    pathElement.className = 'd-block mb-2';
    pathElement.textContent = path;

    const modal = await Modal.create({
        title: getString('htmlpreview', 'tool_mockrequest'),
        large: true,
        removeOnClose: true,
    });
    modal.getBody()[0].replaceChildren(pathElement, frame);
    modal.show();
};

/**
 * Shows the request that was sent and the response, formatting JSON.
 *
 * @param {Object} request
 * @param {Response} response
 * @param {String} text response body
 */
const showResult = (request, response, text) => {
    const region = document.querySelector(SELECTORS.RESULT);

    const requestRegion = region.querySelector(SELECTORS.REQUEST);
    if (request.options.method === 'GET') {
        const link = document.createElement('a');
        link.href = request.url;
        link.target = '_blank';
        link.textContent = request.url;
        requestRegion.replaceChildren('GET ', link);
    } else {
        requestRegion.textContent = `${request.options.method} ${request.url}` +
            `\nContent-Type: ${request.options.headers['Content-Type']}\n\n${request.options.body}`;
    }

    let status = `${response.status} ${response.statusText}`;
    const contentType = response.headers.get('Content-Type');
    if (contentType) {
        status += `\nContent-Type: ${contentType}`;
    }
    if (response.redirected) {
        status += `\nRedirected to: ${response.url}`;
    }
    region.querySelector(SELECTORS.STATUS).textContent = status;

    const json = parseJson(text);
    const output = region.querySelector(SELECTORS.OUTPUT);
    if (json === undefined) {
        output.textContent = text;
    } else {
        output.replaceChildren(renderJson(json));
    }
    region.classList.remove('d-none');
};

/**
 * Sends the request and shows the response.
 *
 * @param {HTMLFormElement} form
 */
const send = async(form) => {
    showError(form, null);
    const request = prepareRequest(form);
    if (request.error) {
        document.querySelector(SELECTORS.RESULT).classList.add('d-none');
        showError(form, await getString(request.error, 'tool_mockrequest'));
        return;
    }
    saveValues(form);

    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
        const response = await fetch(request.url, request.options);
        showResult(request, response, await response.text());
    } catch (e) {
        showError(form, e.message);
    } finally {
        button.disabled = false;
    }
};

/**
 * Initialises the form.
 *
 * @param {Number} userid id of the current user
 */
export const init = async(userid) => {
    currentValues = {sesskey: Config.sesskey, userid: `${userid}`};
    dbKey = `${Config.wwwroot}|${userid}`;
    const form = document.querySelector(SELECTORS.FORM);
    await restoreValues(form);
    updateBodyState(form);
    refresh(form);

    form.elements.method.addEventListener('change', () => updateBodyState(form));
    form.addEventListener('input', (e) => {
        if (e.target.matches('[data-field="value"]')) {
            delete e.target.closest(SELECTORS.PLACEHOLDER).dataset.auto;
        }
        refresh(form);
    });
    form.addEventListener('change', () => refresh(form));
    form.addEventListener('click', (e) => {
        if (e.target.closest(SELECTORS.ADDPLACEHOLDER)) {
            addPlaceholder(form).querySelector('[data-field="name"]').focus();
        } else if (e.target.closest(SELECTORS.RESETFORM)) {
            e.preventDefault();
            resetForm(form);
        } else if (e.target.closest(SELECTORS.ADDMISSING)) {
            e.preventDefault();
            addMissingPlaceholders(form);
            refresh(form);
        } else if (e.target.closest(SELECTORS.REMOVEPLACEHOLDER)) {
            e.target.closest(SELECTORS.PLACEHOLDER).remove();
            refresh(form);
        }
    });
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        send(form);
    });
    document.querySelector(SELECTORS.RESULT).addEventListener('click', (e) => {
        const link = e.target.closest(SELECTORS.PREVIEWHTML);
        if (link) {
            e.preventDefault();
            previewHtml(link.dataset.path, htmlPreviews.get(link));
        }
    });
};
