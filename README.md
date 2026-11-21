# Mock request (tool_mockrequest)

A developer tool for reproducing security issues where a user fabricates a request to the site
using their own session cookie and, if needed, their sesskey.

The page is at `/admin/tool/mockrequest/index.php`. It is available to any user, including users
who are not logged in, but only when developer debugging is enabled. Otherwise it shows an error.

## Usage

1. Log in as the user whose permissions you want to test.
2. Open the page and fill in the form:
   - **Local URL**: path relative to the site root, starting with `/`. It may contain a query string.
     The default is `/lib/ajax/service.php?sesskey=<SESSKEY>`.
   - **Request method**:
     - **POST (JSON)**: the body may be written in [JSON5](https://json5.org/) (comments, unquoted
       keys, single quotes, trailing commas) and is converted to JSON and sent as `application/json`.
       A red note under the field shows when the body is not valid JSON5.
     - **POST**: the body is sent as it is, as `application/x-www-form-urlencoded`.
     - **GET**: no body.
   - **Placeholders**: each placeholder is replaced with its value in the URL and in the request body.
     `<SESSKEY>` and `<USERID>` are added as examples with the current user's session key and id,
     and keep following the current user until you edit their values. Any placeholder can be
     added, changed or removed. When the URL or the body uses a placeholder that is not defined,
     a note under the placeholders offers to add it.
3. Click **Send request**. The page shows the request that was sent (collapsed, with the URL as a
   link for GET requests), the response status, content type and redirect target (if any), and the
   response body. A JSON response is formatted.

The request is sent from the browser with `fetch()` and the user's cookies, so it behaves exactly as
if the user had crafted it. The form values and the placeholders are remembered in the browser's
IndexedDB when a request is sent, separately for each site and user, so each user finds their own
last request when they open the page again. **Reset form** restores the default values and
placeholders and forgets the ones saved for the current user.

## Example

Calling an AJAX web service function:

- Local URL: `/lib/ajax/service.php?sesskey=<SESSKEY>&info=core_user_get_users_by_field`
- Request method: POST (JSON)
- Request body:

  ```json5
  [{
    index: 0,
    methodname: 'core_user_get_users_by_field',
    args: {field: 'id', values: [<USERID>]},
  }]
  ```

## Third-party libraries

`amd/src/local/json5.js` is a copy of `dist/index.mjs` from [json5](https://github.com/json5/json5)
(MIT license), see `thirdpartylibs.xml`.
