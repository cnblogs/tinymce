/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import { Arr } from '@ephox/katamari';
import I18n from 'tinymce/core/api/util/I18n';
import KeyboardShortcuts from '../data/KeyboardShortcuts';
import ConvertShortcut from '../alien/ConvertShortcut';

export interface ShortcutActionPairType {
  shortcuts: string[];
  action: string;
}

const tab = () => {
  const makeAriaLabel = (shortcut: ShortcutActionPairType) => {
    const shortcutText = Arr.map(shortcut.shortcuts, (s) => s.replace(/Ctrl/g, 'Control')).join(' or ');
    return 'aria-label="Action: ' + shortcut.action + ', Shortcut: ' + shortcutText + '"';
  };
  const shortcutLisString = Arr.map(KeyboardShortcuts.shortcuts, function (shortcut: ShortcutActionPairType) {
    const shortcutText = Arr.map(shortcut.shortcuts, ConvertShortcut.convertText).join(' or ');
    return '<tr data-mce-tabstop="1" tabindex="-1" ' + makeAriaLabel(shortcut) + '>' +
              '<td>' + I18n.translate(shortcut.action) + '</td>' +
              '<td>' + shortcutText + '</td>' +
            '</tr>';
  }).join('');

  return {
    title: 'Handy Shortcuts',
    items: [
      {
        type: 'htmlpanel',
        html: '<div>' +
                '<table class="mce-table-striped">' +
                  '<thead>' +
                    '<th>' + I18n.translate('Action') + '</th>' +
                    '<th>' + I18n.translate('Shortcut') + '</th>' +
                  '</thead>' +
                  shortcutLisString +
                '</table>' +
              '</div>'
      }
    ]
  };
};

export default {
  tab
};