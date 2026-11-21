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
import {getString} from 'core/str';

const STORAGEKEY = 'tool_mockrequest_form';
const FIELDS = ['url', 'method', 'sesskey', 'body'];

const SELECTORS = {
    FORM: '#tool_mockrequest_form',
    BODY: '[data-region="body"]',
    ERROR: '[data-region="error"]',
    RESULT: '[data-region="tool_mockrequest_result"]',
    REQUEST: '[data-region="request"]',
    STATUS: '[data-region="status"]',
    OUTPUT: '[data-region="output"]',
};

/**
 * Parses the text as JSON.
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
 * Restores the form values that were saved in the browser storage.
 *
 * @param {HTMLFormElement} form
 */
const restoreValues = (form) => {
    let values = null;
    try {
        values = JSON.parse(window.localStorage.getItem(STORAGEKEY));
    } catch (e) {
        return;
    }
    FIELDS.forEach((name) => {
        if (typeof values?.[name] === 'string') {
            form.elements[name].value = values[name];
        }
    });
};

/**
 * Saves the form values in the browser storage, so they survive logging in as another user.
 *
 * @param {HTMLFormElement} form
 */
const saveValues = (form) => {
    const values = Object.fromEntries(FIELDS.map((name) => [name, form.elements[name].value]));
    try {
        window.localStorage.setItem(STORAGEKEY, JSON.stringify(values));
    } catch (e) {
        // Storage is not available, the values are simply not remembered.
    }
};

/**
 * Shows the body field and allows the sesskey in the body only for POST requests.
 *
 * @param {HTMLFormElement} form
 */
const updateBodyState = (form) => {
    const isPost = form.elements.method.value === 'POST';
    form.querySelector(SELECTORS.BODY).classList.toggle('d-none', !isPost);
    form.elements.sesskey.querySelector('option[value="body"]').disabled = !isPost;
    if (!isPost && form.elements.sesskey.value === 'body') {
        form.elements.sesskey.value = 'url';
    }
};

/**
 * Builds the URL and the fetch() options from the form values.
 *
 * @param {HTMLFormElement} form
 * @returns {Object} either {url, options} or {error} with the string identifier of the error
 */
const prepareRequest = (form) => {
    const path = form.elements.url.value.trim().replace(/#.*$/, '');
    if (!path.startsWith('/')) {
        return {error: 'errorurl'};
    }
    const method = form.elements.method.value;
    const sesskey = form.elements.sesskey.value;
    const sesskeyParam = 'sesskey=' + encodeURIComponent(Config.sesskey);

    let url = Config.wwwroot + path;
    if (sesskey === 'url') {
        url += (path.includes('?') ? '&' : '?') + sesskeyParam;
    }

    const options = {method, credentials: 'same-origin', headers: {}};
    if (method === 'POST') {
        const text = form.elements.body.value;
        const json = parseJson(text);
        if (json !== undefined) {
            options.headers['Content-Type'] = 'application/json';
            options.body = text;
            if (sesskey === 'body') {
                if (json === null || typeof json !== 'object' || Array.isArray(json)) {
                    return {error: 'errorjsonsesskey'};
                }
                options.body = JSON.stringify({...json, sesskey: Config.sesskey});
            }
        } else {
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            options.body = text.trim();
            if (sesskey === 'body') {
                options.body += (options.body === '' ? '' : '&') + sesskeyParam;
            }
        }
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
 * Shows the request that was sent and the response, formatting JSON.
 *
 * @param {Object} request
 * @param {Response} response
 * @param {String} text response body
 */
const showResult = (request, response, text) => {
    const region = document.querySelector(SELECTORS.RESULT);

    let requestText = `${request.options.method} ${request.url}`;
    if (request.options.body !== undefined) {
        requestText += `\nContent-Type: ${request.options.headers['Content-Type']}\n\n${request.options.body}`;
    }
    region.querySelector(SELECTORS.REQUEST).textContent = requestText;

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
    region.querySelector(SELECTORS.OUTPUT).textContent = json === undefined ? text : JSON.stringify(json, null, 2);
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
 */
export const init = () => {
    const form = document.querySelector(SELECTORS.FORM);
    restoreValues(form);
    updateBodyState(form);
    form.elements.method.addEventListener('change', () => updateBodyState(form));
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        send(form);
    });
};
