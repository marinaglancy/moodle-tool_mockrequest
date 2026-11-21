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

$string['body'] = 'Request body';
$string['bodyhint'] = 'A body that is valid JSON is sent as application/json, anything else as application/x-www-form-urlencoded.';
$string['debuggingrequired'] = 'This page is only available when developer debugging is enabled.';
$string['errorjsonsesskey'] = 'The sesskey can only be added to a JSON body that is an object.';
$string['errorurl'] = 'The URL must start with "/".';
$string['method'] = 'Request method';
$string['pluginname'] = 'Mock request';
$string['privacy:metadata'] = 'The Mock request plugin does not store any personal data.';
$string['request'] = 'Request';
$string['response'] = 'Response';
$string['send'] = 'Send request';
$string['sesskey'] = 'Add sesskey';
$string['sesskeybody'] = 'To the request body';
$string['sesskeynone'] = 'None';
$string['sesskeyurl'] = 'To the URL';
$string['url'] = 'Local URL';
$string['urlhint'] = 'Path relative to the site root, starting with "/". It may contain a query string.';
