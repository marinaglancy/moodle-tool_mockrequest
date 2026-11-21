# Mock request (tool_mockrequest)

A developer tool for reproducing security issues where a user fabricates a request to the site
using their own session cookie and, if needed, their sesskey.

The page is at `/admin/tool/mockrequest/index.php`. It is available to any user, including users
who are not logged in, but only when developer debugging is enabled. Otherwise it shows an error.

## Usage

1. Log in as the user whose permissions you want to test.
2. Open the page and fill in the form:
   - **Local URL**: path relative to the site root, starting with `/`. It may contain a query string.
   - **Request method**: POST or GET.
   - **Add sesskey**: to the URL, to the request body (POST only) or not at all.
   - **Request body** (POST only): a body that is valid JSON is sent as `application/json`,
     anything else as `application/x-www-form-urlencoded`. The sesskey can be added to a JSON
     body only when the body is an object.
3. Click **Send request**. The page shows the request that was sent (collapsed), the response status,
   content type and redirect target (if any), and the response body. A JSON response is formatted.

The request is sent from the browser with `fetch()` and the user's cookies, so it behaves exactly as
if the user had crafted it. The form values are remembered in the browser's local storage, so the
same request can be replayed after logging in as a different user.

## Example

Calling an AJAX web service function:

- Local URL: `/lib/ajax/service.php?info=core_fetch_notifications`
- Request method: POST
- Add sesskey: To the URL
- Request body:

  ```json
  [{"index": 0, "methodname": "core_fetch_notifications", "args": {"contextid": 1}}]
  ```
