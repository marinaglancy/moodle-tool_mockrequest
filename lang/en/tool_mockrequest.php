<?php
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
 * Strings for component 'tool_mockrequest', language 'en'
 *
 * @package    tool_mockrequest
 * @copyright  Marina Glancy
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['addplaceholder'] = 'Add placeholder';
$string['body'] = 'Request body';
$string['bodyhintjson'] = 'You can use JSON5 (single quotes, unquoted keys, trailing commas, comments). The body is converted to JSON in the request.';
$string['bodyhintpost'] = 'The body is sent as it is, as application/x-www-form-urlencoded.';
$string['debuggingrequired'] = 'This page is only available when developer debugging is enabled.';
$string['errorjson'] = 'The request body is not valid JSON5.';
$string['errorurl'] = 'The URL must start with "/".';
$string['intro'] = 'Sends requests from the current user\'s session with the specified parameters. Use it for security testing, for example of IDOR (insecure direct object reference) vulnerabilities.';
$string['invalidjson'] = 'Invalid JSON5:';
$string['method'] = 'Request method';
$string['missingplaceholders'] = 'Are you missing {$a}?';
$string['placeholdername'] = 'Placeholder';
$string['placeholders'] = 'Placeholders';
$string['placeholdershint'] = 'Each placeholder is replaced with its value in the URL and in the request body before the request is sent.';
$string['placeholdervalue'] = 'Value';
$string['pluginname'] = 'Mock request';
$string['privacy:metadata'] = 'The Mock request plugin does not store any personal data.';
$string['removeplaceholder'] = 'Remove placeholder';
$string['request'] = 'Request';
$string['resetform'] = 'Reset form';
$string['response'] = 'Response';
$string['send'] = 'Send request';
$string['url'] = 'Local URL';
