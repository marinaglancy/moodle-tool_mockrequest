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
 * Sends a request composed by the user from the browser, with the user's cookies
 *
 * Available to anyone, including users who are not logged in, but only when developer debugging is on.
 *
 * @package    tool_mockrequest
 * @copyright  Marina Glancy
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../../config.php'); // phpcs:ignore moodle.Files.RequireLogin.Missing

$PAGE->set_url(new moodle_url('/admin/tool/mockrequest/index.php'));
$PAGE->set_context(context_system::instance());
$PAGE->set_pagelayout('report');
$PAGE->set_secondary_navigation(false);

if (empty($CFG->debugdeveloper)) {
    throw new moodle_exception('debuggingrequired', 'tool_mockrequest');
}

$title = get_string('pluginname', 'tool_mockrequest');
$PAGE->set_title($title);
$PAGE->set_heading($title);
$PAGE->requires->js_call_amd('tool_mockrequest/form', 'init', [(int)$USER->id]);

echo $OUTPUT->header();
echo $OUTPUT->render_from_template('tool_mockrequest/form', []);
echo $OUTPUT->footer();
